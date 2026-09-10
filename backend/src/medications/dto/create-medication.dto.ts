import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class CreateMedicationDto {
  @IsMongoId()
  practitionerId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
