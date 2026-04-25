"use client";

import {
  ArrowRight,
  Banknote,
  Building2,
  ClipboardCheck,
  FileText,
  Globe,
  Home,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatINR, getInitials, timeAgo } from "@/lib/format";
import { flagAndCountry } from "@/lib/nri-ui";

type DashSummary = {
  unreadCount: number;
  digestStrip: { id: string; title: string; body: string }[];
  quickStats: { myProperties: number; myRequirements: number; myMatches: number };
};

type PropRow = {
  id: string;
  title: string;
  city: string;
  localityPublic?: string;
  price?: unknown;
  status?: string;
  dealType?: string;
  imageUrls?: string[];
  matches?: { id: string }[];
};

type SvcReq = { id: string; type: string; status: string; createdAt: string };

type NriProf = { country: string | null; assignedManager: string | null };

function listingStatus(p: PropRow): "FOR_SALE" | "ON_RENT" | "VACANT" | "MONITORING" {
  const st = String(p.status ?? "active").toUpperCase();
  const dt = String(p.dealType ?? "SALE").toUpperCase();
  if (st === "PAUSED" || st === "PENDING") return "MONITORING";
  if (dt === "RENT" && st === "ACTIVE") return "ON_RENT";
  if (st === "SOLD") return "VACANT";
  return "FOR_SALE";
}

function statusPill(s: ReturnType<typeof listingStatus>) {
  const map = {
    FOR_SALE: { label: "For Sale", className: "border-[#00C49A40] bg-[#00C49A14] text-[#00C49A]" },
    ON_RENT: { label: "On Rent", className: "border-[#378ADD40] bg-[#378ADD14] text-[#7FB8FF]" },
    VACANT: { label: "Vacant", className: "border-[#FFB34740] bg-[#FFB34714] text-[#FFB347]" },
    MONITORING: { label: "Monitoring only", className: "border-[#444] bg-[#1a1a1a] text-[#888]" },
  }[s];
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${map.className}`}>{map.label}</span>;
}

function svcPipeline(status: string): { label: string; active: boolean }[] {
  const u = status.toLowerCase();
  const steps = [
    { key: "pend", label: "PENDING", active: u === "open" },
    { key: "asg", label: "ASSIGNED", active: u === "assigned" },
    { key: "prog", label: "IN PROGRESS", active: u === "in_progress" },
    { key: "done", label: "DONE", active: u === "completed" },
  ];
  return steps.map((s) => ({ label: s.label, active: s.active }));
}

function digitsForTel(s: string | null | undefined): string | null {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.startsWith("91") && d.length > 10 ? d : d;
}

export function NriDashboardView({
  greeting,
  userName,
  now,
  summary,
  properties,
  svcRequests,
  nriProfile,
}: {
  greeting: string;
  userName: string;
  now: Date;
  summary: DashSummary | null;
  properties: PropRow[];
  svcRequests: SvcReq[];
  nriProfile: NriProf | null;
}) {
  const country = nriProfile?.country?.trim() ?? "";
  const manager = nriProfile?.assignedManager?.trim() ?? "";
  const telDigits = digitsForTel(manager);
  const telHref = telDigits ? `tel:+${telDigits.replace(/^\+/, "")}` : null;
  const waHref = telDigits ? `https://wa.me/${telDigits.replace(/^\+/, "")}` : "/services-hub";

  const forSale = properties.filter((p) => listingStatus(p) === "FOR_SALE").length;
  const onRent = properties.filter((p) => listingStatus(p) === "ON_RENT").length;
  const rentProps = properties.filter((p) => listingStatus(p) === "ON_RENT");
  const monthlyRent = rentProps.reduce((sum, p) => sum + Number(p.price ?? 0), 0);

  const openSvc = svcRequests.filter((r) => !["completed", "cancelled"].includes(String(r.status).toLowerCase()));
  const inProg = openSvc.filter((r) => String(r.status).toLowerCase() === "in_progress").length;
  const pend = openSvc.filter((r) => String(r.status).toLowerCase() === "open" || String(r.status).toLowerCase() === "assigned").length;

  const matchCount = summary?.quickStats.myMatches ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {greeting}, {userName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="rose">NRI</Badge>
            <span className="text-xs text-[#888]">Managing from abroad</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-sm text-[#888]">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {country ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1a1a1a] bg-[#111111] px-3 py-1 text-xs text-white">
              <span aria-hidden>{flagAndCountry(country).split(" ")[0]}</span>
              <span>{country}</span>
            </span>
          ) : null}
        </div>
      </div>

      {(summary?.unreadCount ?? 0) > 0 && (summary?.digestStrip?.length ?? 0) > 0 ? (
        <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[#555]">Updates for you</p>
          <ul className="mt-3 space-y-2">
            {(summary?.digestStrip ?? []).slice(0, 4).map((item) => {
              const t = `${item.title} ${item.body}`.toLowerCase();
              const Icon =
                t.includes("match") || t.includes("requirement")
                  ? Zap
                  : t.includes("service") || t.includes("request")
                    ? ClipboardCheck
                    : t.includes("manager") || t.includes("note")
                      ? MessageSquare
                      : t.includes("property") || t.includes("listing")
                        ? Building2
                        : Zap;
              const tone =
                Icon === ClipboardCheck
                  ? "text-[#E85D8A]"
                  : Icon === MessageSquare
                    ? "text-[#378ADD]"
                    : "text-[#00C49A]";
              return (
                <li key={item.id} className="flex gap-3 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                  <div>
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-[#888]">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-xl border border-[#1a1a1a] bg-[#111111] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        {manager ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E85D8A20] text-sm font-semibold text-[#E85D8A]">
                {getInitials(manager)}
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#555]">Your AR Buildwel Manager</p>
                <p className="text-[15px] font-semibold text-white">{manager}</p>
                <p className="text-xs text-[#888]">Available Mon–Sat, 10AM–6PM IST</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="flex gap-2">
                {telHref ? (
                  <a
                    href={telHref}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] text-[#00C49A] hover:bg-[#00C49A12]"
                    aria-label="Call manager"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                ) : null}
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] text-[#00C49A] hover:bg-[#00C49A12]"
                  aria-label="Message manager"
                >
                  <MessageSquare className="h-4 w-4" />
                </a>
              </div>
              <p className="text-[11px] text-[#888]">Contact manager</p>
            </div>
          </>
        ) : (
          <div className="text-sm text-[#888]">
            <p className="text-white">No manager assigned yet</p>
            <Link href="/services-hub" className="mt-1 inline-block text-[#00C49A] hover:underline">
              Contact support
            </Link>
          </div>
        )}
      </motion.section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Indian properties"
          value={properties.length}
          subtext={
            <span>
              <span className="text-[#00C49A]">{forSale} for sale</span>
              <span className="text-[#888]"> · </span>
              <span className="text-[#378ADD]">{onRent} on rent</span>
            </span>
          }
          delay={0}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Service requests"
          value={openSvc.length}
          subtext={
            <span>
              <span className="text-[#00C49A]">{inProg} in progress</span>
              <span className="text-[#888]"> · </span>
              <span className="text-[#E85D8A]">{pend} pending</span>
            </span>
          }
          delay={0.05}
          iconClassName="text-[#E85D8A]"
        />
        <StatCard icon={Zap} label="Property matches" value={matchCount} subtext="New since last visit" delay={0.1} />
        <StatCard
          icon={TrendingUp}
          label="Monthly rental"
          value={rentProps.length ? formatINR(monthlyRent) : "—"}
          subtext={
            rentProps.length ? (
              <span>From {rentProps.length} properties</span>
            ) : (
              <Link href="/services-hub?type=rental" className="text-[#00C49A] hover:underline">
                Set up rental →
              </Link>
            )
          }
          delay={0.15}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <Building2 className="h-4 w-4 text-[#00C49A]" />
                My properties in India
              </p>
              <Link href="/properties" className="text-xs text-[#00C49A] hover:underline">
                View all →
              </Link>
            </div>
            {properties.length ? (
              <ul className="divide-y divide-[#1a1a1a]">
                {properties.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    {p.imageUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrls[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a]">
                        <Building2 className="h-4 w-4 text-[#444]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">{p.title}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#888]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {p.city}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {statusPill(listingStatus(p))}
                        <p className="text-xs text-[#555]">{formatINR(Number(p.price ?? 0))}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Building2}
                title="No properties listed yet"
                subtitle="List your Indian property to track it from abroad."
                actionHref="/properties/new"
                actionLabel="Post your Indian property"
              />
            )}
          </section>

          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <ClipboardCheck className="h-4 w-4 text-[#E85D8A]" />
                Active requests
              </p>
              <Link href="/services-hub" className="text-xs text-[#00C49A] hover:underline">
                New request →
              </Link>
            </div>
            {openSvc.length ? (
              <ul className="space-y-3">
                {openSvc.slice(0, 5).map((r) => {
                  const steps = svcPipeline(r.status);
                  return (
                    <li key={r.id} className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded border border-[#E85D8A30] bg-[#E85D8A10] px-2 py-0.5 text-[11px] font-medium uppercase text-[#E85D8A]">
                          {r.type}
                        </span>
                        <span className="text-[11px] text-[#555]">{timeAgo(r.createdAt)}</span>
                      </div>
                      <p className="mt-2 truncate text-[13px] text-white">Service request · {r.type}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] text-[#555]">
                        {steps.map((s) => (
                          <span
                            key={s.label}
                            className={`inline-flex items-center gap-1 ${s.active ? "text-[#00C49A]" : "text-[#555]"}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${s.active ? "bg-[#00C49A]" : "bg-[#333]"}`} />
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="No active requests"
                subtitle="Get legal, tax, or property management help from your dashboard team."
                actionHref="/services-hub"
                actionLabel="Request a service"
              />
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">Quick actions</p>
            <ul className="mt-3 space-y-0">
              {(
                [
                  { href: "/properties/new", icon: Building2, label: "List my property for sale" },
                  { href: "/services-hub?type=rental", icon: Home, label: "Manage my rental property" },
                  { href: "/services-hub?type=legal", icon: FileText, label: "Get legal help (POA/title)" },
                  { href: "/services-hub?type=loan", icon: Banknote, label: "NRI home loan assistance" },
                  { href: "/verticals/nri#guidance", icon: FileText, label: "FEMA / TDS guidance" },
                  { href: "/irm", icon: TrendingUp, label: "Explore investment deals" },
                  { href: "/verticals/nri", icon: Globe, label: "Update my NRI profile" },
                ] as const
              ).map((row) => (
                <li key={row.href}>
                  <Link
                    href={row.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-[#ccc] transition hover:bg-[#00C49A12] hover:text-white"
                  >
                    <row.icon className="h-4 w-4 shrink-0 text-[#00C49A]" />
                    <span className="min-w-0 flex-1">{row.label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#555]" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck className="h-4 w-4 text-[#00C49A]" />
              NRI compliance
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-1">
              <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                <Banknote className="h-5 w-5 text-[#FFB347]" />
                <p className="mt-2 text-sm font-medium text-white">TDS on property sale</p>
                <p className="mt-1 text-xs leading-relaxed text-[#888]">
                  20% TDS applicable on NRI property sales. Platform assists with Form 15CA/CB.
                </p>
              </div>
              <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                <Globe className="h-5 w-5 text-[#00C49A]" />
                <p className="mt-2 text-sm font-medium text-white">Repatriation allowed</p>
                <p className="mt-1 text-xs leading-relaxed text-[#888]">
                  Sale proceeds up to $1M/year can be repatriated. Requires CA certificate.
                </p>
              </div>
              <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                <ShieldCheck className="h-5 w-5 text-[#00C49A]" />
                <p className="mt-2 text-sm font-medium text-white">FEMA compliance</p>
                <p className="mt-1 text-xs leading-relaxed text-[#888]">
                  NRI can hold residential property. Agricultural land purchase restricted.
                </p>
              </div>
            </div>
            <p className="mt-4 text-[11px] italic text-[#555]">Consult your CA for specific advice</p>
            <p className="mt-1 text-[11px] text-[#444]">AR Buildwel provides information only, not financial advice.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
