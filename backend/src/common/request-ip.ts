import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

/**
 * The client IP of the request being handled, available anywhere below the
 * HTTP layer (e.g. AuditService) without threading `req` through services.
 * `req.ip` honours the `trust proxy` setting (TRUST_PROXY), so behind the
 * Railway edge + gateway it is the real client, not a proxy hop.
 */
const store = new AsyncLocalStorage<{ ip?: string }>();

export function requestIpMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip?.replace(/^::ffff:/, '') || undefined;
    store.run({ ip }, next);
  };
}

export function currentRequestIp(): string | undefined {
  return store.getStore()?.ip;
}
