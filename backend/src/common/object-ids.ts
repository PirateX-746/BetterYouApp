import { Types } from 'mongoose';

/**
 * Casts the named string id fields to ObjectIds before a write.
 *
 * `@Prop({ type: Types.ObjectId })` refs in this codebase resolve to Mixed
 * paths (see common/tenancy/practice-scope.ts), so a string written as-is is
 * stored as a string — and every query, which compares against an ObjectId,
 * then silently misses the document.
 */
export function withObjectIds<T extends object>(doc: T, keys: string[]): T {
  const out = { ...doc } as Record<string, unknown>;
  for (const key of keys) {
    const value = out[key];
    if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
      out[key] = new Types.ObjectId(value);
    }
  }
  return out as T;
}
