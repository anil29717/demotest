import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessPath } from "@/lib/role-access";

const SUPPORTED = ["en", "hi"] as const;

function parseRoleFromToken(token?: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get("accessToken")?.value;
  const role = parseRoleFromToken(token);

  const isWorkspaceRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/auctions") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/broker-network") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/compliance") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/deals") ||
    pathname.startsWith("/export") ||
    pathname.startsWith("/institutions") ||
    pathname.startsWith("/irm") ||
    pathname.startsWith("/matches") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/organizations") ||
    pathname.startsWith("/partners") ||
    pathname.startsWith("/phase2") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/properties") ||
    pathname.startsWith("/reputation") ||
    pathname.startsWith("/requirements") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/services-hub") ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/verticals/");
  if (isWorkspaceRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // If role cannot be decoded from cookie token, do not hard-redirect here;
  // client auth context will resolve role from profile/JWT and guard routes.
  if (isWorkspaceRoute && token && role && !canAccessPath(pathname, role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  const accept = request.headers.get("accept-language") ?? "";
  const fromHeader = accept.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  const locale =
    cookie && SUPPORTED.includes(cookie as (typeof SUPPORTED)[number])
      ? cookie
      : fromHeader === "hi"
        ? "hi"
        : "en";

  const res = NextResponse.next();
  res.headers.set("x-locale", locale);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
