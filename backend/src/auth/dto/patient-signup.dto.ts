import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
  IsIn,
  Matches,
  MinLength,
} from "class-validator";

export class CreatePatientDto {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: "Password must contain 1 uppercase letter" })
  @Matches(/[0-9]/, { message: "Password must contain 1 number" })
  @Matches(/[!@#$%^&*]/, { message: "Password must contain 1 special character" })
  password: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: "Invalid Indian phone number",
  })
  phoneNo: string;

  @IsIn(["Male", "Female", "Other"])
  gender: string;

  @IsIn(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"])
  bloodGroup: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  healthCondition?: string;
}