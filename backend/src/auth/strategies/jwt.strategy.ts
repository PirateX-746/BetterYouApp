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

/** Claims we sign into the session token (see AuthService). */
interface JwtPayload {
  sub: string;
  role: Role;
  practiceId?: string | null;
}

/** The fields validate() selects, common to all three account collections. */
interface AccountRecord {
  role: Role;
  isActive?: boolean;
  practiceId?: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,

    @InjectModel(Patient.name)
    private readonly patientModel: Model<Patient>,

    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,

    @InjectModel(PlatformAdmin.name)
    private readonly platformAdminModel: Model<PlatformAdmin>,
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

  override async validate(payload: JwtPayload) {
    const { sub: id, role, practiceId } = payload;

    // Three collections, one per kind of account. A platform admin is not a
    // practitioner, so it gets its own branch rather than being folded in.
    let model: Model<Patient> | Model<Practitioner> | Model<PlatformAdmin>;
    if (role === Role.SUPER_ADMIN) {
      model = this.platformAdminModel;
    } else if (role === Role.PATIENT) {
      model = this.patientModel;
    } else {
      model = this.practitionerModel;
    }

    const user = await (model as Model<unknown>)
      .findById(id)
      .select('_id role isActive practiceId')
      .lean<AccountRecord>()
      .exec();

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    if (user.isActive === false) {
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
          : (user.practiceId?.toString() ?? practiceId ?? null),
    };
  }
}
