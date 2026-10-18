/**
 * Express `trust proxy` setting, from the TRUST_PROXY env var.
 *
 * Behind a proxy, the TCP peer is the proxy — so without this every request
 * appears to come from the same address, and the rate limiter (which keys
 * on `req.ip`) counts all users as one client: a handful of failed logins
 * anywhere locks everyone out. With it, Express takes the client address
 * from X-Forwarded-For, trusting only as many entries as there are proxies.
 *
 * The value must match the real deployment, which is why it is config and
 * not code:
 *   unset / ""   → not set (Express default: trust nothing; correct when
 *                  the API is reached directly, e.g. local dev)
 *   "1", "2", …  → number of proxy hops in front of the app, e.g. "1" for a
 *                  platform edge (Railway/Render/Fly), "2" for Vercel
 *                  rewrite → platform edge
 *   "loopback", "10.0.0.0/8, 172.16.0.0/12" → trust those proxy addresses
 *   "false"      → explicit off
 *   "true"       → trust every hop. Rejected by assertTrustProxySafe in
 *                  production: the client controls the leftmost
 *                  X-Forwarded-For entry and could pick a new IP per request.
 */
export type TrustProxy = boolean | number | string;

export function parseTrustProxy(
  raw: string | undefined,
): TrustProxy | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

/** Throws on a production config that would let clients spoof their IP. */
export function assertTrustProxySafe(
  value: TrustProxy | undefined,
  nodeEnv: string | undefined,
): void {
  if (value === true && nodeEnv === 'production') {
    throw new Error(
      'TRUST_PROXY=true lets any client spoof its IP via X-Forwarded-For. ' +
        'Set it to the number of proxy hops (e.g. 1) or the proxy addresses.',
    );
  }
}
