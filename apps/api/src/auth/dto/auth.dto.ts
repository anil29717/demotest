import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class LoginDto {
  @IsString()
  @Matches(/^[0-9+\s-]{10,15}$/)
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^[0-9+\s-]{10,15}$/)
  phone!: string;

  @IsString()
  @Length(4, 8)
  otp!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

/** One-shot demo login; only active when API env DEMO_LOGIN=true */
export class DevLoginDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
