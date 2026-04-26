import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, InvoiceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeeService {
  private readonly logger = new Logger(FeeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Deal value in paise: valueInr, else property.price, else institution asking (cr → INR → paise). */
  private dealValuePaise(deal: {
    valueInr: Prisma.Decimal | null;
    property: { price: Prisma.Decimal } | null;
    institution: { askingPriceCr: Prisma.Decimal } | null;
  }): number {
    if (deal.valueInr != null) {
      return Math.round(Number(deal.valueInr) * 100);
    }
    if (deal.property?.price != null) {
      return Math.round(Number(deal.property.price) * 100);
    }
    if (deal.institution?.askingPriceCr != null) {
      const inr = Number(deal.institution.askingPriceCr) * 10_000_000;
      return Math.round(inr * 100);
    }
    return 0;
  }

  /**
   * Creates a DRAFT platform fee invoice for the broker when a deal reaches CLOSURE.
   * Safe to call from orchestration — logs and swallows errors.
   */
  async createClosurePlatformFeeInvoice(
    dealId: string,
    brokerUserId: string,
  ): Promise<void> {
    try {
      const pctRaw = this.config.get<string>('PLATFORM_FEE_PERCENT', '0.3');
      const feePercent = Number.parseFloat(pctRaw);
      if (!Number.isFinite(feePercent) || feePercent < 0) {
        this.logger.warn(`Invalid PLATFORM_FEE_PERCENT=${pctRaw}, skipping fee invoice`);
        return;
      }

      const deal = await this.prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          property: { select: { price: true, title: true } },
          institution: { select: { askingPriceCr: true, institutionName: true } },
        },
      });
      if (!deal) {
        this.logger.warn(`Closure fee: deal ${dealId} not found`);
        return;
      }

      const valuePaise = this.dealValuePaise(deal);
      if (valuePaise <= 0) {
        this.logger.warn(`Closure fee: deal ${dealId} has no computable value, skipping`);
        return;
      }

      const feePaise = Math.round(valuePaise * (feePercent / 100));
      if (feePaise <= 0) {
        this.logger.warn(`Closure fee: computed fee is zero for deal ${dealId}`);
        return;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const lineItems = [
        {
          description: `Platform facilitation fee (${feePercent}% of deal value)`,
          dealValuePaise: valuePaise,
          feePercent,
          feePaise,
          dealId,
        },
      ];

      await this.prisma.invoice.create({
        data: {
          userId: brokerUserId,
          type: InvoiceType.PLATFORM_FEE,
          amountPaise: feePaise,
          status: InvoiceStatus.DRAFT,
          dueDate,
          lineItems,
          dealId,
        },
      });
    } catch (e) {
      this.logger.warn(
        `Closure platform fee invoice failed for deal ${dealId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
