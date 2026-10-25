import { ForbiddenException } from '@nestjs/common';
import { Role } from '../role.enum';
import {
  getTenantContext,
  runAsPlatform,
  runWithTenant,
} from './tenant-context';

describe('tenant context', () => {
  it('is empty outside a request', () => {
    expect(getTenantContext()).toBeUndefined();
  });

  it('exposes the practice inside the scope', () => {
    runWithTenant(
      { practiceId: 'prc_1', userId: 'u1', role: Role.PRACTITIONER },
      () => {
        expect(getTenantContext()?.practiceId).toBe('prc_1');
      },
    );
  });

  it('does not leak out of the scope', () => {
    runWithTenant(
      { practiceId: 'prc_1', userId: 'u1', role: Role.PRACTITIONER },
      () => undefined,
    );
    expect(getTenantContext()).toBeUndefined();
  });

  it('survives an await', async () => {
    await runWithTenant(
      { practiceId: 'prc_1', userId: 'u1', role: Role.PRACTITIONER },
      async () => {
        await Promise.resolve();
        expect(getTenantContext()?.practiceId).toBe('prc_1');
      },
    );
  });

  it('keeps sibling scopes isolated', async () => {
    const seen: (string | null)[] = [];

    await Promise.all([
      runWithTenant(
        { practiceId: 'abc', userId: 'u1', role: Role.PRACTITIONER },
        async () => {
          await new Promise((r) => setTimeout(r, 5));
          seen.push(getTenantContext()?.practiceId ?? null);
        },
      ),
      runWithTenant(
        { practiceId: 'def', userId: 'u2', role: Role.PRACTITIONER },
        async () => {
          await Promise.resolve();
          seen.push(getTenantContext()?.practiceId ?? null);
        },
      ),
    ]);

    expect(seen.sort()).toEqual(['abc', 'def']);
  });

  describe('runAsPlatform', () => {
    it('sets the bypass flag for a super admin', () => {
      runAsPlatform({ role: Role.SUPER_ADMIN }, () => {
        expect(getTenantContext()?.bypass).toBe(true);
      });
    });

    it('refuses a practitioner', () => {
      expect(() =>
        runAsPlatform({ role: Role.PRACTITIONER }, () => undefined),
      ).toThrow(ForbiddenException);
    });

    it('refuses a practice admin — escalation must not be possible', () => {
      expect(() =>
        runAsPlatform({ role: Role.PRACTICE_ADMIN }, () => undefined),
      ).toThrow(ForbiddenException);
    });
  });
});
