import { PartialType } from '@nestjs/mapped-types';
import { CreateAppointmentTypeDto } from './create-appointment-type.dto';

export class UpdateAppointmentTypeDto extends PartialType(CreateAppointmentTypeDto) {}
