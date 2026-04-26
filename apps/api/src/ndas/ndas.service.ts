import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class NdasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatService))
    private readonly chat: ChatService,
  ) {}

  async sign(userId: string, institutionId: string, ip: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });
    if (!institution) {
      throw new BadRequestException('Institution not found');
    }

    const nda = await this.prisma.nda.upsert({
      where: {
        userId_institutionId: {
          userId,
          institutionId,
        },
      },
      create: {
        userId,
        institutionId,
        status: 'APPROVED',
        signedAt: new Date(),
        ipAddress: ip,
      },
      update: {
        status: 'APPROVED',
        signedAt: new Date(),
        ipAddress: ip,
      },
    });

    try {
      const buyer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const buyerLabel = buyer?.name?.trim() || 'Buyer';
      const deals = await this.prisma.deal.findMany({
        where: {
          institutionId,
          requirement: { userId },
        },
        select: { id: true },
      });
      for (const d of deals) {
        await this.chat.createSystemMessageForDeal(
          d.id,
          `NDA signed by ${buyerLabel}`,
        );
      }
    } catch {
      // Non-blocking compliance side-channel
    }

    return nda;
  }
}
