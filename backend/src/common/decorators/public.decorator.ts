import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without authentication.
 *
 * Authentication is enforced globally (see the APP_GUARD registrations in
 * AppModule), so every endpoint is protected by default and anything that
 * genuinely needs to be open — login, signup, the health check — has to opt
 * out explicitly with this decorator.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
