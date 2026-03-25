import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient } from '../../patients/schemas/patient.schema';
import { Practitioner } from '../../practitioners/schemas/practitioner.schema';
import { Role } from '../../common/role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,

    @InjectModel(Patient.name)
    private readonly patientModel: Model<any>,

    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<any>,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not defined');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  override async validate(payload: any) {
    const { sub: id, role } = payload;

    const model: Model<any> =
      role === Role.PRACTITIONER ? this.practitionerModel : this.patientModel;

    const user = await model
      .findById(id)
      .select('_id role isActive')
      .lean()
      .exec();

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    if ('isActive' in user && !user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return {
      userId: id,
      role: user.role,
    };
  }
}
