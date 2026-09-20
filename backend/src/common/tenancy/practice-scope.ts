import { Types } from 'mongoose';

/**
 * A practice-scoped query filter, and the cast practiceId to stamp on a new
 * document.
 *
 * IMPORTANT: `practiceId` fields declared as `@Prop({ type: Types.ObjectId })`
 * in this codebase resolve to a Mongoose `Mixed` path (a pre-existing quirk
 * affecting every ObjectId-ref prop here, not just this one — `patientId`
 * and `practitionerId` show the same thing). Mixed paths do NOT auto-cast a
 * query string to ObjectId, so comparing against a raw string silently
 * matches nothing. Every comparison must wrap the value in `new
 * Types.ObjectId(...)` explicitly.
 *
 * Fails closed: a missing or malformed practiceId matches nothing, never
 * everything — the query returns 0 rows instead of the whole collection.
 */
export function practiceScopeFilter(
  practiceId: string | null | undefined,
): Record<string, unknown> {
  if (!practiceId || !Types.ObjectId.isValid(practiceId)) {
    return { _id: { $exists: false } };
  }
  return { practiceId: new Types.ObjectId(practiceId) };
}

/** The value to stamp onto a new document's `practiceId` field. */
export function practiceStamp(
  practiceId: string | null | undefined,
): Types.ObjectId | undefined {
  return practiceId && Types.ObjectId.isValid(practiceId)
    ? new Types.ObjectId(practiceId)
    : undefined;
}
