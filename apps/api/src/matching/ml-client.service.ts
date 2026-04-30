import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { appendMatchFeedbackCsvRow } from './match-feedback-local';

export type MatchMlFeatures = {
  location_match: number;
  budget_overlap: number;
  type_match: number;
  area_ratio: number;
  urgency_delta: number;
  broker_conversion_rate: number;
  days_since_listing: number;
  requirement_hot: boolean;
};

export type MlScoreResponse = {
  mlScore: number;
  combinedScore: number;
  confidence: number;
  explanation: Record<string, unknown>;
};

@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private baseUrl(): string {
    return this.config.get<string>('ML_SERVICE_URL', 'http://localhost:8001').replace(/\/$/, '');
  }

  async scoreMatch(params: {
    propertyId: string;
    requirementId: string;
    ruleScore: number;
    features: MatchMlFeatures;
  }): Promise<MlScoreResponse> {
    const fallback: MlScoreResponse = {
      mlScore: params.ruleScore,
      combinedScore: params.ruleScore,
      confidence: 0,
      explanation: { using: 'rule_fallback', reason: 'ml_service_unavailable' },
    };
    try {
      const url = `${this.baseUrl()}/match/score`;
      const res = await firstValueFrom(
        this.http.post<{
          ml_score: number;
          combined_score: number;
          confidence: number;
          explanation: Record<string, unknown>;
        }>(url, {
          property_id: params.propertyId,
          requirement_id: params.requirementId,
          rule_score: params.ruleScore,
          features: params.features,
        }),
      );
      const d = res.data;
      return {
        mlScore: d.ml_score,
        combinedScore: d.combined_score,
        confidence: d.confidence,
        explanation: d.explanation ?? {},
      };
    } catch (e) {
      this.logger.warn(
        `ML score unreachable: ${e instanceof Error ? e.message : String(e)}`,
      );
      return fallback;
    }
  }

  async recordFeedback(
    matchId: string,
    feedback: {
      accepted?: boolean;
      convertedToLead?: boolean;
      convertedToDeal?: boolean;
      dealClosed?: boolean;
    },
  ): Promise<void> {
    const url = `${this.baseUrl()}/match/feedback`;
    const body = {
      match_id: matchId,
      accepted: feedback.accepted,
      converted_to_lead: feedback.convertedToLead,
      converted_to_deal: feedback.convertedToDeal,
      deal_closed: feedback.dealClosed,
    };
    try {
      await firstValueFrom(this.http.post(url, body, { timeout: 8000 }));
    } catch (err: unknown) {
      this.logger.warn(
        `ML feedback HTTP failed match=${matchId}; writing local CSV backup`,
      );
      await appendMatchFeedbackCsvRow({
        matchId,
        accepted:
          feedback.accepted === undefined ? null : Boolean(feedback.accepted),
        convertedToLead: feedback.convertedToLead ?? null,
        convertedToDeal: feedback.convertedToDeal ?? null,
        dealClosed: feedback.dealClosed ?? null,
      }).catch((e: unknown) =>
        this.logger.warn(
          `Local match feedback append failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }
  }
}
