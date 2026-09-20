import { createSocket } from "./socket";

/**
 * Every createSocket() call opens a brand-new WebSocket connection — the
 * socket.io-client manager cache only reuses a connection for a *second*
 * namespace on the same host, and forces a new one once "/" is already
 * in use (see socket.io-client's `lookup()`). Since every consumer here
 * connects to the same default namespace, mounting N components for the
 * same user (e.g. the always-on notifications provider + the appointments
 * calendar) opened N independent sockets to the same server.
 *
 * This registry reference-counts one real connection per identity (the
 * query, e.g. { practitionerId }) so concurrent consumers share it, and
 * only disconnects once the last consumer releases it.
 */
type Entry = { socket: ReturnType<typeof createSocket>; refCount: number };

const registry = new Map<string, Entry>();

function keyFor(query: Record<string, string>): string {
  return JSON.stringify(Object.entries(query).sort());
}

export function acquireSocket(query: Record<string, string>) {
  const key = keyFor(query);
  let entry = registry.get(key);
  if (!entry) {
    entry = { socket: createSocket(query), refCount: 0 };
    registry.set(key, entry);
  }
  entry.refCount += 1;
  return entry.socket;
}

export function releaseSocket(query: Record<string, string>) {
  const key = keyFor(query);
  const entry = registry.get(key);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entry.socket.disconnect();
    registry.delete(key);
  }
}
