/**
 * System-level contact blocking for listings and requirements.
 * Reject before persist — no public exposure of direct contact details.
 *
 * Allowed examples:
 * - Prices: 5000000
 * - Areas: 1200 sqft
 * - Coordinates: 28.6139, 77.2090
 */

// Only continuous numbers with 10+ digits should be blocked as phone-like.
const PHONE_PATTERN = /\b\d{10,}\b/g;

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

const URL_PATTERN = /\b(https?:\/\/|www\.)[^\s]+/gi;

export type ContactValidationResult =
  | { ok: true }
  | { ok: false; reason: string; code: string };

/** Join multiple user-visible fields and validate (central entry for “publishable surface” checks). */
export function validatePublishableTextParts(parts: string[]): ContactValidationResult {
  const joined = (parts ?? []).filter(Boolean).join('\n');
  return validateNoContactLeak(joined);
}

export function validateNoContactLeak(text: string): ContactValidationResult {
  const t = text ?? '';
  if (PHONE_PATTERN.test(t)) {
    return { ok: false, reason: 'Phone number pattern detected', code: 'PHONE' };
  }
  if (EMAIL_PATTERN.test(t)) {
    return { ok: false, reason: 'Email address detected', code: 'EMAIL' };
  }
  if (URL_PATTERN.test(t)) {
    return { ok: false, reason: 'URL or website detected', code: 'URL' };
  }
  return { ok: true };
}

export { HOT_MATCH_THRESHOLD, MATCH_WEIGHTS } from './match-scoring';
