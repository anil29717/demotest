export type AppRole =
  | "ADMIN"
  | "BROKER"
  | "BUYER"
  | "SELLER"
  | "NRI"
  | "HNI"
  | "INSTITUTIONAL_BUYER"
  | "INSTITUTIONAL_SELLER";

/** Keys resolved to Lucide icons in `NavIcon` */
export type NavIconKey =
  | "layout-dashboard"
  | "building-2"
  | "plus-circle"
  | "clipboard-list"
  | "file-plus"
  | "git-merge"
  | "briefcase"
  | "users"
  | "bell"
  | "landmark"
  | "gavel"
  | "globe"
  | "trending-up"
  | "handshake"
  | "line-chart"
  | "credit-card"
  | "search"
  | "bar-chart-3"
  | "shield-check"
  | "scale"
  | "user-circle"
  | "award"
  | "sliders-horizontal"
  | "scroll-text"
  | "star"
  | "rocket"
  | "download";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  roles: AppRole[];
};

export type BrokerSidebarItem = {
  href: string;
  label: string;
  icon?: NavIconKey;
  subItem?: boolean;
  badgeKey?: "properties" | "requirements" | "matches" | "hotLeads" | "deals" | "compliance" | "auctions" | "institutions";
};

export type BrokerSidebarSection = {
  category: string;
  items: BrokerSidebarItem[];
};

export type SellerSidebarSection = {
  category: string;
  items: BrokerSidebarItem[];
};

export const SIDEBAR_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "layout-dashboard",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/properties",
    label: "Properties",
    icon: "building-2",
    roles: ["ADMIN", "BROKER", "SELLER", "NRI", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/properties/new",
    label: "Post property",
    icon: "plus-circle",
    roles: ["ADMIN", "BROKER", "SELLER", "NRI", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/requirements",
    label: "Requirements",
    icon: "clipboard-list",
    roles: ["ADMIN", "BROKER", "BUYER", "NRI", "INSTITUTIONAL_BUYER"],
  },
  {
    href: "/requirements/new",
    label: "Post requirement",
    icon: "file-plus",
    roles: ["ADMIN", "BROKER", "BUYER", "NRI", "INSTITUTIONAL_BUYER"],
  },
  {
    href: "/matches",
    label: "Matches",
    icon: "git-merge",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/broker-network",
    label: "Broker network",
    icon: "bar-chart-3",
    roles: ["ADMIN", "BROKER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  { href: "/deals", label: "Deals", icon: "briefcase", roles: ["ADMIN", "BROKER", "SELLER", "BUYER"] },
  { href: "/crm", label: "CRM leads", icon: "users", roles: ["ADMIN", "BROKER"] },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "bell",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/institutions",
    label: "Institutions",
    icon: "landmark",
    roles: ["ADMIN", "BROKER", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  { href: "/auctions", label: "Auctions", icon: "gavel", roles: ["ADMIN", "BROKER", "HNI"] },
  { href: "/verticals/nri", label: "NRI", icon: "globe", roles: ["ADMIN", "NRI"] },
  { href: "/verticals/hni", label: "HNI", icon: "trending-up", roles: ["ADMIN", "HNI"] },
  { href: "/partners", label: "Partners", icon: "handshake", roles: ["ADMIN", "BROKER"] },
  { href: "/irm", label: "IRM", icon: "line-chart", roles: ["ADMIN", "BROKER", "HNI", "NRI"] },
  {
    href: "/billing",
    label: "Billing",
    icon: "credit-card",
    roles: ["ADMIN", "BROKER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/search",
    label: "Search",
    icon: "search",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  { href: "/analytics", label: "Analytics", icon: "bar-chart-3", roles: ["ADMIN", "BROKER", "SELLER", "HNI"] },
  {
    href: "/compliance",
    label: "Compliance",
    icon: "shield-check",
    roles: ["ADMIN", "BROKER", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/services-hub",
    label: "Legal & loans",
    icon: "scale",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/onboarding",
    label: "Onboarding",
    icon: "user-circle",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/reputation",
    label: "Reputation",
    icon: "award",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/settings/notifications",
    label: "Alert prefs",
    icon: "sliders-horizontal",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  {
    href: "/export",
    label: "Export data",
    icon: "download",
    roles: ["ADMIN", "BROKER", "BUYER", "SELLER", "NRI", "HNI", "INSTITUTIONAL_BUYER", "INSTITUTIONAL_SELLER"],
  },
  { href: "/admin/whatsapp", label: "WhatsApp (admin)", icon: "bell", roles: ["ADMIN"] },
  { href: "/admin/fraud", label: "Fraud (admin)", icon: "shield-check", roles: ["ADMIN"] },
  { href: "/admin/audit", label: "Audit (admin)", icon: "scroll-text", roles: ["ADMIN"] },
  { href: "/admin/reviews", label: "Reviews (admin)", icon: "star", roles: ["ADMIN"] },
  { href: "/phase2", label: "Phase 2", icon: "rocket", roles: ["ADMIN"] },
];

export const BROKER_SIDEBAR_SECTIONS: BrokerSidebarSection[] = [
  {
    category: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
      { href: "/analytics", label: "Analytics", icon: "bar-chart-3" },
    ],
  },
  {
    category: "Listings",
    items: [
      { href: "/properties", label: "Properties", icon: "building-2", badgeKey: "properties" },
      { href: "/properties/new", label: "Post property", subItem: true },
      { href: "/requirements", label: "Requirements", icon: "clipboard-list", badgeKey: "requirements" },
      { href: "/requirements/new", label: "Post requirement", subItem: true },
      { href: "/search", label: "Search", icon: "search" },
    ],
  },
  {
    category: "Pipeline",
    items: [
      { href: "/matches", label: "Matches", icon: "git-merge", badgeKey: "matches" },
      { href: "/crm", label: "CRM leads", icon: "users", badgeKey: "hotLeads" },
      { href: "/deals", label: "Deals", icon: "briefcase", badgeKey: "deals" },
    ],
  },
  {
    category: "Verticals",
    items: [
      { href: "/institutions", label: "Institutions", icon: "landmark" },
      { href: "/auctions", label: "Auctions", icon: "gavel" },
      { href: "/irm", label: "IRM", icon: "line-chart" },
    ],
  },
  {
    category: "Network",
    items: [
      { href: "/broker-network", label: "Broker network", icon: "users" },
      { href: "/partners", label: "Partners", icon: "handshake" },
    ],
  },
  {
    category: "Services",
    items: [
      { href: "/services-hub", label: "Legal & loans", icon: "scale" },
      { href: "/compliance", label: "Compliance", icon: "shield-check", badgeKey: "compliance" },
      { href: "/settings/notifications", label: "Alert prefs", icon: "bell" },
    ],
  },
  {
    category: "Account",
    items: [
      { href: "/reputation", label: "Reputation", icon: "award" },
      { href: "/billing", label: "Billing", icon: "credit-card" },
      { href: "/export", label: "Export data", icon: "download" },
    ],
  },
];

export const NRI_SIDEBAR_SECTIONS: SellerSidebarSection[] = [
  {
    category: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" }],
  },
  {
    category: "My Properties",
    items: [
      { href: "/properties", label: "Properties", icon: "building-2", badgeKey: "properties" },
      { href: "/properties/new", label: "Post property", subItem: true },
      { href: "/search", label: "Search", icon: "search" },
    ],
  },
  {
    category: "Demand",
    items: [
      { href: "/requirements", label: "Requirements", icon: "clipboard-list" },
      { href: "/requirements/new", label: "Post requirement", subItem: true },
      { href: "/matches", label: "Matches", icon: "git-merge", badgeKey: "matches" },
    ],
  },
  {
    category: "NRI Services",
    items: [
      { href: "/verticals/nri", label: "NRI workspace", icon: "globe" },
      { href: "/irm", label: "IRM", icon: "line-chart" },
    ],
  },
  {
    category: "Network",
    items: [{ href: "/broker-network", label: "Broker network", icon: "bar-chart-3" }],
  },
  {
    category: "Services",
    items: [
      { href: "/services-hub", label: "Legal & loans", icon: "scale" },
      { href: "/settings/notifications", label: "Alert prefs", icon: "bell" },
    ],
  },
  {
    category: "Account",
    items: [
      { href: "/reputation", label: "Reputation", icon: "award" },
      { href: "/billing", label: "Billing", icon: "credit-card" },
      { href: "/export", label: "Export data", icon: "download" },
    ],
  },
];

export const BUYER_SIDEBAR_SECTIONS: BrokerSidebarSection[] = [
  {
    category: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" }],
  },
  {
    category: "My Search",
    items: [
      { href: "/requirements", label: "Requirements", icon: "clipboard-list", badgeKey: "requirements" },
      { href: "/requirements/new", label: "Post requirement", subItem: true },
      { href: "/matches", label: "Matches", icon: "git-merge", badgeKey: "matches" },
      { href: "/search", label: "Search", icon: "search" },
    ],
  },
  {
    category: "Transactions",
    items: [{ href: "/deals", label: "My deals", icon: "briefcase", badgeKey: "deals" }],
  },
  {
    category: "Services",
    items: [
      { href: "/services-hub", label: "Legal & loans", icon: "scale" },
      { href: "/settings/notifications", label: "Alert prefs", icon: "bell" },
    ],
  },
  {
    category: "Account",
    items: [
      { href: "/reputation", label: "Reputation", icon: "award" },
      { href: "/billing", label: "Billing", icon: "credit-card" },
      { href: "/export", label: "Export data", icon: "download" },
    ],
  },
];

export const HNI_SIDEBAR_SECTIONS: BrokerSidebarSection[] = [
  {
    category: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
      { href: "/analytics", label: "Analytics", icon: "bar-chart-3" },
    ],
  },
  {
    category: "Investments",
    items: [
      { href: "/matches", label: "Matches", icon: "git-merge", badgeKey: "matches" },
      { href: "/auctions", label: "Auctions", icon: "gavel", badgeKey: "auctions" },
      { href: "/institutions", label: "Institutions", icon: "landmark" },
      { href: "/irm", label: "IRM", icon: "line-chart" },
    ],
  },
  {
    category: "Network",
    items: [{ href: "/broker-network", label: "Broker network", icon: "bar-chart-3" }],
  },
  {
    category: "Services",
    items: [
      { href: "/services-hub", label: "Legal & loans", icon: "scale" },
      { href: "/settings/notifications", label: "Alert prefs", icon: "bell" },
    ],
  },
  {
    category: "Account",
    items: [
      { href: "/reputation", label: "Reputation", icon: "award" },
      { href: "/billing", label: "Billing", icon: "credit-card" },
      { href: "/export", label: "Export data", icon: "download" },
    ],
  },
];

export const INSTITUTIONAL_BUYER_SIDEBAR_SECTIONS: BrokerSidebarSection[] = [
  {
    category: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" }],
  },
  {
    category: "Deal Flow",
    items: [
      { href: "/institutions", label: "Institutions", icon: "landmark", badgeKey: "institutions" },
      { href: "/requirements", label: "Requirements", icon: "clipboard-list", badgeKey: "requirements" },
      { href: "/requirements/new", label: "Post requirement", subItem: true },
      { href: "/matches", label: "Matches", icon: "git-merge", badgeKey: "matches" },
    ],
  },
  {
    category: "Due Diligence",
    items: [{ href: "/compliance", label: "Compliance", icon: "shield-check", badgeKey: "compliance" }],
  },
  {
    category: "Network",
    items: [{ href: "/broker-network", label: "Broker network", icon: "bar-chart-3" }],
  },
  {
    category: "Services",
    items: [
      { href: "/services-hub", label: "Legal & loans", icon: "scale" },
      { href: "/settings/notifications", label: "Alert prefs", icon: "bell" },
    ],
  },
  {
    category: "Account",
    items: [
      { href: "/reputation", label: "Reputation", icon: "award" },
      { href: "/billing", label: "Billing", icon: "credit-card" },
      { href: "/export", label: "Export data", icon: "download" },
    ],
  },
];

export const INSTITUTIONAL_SELLER_SIDEBAR_SECTIONS: BrokerSidebarSection[] = [
  {
    category: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" }],
  },
  {
    category: "My Institution",
    items: [
      { href: "/properties", label: "Properties", icon: "building-2" },
      { href: "/properties/new", label: "Post property", subItem: true },
      { href: "/institutions", label: "Institutions", icon: "landmark", badgeKey: "institutions" },
      { href: "/matches", label: "Matches", icon: "git-merge", badgeKey: "matches" },
    ],
  },
  {
    category: "Due Diligence",
    items: [{ href: "/compliance", label: "Compliance", icon: "shield-check", badgeKey: "compliance" }],
  },
  {
    category: "Network",
    items: [{ href: "/broker-network", label: "Broker network", icon: "bar-chart-3" }],
  },
  {
    category: "Services",
    items: [
      { href: "/services-hub", label: "Legal & loans", icon: "scale" },
      { href: "/settings/notifications", label: "Alert prefs", icon: "bell" },
    ],
  },
  {
    category: "Account",
    items: [
      { href: "/reputation", label: "Reputation", icon: "award" },
      { href: "/billing", label: "Billing", icon: "credit-card" },
      { href: "/export", label: "Export data", icon: "download" },
    ],
  },
];

export const SELLER_SIDEBAR_SECTIONS: SellerSidebarSection[] = [
  {
    category: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
      { href: "/analytics", label: "Analytics", icon: "bar-chart-3" },
    ],
  },
  {
    category: "My Listings",
    items: [
      { href: "/properties", label: "Properties", icon: "building-2", badgeKey: "properties" },
      { href: "/properties/new", label: "Post property", subItem: true },
      { href: "/search", label: "Search", icon: "search" },
    ],
  },
  {
    category: "Demand",
    items: [{ href: "/matches", label: "Matches", icon: "git-merge", badgeKey: "matches" }],
  },
  {
    category: "Transactions",
    items: [{ href: "/deals", label: "Deals", icon: "briefcase", badgeKey: "deals" }],
  },
  {
    category: "Services",
    items: [
      { href: "/services-hub", label: "Legal & loans", icon: "scale" },
      { href: "/settings/notifications", label: "Alert prefs", icon: "bell" },
    ],
  },
  {
    category: "Account",
    items: [
      { href: "/reputation", label: "Reputation", icon: "award" },
      { href: "/billing", label: "Billing", icon: "credit-card" },
      { href: "/export", label: "Export data", icon: "download" },
    ],
  },
];

const PUBLIC_WORKSPACE_PATHS = ["/dashboard"];

const PROTECTED_PATH_PREFIXES = SIDEBAR_ITEMS.map((i) => i.href).sort(
  (a, b) => b.length - a.length,
);

export function itemsForRole(role?: string | null): NavItem[] {
  if (role === "ADMIN") return [...SIDEBAR_ITEMS];
  if (!role) return SIDEBAR_ITEMS.filter((i) => PUBLIC_WORKSPACE_PATHS.includes(i.href));
  if (role === "BROKER") {
    const orderedHrefs = BROKER_SIDEBAR_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.href),
    );
    return orderedHrefs
      .map((href) => SIDEBAR_ITEMS.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item))
      .filter((item) => item.roles.includes("BROKER"));
  }
  if (role === "SELLER") {
    const orderedHrefs = SELLER_SIDEBAR_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.href),
    );
    return orderedHrefs
      .map((href) => SIDEBAR_ITEMS.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item))
      .filter((item) => item.roles.includes("SELLER"));
  }
  if (role === "NRI") {
    const orderedHrefs = NRI_SIDEBAR_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.href),
    );
    return orderedHrefs
      .map((href) => SIDEBAR_ITEMS.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item))
      .filter((item) => item.roles.includes("NRI"));
  }
  if (role === "BUYER") {
    const orderedHrefs = BUYER_SIDEBAR_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    return orderedHrefs
      .map((href) => SIDEBAR_ITEMS.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item))
      .filter((item) => item.roles.includes("BUYER"));
  }
  if (role === "HNI") {
    const orderedHrefs = HNI_SIDEBAR_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    return orderedHrefs
      .map((href) => SIDEBAR_ITEMS.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item))
      .filter((item) => item.roles.includes("HNI"));
  }
  if (role === "INSTITUTIONAL_BUYER") {
    const orderedHrefs = INSTITUTIONAL_BUYER_SIDEBAR_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    return orderedHrefs
      .map((href) => SIDEBAR_ITEMS.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item))
      .filter((item) => item.roles.includes("INSTITUTIONAL_BUYER"));
  }
  if (role === "INSTITUTIONAL_SELLER") {
    const orderedHrefs = INSTITUTIONAL_SELLER_SIDEBAR_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    return orderedHrefs
      .map((href) => SIDEBAR_ITEMS.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item))
      .filter((item) => item.roles.includes("INSTITUTIONAL_SELLER"));
  }
  return SIDEBAR_ITEMS.filter((i) => i.roles.includes(role as AppRole));
}

export function canAccessPath(pathname: string, role?: string | null): boolean {
  const matched = PROTECTED_PATH_PREFIXES.find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!matched) return true;
  if (role === "ADMIN") return true;
  const nav = SIDEBAR_ITEMS.find((i) => i.href === matched);
  if (!nav) return true;
  if (!role) return PUBLIC_WORKSPACE_PATHS.includes(nav.href);
  return nav.roles.includes(role as AppRole);
}

