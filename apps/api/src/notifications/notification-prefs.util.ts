/** Shape stored in `User.notificationPrefs` (JSON); validated on write via `NotificationPrefsDto`. */
export type NormalizedNotificationPrefs = {
  dailyDigest: boolean;
  matchAlerts: boolean;
  slaWarnings: boolean;
  /** Institutional / confidentiality requests */
  ndaAlerts: boolean;
  /** Pipeline stage changes on deals */
  dealAlerts: boolean;
  /** SLA warnings, system/OCR/WhatsApp admin pings, digest summaries */
  alertAlerts: boolean;
  digestHourLocal: number | null;
  digestMinuteLocal: number | null;
  /** When true and `whatsappDigestTo` is valid E.164, daily digest cron may mirror summary via Cloud API. */
  whatsappDigest: boolean;
  whatsappDigestTo: string | null;
  /** Log-based / future SMTP mirror for match alerts. */
  emailMatchAlerts: boolean;
  /** Log-based / future SMTP mirror for daily digest. */
  emailDailyDigest: boolean;
};

const DEFAULT_DIGEST_HOUR = 9;
const DEFAULT_DIGEST_MINUTE = 30;

function clampHour(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 23)
    return null;
  return n;
}

function clampMinute(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 59)
    return null;
  return n;
}

function normalizeE164(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return /^\+[1-9]\d{9,14}$/.test(t) ? t : null;
}

/** Defaults align with web settings initial state (all alerts on). */
export function normalizeNotificationPrefs(
  raw: unknown,
): NormalizedNotificationPrefs {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const slaOn = o.slaWarnings !== false;
  const nda =
    o.ndaAlerts === undefined ? slaOn !== false : o.ndaAlerts !== false;
  const deal =
    o.dealAlerts === undefined ? slaOn !== false : o.dealAlerts !== false;
  const alert =
    o.alertAlerts === undefined ? slaOn !== false : o.alertAlerts !== false;
  return {
    dailyDigest: o.dailyDigest !== false,
    matchAlerts: o.matchAlerts !== false,
    slaWarnings: slaOn,
    ndaAlerts: nda,
    dealAlerts: deal,
    alertAlerts: alert,
    digestHourLocal: clampHour(o.digestHourLocal),
    digestMinuteLocal: clampMinute(o.digestMinuteLocal),
    whatsappDigest: o.whatsappDigest === true,
    whatsappDigestTo: normalizeE164(o.whatsappDigestTo),
    emailMatchAlerts: o.emailMatchAlerts === true,
    emailDailyDigest: o.emailDailyDigest === true,
  };
}

export function formatDigestWindowLocal(
  prefs: NormalizedNotificationPrefs,
): string {
  const h = prefs.digestHourLocal ?? DEFAULT_DIGEST_HOUR;
  const m = prefs.digestMinuteLocal ?? DEFAULT_DIGEST_MINUTE;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
