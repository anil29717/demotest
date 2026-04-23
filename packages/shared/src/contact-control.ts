/**
 * System-level contact blocking for listings and requirements.
 * Reject before persist — no public exposure of phone, email, URLs, or contact phrases.
 */

const PHONE_PATTERNS = [
  /\b(\+91[\s-]?)?[6-9]\d{9}\b/g,
  /\b0\d{10}\b/g,
  /\+\d{10,15}\b/g,
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

const URL_PATTERN = /\b(https?:\/\/|www\.)[^\s]+/gi;

const CONTACT_PHRASES = [
  /\bcall\s+me\b/i,
  /\bwhatsapp\b/i,
  /\bcontact\s+(me|us|at)\b/i,
  /\breach\s+at\b/i,
  /\bphone\b/i,
  /\bmobile\s*(no|number)?\b/i,
  /\bemail\s*(me|us)?\b/i,
  /\bdm\s+me\b/i,
];

export type ContactValidationResult =
  | { ok: true }
  | { ok: false; reason: string; code: string };

export function validateNoContactLeak(text: string): ContactValidationResult {
  const t = text ?? '';
  for (const re of PHONE_PATTERNS) {
    if (re.test(t)) {
      return { ok: false, reason: 'Phone number pattern detected', code: 'PHONE' };
    }
  }
  if (EMAIL_PATTERN.test(t)) {
    return { ok: false, reason: 'Email address detected', code: 'EMAIL' };
  }
  if (URL_PATTERN.test(t)) {
    return { ok: false, reason: 'URL or website detected', code: 'URL' };
  }
  for (const re of CONTACT_PHRASES) {
    if (re.test(t)) {
      return { ok: false, reason: 'Contact solicitation phrase detected', code: 'PHRASE' };
    }
  }
  return { ok: true };
}

export const MATCH_WEIGHTS = {
  location: 0.25,
  budget: 0.25,
  propertyType: 0.15,
  dealType: 0.1,
  areaSqft: 0.15,
  urgency: 0.1,
} as const;

export const HOT_MATCH_THRESHOLD = 75;
