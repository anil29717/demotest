import { constants } from 'fs';
import { access, appendFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';

function resolveFeedbackPath(): string {
  const env = process.env.MATCH_FEEDBACK_CSV_PATH?.trim();
  if (env) return env;
  return join(process.cwd(), '..', 'ml', 'data', 'match_feedback.csv');
}

/** Same schema as apps/ml/routers/matching.py — backup when ML HTTP fails. */
export async function appendMatchFeedbackCsvRow(row: {
  matchId: string;
  accepted: boolean | null;
  convertedToLead?: boolean | null;
  convertedToDeal?: boolean | null;
  dealClosed?: boolean | null;
}): Promise<void> {
  const normalized = resolveFeedbackPath();
  await mkdir(dirname(normalized), { recursive: true });

  let exists = false;
  try {
    await access(normalized, constants.F_OK);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) {
    await appendFile(
      normalized,
      'ts,match_id,accepted,converted_to_lead,converted_to_deal,deal_closed\n',
      'utf8',
    );
  }

  const iso = new Date().toISOString();
  const line = `${iso},${row.matchId},${row.accepted ?? ''},${row.convertedToLead ?? ''},${row.convertedToDeal ?? ''},${row.dealClosed ?? ''}\n`;
  await appendFile(normalized, line, 'utf8');
}
