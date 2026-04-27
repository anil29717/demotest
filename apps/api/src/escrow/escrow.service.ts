import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  EscrowStatus,
  EscrowTransactionType,
  UserRole,
} from '@prisma/client';
import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../billing/razorpay.service';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    @Inject(forwardRef(() => ChatService))
    private readonly chat: ChatService,
  ) {}

  private async loadDeal(dealId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        requirement: { select: { userId: true } },
        property: { select: { postedById: true } },
        institution: { select: { postedById: true } },
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  private beneficiaryId(deal: {
    property: { postedById: string } | null;
    institution: { postedById: string } | null;
  }): string {
    if (deal.property) return deal.property.postedById;
    if (deal.institution) return deal.institution.postedById;
    throw new BadRequestException('Deal has no seller (property or institution)');
  }

  private async assertDealAccess(dealId: string, userId: string) {
    const deal = await this.loadDeal(dealId);
    if (deal.requirement.userId === userId) return deal;
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId },
    });
    if (!member) throw new ForbiddenException('No access to this deal');
    return deal;
  }

  async initiateEscrow(dealId: string, amountRupees: number, buyerUserId: string) {
    const deal = await this.loadDeal(dealId);
    if (deal.requirement.userId !== buyerUserId) {
      throw new ForbiddenException('Only the buyer can initiate escrow for this deal');
    }
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      throw new BadRequestException('Invalid amount');
    }
    const amountPaise = Math.round(amountRupees * 100);
    const beneficiaryId = this.beneficiaryId(deal);

    const existing = await this.prisma.escrowAccount.findUnique({
      where: { dealId },
    });
    if (existing?.status === EscrowStatus.HELD) {
      throw new BadRequestException('Escrow is already held for this deal');
    }
    if (existing?.status === EscrowStatus.PENDING_PAYOUT) {
      throw new BadRequestException(
        'Escrow payout is pending admin confirmation',
      );
    }
    if (
      existing &&
      existing.status !== EscrowStatus.INITIATED
    ) {
      throw new BadRequestException('Escrow already completed for this deal');
    }

    const receipt = `esc_${dealId.slice(0, 8)}_${Date.now()}`;
    const order = await this.razorpay.createOrder(amountPaise, 'INR', receipt, {
      dealId,
      purpose: 'escrow_token',
    });

    const row =
      existing?.status === EscrowStatus.INITIATED
        ? await this.prisma.escrowAccount.update({
            where: { id: existing.id },
            data: {
              amountPaise,
              razorpayOrderId: order.id,
              beneficiaryId,
              holderId: buyerUserId,
            },
          })
        : await this.prisma.escrowAccount.create({
            data: {
              dealId,
              amountPaise,
              status: EscrowStatus.INITIATED,
              holderId: buyerUserId,
              beneficiaryId,
              razorpayOrderId: order.id,
            },
          });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: this.razorpay.getPublishableKeyId(),
      escrowId: row.id,
    };
  }

  async confirmEscrowPayment(
    dealId: string,
    orderId: string,
    paymentId: string,
    signature: string,
    buyerUserId: string,
  ) {
    if (!this.razorpay.verifyPaymentSignature(orderId, paymentId, signature)) {
      throw new BadRequestException('Invalid payment signature');
    }

    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!escrow || escrow.dealId !== dealId) {
      throw new NotFoundException('Escrow order not found for this deal');
    }
    if (escrow.holderId !== buyerUserId) {
      throw new ForbiddenException('Only the buyer can confirm this escrow payment');
    }
    if (escrow.status === EscrowStatus.HELD) {
      return { ok: true, status: escrow.status, idempotent: true };
    }
    if (escrow.status !== EscrowStatus.INITIATED) {
      throw new BadRequestException('Escrow cannot be confirmed in its current state');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.escrowAccount.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.HELD,
          heldAt: now,
          razorpayPaymentId: paymentId,
        },
      }),
      this.prisma.escrowTransaction.create({
        data: {
          escrowAccountId: escrow.id,
          type: EscrowTransactionType.HOLD,
          amountPaise: escrow.amountPaise,
          fromUserId: escrow.holderId,
          toUserId: escrow.beneficiaryId,
          razorpayId: paymentId,
          notes: 'Buyer token held',
        },
      }),
    ]);

    try {
      const rupees = escrow.amountPaise / 100;
      const formatted = new Intl.NumberFormat('en-IN').format(rupees);
      await this.chat.createSystemMessageForDeal(
        dealId,
        `Token payment of ₹${formatted} held in escrow`,
      );
    } catch {
      // Non-blocking
    }

    return { ok: true, status: EscrowStatus.HELD };
  }

  async releaseEscrow(dealId: string, releasedByUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: releasedByUserId },
      select: { role: true },
    });
    if (
      user?.role !== UserRole.ADMIN &&
      user?.role !== UserRole.BROKER
    ) {
      throw new ForbiddenException('Only admin or broker can release escrow');
    }
    if (user.role === UserRole.BROKER) {
      const deal = await this.loadDeal(dealId);
      const member = await this.prisma.organizationMember.findFirst({
        where: { organizationId: deal.organizationId, userId: releasedByUserId },
      });
      if (!member) throw new ForbiddenException('Broker is not on this deal organization');
    }

    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { dealId },
    });
    if (!escrow) throw new NotFoundException('No escrow for this deal');
    if (escrow.status !== EscrowStatus.HELD) {
      throw new BadRequestException('Escrow must be HELD to request release');
    }

    const now = new Date();
    const updated = await this.prisma.escrowAccount.update({
      where: { id: escrow.id },
      data: {
        status: EscrowStatus.PENDING_PAYOUT,
        pendingPayoutAt: now,
        payoutReference: null,
      },
    });

    await this.notifyAdminsEscrowPayoutPending(dealId, escrow.amountPaise);

    try {
      const rupees = escrow.amountPaise / 100;
      const formatted = new Intl.NumberFormat('en-IN').format(rupees);
      await this.chat.createSystemMessageForDeal(
        dealId,
        `Seller payout requested — transfer ₹${formatted} manually, then admin confirms reference.`,
      );
    } catch {
      // non-blocking
    }

    return { ok: true, status: updated.status };
  }

  /** Admin confirms manual bank/Razorpay payout after broker requested release (Option B). */
  async confirmManualPayout(
    dealId: string,
    adminUserId: string,
    payoutReference: string,
  ) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    });
    if (admin?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin only');
    }
    const ref = payoutReference.trim();
    if (!ref) throw new BadRequestException('payoutReference required');

    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { dealId },
    });
    if (!escrow) throw new NotFoundException('No escrow for this deal');
    if (escrow.status !== EscrowStatus.PENDING_PAYOUT) {
      throw new BadRequestException(
        'Escrow must be PENDING_PAYOUT to confirm payout',
      );
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.escrowAccount.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.RELEASED,
          releasedAt: now,
          payoutReference: ref,
        },
      }),
      this.prisma.escrowTransaction.create({
        data: {
          escrowAccountId: escrow.id,
          type: EscrowTransactionType.RELEASE,
          amountPaise: escrow.amountPaise,
          fromUserId: adminUserId,
          toUserId: escrow.beneficiaryId,
          notes: `Manual payout confirmed · ref: ${ref}`,
        },
      }),
    ]);

    return { ok: true, status: EscrowStatus.RELEASED };
  }

  async listEscrowsForAdmin(opts?: { status?: EscrowStatus }) {
    return this.prisma.escrowAccount.findMany({
      where: opts?.status ? { status: opts.status } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        deal: {
          select: {
            id: true,
            stage: true,
            requirement: {
              select: { userId: true, city: true },
            },
          },
        },
        holder: { select: { id: true, name: true } },
        beneficiary: { select: { id: true, name: true } },
      },
    });
  }

  private async notifyAdminsEscrowPayoutPending(
    dealId: string,
    amountPaise: number,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    const rupees = amountPaise / 100;
    const formatted = new Intl.NumberFormat('en-IN').format(rupees);
    const short = dealId.slice(0, 8);
    for (const a of admins) {
      await this.prisma.notification.create({
        data: {
          userId: a.id,
          channel: 'in_app',
          title: 'Escrow payout required',
          body: `Deal ${short}… — pay seller ₹${formatted} outside the app, then confirm reference under Admin → Escrow.`,
        },
      });
    }
  }

  async refundEscrow(dealId: string, reason: string) {
    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { dealId },
    });
    if (!escrow) throw new NotFoundException('No escrow for this deal');
    if (escrow.status !== EscrowStatus.HELD && escrow.status !== EscrowStatus.FROZEN) {
      throw new BadRequestException('Escrow must be HELD or FROZEN to refund');
    }
    if (!escrow.razorpayPaymentId) {
      throw new BadRequestException('No Razorpay payment id on escrow');
    }

    try {
      await this.razorpay.refundPayment(escrow.razorpayPaymentId, escrow.amountPaise, {
        reason,
        dealId,
      });
    } catch (e) {
      this.logger.error('Escrow refund Razorpay call failed', e);
      throw e;
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.escrowAccount.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.REFUNDED, refundedAt: now },
      }),
      this.prisma.escrowTransaction.create({
        data: {
          escrowAccountId: escrow.id,
          type: EscrowTransactionType.REFUND,
          amountPaise: escrow.amountPaise,
          razorpayId: escrow.razorpayPaymentId,
          notes: reason,
        },
      }),
    ]);

    return { ok: true, status: EscrowStatus.REFUNDED };
  }

  async freezeEscrow(dealId: string) {
    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { dealId },
    });
    if (!escrow) throw new NotFoundException('No escrow for this deal');
    if (escrow.status !== EscrowStatus.HELD) {
      throw new BadRequestException('Only HELD escrow can be frozen');
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.escrowAccount.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.FROZEN, frozenAt: now },
      }),
      this.prisma.escrowTransaction.create({
        data: {
          escrowAccountId: escrow.id,
          type: EscrowTransactionType.FREEZE,
          amountPaise: escrow.amountPaise,
          notes: 'Dispute freeze',
        },
      }),
    ]);
    return { ok: true, status: EscrowStatus.FROZEN };
  }

  async getEscrowStatus(dealId: string, userId: string) {
    await this.assertDealAccess(dealId, userId);
    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { dealId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!escrow) return { exists: false as const };
    return {
      exists: true as const,
      account: {
        id: escrow.id,
        dealId: escrow.dealId,
        amountPaise: escrow.amountPaise,
        currency: escrow.currency,
        status: escrow.status,
        heldAt: escrow.heldAt,
        releasedAt: escrow.releasedAt,
        refundedAt: escrow.refundedAt,
        frozenAt: escrow.frozenAt,
        pendingPayoutAt: escrow.pendingPayoutAt,
        payoutReference: escrow.payoutReference,
        holderId: escrow.holderId,
        beneficiaryId: escrow.beneficiaryId,
      },
      transactions: escrow.transactions,
    };
  }
}
