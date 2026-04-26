import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingInterval,
  EscrowStatus,
  EscrowTransactionType,
  InvoiceStatus,
  InvoiceType,
  PaymentStatus,
  PaymentType,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BILLING_PLANS,
  getPlanById,
  monthlyAmountPaise,
  type BillingPlanId,
} from './billing-plans.config';
import { RazorpayService } from './razorpay.service';

export type CheckoutInterval = 'monthly' | 'annual';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

  async getPlans(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const active = await this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    const recommended = BILLING_PLANS.find((p) => p.eligibleRoles.includes(user.role));

    const plans = BILLING_PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      annualAmountPaise: p.annualAmountPaise,
      monthlyAmountPaise: monthlyAmountPaise(p),
      features: p.features,
      eligible: p.eligibleRoles.includes(user.role),
      recommended: recommended?.id === p.id,
      active: active?.planName === p.id,
    }));

    return {
      plans,
      activeSubscription: active
        ? {
            id: active.id,
            planName: active.planName as BillingPlanId,
            status: active.status,
            currentPeriodStart: active.currentPeriodStart,
            currentPeriodEnd: active.currentPeriodEnd,
            amountPaise: active.amountPaise,
            interval: active.interval,
          }
        : null,
      razorpayKeyId: this.razorpay.getPublishableKeyId() || null,
    };
  }

  async createCheckoutSession(
    userId: string,
    planId: string,
    interval: CheckoutInterval,
  ) {
    const plan = getPlanById(planId);
    if (!plan) throw new BadRequestException('Unknown plan');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!plan.eligibleRoles.includes(user.role)) {
      throw new ForbiddenException('This plan is not available for your role');
    }

    const amountPaise =
      interval === 'annual' ? plan.annualAmountPaise : monthlyAmountPaise(plan);

    let customerId = user.razorpayCustomerId;
    if (!customerId) {
      const contact = user.phoneEnc?.replace(/\D/g, '').slice(-10) || '9999999999';
      const customer = await this.razorpay.createCustomer(
        user.name ?? 'User',
        contact,
        user.email ?? undefined,
      );
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { razorpayCustomerId: customerId },
      });
    }

    const receipt = `sub_${userId.slice(0, 8)}_${Date.now()}`;
    const order = await this.razorpay.createOrder(amountPaise, 'INR', receipt, {
      userId,
      planId: plan.id,
      interval,
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        type: PaymentType.SUBSCRIPTION,
        amountPaise,
        status: PaymentStatus.CREATED,
        razorpayOrderId: order.id,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: this.razorpay.getPublishableKeyId(),
      paymentId: payment.id,
      prefill: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        contact: user.phoneEnc?.replace(/\D/g, '').slice(-10),
      },
    };
  }

  async verifyAndActivate(
    orderId: string,
    paymentId: string,
    signature: string,
    userId: string,
  ) {
    if (!this.razorpay.verifyPaymentSignature(orderId, paymentId, signature)) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId: orderId, userId },
    });
    if (!payment) throw new NotFoundException('Payment not found for this order');
    if (payment.type !== PaymentType.SUBSCRIPTION) {
      throw new BadRequestException('This verification endpoint is for subscriptions only');
    }

    if (payment.subscriptionId) {
      const existing = await this.prisma.subscription.findUnique({
        where: { id: payment.subscriptionId },
      });
      if (existing) {
        return {
          success: true,
          subscription: {
            id: existing.id,
            planName: existing.planName,
            status: existing.status,
            currentPeriodEnd: existing.currentPeriodEnd,
            interval: existing.interval,
          },
        };
      }
    }

    const order = await this.razorpay.fetchOrder(orderId);
    const planId = order.notes?.planId;
    const intervalRaw = order.notes?.interval as CheckoutInterval | undefined;
    if (!planId || !intervalRaw) {
      throw new BadRequestException('Order metadata missing');
    }
    const plan = getPlanById(planId);
    if (!plan) throw new BadRequestException('Invalid plan on order');

    const billingInterval: BillingInterval =
      intervalRaw === 'monthly' ? BillingInterval.MONTHLY : BillingInterval.YEARLY;

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingInterval === BillingInterval.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CAPTURED,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      });

      await tx.subscription.updateMany({
        where: { userId, status: SubscriptionStatus.ACTIVE },
        data: { status: SubscriptionStatus.CANCELLED, cancelledAt: now },
      });

      const subscription = await tx.subscription.create({
        data: {
          userId,
          planName: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          amountPaise: payment.amountPaise,
          interval: billingInterval,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id },
      });

      const lineItems = [
        { description: `${plan.name} subscription`, amountPaise: payment.amountPaise },
        { description: 'Billing interval', value: billingInterval },
      ];

      const invoice = await tx.invoice.create({
        data: {
          userId,
          type: InvoiceType.SUBSCRIPTION,
          amountPaise: payment.amountPaise,
          status: InvoiceStatus.PAID,
          paidAt: now,
          lineItems,
          paymentId: payment.id,
        },
      });

      return { subscription, invoice };
    });

    return {
      success: true,
      subscription: {
        id: result.subscription.id,
        planName: result.subscription.planName,
        status: result.subscription.status,
        currentPeriodEnd: result.subscription.currentPeriodEnd,
        interval: result.subscription.interval,
      },
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Razorpay webhook signature verification failed');
      return { received: true };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      this.logger.warn('Razorpay webhook: invalid JSON');
      return { received: true };
    }

    const event = String(payload.event ?? '');
    try {
      if (event === 'payment.captured') {
        await this.onPaymentCaptured(payload);
      } else if (event === 'payment.failed') {
        await this.onPaymentFailed(payload);
      } else if (event === 'subscription.cancelled') {
        await this.onSubscriptionCancelled(payload);
      }
    } catch (e) {
      this.logger.warn(`Webhook handler error for ${event}: ${e instanceof Error ? e.message : e}`);
    }
    return { received: true };
  }

  private async onPaymentCaptured(body: Record<string, unknown>) {
    const pay = (body.payload as { payment?: { entity?: Record<string, string> } })?.payment
      ?.entity;
    if (!pay) return;
    const orderId = pay.order_id as string | undefined;
    const paymentId = pay.id as string | undefined;
    if (!orderId || !paymentId) return;

    const existing = await this.prisma.payment.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (existing && existing.status !== PaymentStatus.CAPTURED) {
      await this.prisma.payment.update({
        where: { id: existing.id },
        data: { status: PaymentStatus.CAPTURED, razorpayPaymentId: paymentId },
      });
    }

    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (escrow && escrow.status === EscrowStatus.INITIATED) {
      await this.prisma.escrowAccount.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.HELD,
          heldAt: new Date(),
          razorpayPaymentId: paymentId,
        },
      });
      await this.prisma.escrowTransaction.create({
        data: {
          escrowAccountId: escrow.id,
          type: EscrowTransactionType.HOLD,
          amountPaise: escrow.amountPaise,
          fromUserId: escrow.holderId,
          toUserId: escrow.beneficiaryId,
          razorpayId: paymentId,
          notes: 'Funds held (webhook)',
        },
      });
    }
  }

  private async onPaymentFailed(body: Record<string, unknown>) {
    const pay = (body.payload as { payment?: { entity?: Record<string, string> } })?.payment
      ?.entity;
    const orderId = pay?.order_id as string | undefined;
    if (!orderId) return;
    await this.prisma.payment.updateMany({
      where: { razorpayOrderId: orderId, status: PaymentStatus.CREATED },
      data: { status: PaymentStatus.FAILED },
    });
  }

  private async onSubscriptionCancelled(body: Record<string, unknown>) {
    const sub = (body.payload as { subscription?: { entity?: { id?: string } } })?.subscription
      ?.entity;
    const rzId = sub?.id;
    if (!rzId) return;
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId: rzId },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  async cancelSubscription(userId: string) {
    const active = await this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (!active) return { cancelled: false };
    await this.prisma.subscription.update({
      where: { id: active.id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
    return { cancelled: true, subscriptionId: active.id };
  }

  async getCurrentSubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
    return sub;
  }

  async getInvoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
