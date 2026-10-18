import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { isAllowedOrigin } from './cors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence by origin verification (OWASP "Verifying Origin With Standard
 * Headers" + Fetch Metadata).
 *
 * In production the session cookie is `SameSite=None` so the frontend can
 * reach the API and sockets cross-site — which also means the browser
 * attaches it to a form POST from any other site. CORS does not stop that:
 * it only hides the *response*, the request has already been processed.
 *
 * So every state-changing request is checked here, before any guard runs:
 *  - an `Origin` header must be one of ours (browsers send it on every
 *    cross-origin POST/PUT/PATCH/DELETE, including plain HTML form posts);
 *  - with no `Origin`, a browser that marks the request `Sec-Fetch-Site:
 *    cross-site` is rejected too;
 *  - with neither header the caller is not a browser (curl, server-to-server,
 *    tests), and a non-browser client cannot carry a victim's cookie, so
 *    there is nothing to forge.
 *
 * Safe methods are not checked — no GET route may change state.
 */
@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.headers.origin;
    if (origin !== undefined) {
      if (isAllowedOrigin(origin)) return next();
      throw new ForbiddenException('Cross-site request blocked');
    }

    if (req.headers['sec-fetch-site'] === 'cross-site') {
      throw new ForbiddenException('Cross-site request blocked');
    }

    next();
  }
}
