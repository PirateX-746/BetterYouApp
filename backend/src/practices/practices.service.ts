import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Practice,
  PracticeDocument,
  PracticeStatus,
  USABLE_PRACTICE_STATUSES,
} from './schemas/practice.schema';

interface CacheEntry {
  practice: PracticeDocument | null;
  expiresAt: number;
}

/** Short enough that a suspension takes effect promptly without a restart. */
const CACHE_TTL_MS = 30_000;

@Injectable()
export class PracticesService {
  private readonly logger = new Logger(PracticesService.name);

  /**
   * Subdomain → practice. Every request resolves a practice, so without this
   * we would add a database round-trip to each one. Negative results are
   * cached too, so a flood of requests for a non-existent subdomain does not
   * become a flood of queries.
   */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectModel(Practice.name)
    private readonly practiceModel: Model<PracticeDocument>,
  ) {}

  async findBySubdomain(subdomain: string): Promise<PracticeDocument | null> {
    const key = subdomain.toLowerCase();
    const hit = this.cache.get(key);

    if (hit && hit.expiresAt > Date.now()) return hit.practice;

    const practice = await this.practiceModel
      .findOne({ subdomain: key, deletedAt: null })
      .exec();

    this.cache.set(key, { practice, expiresAt: Date.now() + CACHE_TTL_MS });
    return practice;
  }

  /**
   * Drops a cached entry. Must be called whenever a practice is edited,
   * suspended or archived, otherwise the change waits out the TTL.
   */
  invalidate(subdomain: string): void {
    this.cache.delete(subdomain.toLowerCase());
    this.logger.log(`Practice cache invalidated for "${subdomain}"`);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  static isUsable(practice: Pick<Practice, 'status'>): boolean {
    return USABLE_PRACTICE_STATUSES.includes(practice.status);
  }

  async findById(id: string): Promise<PracticeDocument | null> {
    return this.practiceModel.findOne({ _id: id, deletedAt: null }).exec();
  }

  async listAll(): Promise<PracticeDocument[]> {
    return this.practiceModel
      .find({ deletedAt: null })
      .sort({ name: 1 })
      .exec();
  }

  async setStatus(
    id: string,
    status: PracticeStatus,
  ): Promise<PracticeDocument | null> {
    const updated = await this.practiceModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    if (updated) this.invalidate(updated.subdomain);
    return updated;
  }
}
