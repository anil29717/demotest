import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly prisma: PrismaService) {}

  async downloadImage(url: string): Promise<Buffer> {
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 10_000,
    });
    return Buffer.from(res.data);
  }

  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    try {
      const Tesseract = await import('tesseract.js');
      const out = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: () => undefined,
      });
      return out.data?.text ?? '';
    } catch (e) {
      this.logger.warn(
        `OCR extract failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return '';
    }
  }

  analyzeText(text: string): {
    hasSuspiciousContent: boolean;
    detectedPatterns: string[];
    confidence: number;
  } {
    const src = text || '';
    const found: string[] = [];
    const tests: Array<[string, RegExp]> = [
      ['phone', /[6-9]\d{9}/g],
      ['phone_plus91', /\+91[\s-]?\d{10}/g],
      ['phone_0prefix', /0\d{10}/g],
      ['email', /[\w.-]+@[\w.-]+\.\w{2,}/g],
      ['url', /https?:\/\/[^\s]+/g],
      ['www', /www\.[^\s]+/g],
      ['whatsapp', /whatsapp/gi],
      ['wa.me', /wa\.me/gi],
    ];
    for (const [name, re] of tests) {
      if (re.test(src)) found.push(name);
    }
    const competitors = [
      'magicbricks',
      '99acres',
      'housing.com',
      'olx',
      'quikr',
      'sulekha',
      'commonfloor',
      'makaan',
      'proptiger',
    ];
    for (const c of competitors) {
      if (src.toLowerCase().includes(c)) found.push(`competitor:${c}`);
    }
    return {
      hasSuspiciousContent: found.length > 0,
      detectedPatterns: [...new Set(found)],
      confidence: found.length > 0 ? 1 : 0,
    };
  }

  async scanPropertyImages(propertyId: string, imageUrls: string[]) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { postedById: true },
    });
    if (!property) return;
    for (const url of imageUrls) {
      try {
        const buf = await this.downloadImage(url);
        const text = await this.extractTextFromImage(buf);
        const result = this.analyzeText(text);
        if (!result.hasSuspiciousContent) continue;
        await this.prisma.fraudCase.create({
          data: {
            subjectUserId: property.postedById,
            propertyId,
            status: 'open',
            score: 95,
            reason: `OCR_DETECTED: ${result.detectedPatterns.join(', ')}`,
          },
        });
        const admins = await this.prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        });
        await Promise.all(
          admins.map((a) =>
            this.prisma.notification.create({
              data: {
                userId: a.id,
                channel: 'in_app',
                title: 'OCR fraud detected',
                body: 'Property image contains contact/platform markers',
              },
            }),
          ),
        );
      } catch (e) {
        this.logger.warn(
          `OCR scan failed for ${propertyId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
}

