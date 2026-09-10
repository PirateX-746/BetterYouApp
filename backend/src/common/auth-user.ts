import { ForbiddenException } from '@nestjs/common';
import { Role } from './role.enum';

/** Shape that JwtStrategy.validate() puts on `request.user`. */
export interface AuthUser {
  userId: string;
  role: Role;
}

/** Request with a guaranteed authenticated user (every non-@Public route). */
export interface AuthedRequest {
  user: AuthUser;
}

export function isPractitioner(user: AuthUser): boolean {
  return user.role === Role.PRACTITIONER;
}

/**
 * Allows the action when the caller is a practitioner, or is the patient the
 * record belongs to. Used on the endpoints a patient legitimately reaches for
 * their own record (profile read/update, password change, their appointments).
 *
 * `targetUserId` must come from the route/record — never from the request body.
 */
export function assertSelfOrPractitioner(
  user: AuthUser,
  targetUserId: string,
): void {
  if (isPractitioner(user)) return;
  if (user.userId === targetUserId) return;

  throw new ForbiddenException('You can only access your own records');
}

/** Allows the action only when the caller owns the record. */
export function assertSelf(user: AuthUser, targetUserId: string): void {
  if (user.userId !== targetUserId) {
    throw new ForbiddenException('You can only access your own records');
  }
}
