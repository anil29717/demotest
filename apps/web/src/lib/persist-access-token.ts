const STORAGE_KEY = "accessToken";
const COOKIE_KEY = "accessToken";

/** Match AuthProvider so middleware and API calls see the same session. */
export function persistAccessToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, token);
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; path=/; samesite=lax`;
}
