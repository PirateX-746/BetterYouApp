import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, mongo } from 'mongoose';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export type StorageDriverName = 'r2' | 'gridfs';

/**
 * Private binary storage for clinical files.
 *
 * Two interchangeable drivers:
 *  - `r2`     — Cloudflare R2 (S3 API). Used whenever R2_BUCKET is set.
 *  - `gridfs` — MongoDB GridFS in the app's own database. The fallback, so
 *               uploads work without extra infrastructure. Still private:
 *               nothing is reachable except through the authorized
 *               DocumentsController stream endpoint.
 *
 * Neither driver ever hands the client a URL — files are streamed through
 * the API after the caller's practice and role have been checked, so access
 * cannot outlive or bypass authorization.
 */
interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}

class R2Driver implements StorageDriver {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
      }),
    );
  }

  async get(key: string) {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return res.Body as Readable;
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

class GridFsDriver implements StorageDriver {
  constructor(private readonly connection: Connection) {}

  private bucket() {
    // Resolved lazily: the connection's `db` is not ready at construction.
    return new mongo.GridFSBucket(this.connection.db!, {
      bucketName: 'documentFiles',
    });
  }

  put(key: string, body: Buffer, contentType: string) {
    return new Promise<void>((resolve, reject) => {
      const upload = this.bucket().openUploadStream(key, {
        metadata: { contentType },
      });
      upload.once('error', reject);
      upload.once('finish', () => resolve());
      upload.end(body);
    });
  }

  async get(key: string) {
    const bucket = this.bucket();
    const file = await bucket.find({ filename: key }).limit(1).next();
    if (!file) throw new Error('Stored file not found');
    return bucket.openDownloadStream(file._id);
  }

  async delete(key: string) {
    const bucket = this.bucket();
    const files = await bucket.find({ filename: key }).toArray();
    for (const file of files) await bucket.delete(file._id);
  }
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private driver!: StorageDriver;
  driverName!: StorageDriverName;

  constructor(
    private readonly config: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  onModuleInit() {
    const bucket = this.config.get<string>('R2_BUCKET');

    if (bucket) {
      const accountId = this.config.get<string>('R2_ACCOUNT_ID');
      const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
      const secret = this.config.get<string>('R2_SECRET_ACCESS_KEY');
      if (!accountId || !accessKeyId || !secret) {
        throw new Error(
          'R2_BUCKET is set but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are incomplete',
        );
      }
      this.driver = new R2Driver(bucket, accountId, accessKeyId, secret);
      this.driverName = 'r2';
    } else {
      this.driver = new GridFsDriver(this.connection);
      this.driverName = 'gridfs';
    }

    this.logger.log(`Document storage driver: ${this.driverName}`);
  }

  put(key: string, body: Buffer, contentType: string) {
    return this.driver.put(key, body, contentType);
  }

  get(key: string) {
    return this.driver.get(key);
  }

  /** Best-effort delete. Never throws — used on cleanup paths. */
  async deleteQuietly(key: string): Promise<boolean> {
    try {
      await this.driver.delete(key);
      return true;
    } catch (err) {
      // Key only — never the content or any patient detail.
      this.logger.error(
        `Failed to delete stored object ${key}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
