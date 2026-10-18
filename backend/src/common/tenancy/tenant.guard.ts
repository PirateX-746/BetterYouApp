import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PracticesService } from '../../practices/practices.service';
import type { PracticeAwareRequest } from './practice-resolver.middleware';
import { tenantStore, type TenantContext } from './tenant-context';
import { isMultiTenancyEnabled } from './tenancy.config';

interface RequestUser {
  userId: string;
  role: Role;
  practiceId?: string | null;
}

/**
 * Confines a request to one practice.
 *
 * Runs after JwtAuthGuard (so request.user is populated from the verified
 * token) and before RolesGuard. Three jobs:
 *
 *   1. Cross-check the practice in the token against the practice in the
 *      hostname, so a session cannot be replayed against another practice.
 *   2. Block practices that are suspended or cancelled.
 *   3. Open the AsyncLocalStorage scope the Mongoose plugin reads.
 *
 * While the multi-tenancy flag is off this is a no-op, so the app behaves
 * exactly as it does today.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!isMultiTenancyEnabled()) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<PracticeAwareRequest & { user?: RequestUser }>();

    const user = req.user;
    if (!user) return true; // JwtAuthGuard already rejected it.

    // Platform operators are outside every practice by construction.
    if (user.role === Role.SUPER_ADMIN) {
      return this.openScope({
        practiceId: null,
        userId: user.userId,
        role: user.role,
      });
    }

    const hostPractice = req.practice;

    if (!hostPractice) {
      throw new NotFoundException('TENANT_NOT_FOUND');
    }

    if (
      !user.practiceId ||
      String(user.practiceId) !== String(hostPractice._id)
    ) {
      throw new ForbiddenException('TENANT_ACCESS_DENIED');
    }

    if (!PracticesService.isUsable(hostPractice)) {
      throw new ForbiddenException('TENANT_SUSPENDED');
    }

    return this.openScope({
      practiceId: String(hostPractice._id),
      userId: user.userId,
      role: user.role,
    });
  }

  /**
   * A guard returns before the handler runs, so the tenant scope cannot be
   * opened with `tenantStore.run(fn)` around it. `enterWith` binds the store
   * to the current async context instead: it stays bound to this request's
   * chain and is collected with it.
   */
  private openScope(ctx: TenantContext): boolean {
    tenantStore.enterWith(ctx);
    return true;
  }
}
