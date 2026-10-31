import { BadRequestException, UnauthorizedException } from '@nestjs/common';

// The service only needs the schema classes as injection tokens; loading the
// real ones would compile their Mongoose decorators.
jest.mock('../patients/schemas/patient.schema', () => ({ Patient: class {} }));
jest.mock('../practitioners/schemas/practitioner.schema', () => ({
  Practitioner: class {},
}));
jest.mock('../platform-admins/schemas/platform-admin.schema', () => ({
  PlatformAdmin: class {},
}));
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Role } from '../common/role.enum';

/**
 * The platform console's password recovery: forgot-password emails a
 * temporary password that only takes over when used, and platform
 * passwords keep the 12-character minimum.
 */

const chain = <T>(value: T) => {
  const q = { select: () => q, exec: () => Promise.resolve(value) };
  return q;
};

async function setup(admin: Record<string, unknown> | null) {
  const updates: Record<string, unknown>[] = [];
  const platformAdminModel = {
    findOne: jest.fn(() => chain(admin)),
    findById: jest.fn(() => ({ select: () => Promise.resolve(admin) })),
    updateOne: jest.fn((_q: unknown, u: Record<string, unknown>) => {
      updates.push(u);
      return chain({});
    }),
  };
  const email = { send: jest.fn(() => Promise.resolve()), enabled: true };
  const jwt = { sign: jest.fn(() => 'jwt') };
  const service = new AuthService(
    {} as never,
    {} as never,
    platformAdminModel as never,
    jwt as never,
    email as never,
  );
  return { service, platformAdminModel, email, updates };
}

const hash = (p: string) => bcrypt.hash(p, 4);

describe('platform admin password recovery', () => {
  it('emails a temporary password without touching the current one', async () => {
    const admin = { _id: 'a1', name: 'Admin', isActive: true };
    const { service, email, updates } = await setup(admin);

    const res = await service.platformForgotPassword({ email: 'Admin@X.com ' });

    expect(res.message).toMatch(/If an account exists/);
    expect(res).not.toHaveProperty('devTempPassword');
    const set = (updates[0] as { $set: Record<string, unknown> }).$set;
    expect(set.resetPasswordHash).toEqual(expect.any(String));
    expect(set).not.toHaveProperty('password');
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@x.com' }),
    );
    const sent = (email.send.mock.calls[0] as unknown[])[0] as { text: string };
    expect(sent.text).toContain('/adminLogin');
  });

  it('gives the same answer for an unknown email and sends nothing', async () => {
    const { service, email, updates } = await setup(null);
    const res = await service.platformForgotPassword({ email: 'nobody@x.com' });
    expect(res.message).toMatch(/If an account exists/);
    expect(updates).toHaveLength(0);
    expect(email.send).not.toHaveBeenCalled();
  });

  it('signs in with the temporary password and forces a new one', async () => {
    const admin = {
      _id: 'a1',
      name: 'Admin',
      isActive: true,
      password: await hash('old-password-123'),
      resetPasswordHash: await hash('TEMP-pass-1'),
      resetPasswordExpiresAt: new Date(Date.now() + 60_000),
    };
    const { service, updates } = await setup(admin);

    const res = await service.platformLogin({ email: 'a@x.com', password: 'TEMP-pass-1' });

    expect(res.mustChangePassword).toBe(true);
    expect(updates[0]).toMatchObject({
      password: admin.resetPasswordHash,
      mustChangePassword: true,
      $unset: { resetPasswordHash: 1, resetPasswordExpiresAt: 1 },
    });
  });

  it('refuses an expired temporary password', async () => {
    const admin = {
      _id: 'a1',
      isActive: true,
      password: await hash('old-password-123'),
      resetPasswordHash: await hash('TEMP-pass-1'),
      resetPasswordExpiresAt: new Date(Date.now() - 1),
    };
    const { service } = await setup(admin);
    await expect(
      service.platformLogin({ email: 'a@x.com', password: 'TEMP-pass-1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('cancels a pending reset when the real password is used', async () => {
    const admin = {
      _id: 'a1',
      name: 'Admin',
      isActive: true,
      password: await hash('old-password-123'),
      resetPasswordHash: await hash('TEMP-pass-1'),
      resetPasswordExpiresAt: new Date(Date.now() + 60_000),
    };
    const { service, updates } = await setup(admin);

    const res = await service.platformLogin({ email: 'a@x.com', password: 'old-password-123' });

    expect(res.mustChangePassword).toBe(false);
    expect(updates[0]).toMatchObject({
      $unset: { resetPasswordHash: 1, resetPasswordExpiresAt: 1 },
    });
    expect(updates[0]).not.toHaveProperty('password');
  });

  it('keeps the 12-character minimum for platform passwords', async () => {
    const { service } = await setup({ _id: 'a1' });
    await expect(
      service.changePassword('a1', Role.SUPER_ADMIN, {
        currentPassword: 'x',
        newPassword: 'Short@2010',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('changes the password when the current one is right', async () => {
    const admin = {
      _id: 'a1',
      password: await hash('old-password-123'),
      mustChangePassword: false,
      save: jest.fn(() => Promise.resolve()),
    };
    const { service } = await setup(admin);

    await service.changePassword('a1', Role.SUPER_ADMIN, {
      currentPassword: 'old-password-123',
      newPassword: 'Brand-New@Pass2026',
    });

    expect(admin.save).toHaveBeenCalled();
    expect(await bcrypt.compare('Brand-New@Pass2026', admin.password)).toBe(true);
  });
});
