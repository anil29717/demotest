import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { NlpIntentResult } from './nlp.types';

const SYSTEM_PROMPT = `You are a real estate assistant for AR Buildwel,
an Indian real estate platform.

Classify the user message into one of these intents:
BUY_INTENT, SELL_INTENT, RENT_INTENT,
RENT_OUT_INTENT, INSTITUTIONAL_INQUIRY,
PRICE_INQUIRY, STATUS_UPDATE, SUPPORT, UNKNOWN

Also extract these fields if present:
- propertyType: RESIDENTIAL/COMMERCIAL/PLOT/
  INSTITUTIONAL (null if not found)
- city: string (null if not found)
- locality: string (null if not found)
- budgetMin: number in INR (null if not found)
- budgetMax: number in INR (null if not found)
- bedrooms: number (null if not found)
- areaSqft: number (null if not found)
- timeline: IMMEDIATE/FLEXIBLE/LONG_TERM
  (null if not found)
- urgency: HOT/WARM/FLEXIBLE
  (WARM if not specified)

Respond ONLY with valid JSON.
No explanation. No markdown. Just JSON.

Example output:
{
  "intent": "BUY_INTENT",
  "confidence": 0.95,
  "propertyType": "RESIDENTIAL",
  "city": "Mumbai",
  "locality": "Bandra West",
  "budgetMin": 20000000,
  "budgetMax": 30000000,
  "bedrooms": 3,
  "areaSqft": null,
  "timeline": "FLEXIBLE",
  "urgency": "WARM"
}`;

function safeParseJson(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

@Injectable()
export class NlpService {
  private readonly logger = new Logger(NlpService.name);

  constructor(private readonly config: ConfigService) {}

  async classifyMessage(
    messageText: string,
    senderId: string,
  ): Promise<NlpIntentResult> {
    const fallback: NlpIntentResult = {
      intent: 'UNKNOWN',
      confidence: 0,
      propertyType: null,
      city: null,
      locality: null,
      budgetMin: null,
      budgetMax: null,
      bedrooms: null,
      areaSqft: null,
      timeline: null,
      urgency: null,
    };

    const text = (messageText ?? '').trim();
    if (text.length <= 5) {
      this.logger.debug(`NLP skipped (short message) sender=${senderId} len=${text.length}`);
      return { ...fallback, intent: 'UNKNOWN', confidence: 0 };
    }

    const apiKey = this.config.get<string>('OPENAI_API_KEY', '').trim();
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set; NLP returns UNKNOWN');
      return fallback;
    }

    const model = this.config.get<string>('OPENAI_MODEL', 'gpt-4o').trim() || 'gpt-4o';
    const threshold = Number.parseFloat(
      this.config.get<string>('NLP_CONFIDENCE_THRESHOLD', '0.7'),
    );
    const effectiveThreshold = Number.isFinite(threshold) ? threshold : 0.7;

    try {
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const usage = completion.usage;
      if (usage) {
        this.logger.log(
          `OpenAI usage model=${model} prompt_tokens=${usage.prompt_tokens ?? 0} completion_tokens=${usage.completion_tokens ?? 0} total=${usage.total_tokens ?? 0}`,
        );
      }

      const content = completion.choices[0]?.message?.content ?? '';
      const obj = safeParseJson(content);
      if (!obj) {
        this.logger.warn('NLP: failed to parse JSON from model response');
        return fallback;
      }

      let intent = (asStr(obj.intent) ?? 'UNKNOWN').toUpperCase();
      let confidence = asNum(obj.confidence) ?? 0;
      if (confidence < 0) confidence = 0;
      if (confidence > 1) confidence = 1;

      if (confidence < effectiveThreshold) {
        intent = 'UNKNOWN';
      }

      return {
        intent,
        confidence,
        propertyType: asStr(obj.propertyType)?.toUpperCase() ?? null,
        city: asStr(obj.city),
        locality: asStr(obj.locality),
        budgetMin: asNum(obj.budgetMin),
        budgetMax: asNum(obj.budgetMax),
        bedrooms: asNum(obj.bedrooms),
        areaSqft: asNum(obj.areaSqft),
        timeline: asStr(obj.timeline)?.toUpperCase() ?? null,
        urgency: asStr(obj.urgency)?.toUpperCase() ?? null,
      };
    } catch (e) {
      this.logger.warn(
        `OpenAI NLP failed sender=${senderId}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return fallback;
    }
  }
}
