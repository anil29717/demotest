import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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

const SELF_SIGNUP_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.BROKER,
  UserRole.BUYER,
  UserRole.SELLER,
  UserRole.NRI,
  UserRole.HNI,
  UserRole.BUILDER,
  UserRole.INSTITUTIONAL_BUYER,
  UserRole.INSTITUTIONAL_SELLER,
]);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private resolveSignupRole(role?: UserRole): UserRole {
    if (!role) return UserRole.BUYER;
    return SELF_SIGNUP_ROLES.has(role) ? role : UserRole.BUYER;
  }

  async requestOtp(phone: string) {
    const hash = phoneHash(phone);
    if (this.redis.redis.status === 'wait') {
      await this.redis.redis.connect();
    }
    const otp =
      this.config.get<string>('OTP_DEV_MODE') === 'true'
        ? '123456'
        : String(randomInt(100000, 999999));
    await this.redis.redis.setex(`otp:${hash}`, 600, otp);
    if (this.config.get<string>('OTP_DEV_MODE') === 'true') {
      console.log(`[OTP DEV] ${normalizePhone(phone)} -> ${otp}`);
    }
    return { ok: true, message: 'OTP sent' };
  }

  async verifyOtp(phone: string, otp: string, role?: UserRole) {
    const hash = phoneHash(phone);
    const key = `otp:${hash}`;
    if (this.redis.redis.status === 'wait') {
      await this.redis.redis.connect();
    }
    const expected = await this.redis.redis.get(key);
    if (!expected || expected !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }
    await this.redis.redis.del(key);

    let user = await this.prisma.user.findUnique({
      where: { phoneHash: hash },
    });
    if (!user) {
      const signupRole = this.resolveSignupRole(role);
      user = await this.prisma.user.create({
        data: { phoneHash: hash, phoneEnc: null, role: signupRole },
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

  /** Resolve a platform user from Meta WhatsApp `from` (digits, often with country code). */
  async findUserIdByWaSender(waFrom: string | null): Promise<string | null> {
    if (!waFrom) return null;
    const d = waFrom.replace(/\D/g, '');
    const candidates = new Set<string>();
    if (d.length >= 10) candidates.add(d.slice(-10));
    if (d.length >= 12 && d.startsWith('91')) candidates.add(d.slice(-10));
    for (const digits of candidates) {
      try {
        const hash = phoneHash(digits);
        const u = await this.prisma.user.findUnique({
          where: { phoneHash: hash },
          select: { id: true },
        });
        if (u) return u.id;
      } catch {
        // normalizePhone may reject pattern
      }
    }
    return null;
  }

  /**
   * Deterministic demo users so each role maps to a stable account
   * with human-readable identity data (name/email/phone).
   * Only enabled when DEMO_LOGIN=true (never enable in production).
   */
  async devLogin(role: UserRole) {
    if (this.config.get<string>('DEMO_LOGIN') !== 'true') {
      throw new ForbiddenException('Demo login is disabled');
    }

    const roleToDemo: Record<
      UserRole,
      { phone: string; name: string; email: string }
    > = {
      [UserRole.BROKER]: {
        phone: '9990000001',
        name: 'Arun Broker',
        email: 'broker.demo@arbuildwel.local',
      },
      [UserRole.BUYER]: {
        phone: '9990000002',
        name: 'Bhavna Buyer',
        email: 'buyer.demo@arbuildwel.local',
      },
      [UserRole.SELLER]: {
        phone: '9990000003',
        name: 'Suresh Seller',
        email: 'seller.demo@arbuildwel.local',
      },
      [UserRole.NRI]: {
        phone: '9990000004',
        name: 'Neha NRI',
        email: 'nri.demo@arbuildwel.local',
      },
      [UserRole.HNI]: {
        phone: '9990000005',
        name: 'Harsh HNI',
        email: 'hni.demo@arbuildwel.local',
      },
      [UserRole.BUILDER]: {
        phone: '9990000006',
        name: 'Bharat Builder',
        email: 'builder.demo@arbuildwel.local',
      },
      [UserRole.INSTITUTIONAL_SELLER]: {
        phone: '9990000007',
        name: 'Institution Seller',
        email: 'inst.seller.demo@arbuildwel.local',
      },
      [UserRole.INSTITUTIONAL_BUYER]: {
        phone: '9990000008',
        name: 'Institution Buyer',
        email: 'inst.buyer.demo@arbuildwel.local',
      },
      [UserRole.ADMIN]: {
        phone: '9990000009',
        name: 'Admin User',
        email: 'admin.demo@arbuildwel.local',
      },
    };

    const demo = roleToDemo[role];
    const phone = demo.phone;
    const hash = phoneHash(phone);

    const user = await this.prisma.user.upsert({
      where: { phoneHash: hash },
      create: {
        phoneHash: hash,
        phoneEnc: phone,
        name: demo.name,
        email: demo.email,
        role,
        verified: true,
      },
      update: {
        phoneEnc: phone,
        name: demo.name,
        email: demo.email,
        role,
        verified: true,
      },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      phoneHash: user.phoneHash,
      role: user.role,
    });

    return {
      accessToken,
      user: { id: user.id, role: user.role },
    };
  }
}
