import { DealStage } from '@prisma/client';

/** SLA targets in hours per stage (aligned with orchestration). */
export const DEAL_STAGE_SLA_HOURS: Partial<Record<DealStage, number>> = {
  LEAD: 24,
  MATCH: 72,
  SITE_VISIT: 120,
  NEGOTIATION: 168,
  LEGAL: 336,
  CLOSURE: 72,
};

export type DealSlaView = {
  limitHours: number | null;
  hoursInStage: number;
  /** Hours past SLA when applicable */
  overHours: number | null;
  status: 'none' | 'on_track' | 'at_risk' | 'breached';
};

export function computeDealSlaView(
  stage: DealStage,
  stageEnteredAt: Date,
): DealSlaView {
  const limitHours = DEAL_STAGE_SLA_HOURS[stage] ?? null;
  const hoursInStage =
    (Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60);

  if (limitHours == null || limitHours <= 0) {
    return {
      limitHours: null,
      hoursInStage,
      overHours: null,
      status: 'none',
    };
  }

  const ratio = hoursInStage / limitHours;
  const breached = hoursInStage > limitHours;
  const overHours = breached ? hoursInStage - limitHours : null;

  let status: DealSlaView['status'] = 'on_track';
  if (breached) status = 'breached';
  else if (ratio >= 0.8) status = 'at_risk';

  return {
    limitHours,
    hoursInStage,
    overHours,
    status,
  };
}
