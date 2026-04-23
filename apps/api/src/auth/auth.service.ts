import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UserRole } from '@prisma/client';

function normalizePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return d.slice(-10);
  if (d.length === 11 && d.startsWith('0')) return d.slice(1);
  if (d.length === 10) return d;
  throw new UnauthorizedException('Invalid phone number');
}

function phoneHash(phone: string): string {
  return createHash('sha256').update(normalizePhone(phone)).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async requestOtp(phone: string) {
    const hash = phoneHash(phone);
    const otp =
      this.config.get<string>('OTP_DEV_MODE') === 'true'
        ? '123456'
        : String(randomInt(100000, 999999));
    await this.redis.redis.setex(`otp:${hash}`, 600, otp);
    if (this.config.get<string>('OTP_DEV_MODE') === 'true') {
      // eslint-disable-next-line no-console
      console.log(`[OTP DEV] ${normalizePhone(phone)} -> ${otp}`);
    }
    return { ok: true, message: 'OTP sent' };
  }

  async verifyOtp(phone: string, otp: string, role: UserRole = UserRole.BUYER) {
    const hash = phoneHash(phone);
    const key = `otp:${hash}`;
    const expected = await this.redis.redis.get(key);
    if (!expected || expected !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }
    await this.redis.redis.del(key);

    let user = await this.prisma.user.findUnique({ where: { phoneHash: hash } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phoneHash: hash, phoneEnc: null, role },
      });
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      phoneHash: user.phoneHash,
      role: user.role,
    });

    return {
      accessToken: token,
      user: { id: user.id, role: user.role },
    };
  }

  phoneHashFromRaw(phone: string): string {
    return phoneHash(phone);
  }
}
