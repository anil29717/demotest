"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  ClipboardList,
  CreditCard,
  Download,
  Gavel,
  Handshake,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Scale,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
  Globe,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { NavIcon } from "@/components/nav-icon";
import { apiFetch } from "@/lib/api";
import {
  BROKER_SIDEBAR_SECTIONS,
  BUYER_SIDEBAR_SECTIONS,
  HNI_SIDEBAR_SECTIONS,
  INSTITUTIONAL_BUYER_SIDEBAR_SECTIONS,
  INSTITUTIONAL_SELLER_SIDEBAR_SECTIONS,
  NRI_SIDEBAR_SECTIONS,
  SELLER_SIDEBAR_SECTIONS,
  type BrokerSidebarItem,
  itemsForRole,
} from "@/lib/role-access";
import { getInitials } from "@/lib/format";
import { flagAndCountry, httpStatusFromError } from "@/lib/nri-ui";

const WORKSPACE_SIDEBAR_ROLES = new Set([
  "BROKER",
  "SELLER",
  "NRI",
  "BUYER",
  "HNI",
  "INSTITUTIONAL_BUYER",
  "INSTITUTIONAL_SELLER",
]);

type SidebarCounts = {
  properties: number;
  requirements: number;
  matches: number;
  deals: number;
  hotLeads: number;
  compliance: number;
  auctions: number;
  institutions: number;
};

const EMPTY_COUNTS: SidebarCounts = {
  properties: 0,
  requirements: 0,
  matches: 0,
  deals: 0,
  hotLeads: 0,
  compliance: 0,
  auctions: 0,
  institutions: 0,
};

function useSidebarCounts(token: string | null, role?: string | null): SidebarCounts {
  const [counts, setCounts] = useState<SidebarCounts>(EMPTY_COUNTS);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      try {
        if (role === "NRI") {
          const summary = await apiFetch<Record<string, unknown>>("/dashboard/summary", { token });
          const quickStats =
            typeof summary.quickStats === "object" && summary.quickStats
              ? (summary.quickStats as Record<string, unknown>)
              : {};
          const next: SidebarCounts = {
            ...EMPTY_COUNTS,
            properties: Number(summary.myListings ?? quickStats.myProperties ?? 0),
            requirements: Number(summary.myRequirements ?? quickStats.myRequirements ?? 0),
            matches: Number(summary.matches ?? quickStats.myMatches ?? 0),
          };
          if (!cancelled) setCounts(next);
          return;
        }

        if (role === "BUYER") {
          const [summary, dealRows] = await Promise.all([
            apiFetch<Record<string, unknown>>("/dashboard/summary", { token }),
            apiFetch<unknown[]>("/deals", { token }).catch(() => []),
          ]);
          const quickStats =
            typeof summary.quickStats === "object" && summary.quickStats
              ? (summary.quickStats as Record<string, unknown>)
              : {};
          const next: SidebarCounts = {
            ...EMPTY_COUNTS,
            requirements: Number(summary.myRequirements ?? quickStats.myRequirements ?? 0),
            matches: Number(summary.matches ?? quickStats.myMatches ?? 0),
            deals: Array.isArray(dealRows) ? dealRows.length : 0,
          };
          if (!cancelled) setCounts(next);
          return;
        }

        if (role === "HNI") {
          const [summary, auctions] = await Promise.all([
            apiFetch<Record<string, unknown>>("/dashboard/summary", { token }),
            apiFetch<unknown[]>("/verticals/auctions", { token }).catch(() => []),
          ]);
          const quickStats =
            typeof summary.quickStats === "object" && summary.quickStats
              ? (summary.quickStats as Record<string, unknown>)
              : {};
          const next: SidebarCounts = {
            ...EMPTY_COUNTS,
            matches: Number(summary.matches ?? quickStats.myMatches ?? 0),
            auctions: Array.isArray(auctions) ? auctions.length : 0,
          };
          if (!cancelled) setCounts(next);
          return;
        }

        if (role === "INSTITUTIONAL_BUYER" || role === "INSTITUTIONAL_SELLER") {
          const [summary, instRows, compliance] = await Promise.all([
            apiFetch<Record<string, unknown>>("/dashboard/summary", { token }),
            apiFetch<unknown[]>("/institutions", { token }).catch(() => []),
            apiFetch<{ items?: { severity?: string }[] } | { severity?: string }[]>("/compliance/feed", {
              token,
            }).catch(() => []),
          ]);
          const complianceItems = Array.isArray(compliance)
            ? compliance
            : Array.isArray((compliance as { items?: unknown[] }).items)
              ? (compliance as { items: { severity?: string }[] }).items
              : [];
          const quickStats =
            typeof summary.quickStats === "object" && summary.quickStats
              ? (summary.quickStats as Record<string, unknown>)
              : {};
          const next: SidebarCounts = {
            ...EMPTY_COUNTS,
            requirements: Number(summary.myRequirements ?? quickStats.myRequirements ?? 0),
            matches: Number(summary.matches ?? quickStats.myMatches ?? 0),
            institutions: Array.isArray(instRows) ? instRows.length : 0,
            compliance: complianceItems.filter(
              (item) => String(item.severity ?? "").toUpperCase() === "HIGH",
            ).length,
          };
          if (!cancelled) setCounts(next);
          return;
        }

        const [summary, leads, compliance] = await Promise.all([
          apiFetch<Record<string, unknown>>("/dashboard/summary", { token }),
          apiFetch<{ status?: string }[]>("/leads", { token }).catch(() => []),
          apiFetch<{ items?: { severity?: string }[] } | { severity?: string }[]>("/compliance/feed", {
            token,
          }).catch(() => []),
        ]);

        const complianceItems = Array.isArray(compliance)
          ? compliance
          : Array.isArray(compliance.items)
            ? compliance.items
            : [];

        const quickStats =
          typeof summary.quickStats === "object" && summary.quickStats
            ? (summary.quickStats as Record<string, unknown>)
            : {};

        const next: SidebarCounts = {
          ...EMPTY_COUNTS,
          properties: Number(summary.myListings ?? quickStats.myProperties ?? 0),
          requirements: Number(summary.myRequirements ?? quickStats.myRequirements ?? 0),
          matches: Number(summary.matches ?? quickStats.myMatches ?? 0),
          deals: Number(
            summary.deals ?? (summary as { recentMatches?: unknown[] }).recentMatches?.length ?? 0,
          ),
          hotLeads: leads.filter((lead) => String(lead.status ?? "").toUpperCase() === "HOT").length,
          compliance: complianceItems.filter(
            (item) => String(item.severity ?? "").toUpperCase() === "HIGH",
          ).length,
        };
        if (!cancelled) setCounts(next);
      } catch {
        if (!cancelled) setCounts(EMPTY_COUNTS);
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, role]);

  return counts;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token } = useAuth();
  const nav = useMemo(() => itemsForRole(user?.role), [user?.role]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [organizationName, setOrganizationName] = useState<string>("Independent broker");
  const [nriCountry, setNriCountry] = useState<string | null>(null);
  const [hniTicketMin, setHniTicketMin] = useState<number | null>(null);
  const [hniTicketMax, setHniTicketMax] = useState<number | null>(null);
  const counts = useSidebarCounts(token, user?.role);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NEXT_PUBLIC_PWA === "false") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const page = pathname === "/" ? "Workspace" : pathname.split("/").filter(Boolean).join(" · ");
    document.title = `AR Buildwel · ${page}`;
  }, [pathname]);

  useEffect(() => {
    if (!token || !user?.role || !WORKSPACE_SIDEBAR_ROLES.has(user.role)) return;
    let cancelled = false;
    void Promise.all([
      apiFetch<{ onboardingComplete?: boolean }>("/user/profile", { token }).catch(() => ({})),
      apiFetch<{ name?: string }[]>("/organizations/mine", { token }).catch(() => []),
    ]).then(([profile, orgs]) => {
      if (cancelled) return;
      const p = profile as { onboardingComplete?: boolean };
      setOnboardingComplete(Boolean(p.onboardingComplete));
      const r = user?.role;
      const fallback =
        r === "SELLER"
          ? "Individual seller"
          : r === "NRI"
            ? "NRI account"
            : r === "BUYER"
              ? "Buyer"
              : r === "HNI"
                ? "HNI account"
                : r === "INSTITUTIONAL_BUYER" || r === "INSTITUTIONAL_SELLER"
                  ? "Organization"
                  : "Independent broker";
      setOrganizationName(orgs[0]?.name?.trim() || fallback);
    });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== "HNI") return;
    let cancelled = false;
    void apiFetch<{ ticketMinCr?: number | null; ticketMaxCr?: number | null }>("/verticals/hni/profile", { token })
      .then((prof) => {
        if (!cancelled) {
          setHniTicketMin(prof?.ticketMinCr ?? null);
          setHniTicketMax(prof?.ticketMaxCr ?? null);
        }
      })
      .catch((err) => {
        const s = httpStatusFromError(err);
        if (!cancelled && (s === 404 || s === 400 || s === 403)) {
          setHniTicketMin(null);
          setHniTicketMax(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== "NRI") return;
    let cancelled = false;
    void apiFetch<{ country?: string | null }>("/verticals/nri/profile", { token })
      .then((p) => {
        if (!cancelled) setNriCountry(p?.country ?? null);
      })
      .catch((err) => {
        const s = httpStatusFromError(err);
        if (!cancelled && (s === 404 || s === 400 || s === 403)) setNriCountry(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  const roleIconMap = {
    "/dashboard": LayoutDashboard,
    "/analytics": BarChart3,
    "/properties": Building2,
    "/requirements": ClipboardList,
    "/search": Search,
    "/matches": Zap,
    "/crm": Users,
    "/deals": Briefcase,
    "/institutions": Landmark,
    "/auctions": Gavel,
    "/irm": Target,
    "/verticals/hni": TrendingUp,
    "/verticals/nri": Globe,
    "/broker-network": Network,
    "/partners": Handshake,
    "/services-hub": Scale,
    "/compliance": ShieldCheck,
    "/settings/notifications": Bell,
    "/reputation": Award,
    "/billing": CreditCard,
    "/export": Download,
  } as const;

  function isActive(item: BrokerSidebarItem) {
    if (item.href === "/properties/new") return pathname === "/properties/new";
    if (item.href === "/requirements/new") return pathname === "/requirements/new";
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`) || pathname.startsWith(`${item.href}?`);
  }

  function badgeFor(item: BrokerSidebarItem): number {
    if (!item.badgeKey) return 0;
    return counts[item.badgeKey] ?? 0;
  }

  function badgeClass(item: BrokerSidebarItem, role?: string | null): string {
    if (item.badgeKey === "hotLeads") return "bg-[#EF9F27] text-black";
    if (item.badgeKey === "compliance") return "bg-[#FF4444] text-white";
    if (item.badgeKey === "auctions") return "bg-amber-500/90 text-black";
    if (item.badgeKey === "institutions") return "bg-[#7F77DD] text-white";
    if (role === "BUYER" && item.badgeKey === "requirements") return "bg-[#378ADD] text-white";
    return "bg-[#00C49A] text-black";
  }

  function signOut() {
    logout();
    router.replace("/login");
  }

  const wr = user?.role;
  if (wr && WORKSPACE_SIDEBAR_ROLES.has(wr)) {
    const isSeller = wr === "SELLER";
    const isNri = wr === "NRI";
    const isBuyer = wr === "BUYER";
    const isHni = wr === "HNI";
    const isInstBuyer = wr === "INSTITUTIONAL_BUYER";
    const isInstSeller = wr === "INSTITUTIONAL_SELLER";
    const isBroker = wr === "BROKER";

    const sections = isNri
      ? NRI_SIDEBAR_SECTIONS
      : isSeller
        ? SELLER_SIDEBAR_SECTIONS
        : isBuyer
          ? BUYER_SIDEBAR_SECTIONS
          : isHni
            ? HNI_SIDEBAR_SECTIONS
            : isInstBuyer
              ? INSTITUTIONAL_BUYER_SIDEBAR_SECTIONS
              : isInstSeller
                ? INSTITUTIONAL_SELLER_SIDEBAR_SECTIONS
                : BROKER_SIDEBAR_SECTIONS;

    const rolePill = isSeller
      ? {
          wrap: "border border-[#EF9F2730] bg-[#EF9F2710]",
          text: "text-[#EF9F27]",
          dot: "bg-[#EF9F27]",
          label: "SELLER",
        }
      : isNri
        ? {
            wrap: "border border-[#00C49A25] bg-[#00C49A0F]",
            text: "text-[#00C49A]",
            dot: "bg-[#00C49A]",
            label: "NRI",
          }
        : isBuyer
          ? {
              wrap: "border border-[#378ADD30] bg-[#378ADD10]",
              text: "text-[#378ADD]",
              dot: "bg-[#378ADD]",
              label: "BUYER",
            }
          : isHni
            ? {
                wrap: "border border-[#F0922B30] bg-[#F0922B10]",
                text: "text-[#F0922B]",
                dot: "bg-[#F0922B]",
                label: "HNI",
              }
            : isInstBuyer
              ? {
                  wrap: "border border-[#7F77DD30] bg-[#7F77DD10]",
                  text: "text-[#7F77DD]",
                  dot: "bg-[#7F77DD]",
                  label: "INST. BUYER",
                }
              : isInstSeller
                ? {
                    wrap: "border border-[#5BAD8F30] bg-[#5BAD8F10]",
                    text: "text-[#5BAD8F]",
                    dot: "bg-[#5BAD8F]",
                    label: "INST. SELLER",
                  }
                : {
                    wrap: "border border-[#00C49A25] bg-[#00C49A0F]",
                    text: "text-[#00C49A]",
                    dot: "bg-[#00C49A]",
                    label: "BROKER",
                  };

    const showOnboardingCard = isBroker || isSeller || isNri;

    const hniRangeOk =
      hniTicketMin != null && hniTicketMax != null && Number.isFinite(hniTicketMin) && Number.isFinite(hniTicketMax);

    const avatarTone = isNri
      ? "text-[#E85D8A]"
      : isSeller
        ? "text-[#EF9F27]"
        : isBuyer
          ? "text-[#378ADD]"
          : isHni
            ? "text-[#F0922B]"
            : isInstBuyer
              ? "text-[#7F77DD]"
              : isInstSeller
                ? "text-[#5BAD8F]"
                : "text-[#00C49A]";

    const footerSecondary = isNri
      ? `NRI · ${nriCountry?.trim() ? flagAndCountry(nriCountry) : "Country not set"}`
      : isSeller
        ? "Seller"
        : isBuyer
          ? "Buyer"
          : isHni
            ? "HNI Investor"
            : isInstBuyer
              ? "Inst. Buyer"
              : isInstSeller
                ? "Inst. Seller"
                : "Broker";

    const displayName =
      user?.name?.trim() ||
      (isSeller ? "Seller User" : isNri ? "NRI User" : isBuyer ? "Buyer User" : isHni ? "HNI User" : isInstBuyer ? "Inst. Buyer" : isInstSeller ? "Inst. Seller" : "Broker User");

    const initialsSeed =
      user?.name?.trim() ||
      (isSeller ? "Seller" : isNri ? "NRI" : isBuyer ? "Buyer" : isHni ? "HNI" : isInstBuyer ? "Inst Buyer" : isInstSeller ? "Inst Seller" : "Broker");

    return (
      <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-zinc-100">
        <aside className="hidden h-screen w-[240px] min-w-[240px] flex-col overflow-hidden border-r border-[#1a1a1a] bg-[#0a0a0a] md:flex">
          <div className="h-14 shrink-0 border-b border-[#1a1a1a] px-3">
            <Link href="/dashboard" prefetch={true} className="flex h-full items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#00C49A] text-[11px] font-bold text-black">
                AR
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">AR Buildwel</p>
                <p className="text-[10px] text-[#444444]">Real Estate OS</p>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className={`mx-3 my-[10px] rounded-lg px-[10px] py-2 ${rolePill.wrap}`}>
              <p className={`flex items-center gap-1.5 text-[11px] font-medium ${rolePill.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${rolePill.dot}`} />
                {rolePill.label}
              </p>
              {isBuyer ? <p className="mt-1 truncate text-[10px] text-[#444444]">Looking for property</p> : null}
              {isHni ? (
                hniRangeOk ? (
                  <p className="mt-1 truncate text-[10px] text-[#444444]">
                    ₹{hniTicketMin}Cr – ₹{hniTicketMax}Cr
                  </p>
                ) : (
                  <Link href="/verticals/hni" className="mt-1 block truncate text-[10px] text-[#F0922B] hover:underline">
                    Set investment range →
                  </Link>
                )
              ) : null}
              {isInstBuyer ? (
                <p className="mt-1 truncate text-[10px] text-[#444444]">Institutional acquisitions</p>
              ) : null}
              {isInstSeller ? <p className="mt-1 truncate text-[10px] text-[#444444]">{organizationName}</p> : null}
              {(isBroker || isSeller || isNri) ? (
                <p className="mt-1 truncate text-[10px] text-[#444444]">{organizationName}</p>
              ) : null}
            </div>

            {showOnboardingCard && !onboardingComplete ? (
              <div className="mx-3 my-2 rounded-lg border border-[#EF9F2730] bg-[#EF9F2710] px-[10px] py-2">
                <p className="text-[11px] font-medium text-[#EF9F27]">⚡ Complete your profile</p>
                <Link href="/onboarding" className="mt-1 block text-[10px] text-[#EF9F27]">
                  Unlock all features →
                </Link>
              </div>
            ) : null}

            {sections.map((section) => (
              <div key={section.category}>
                <p className="px-4 pb-[3px] pt-[10px] text-[9px] uppercase tracking-[0.08em] text-[#383838]">
                  {section.category}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = roleIconMap[item.href as keyof typeof roleIconMap];
                    const active = isActive(item);
                    const badge = badgeFor(item);
                    const badgeCls =
                      (isNri || isBuyer) && item.badgeKey === "matches"
                        ? "bg-[#00C49A] text-black"
                        : badgeClass(item, wr);
                    if (item.subItem) {
                      return (
                        <li key={item.href} className="mx-2">
                          <Link
                            href={item.href}
                            prefetch={true}
                            className={`flex h-7 items-center rounded-[6px] pl-8 pr-3 text-[11px] transition-all duration-150 ${
                              active
                                ? "bg-[#00C49A12] text-[#00C49A]"
                                : "text-[#444444] hover:bg-[#ffffff09] hover:text-[#888888]"
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    }
                    return (
                      <li key={item.href} className="mx-2">
                        <Link
                          href={item.href}
                          prefetch={true}
                          className={`flex h-[34px] items-center gap-2 rounded-[6px] border-l-2 px-3 transition-all duration-150 ${
                            active
                              ? "border-l-[#00C49A] bg-[#00C49A12] text-[#00C49A]"
                              : "border-l-transparent text-[#666666] hover:bg-[#ffffff09] hover:text-[#888888]"
                          }`}
                        >
                          {Icon ? (
                            <Icon className={`h-4 w-4 ${active ? "text-[#00C49A]" : "text-[#3d3d3d]"}`} />
                          ) : null}
                          <span className="text-[12px]">{item.label}</span>
                          {badge > 0 ? (
                            <span
                              className={`ml-auto min-w-[18px] rounded-[10px] px-1.5 py-[1px] text-center text-[9px] font-semibold ${badgeCls}`}
                            >
                              {badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t border-[#1a1a1a] p-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-[12px] font-semibold ${avatarTone}`}
              >
                {getInitials(initialsSeed)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-white">{displayName}</p>
                <p className="truncate text-[10px] text-[#444444]">{footerSecondary}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="mt-1.5 flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-[#444444] transition hover:bg-[#FF444410] hover:text-[#FF4444]"
            >
              <LogOut className="h-[14px] w-[14px]" />
              Log out
            </button>
          </div>
        </aside>

        <main className="h-screen flex-1 overflow-y-auto bg-[#0a0a0a] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="sticky top-0 z-30 border-b border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex items-center gap-2 text-sm text-[#00C49A]"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>
          </div>
          {menuOpen ? (
            <div className="fixed inset-0 z-40 bg-black/60 md:hidden">
              <aside className="h-full w-64 border-r border-[#1a1a1a] bg-[#0a0a0a] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Navigation</p>
                  <button type="button" onClick={() => setMenuOpen(false)} className="text-zinc-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {sections.flatMap((s) => s.items).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      className={`block rounded px-3 py-2 text-sm ${
                        isActive(item) ? "bg-[#00C49A12] text-[#00C49A]" : "text-zinc-400 hover:bg-[#ffffff09]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </aside>
            </div>
          ) : null}
          <div className="p-6">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 border-r border-[#1f1f1f] bg-[#111111] p-4 md:block">
          <Link href="/dashboard" prefetch={true} className="block font-semibold text-teal-400">
            AR Buildwel
          </Link>
          <nav className="mt-6 flex flex-col gap-1 text-sm">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[#1a1a1a] ${
                    active ? "bg-[#1a1a1a] text-white" : "text-zinc-400"
                  }`}
                >
                  <NavIcon
                    icon={item.icon}
                    className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-zinc-500"}`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden">
            <aside className="h-full w-64 border-r border-[#1f1f1f] bg-[#111111] p-4">
              <div className="flex items-center justify-between">
                <Link href="/dashboard" prefetch={true} className="font-semibold text-teal-400" onClick={() => setMenuOpen(false)}>
                  AR Buildwel
                </Link>
                <button type="button" onClick={() => setMenuOpen(false)} className="text-zinc-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-6 flex flex-col gap-1 text-sm">
                {nav.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[#1a1a1a] ${
                        active ? "bg-[#1a1a1a] text-white" : "text-zinc-400"
                      }`}
                    >
                      <NavIcon
                        icon={item.icon}
                        className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-zinc-500"}`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
            <div className="flex flex-wrap gap-2 md:hidden">
              <button type="button" onClick={() => setMenuOpen(true)} className="inline-flex items-center gap-2 text-sm text-teal-400">
                <Menu className="h-4 w-4" />
                Menu
              </button>
            </div>
            <div className="ml-auto flex items-center gap-3 text-sm text-zinc-400">
              {user && <span className="text-zinc-200">{user.role}</span>}
              {token ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 rounded border border-zinc-600 px-2 py-1 hover:bg-[#1a1a1a]"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                  Log out
                </button>
              ) : (
                <Link href="/login" className="text-teal-400">
                  Log in
                </Link>
              )}
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
