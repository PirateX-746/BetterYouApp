import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PracticesService } from '../../practices/practices.service';
import type { PracticeDocument } from '../../practices/schemas/practice.schema';
import { subdomainFrom } from './subdomain';
import { adminSubdomain, rootDomain } from './tenancy.config';

export interface PracticeAwareRequest extends Request {
  /** Practice resolved from the Host header. Null on the apex or console. */
  practice?: PracticeDocument | null;
  practiceSubdomain?: string | null;
  isAdminHost?: boolean;
}

/**
 * Resolves the practice from the Host header and attaches it to the request.
 *
 * Resolution only — it authorises nothing. TenantGuard decides what the
 * result means, so that no controller ever parses a hostname itself.
 */
@Injectable()
export class PracticeResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PracticeResolverMiddleware.name);

  constructor(private readonly practices: PracticesService) {}

  async use(
    req: PracticeAwareRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const label = subdomainFrom(req.headers.host, rootDomain());

    req.practiceSubdomain = label;
    req.isAdminHost = label === adminSubdomain();
    req.practice = null;

    if (label && !req.isAdminHost) {
      try {
        req.practice = await this.practices.findBySubdomain(label);
      } catch (err) {
        // Never fail the request here — the guard turns "no practice" into
        // the correct 404, and a resolver blowing up should not 500 every
        // route including the health check.
        this.logger.error(
          `Practice lookup failed for "${label}": ${(err as Error).message}`,
        );
      }
    }

    next();
  }
}
