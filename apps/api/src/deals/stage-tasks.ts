import { DealStage, type Prisma } from '@prisma/client';

export type DealStageTask = {
  key: string;
  label: string;
  required: boolean;
  done: boolean;
  notes: string;
};

export type DealStageTaskMap = Partial<Record<DealStage, DealStageTask[]>>;

const TEMPLATE: Partial<Record<DealStage, Array<Omit<DealStageTask, 'done' | 'notes'>>>> = {
  [DealStage.LEAD]: [
    { key: 'contact_buyer', label: 'Contact buyer', required: true },
    { key: 'confirm_requirement', label: 'Confirm requirement', required: true },
  ],
  [DealStage.MATCH]: [
    { key: 'confirm_fit', label: 'Confirm listing fits requirement', required: true },
    { key: 'schedule_site_visit', label: 'Schedule site visit', required: true },
  ],
  [DealStage.SITE_VISIT]: [
    { key: 'complete_visit', label: 'Complete site visit', required: true },
    { key: 'add_visit_notes', label: 'Add visit notes', required: true },
  ],
  [DealStage.NEGOTIATION]: [
    { key: 'enter_offer_price', label: 'Enter offer price', required: true },
    { key: 'track_counter_offers', label: 'Track counter offers', required: true },
  ],
  [DealStage.LEGAL]: [
    { key: 'upload_documents', label: 'Upload documents', required: true },
    { key: 'verify_legal_checklist', label: 'Verify legal checklist', required: true },
  ],
};

const STAGES: DealStage[] = [
  DealStage.LEAD,
  DealStage.MATCH,
  DealStage.SITE_VISIT,
  DealStage.NEGOTIATION,
  DealStage.LEGAL,
  DealStage.CLOSURE,
];

export function createInitialStageTasks(): Prisma.InputJsonValue {
  const out: DealStageTaskMap = {};
  for (const stage of STAGES) {
    const template = TEMPLATE[stage] ?? [];
    out[stage] = template.map((t) => ({
      ...t,
      done: false,
      notes: '',
    }));
  }
  return out as Prisma.InputJsonValue;
}

export function normalizeStageTasks(raw: unknown): DealStageTaskMap {
  const current = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const out: DealStageTaskMap = {};
  for (const stage of STAGES) {
    const template = TEMPLATE[stage] ?? [];
    const existing = Array.isArray(current[stage]) ? current[stage] : [];
    const existingByKey = new Map(
      existing
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => [String(x.key ?? ''), x]),
    );
    out[stage] = template.map((t) => {
      const prev = existingByKey.get(t.key);
      return {
        ...t,
        done: Boolean(prev?.done),
        notes: typeof prev?.notes === 'string' ? prev.notes : '',
      };
    });
  }
  return out;
}

export function requiredTasksCompletion(
  map: DealStageTaskMap,
  stage: DealStage,
): { done: number; total: number; pendingLabels: string[] } {
  const tasks = map[stage] ?? [];
  const required = tasks.filter((t) => t.required);
  const done = required.filter((t) => t.done).length;
  const pendingLabels = required.filter((t) => !t.done).map((t) => t.label);
  return { done, total: required.length, pendingLabels };
}
