/**
 * Multi-tenancy feature flag.
 *
 * The whole tenancy layer ships switched OFF. With the flag unset the
 * resolver still runs (so it can be observed in logs) but TenantGuard
 * enforces nothing and no schema is tenant-scoped — the app behaves exactly
 * as it does today.
 *
 * Turning it on is the cutover, and must not happen until migration steps
 * 1–5 have run and every tenant-owned document carries a practiceId.
 */
export function isMultiTenancyEnabled(): boolean {
  return process.env.MULTI_TENANCY_ENABLED === 'true';
}

/** Root domain used to derive the tenant from the Host header. */
export function rootDomain(): string {
  return process.env.ROOT_DOMAIN ?? 'localhost';
}

/** Subdomain reserved for the platform console. */
export function adminSubdomain(): string {
  return process.env.ADMIN_SUBDOMAIN ?? 'admin';
}
