import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
};

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private client: Razorpay | null = null;

  constructor(private readonly config: ConfigService) {}

  private getKeyId(): string {
    return this.config.get<string>('RAZORPAY_KEY_ID', '').trim();
  }

  private getKeySecret(): string {
    return this.config.get<string>('RAZORPAY_KEY_SECRET', '').trim();
  }

  private getWebhookSecret(): string {
    return this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', '').trim();
  }

  private ensureClient(): Razorpay {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException('Billing is not configured');
    }
    if (!this.client) {
      this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return this.client;
  }

  getPublishableKeyId(): string {
    return this.getKeyId();
  }

  async fetchOrder(orderId: string): Promise<{ notes?: Record<string, string> }> {
    try {
      return (await this.ensureClient().orders.fetch(orderId)) as {
        notes?: Record<string, string>;
      };
    } catch (e) {
      this.logger.error('Razorpay fetchOrder failed', e);
      throw new BadRequestException('Unable to load order');
    }
  }

  async createOrder(
    amountPaise: number,
    currency: string,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<RazorpayOrder> {
    try {
      const order = (await this.ensureClient().orders.create({
        amount: amountPaise,
        currency,
        receipt,
        notes: notes ?? {},
      })) as RazorpayOrder;
      return order;
    } catch (e) {
      this.logger.error('Razorpay createOrder failed', e);
      throw new BadRequestException('Unable to create payment order');
    }
  }

  async createCustomer(
    name: string,
    contact: string,
    email: string | undefined,
  ): Promise<{ id: string }> {
    try {
      const customer = (await this.ensureClient().customers.create({
        name: name || 'Customer',
        contact: contact || '0000000000',
        email: email || undefined,
      })) as { id: string };
      return customer;
    } catch (e) {
      this.logger.error('Razorpay createCustomer failed', e);
      throw new BadRequestException('Unable to create customer profile');
    }
  }

  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const secret = this.getKeySecret();
    if (!secret || !signature) return false;
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    const secret = this.getWebhookSecret();
    if (!secret || !signatureHeader) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  async refundPayment(
    paymentId: string,
    amountPaise: number | undefined,
    notes?: Record<string, string>,
  ): Promise<unknown> {
    try {
      const payload: { amount?: number; notes?: Record<string, string> } = {
        notes: notes ?? {},
      };
      if (amountPaise != null) payload.amount = amountPaise;
      return await this.ensureClient().payments.refund(paymentId, payload);
    } catch (e) {
      this.logger.error('Razorpay refundPayment failed', e);
      throw new BadRequestException('Unable to process refund');
    }
  }
}
