"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Download,
  Gavel,
  Globe,
  Handshake,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  Scale,
  Search,
  ShieldCheck,
  Settings,
  Target,
  TrendingUp,
  Users,
  User,
  ChevronUp,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { NavIcon } from "@/components/nav-icon";
import { apiFetch } from "@/lib/api";
import {
  BUILDER_SIDEBAR_SECTIONS,
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
  "ADMIN",
  "BROKER",
  "SELLER",
  "NRI",
  "BUYER",
  "HNI",
  "BUILDER",
  "INSTITUTIONAL_BUYER",
  "INSTITUTIONAL_SELLER",
]);
const ORG_CONTEXT_ROLES = new Set([
  "ADMIN",
  "BROKER",
  "SELLER",
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
  chatUnread: number;
};

type SidebarCountsResponse = SidebarCounts;

type OrgMembership = {
  id: string;
  name?: string;
  organizationId?: string;
  role?: string;
  isActive?: boolean;
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
  chatUnread: 0,
};

type AdminSidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: keyof SidebarCounts | "fraudQueue" | "pendingReviews";
  badgeColor?: string;
};

type AdminSidebarCategory = {
  label: string;
  icon: LucideIcon;
  defaultOpen: boolean;
  items: AdminSidebarItem[];
};

const ADMIN_CATEGORY_STORAGE_KEY = "admin-sidebar-categories";
const ADMIN_CATEGORIES: AdminSidebarCategory[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Listings",
    icon: Building2,
    defaultOpen: false,
    items: [
      { label: "All properties", href: "/properties", icon: Building2, badgeKey: "properties" },
      { label: "All requirements", href: "/requirements", icon: ClipboardList, badgeKey: "requirements" },
      { label: "Search", href: "/search", icon: Search },
      { label: "Auctions", href: "/auctions", icon: Gavel, badgeKey: "auctions" },
    ],
  },
  {
    label: "Pipeline",
    icon: Users,
    defaultOpen: false,
    items: [
      { label: "All leads", href: "/crm", icon: Users, badgeKey: "hotLeads" },
      { label: "All deals", href: "/deals", icon: Briefcase, badgeKey: "deals" },
      { label: "Compliance", href: "/compliance", icon: ShieldCheck, badgeKey: "compliance" },
    ],
  },
  {
    label: "Institutions",
    icon: Landmark,
    defaultOpen: false,
    items: [
      { label: "Listings", href: "/institutions", icon: Landmark, badgeKey: "institutions" },
      { label: "NDA management", href: "/admin/nda", icon: ShieldCheck },
      { label: "Data rooms", href: "/institutions?tab=dataroom", icon: Download },
    ],
  },
  {
    label: "Platform admin",
    icon: ShieldCheck,
    defaultOpen: true,
    items: [
      { label: "Fraud queue", href: "/admin/fraud", icon: ShieldCheck },
      { label: "Audit logs", href: "/admin/audit", icon: Award },
      { label: "Reviews", href: "/admin/reviews", icon: Award },
      { label: "WhatsApp", href: "/admin/whatsapp", icon: Bell },
      { label: "Escrow", href: "/admin/escrow", icon: CreditCard },
      { label: "Crawler", href: "/admin/crawler", icon: Zap },
      { label: "API usage", href: "/admin/api-usage", icon: BarChart3 },
    ],
  },
  {
    label: "Users",
    icon: Users,
    defaultOpen: false,
    items: [
      { label: "All users", href: "/admin/users", icon: Users },
      { label: "Organizations", href: "/admin/organizations", icon: Building2 },
      { label: "Co-Broker (Manual)", href: "/broker-network", icon: Network },
      { label: "Partners", href: "/partners", icon: Handshake },
    ],
  },
  {
    label: "Verticals",
    icon: Globe,
    defaultOpen: false,
    items: [
      { label: "NRI workspace", href: "/verticals/nri", icon: Globe },
      { label: "HNI workspace", href: "/verticals/hni", icon: TrendingUp },
      { label: "IRM", href: "/irm", icon: Target },
      { label: "Builder portal", href: "/builder/projects", icon: Building2 },
    ],
  },
  {
    label: "Account",
    icon: Settings,
    defaultOpen: false,
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Export data", href: "/export", icon: Download },
      { label: "Profile", href: "/profile", icon: User },
      { label: "API access", href: "/api-product", icon: Zap },
    ],
  },
];

function pathMatches(pathname: string, href: string) {
  if (!href || href === "/") return pathname === "/";
  const [base] = href.split("?");
  const target = base || href;
  return pathname === target || pathname.startsWith(`${target}/`) || pathname.startsWith(`${target}?`);
}

const SIDEBAR_COUNTS_STALE_MS = 1000 * 60 * 3;
const sidebarCountsCache = new Map<string, { counts: SidebarCounts; ts: number }>();

function mergeCounts(base: SidebarCounts, next: Partial<SidebarCounts>): SidebarCounts {
  return {
    ...base,
    ...next,
  };
}

function cacheKey(token: string, role?: string | null) {
  return `${token}:${role ?? "UNKNOWN"}`;
}

function runWhenIdle(task: () => void): () => void {
  if (typeof window === "undefined") {
    task();
    return () => {};
  }
  type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    const id = idleWindow.requestIdleCallback(task, { timeout: 1200 });
    return () => {
      if (typeof idleWindow.cancelIdleCallback === "function") idleWindow.cancelIdleCallback(id);
    };
  }
  const timeout = window.setTimeout(task, 220);
  return () => window.clearTimeout(timeout);
}

function useSidebarCounts(token: string | null, role?: string | null): SidebarCounts {
  const [counts, setCounts] = useState<SidebarCounts>(EMPTY_COUNTS);

  useEffect(() => {
    if (!token || !role) return;
    let cancelled = false;
    let stopIdleTask = () => {};

    const key = cacheKey(token, role);
    const cached = sidebarCountsCache.get(key);
    if (cached && Date.now() - cached.ts < SIDEBAR_COUNTS_STALE_MS) {
      setCounts(cached.counts);
    }

    const loadCritical = async () => {
      try {
        const critical = await apiFetch<SidebarCountsResponse>("/dashboard/sidebar-counts", { token });
        if (cancelled) return;
        const next = mergeCounts(EMPTY_COUNTS, critical ?? {});
        setCounts(next);
        sidebarCountsCache.set(key, { counts: next, ts: Date.now() });
      } catch {
        if (!cancelled) setCounts(EMPTY_COUNTS);
      }
    };

    const loadNonCritical = async () => {
      try {
        const patch: Partial<SidebarCounts> = {};
        const nonCritical = await apiFetch<SidebarCountsResponse>("/dashboard/sidebar-counts?includeNonCritical=true", {
          token,
        });
        if (cancelled) return;
        patch.hotLeads = Number(nonCritical?.hotLeads ?? 0);
        if (role === "BROKER" || role === "SELLER" || role === "ADMIN" || role === "BUYER") {
          const threads = await apiFetch<{ unreadCount?: number }[]>("/chat/threads", { token }).catch(() => []);
          patch.chatUnread = Array.isArray(threads)
            ? threads.reduce((sum, t) => sum + Number(t.unreadCount ?? 0), 0)
            : 0;
        }
        if (role === "INSTITUTIONAL_BUYER" || role === "INSTITUTIONAL_SELLER" || role === "BROKER") {
          const compliance = await apiFetch<{ items?: { severity?: string }[] } | { severity?: string }[]>(
            "/compliance/feed",
            { token },
          ).catch(() => []);
          const complianceItems = Array.isArray(compliance)
            ? compliance
            : Array.isArray((compliance as { items?: { severity?: string }[] }).items)
              ? (compliance as { items: { severity?: string }[] }).items
              : [];
          patch.compliance = complianceItems.filter((item) => String(item.severity ?? "").toUpperCase() === "HIGH").length;
        }
        if (role === "HNI") {
          const auctions = await apiFetch<unknown[]>("/verticals/auctions", { token }).catch(() => []);
          patch.auctions = Array.isArray(auctions) ? auctions.length : 0;
        }
        if (role === "INSTITUTIONAL_BUYER" || role === "INSTITUTIONAL_SELLER") {
          const instRows = await apiFetch<unknown[]>("/institutions/me", { token }).catch(() => []);
          patch.institutions = Array.isArray(instRows) ? instRows.length : 0;
        }
        if (!cancelled) {
          setCounts((prev) => {
            const merged = mergeCounts(prev, patch);
            sidebarCountsCache.set(key, { counts: merged, ts: Date.now() });
            return merged;
          });
        }
      } catch {
        // Keep critical counts visible even if lazy fetches fail.
      }
    };

    void loadCritical();
    stopIdleTask = runWhenIdle(() => {
      void loadNonCritical();
    });

    const timer = setInterval(() => {
      void loadCritical();
      stopIdleTask = runWhenIdle(() => {
        void loadNonCritical();
      });
    }, 180000);
    return () => {
      cancelled = true;
      stopIdleTask();
      clearInterval(timer);
    };
  }, [token, role]);

  return counts;
}

function SidebarCategory({
  category,
  pathname,
  isCollapsed,
  isOpen,
  hasActiveChild,
  onToggle,
  counts,
  defaultBadgeClass,
}: {
  category: AdminSidebarCategory;
  pathname: string;
  isCollapsed: boolean;
  isOpen: boolean;
  hasActiveChild: boolean;
  onToggle: () => void;
  counts: SidebarCounts;
  defaultBadgeClass: string;
}) {
  const CategoryIcon = category.icon;
  const activeHeader = hasActiveChild;
  const headerClass = activeHeader
    ? "border-l-2 border-l-[#00C49A] text-[#cccccc]"
    : "border-l-2 border-l-transparent text-[#888888]";
  return (
    <div className="mx-2 mt-1">
      <button
        type="button"
        onClick={onToggle}
        title={category.label}
        className={`flex h-[34px] w-full items-center gap-2 rounded-[6px] px-3 transition hover:bg-[#ffffff06] ${headerClass}`}
      >
        <CategoryIcon className="h-[18px] w-[18px] shrink-0" />
        {!isCollapsed ? (
          <>
            <span className="text-[13px]">{category.label}</span>
            <ChevronDown
              className={`ml-auto h-3 w-3 text-[#555] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </>
        ) : null}
      </button>
      {!isCollapsed ? (
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out"
          style={{ maxHeight: isOpen ? 600 : 0, opacity: isOpen ? 1 : 0 }}
        >
          <ul className="space-y-0.5 pt-1">
            {category.items.map((item) => {
              const active = pathMatches(pathname, item.href);
              const badge =
                item.badgeKey && item.badgeKey in counts
                  ? Number(counts[item.badgeKey as keyof SidebarCounts] ?? 0)
                  : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={true}
                    className={`flex h-[34px] items-center border-l-2 pl-7 pr-3 text-[12px] transition ${
                      active
                        ? "border-l-[#00C49A] bg-[#ffffff0a] text-white"
                        : "border-l-transparent text-[#666666] hover:bg-[#ffffff08] hover:text-[#cccccc]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {badge > 0 ? (
                      <span
                        className={`ml-auto inline-flex h-4 min-w-[18px] items-center justify-center rounded-[20px] px-[5px] text-[10px] font-semibold ${
                          item.badgeColor || defaultBadgeClass
                        }`}
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
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token, sessionRole } = useAuth();
  const nav = useMemo(() => itemsForRole(sessionRole), [sessionRole]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [organizationName, setOrganizationName] = useState<string>("Independent broker");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgMemberships, setOrgMemberships] = useState<OrgMembership[]>([]);
  const [nriCountry, setNriCountry] = useState<string | null>(null);
  const [hniTicketMin, setHniTicketMin] = useState<number | null>(null);
  const [hniTicketMax, setHniTicketMax] = useState<number | null>(null);
  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const [adminCategoryOpen, setAdminCategoryOpen] = useState<Record<string, boolean>>({});
  const [adminPopoutCategory, setAdminPopoutCategory] = useState<string | null>(null);
  const counts = useSidebarCounts(token, sessionRole);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    function onMouseDown(event: MouseEvent) {
      if (!profileMenuRef.current) return;
      if (event.target instanceof Node && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (sessionRole !== "ADMIN") return;
    let initial = Object.fromEntries(ADMIN_CATEGORIES.map((c) => [c.label, c.defaultOpen])) as Record<string, boolean>;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(ADMIN_CATEGORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, boolean>;
          initial = { ...initial, ...parsed };
        }
      } catch {
        // ignore storage parse errors
      }
    }
    for (const cat of ADMIN_CATEGORIES) {
      if (cat.items.some((item) => pathMatches(pathname, item.href))) {
        initial[cat.label] = true;
      }
    }
    setAdminCategoryOpen(initial);
  }, [sessionRole, pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const isProd = process.env.NODE_ENV === "production";
    const pwaEnabled = process.env.NEXT_PUBLIC_PWA !== "false";
    if (!isProd || !pwaEnabled) {
      // Avoid stale chunk issues during local development.
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          void reg.unregister();
        });
      });
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const page = pathname === "/" ? "Workspace" : pathname.split("/").filter(Boolean).join(" · ");
    document.title = `AR Buildwel · ${page}`;
  }, [pathname]);

  const reloadWorkspaceOrgsAndProfile = useCallback(async () => {
    if (!token || !sessionRole || !WORKSPACE_SIDEBAR_ROLES.has(sessionRole)) return;
    const [profile, orgs] = await Promise.all([
      apiFetch<{ onboardingComplete?: boolean; onboardingStep?: string | null }>("/user/profile", { token }).catch(
        () => ({}),
      ),
      ORG_CONTEXT_ROLES.has(sessionRole)
        ? apiFetch<OrgMembership[]>("/organizations/mine", { token }).catch(() => [])
        : Promise.resolve([] as OrgMembership[]),
    ]);
    const p = profile as { onboardingComplete?: boolean; onboardingStep?: string | null };
    const isCompleteFromStep = String(p.onboardingStep ?? "").toLowerCase() === "complete";
    const isComplete = typeof p.onboardingComplete === "boolean" ? p.onboardingComplete : isCompleteFromStep;
    setOnboardingComplete(isComplete);
    const r = sessionRole;
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
    const resolvedOrgs = orgs ?? [];
    setOrgMemberships(resolvedOrgs);
    const active = resolvedOrgs.find((m) => m.isActive) ?? resolvedOrgs[0];
    const activeName = active?.name?.trim() || fallback;
    const activeId = active ? active.organizationId || active.id : null;
    setOrganizationName(activeName);
    setOrganizationId(activeId);
  }, [token, sessionRole]);

  useEffect(() => {
    void reloadWorkspaceOrgsAndProfile();
  }, [reloadWorkspaceOrgsAndProfile]);

  useEffect(() => {
    const handler = () => void reloadWorkspaceOrgsAndProfile();
    window.addEventListener("ar-buildwel-orgs-changed", handler);
    return () => window.removeEventListener("ar-buildwel-orgs-changed", handler);
  }, [reloadWorkspaceOrgsAndProfile]);

  async function switchOrganization(nextOrgId: string) {
    if (!token || !nextOrgId) return;
    await apiFetch("/organizations/switch", {
      method: "POST",
      token,
      body: JSON.stringify({ organizationId: nextOrgId }),
    }).catch(() => null);
    const next = orgMemberships.find((m) => (m.organizationId || m.id) === nextOrgId);
    if (next) {
      setOrganizationId(nextOrgId);
      setOrganizationName(next.name?.trim() || organizationName);
      setOrgMemberships((prev) =>
        prev.map((m) => ({
          ...m,
          isActive: (m.organizationId || m.id) === nextOrgId,
        })),
      );
    }
  }

  useEffect(() => {
    if (!token || sessionRole !== "HNI") return;
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
  }, [token, sessionRole]);

  useEffect(() => {
    if (!token || sessionRole !== "NRI") return;
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
  }, [token, sessionRole]);

  const roleIconMap = {
    "/dashboard": LayoutDashboard,
    "/analytics": BarChart3,
    "/properties": Building2,
    "/requirements": ClipboardList,
    "/search": Search,
    "/matches": Zap,
    "/crm": Users,
    "/deals": Briefcase,
    "/chat": MessageSquare,
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
    if (item.badgeKey === "chatUnread") return "bg-sky-500 text-white";
    if (role === "BUYER" && item.badgeKey === "requirements") return "bg-[#378ADD] text-white";
    return "bg-[#00C49A] text-black";
  }

  function toggleAdminCategory(label: string) {
    setAdminCategoryOpen((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      if (typeof window !== "undefined") {
        localStorage.setItem(ADMIN_CATEGORY_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  function signOut() {
    logout();
    router.replace("/login");
  }

  const wr = sessionRole;
  if (wr && WORKSPACE_SIDEBAR_ROLES.has(wr)) {
    const isSeller = wr === "SELLER";
    const isNri = wr === "NRI";
    const isBuyer = wr === "BUYER";
    const isHni = wr === "HNI";
    const isBuilder = wr === "BUILDER";
    const isInstBuyer = wr === "INSTITUTIONAL_BUYER";
    const isInstSeller = wr === "INSTITUTIONAL_SELLER";
    const isBroker = wr === "BROKER";
    const isAdmin = wr === "ADMIN";

    const sections = isAdmin
      ? BROKER_SIDEBAR_SECTIONS
      : isNri
      ? NRI_SIDEBAR_SECTIONS
      : isSeller
        ? SELLER_SIDEBAR_SECTIONS
        : isBuyer
          ? BUYER_SIDEBAR_SECTIONS
          : isHni
            ? HNI_SIDEBAR_SECTIONS
              : isBuilder
                ? BUILDER_SIDEBAR_SECTIONS
            : isInstBuyer
              ? INSTITUTIONAL_BUYER_SIDEBAR_SECTIONS
              : isInstSeller
                ? INSTITUTIONAL_SELLER_SIDEBAR_SECTIONS
                : BROKER_SIDEBAR_SECTIONS;

    const rolePill = isAdmin
      ? {
          wrap: "border border-[#00C49A25] bg-[#00C49A0F]",
          text: "text-[#00C49A]",
          dot: "bg-[#00C49A]",
          label: "ADMIN",
        }
      : isSeller
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
            : isBuilder
              ? {
                  wrap: "border border-[#00C49A25] bg-[#00C49A0F]",
                  text: "text-[#00C49A]",
                  dot: "bg-[#00C49A]",
                  label: "BUILDER",
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
        : isBuilder
          ? "text-[#00C49A]"
            : isInstBuyer
              ? "text-[#7F77DD]"
              : isInstSeller
                ? "text-[#5BAD8F]"
                : "text-[#00C49A]";

    const footerSecondary = isNri
      ? `NRI · ${nriCountry?.trim() ? flagAndCountry(nriCountry) : "Country not set"}`
      : isAdmin
        ? "Admin"
      : isSeller
        ? "Seller"
        : isBuyer
          ? "Buyer"
          : isHni
            ? "HNI Investor"
          : isBuilder
            ? "Builder"
            : isInstBuyer
              ? "Inst. Buyer"
              : isInstSeller
                ? "Inst. Seller"
                : "Broker";

    const displayName =
      user?.name?.trim() ||
      (isAdmin ? "Admin User" : isSeller ? "Seller User" : isNri ? "NRI User" : isBuyer ? "Buyer User" : isHni ? "HNI User" : isBuilder ? "Builder User" : isInstBuyer ? "Inst. Buyer" : isInstSeller ? "Inst. Seller" : "Broker User");

    const initialsSeed =
      user?.name?.trim() ||
      (isAdmin ? "Admin" : isSeller ? "Seller" : isNri ? "NRI" : isBuyer ? "Buyer" : isHni ? "HNI" : isBuilder ? "Builder" : isInstBuyer ? "Inst Buyer" : isInstSeller ? "Inst Seller" : "Broker");

    return (
      <div className="flex h-screen min-h-0 w-full overflow-hidden bg-[#0a0a0a] text-zinc-100">
        <aside
          className={`hidden h-screen shrink-0 flex-col overflow-hidden border-r border-[#1a1a1a] bg-[#0a0a0a] transition-[width,min-width] duration-200 md:flex ${
            isAdmin && adminCollapsed ? "w-16 min-w-16" : "w-[240px] min-w-[240px]"
          }`}
        >
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
                {!isAdmin || !adminCollapsed ? rolePill.label : null}
              </p>
              {!isAdmin || !adminCollapsed ? isBuyer ? <p className="mt-1 truncate text-[10px] text-[#444444]">Looking for property</p> : null : null}
              {!isAdmin || !adminCollapsed ? isHni ? (
                hniRangeOk ? (
                  <p className="mt-1 truncate text-[10px] text-[#444444]">
                    ₹{hniTicketMin}Cr – ₹{hniTicketMax}Cr
                  </p>
                ) : (
                  <Link href="/verticals/hni" className="mt-1 block truncate text-[10px] text-[#F0922B] hover:underline">
                    Set investment range →
                  </Link>
                )
              ) : null : null}
              {!isAdmin || !adminCollapsed ? isInstBuyer ? (
                <p className="mt-1 truncate text-[10px] text-[#444444]">Institutional acquisitions</p>
              ) : null : null}
              {(!isAdmin || !adminCollapsed) && orgMemberships.length > 1 ? (
                <select
                  className="mt-2 w-full rounded border border-[#2a2a2a] bg-[#0b0b0b] px-2 py-1 text-[10px] text-[#a3a3a3]"
                  value={organizationId ?? ""}
                  onChange={(e) => {
                    void switchOrganization(e.target.value);
                  }}
                >
                  {orgMemberships.map((m) => {
                    const oid = m.organizationId || m.id;
                    return (
                      <option key={oid} value={oid}>
                        {(m.name || "Organization")} ({oid})
                      </option>
                    );
                  })}
                </select>
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

            {isAdmin ? (
              <div className="relative">
                <div className="mx-2 mb-2 mt-1 flex justify-end">
                  <button
                    type="button"
                    title={adminCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    onClick={() => {
                      setAdminCollapsed((prev) => !prev);
                      setAdminPopoutCategory(null);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#777] transition hover:bg-[#ffffff09] hover:text-[#ccc]"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </div>
                {ADMIN_CATEGORIES.map((category) => {
                  const hasActiveChild = category.items.some((item) => pathMatches(pathname, item.href));
                  const isOpen = hasActiveChild || Boolean(adminCategoryOpen[category.label]);
                  return (
                    <div key={category.label} className="relative">
                      <SidebarCategory
                        category={category}
                        pathname={pathname}
                        isCollapsed={adminCollapsed}
                        isOpen={isOpen}
                        hasActiveChild={hasActiveChild}
                        onToggle={() => {
                          if (adminCollapsed) {
                            setAdminPopoutCategory((prev) => (prev === category.label ? null : category.label));
                            return;
                          }
                          toggleAdminCategory(category.label);
                        }}
                        counts={counts}
                        defaultBadgeClass="bg-[#00C49A] text-black"
                      />
                      {adminCollapsed && adminPopoutCategory === category.label ? (
                        <div className="absolute left-[64px] top-0 z-[100] min-w-[220px] rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] py-1 shadow-xl">
                          {category.items.map((item) => {
                            const active = pathMatches(pathname, item.href);
                            const badge =
                              item.badgeKey && item.badgeKey in counts
                                ? Number(counts[item.badgeKey as keyof SidebarCounts] ?? 0)
                                : 0;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                onClick={() => setAdminPopoutCategory(null)}
                                className={`mx-1 flex h-[34px] items-center rounded-md px-3 text-[12px] transition ${
                                  active ? "bg-[#ffffff0a] text-white" : "text-[#999] hover:bg-[#ffffff08] hover:text-[#ccc]"
                                }`}
                              >
                                <span>{item.label}</span>
                                {badge > 0 ? (
                                  <span
                                    className={`ml-auto inline-flex h-4 min-w-[18px] items-center justify-center rounded-[20px] px-[5px] text-[10px] font-semibold ${
                                      item.badgeColor || "bg-[#00C49A] text-black"
                                    }`}
                                  >
                                    {badge}
                                  </span>
                                ) : null}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              sections.map((section) => (
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
              ))
            )}
          </div>

          <div className="relative shrink-0 border-t border-[#1a1a1a] p-3" ref={profileMenuRef}>
            <AnimatePresence>
              {profileMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute left-3 z-50 w-[220px] rounded-[10px] border border-[#2a2a2a] bg-[#1a1a1a] p-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
                  style={{ bottom: 72 }}
                >
                  {(wr === "BROKER" || wr === "INSTITUTIONAL_BUYER" || wr === "INSTITUTIONAL_SELLER") &&
                  !organizationId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          router.push("/organizations/setup");
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-[#00C49A] transition hover:bg-[#00C49A14]"
                      >
                        <Building2 className="h-[14px] w-[14px]" />
                        Create organization
                      </button>
                      <div className="my-1 h-px bg-[#2a2a2a]" />
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-[#ccc] transition hover:bg-[#2a2a2a]"
                  >
                    <User className="h-[14px] w-[14px] text-[#888]" />
                    View profile
                  </button>
                  <div className="my-1 h-px bg-[#2a2a2a]" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/profile?tab=settings");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-[#ccc] transition hover:bg-[#2a2a2a]"
                  >
                    <Settings className="h-[14px] w-[14px] text-[#888]" />
                    Account settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/profile?tab=organization");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-[#ccc] transition hover:bg-[#2a2a2a]"
                  >
                    <Building2 className="h-[14px] w-[14px] text-[#888]" />
                    Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/settings/notifications");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-[#ccc] transition hover:bg-[#2a2a2a]"
                  >
                    <Bell className="h-[14px] w-[14px] text-[#888]" />
                    Alert preferences
                  </button>
                  <div className="my-1 h-px bg-[#2a2a2a]" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-[#FF4444] transition hover:bg-[#FF444410]"
                  >
                    <LogOut className="h-[14px] w-[14px] text-[#FF4444]" />
                    Log out
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className={`flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 text-left transition hover:bg-[#ffffff08] ${
                isAdmin && adminCollapsed ? "justify-center" : "gap-2.5"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-[12px] font-semibold ${avatarTone}`}
              >
                {getInitials(initialsSeed)}
              </div>
              {isAdmin && adminCollapsed ? null : <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white">{displayName}</p>
                <p className="truncate text-[10px] text-[#444444]">{footerSecondary}</p>
                {(isBroker || isSeller || isNri || isInstSeller) && organizationId ? (
                  <div className="mt-1 border-t border-[#2a2a2a]/80 pt-1">
                    <p className="truncate text-[10px] font-medium leading-tight text-[#00C49A]" title={organizationName}>
                      {organizationName}
                    </p>
                    <p
                      className="truncate font-mono text-[9px] leading-tight text-[#666]"
                      title={organizationId ?? undefined}
                    >
                      {organizationId}
                    </p>
                  </div>
                ) : null}
              </div>}
              {isAdmin && adminCollapsed ? null : <ChevronUp className="h-3 w-3 text-[#555]" />}
            </button>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#0a0a0a] text-zinc-100 [color-scheme:dark] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
              {sessionRole ? <span className="text-zinc-200">{sessionRole}</span> : null}
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
          <main className="flex-1 bg-[#0a0a0a] p-6 text-zinc-100 [color-scheme:dark]">{children}</main>
        </div>
      </div>
    </div>
  );
}
