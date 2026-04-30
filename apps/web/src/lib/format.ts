export function formatINR(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

/** Live lakh / crore (and K) preview for plain numeric price filters in forms. */
export function formatPriceFilterPreview(raw: string): {
  compact: string;
  full: string;
} | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  const full = `₹${Math.round(n).toLocaleString("en-IN")}`;
  if (n === 0) return { compact: "₹0", full };
  if (n >= 10000000) {
    return { compact: `≈ ₹${(n / 10000000).toFixed(2)} Cr`, full };
  }
  if (n >= 100000) {
    return { compact: `≈ ₹${(n / 100000).toFixed(2)} Lakh`, full };
  }
  if (n >= 1000) {
    return { compact: `≈ ₹${(n / 1000).toFixed(2)} K`, full };
  }
  return { compact: full, full };
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
