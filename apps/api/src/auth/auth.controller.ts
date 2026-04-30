import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { DevLoginDto, LoginDto, VerifyOtpDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('verify-otp')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.otp, dto.role);
  }

  @Post('dev-login')
  devLogin(@Body() dto: DevLoginDto) {
    return this.auth.devLogin(dto.role);
  }
}
