/** Browser must use NEXT_PUBLIC_* (inlined at build). Default local API port matches apps/api `PORT` (4000). */
const LOCAL_API_DEFAULT = "http://localhost:4000";
const base =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "development" ? LOCAL_API_DEFAULT : "")
    : process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? LOCAL_API_DEFAULT;

export function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function extractReadableErrorMessage(text: string, fallback: string): string {
  const raw = text?.trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[]; error?: string };
    if (Array.isArray(parsed?.message)) {
      return parsed.message.filter(Boolean).join(", ") || fallback;
    }
    if (typeof parsed?.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // Not JSON; continue with raw text.
  }
  return raw;
}

function normalizeErrorText(raw: string): string {
  const t = raw.trim();
  if (!t) return "Request failed";
  if (t.startsWith("{") || t.startsWith("[")) {
    return "Request failed";
  }
  return t;
}

function mapBackendErrorToUserMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (
    m.includes("contact_details_not_allowed") ||
    m.includes("contact solicitation phrase detected")
  ) {
    return "Contact details are not allowed. Please remove phone number, email, or links and use platform chat.";
  }
  if (m.includes("organization not found")) {
    return "Organization was not found. Please create or select an organization, then try again.";
  }
  if (m.includes("not a member of organization")) {
    return "You do not have access to this organization. Please switch to an organization you belong to.";
  }
  if (m.includes("unauthorized") || m.includes("forbidden")) {
    return "You do not have permission for this action. Please log in with an authorized account and try again.";
  }
  if (m.includes("validation failed") || m.includes("bad request")) {
    return "Some input is invalid. Please review required fields and try again.";
  }
  return `${normalizeErrorText(msg)}. Please review your input and try again.`;
}

export function getUserFacingErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
  if (typeof raw === "string" && /failed to fetch/i.test(raw)) {
    return "Cannot reach the API. Check that the server is running and NEXT_PUBLIC_API_URL matches your backend (e.g. http://localhost:4000).";
  }
  const readable = normalizeErrorText(raw || fallback);
  return mapBackendErrorToUserMessage(readable);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!headers.has("Content-Type") && rest.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { ...rest, headers });
  if (!res.ok) {
    const text = await res.text();
    const readable = extractReadableErrorMessage(text, res.statusText);
    throw new Error(mapBackendErrorToUserMessage(readable));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/** Same as fetch + JSON parse but returns response headers (e.g. X-Search-Fallback). */
export async function apiFetchJsonWithHeaders<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<{ data: T; headers: Headers }> {
  const { token, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!headers.has("Content-Type") && rest.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { ...rest, headers });
  const text = await res.text();
  if (!res.ok) {
    const readable = extractReadableErrorMessage(text, res.statusText);
    throw new Error(mapBackendErrorToUserMessage(readable));
  }
  const data = (text.trim() ? JSON.parse(text) : undefined) as T;
  return { data, headers: res.headers };
}
