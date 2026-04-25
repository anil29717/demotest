/** Shared helpers for NRI workspace UI (no API calls). */

const COUNTRY_FLAGS: Record<string, string> = {
  "united states": "🇺🇸",
  usa: "🇺🇸",
  america: "🇺🇸",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
  england: "🇬🇧",
  canada: "🇨🇦",
  australia: "🇦🇺",
  "new zealand": "🇳🇿",
  germany: "🇩🇪",
  france: "🇫🇷",
  singapore: "🇸🇬",
  "united arab emirates": "🇦🇪",
  uae: "🇦🇪",
  qatar: "🇶🇦",
  "saudi arabia": "🇸🇦",
  japan: "🇯🇵",
  "south korea": "🇰🇷",
  china: "🇨🇳",
  "hong kong": "🇭🇰",
  india: "🇮🇳",
  netherlands: "🇳🇱",
  ireland: "🇮🇪",
  switzerland: "🇨🇭",
  italy: "🇮🇹",
  spain: "🇪🇸",
  oman: "🇴🇲",
  bahrain: "🇧🇭",
  kuwait: "🇰🇼",
};

export function countryFlagEmoji(country: string | null | undefined): string {
  const c = (country ?? "").trim().toLowerCase();
  if (!c) return "🌍";
  return COUNTRY_FLAGS[c] ?? "🌍";
}

export function flagAndCountry(country: string | null | undefined): string {
  const t = (country ?? "").trim();
  if (!t) return "";
  return `${countryFlagEmoji(t)} ${t}`;
}

export function httpStatusFromError(error: unknown): number | null {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const m = raw.match(/\b(\d{3})\b/);
  if (m) return Number(m[1]);
  if (raw.includes("404") || raw.toLowerCase().includes("not found")) return 404;
  if (raw.includes("403") || raw.toLowerCase().includes("forbidden")) return 403;
  if (raw.includes("400") || raw.toLowerCase().includes("bad request")) return 400;
  try {
    const parsed = JSON.parse(raw) as { statusCode?: number };
    return typeof parsed.statusCode === "number" ? parsed.statusCode : null;
  } catch {
    return null;
  }
}

export const NRI_ROSE = "#E85D8A";
export const NRI_ROSE_BG = "#E85D8A10";
export const NRI_ROSE_BORDER = "#E85D8A30";
