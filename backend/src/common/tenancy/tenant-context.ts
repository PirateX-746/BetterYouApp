import { AsyncLocalStorage } from 'node:async_hooks';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '../role.enum';

export interface TenantContext {
  /** The practice every scoped query is confined to. */
  practiceId: string | null;
  userId: string | null;
  role: Role | null;
  /**
   * True only inside runAsPlatform(). Lets a platform query cross practices;
   * never set from a request.
   */
  bypass?: boolean;
}

/**
 * Carries the tenant for the life of a request without threading it through
 * every service signature. Node's AsyncLocalStorage survives awaits, so a
 * Mongoose hook deep in a call stack can still read it.
 */
export const tenantStore = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantStore.getStore();
}

export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return tenantStore.run(ctx, fn);
}

/**
 * Runs `fn` with tenant scoping switched off, for genuinely platform-wide
 * queries such as "count all patients across every practice".
 *
 * Deliberately verbose and never the default: crossing practices should be a
 * visible decision in the code, not something that happens because a filter
 * was forgotten. Callers must be SUPER_ADMIN.
 */
export function runAsPlatform<T>(actor: { role: Role | null }, fn: () => T): T {
  if (actor.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenException(
      'Platform-wide queries require a platform administrator',
    );
  }

  const current = getTenantContext();
  return tenantStore.run(
    {
      practiceId: null,
      userId: current?.userId ?? null,
      role: Role.SUPER_ADMIN,
      bypass: true,
    },
    fn,
  );
}
