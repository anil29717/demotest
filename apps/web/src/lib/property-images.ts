/**
 * Resolve property image URLs for display. Uploads from the API are absolute;
 * allows same-origin relative paths if ever stored.
 */
export function getPublicApiBase(): string {
  const b =
    (typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL) || "";
  return b.replace(/\/$/, "") || "http://localhost:4000";
}

export function resolvePropertyImageUrlForDisplay(url: string | null | undefined): string {
  if (url == null) return "";
  const u = String(url).trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:")) return u;
  if (u.startsWith("/")) {
    return `${getPublicApiBase()}${u}`;
  }
  return u;
}

export function pickPrimaryImageUrl(urls: string[] | null | undefined): string {
  if (!Array.isArray(urls) || !urls.length) return "";
  const first = urls.map((s) => String(s).trim()).find(Boolean);
  return first ? resolvePropertyImageUrlForDisplay(first) : "";
}

const ALLOWED_UPLOAD = new Set(["image/jpeg", "image/png"]);

export function validateImageFileForUpload(file: File): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_UPLOAD.has(file.type)) {
    return { ok: false, reason: "Only JPG and PNG images are allowed." };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".jpg") && !name.endsWith(".jpeg") && !name.endsWith(".png")) {
    return { ok: false, reason: "File must have a .jpg, .jpeg, or .png extension." };
  }
  return { ok: true };
}
