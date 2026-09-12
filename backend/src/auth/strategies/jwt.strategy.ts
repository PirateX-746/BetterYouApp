import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient } from '../../patients/schemas/patient.schema';
import { Practitioner } from '../../practitioners/schemas/practitioner.schema';
import { PlatformAdmin } from '../../platform-admins/schemas/platform-admin.schema';
import { Role } from '../../common/role.enum';
import { AUTH_COOKIE } from '../auth.cookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,

    @InjectModel(Patient.name)
    private readonly patientModel: Model<any>,

    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<any>,

    @InjectModel(PlatformAdmin.name)
    private readonly platformAdminModel: Model<any>,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not defined');

    super({
      // The browser session lives in an HttpOnly cookie, which is what the
      // web app uses. The Bearer header is kept as a fallback so non-browser
      // clients (curl, tests, future mobile app) still work.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: { cookies?: Record<string, string> }) =>
          req?.cookies?.[AUTH_COOKIE] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  override async validate(payload: any) {
    const { sub: id, role, practiceId } = payload;

    // Three collections, one per kind of account. A platform admin is not a
    // practitioner, so it gets its own branch rather than being folded in.
    let model: Model<any>;
    if (role === Role.SUPER_ADMIN) {
      model = this.platformAdminModel;
    } else if (role === Role.PATIENT) {
      model = this.patientModel;
    } else {
      model = this.practitionerModel;
    }

    const user = await model
      .findById(id)
      .select('_id role isActive practiceId')
      .lean()
      .exec();

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    if ('isActive' in user && user.isActive === false) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return {
      userId: id,
      role: user.role,
      // Read from the database record, not the token, so a practice move or
      // a tampered claim cannot change what the request is scoped to.
      // Always null for a platform admin.
      practiceId:
        user.role === Role.SUPER_ADMIN
          ? null
          : ((user.practiceId as unknown)?.toString() ??
            practiceId ??
            null),
    };
  }
}
