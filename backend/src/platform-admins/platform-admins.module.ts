import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlatformAdmin,
  PlatformAdminSchema,
} from './schemas/platform-admin.schema';

/**
 * Schema registration only for now. The platform sign-in path and the
 * Super Admin APIs are the next slice; this exists so JwtStrategy can gain
 * its third branch and the migration can seed a platform account.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformAdmin.name, schema: PlatformAdminSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class PlatformAdminsModule {}
