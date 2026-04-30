/** Decode JWT payload (middle segment) without verifying signature — UI/session hints only. */

export function decodeJwtPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string | null | undefined,
): T | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    if (typeof atob === "undefined") return null;
    const json = atob(padded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function decodeJwtRole(token: string | null | undefined): string | null {
  const payload = decodeJwtPayload<{ role?: unknown }>(token);
  const r = payload?.role;
  return typeof r === "string" && r.trim().length > 0 ? r.trim() : null;
}
