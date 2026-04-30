"use client";

import { Bell, Briefcase, Building2, CheckCircle, Eye, GitMerge, MapPin, ShieldCheck, Users, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR, getInitials, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { BuyerDashboardView } from "./buyer-dashboard-view";
import { HniDashboardView } from "./hni-dashboard-view";
import { InstitutionalBuyerDashboardView } from "./institutional-buyer-dashboard-view";
import { InstitutionalSellerDashboardView } from "./institutional-seller-dashboard-view";
import { NriDashboardView } from "./nri-dashboard-view";

type DashboardSummary = {
  unreadCount: number;
  digestStrip: { id: string; title: string; body: string }[];
  quickStats: { myProperties: number; myRequirements: number; myMatches: number };
  recentMatches: {
    id: string;
    matchScore: number;
    property: { id: string; title: string; city: string };
    requirement: { id: string; city: string; tag: string };
  }[];
};

type Lead = { id: string; leadName: string; source: string; pipelineStage: string | null; createdAt: string };
type Deal = { id: string; stage: string; valueInr?: unknown };
type SellerProperty = {
  id: string;
  title: string;
  city: string;
  localityPublic?: string;
  price?: unknown;
  status?: string;
  dealType?: string;
  imageUrls?: string[];
  matches?: { id: string }[];
  views?: number;
};

type NriDashProfile = { country: string | null; assignedManager: string | null };
type SvcReq = { id: string; type: string; status: string; createdAt: string };

export default function DashboardPage() {
  const { token, ready, user } = useAuth();
  const canReadLeads = user?.role === "ADMIN" || user?.role === "BROKER";
  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ["dashboard-all", token, user?.role],
    enabled: Boolean(ready && token && user?.role),
    queryFn: async () => {
      if (
        user?.role === "BUYER" ||
        user?.role === "HNI" ||
        user?.role === "INSTITUTIONAL_BUYER" ||
        user?.role === "INSTITUTIONAL_SELLER"
      ) {
        return {
          summary: null as DashboardSummary | null,
          deals: [] as Deal[],
          leads: [] as Lead[],
          orgName: null as string | null,
          properties: [] as SellerProperty[],
          nriDashProfile: null as NriDashProfile | null,
          svcRequests: [] as SvcReq[],
        };
      }

      if (user?.role === "NRI") {
        const summary = await apiFetch<DashboardSummary>("/dashboard/summary", {
          token: token ?? undefined,
        }).catch(() => null);
        const nriDashProfile = await apiFetch<NriDashProfile>("/verticals/nri/profile", {
          token: token ?? undefined,
        }).catch(() => null);
        return {
          summary,
          deals: [] as Deal[],
          leads: [] as Lead[],
          orgName: null as string | null,
          properties: [] as SellerProperty[],
          nriDashProfile,
          svcRequests: [] as SvcReq[],
        };
      }

      const [summary, deals, leads, orgs, properties] = await Promise.all([
        apiFetch<DashboardSummary>("/dashboard/summary", { token: token ?? undefined }).catch(() => null),
        apiFetch<Deal[]>("/deals?limit=20&offset=0", { token: token ?? undefined }).catch(() => []),
        canReadLeads
          ? apiFetch<Lead[]>("/leads?limit=20&offset=0", { token: token ?? undefined }).catch(() => [])
          : Promise.resolve([] as Lead[]),
        apiFetch<{ id: string; name: string }[]>("/organizations/mine", {
          token: token ?? undefined,
        }).catch(() => []),
        apiFetch<SellerProperty[]>("/properties/mine?limit=20&offset=0", { token: token ?? undefined }).catch(() => []),
      ]);
      return {
        summary,
        deals,
        leads: leads.slice(0, 5),
        orgName: orgs[0]?.name ?? null,
        properties,
        nriDashProfile: null as NriDashProfile | null,
        svcRequests: [] as SvcReq[],
      };
    },
    staleTime: 1000 * 60 * 2,
  });
  const summary = dashboardData?.summary ?? null;
  const deals = dashboardData?.deals ?? [];
  const leads = dashboardData?.leads ?? [];
  const orgName = dashboardData?.orgName ?? null;
  const properties = dashboardData?.properties ?? [];
  const nriDashProfile = dashboardData?.nriDashProfile ?? null;
  const svcRequests = dashboardData?.svcRequests ?? [];

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  const hotMatches = summary?.recentMatches.filter((m) => m.matchScore >= 80).length ?? 0;
  const pipelineValue = deals.reduce((sum, d) => sum + Number(d.valueInr ?? 0), 0);

  if (!ready) return <PageSkeleton count={5} type="stat" />;
  if (!token) {
    return <EmptyState icon={Building2} title="Sign in required" subtitle="Sign in to open your broker workspace." actionHref="/login" actionLabel="Log in" />;
  }

  if (user?.role === "BUYER") {
    return <BuyerDashboardView />;
  }
  if (user?.role === "HNI") {
    return <HniDashboardView />;
  }
  if (user?.role === "INSTITUTIONAL_BUYER") {
    return <InstitutionalBuyerDashboardView />;
  }
  if (user?.role === "INSTITUTIONAL_SELLER") {
    return <InstitutionalSellerDashboardView />;
  }

  if (loading)
    return (
      <div className="space-y-6 p-1">
        <PageSkeleton count={5} type="stat" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PageSkeleton count={4} type="row" />
          <PageSkeleton count={3} type="card" />
        </div>
      </div>
    );

  if (user?.role === "NRI") {
    return (
      <NriDashboardView
        greeting={greeting}
        userName={user?.name?.trim() || "there"}
        now={now}
        summary={summary}
        properties={properties}
        svcRequests={svcRequests}
        nriProfile={nriDashProfile}
      />
    );
  }

  if (user?.role === "SELLER") {
    const active = properties.filter((p) => String(p.status ?? "ACTIVE").toUpperCase() === "ACTIVE").length;
    const paused = properties.filter((p) => String(p.status ?? "").toUpperCase() === "PAUSED").length;
    const profileStrength =
      Math.min(
        100,
        [
          user?.name ? 20 : 0,
          orgName ? 20 : 0,
          properties.length ? 30 : 0,
          deals.length ? 30 : 0,
        ].reduce((a, b) => a + b, 0),
      ) || 20;
    const profileTone = profileStrength > 70 ? "bg-[#00C49A]" : profileStrength >= 40 ? "bg-[#EF9F27]" : "bg-[#FF4444]";
    const listingViews = properties.reduce((sum, p) => sum + Number(p.views ?? 0), 0);
    const totalMatches = properties.reduce((sum, p) => sum + (p.matches?.length ?? 0), 0);

    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{greeting}, {user?.name ?? "Seller"}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone="amber">Seller</Badge>
              {orgName ? <Badge tone="gray">{orgName}</Badge> : null}
            </div>
          </div>
          <p className="text-sm text-[#888]">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <StatCard icon={Building2} label="My listings" value={properties.length} subtext={<span><span className="text-[#00C49A]">{active} active</span> · <span className="text-[#888]">{paused} paused</span></span>} />
          <StatCard icon={Zap} label="Buyer matches" value={summary?.quickStats.myMatches ?? 0} subtext={`${hotMatches} new this week`} />
          <StatCard icon={Briefcase} label="Active deals" value={deals.length} subtext={`${formatINR(pipelineValue)} total value`} />
          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#888]">Profile strength</p>
            <p className="mt-2 text-3xl font-semibold text-white">{profileStrength}%</p>
            <div className="mt-3 h-2 rounded-full bg-[#1a1a1a]"><div className={`h-2 rounded-full ${profileTone}`} style={{ width: `${profileStrength}%` }} /></div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
          <div className="space-y-4">
            <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-white"><Building2 className="h-4 w-4 text-[#00C49A]" />My listings</p>
                <Link href="/properties" className="text-xs text-[#00C49A]">View all →</Link>
              </div>
              {properties.length ? (
                <ul className="divide-y divide-[#1f1f1f]">
                  {properties.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      {p.imageUrls?.[0] ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                          <Image src={p.imageUrls[0]} alt={p.title} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1a1a1a]"><Building2 className="h-4 w-4 text-[#444]" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">{p.title}</p>
                        <p className="inline-flex items-center gap-1 text-xs text-[#888]"><MapPin className="h-3 w-3" />{p.localityPublic ?? "Locality"} · {p.city}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-[#00C49A]">{formatINR(Number(p.price ?? 0))}</p>
                        <p className="text-[11px] text-[#555]">{p.matches?.length ?? 0} matches</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Building2} title="No listings yet" subtitle="Post your first property to start receiving buyer matches." actionHref="/properties/new" actionLabel="Post property +" />
              )}
            </section>
            <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-white"><Zap className="h-4 w-4 text-[#00C49A]" />Buyer matches</p>
                <Link href="/matches" className="text-xs text-[#00C49A]">View all →</Link>
              </div>
              {summary?.recentMatches?.length ? (
                <ul className="space-y-3">
                  {summary.recentMatches.slice(0, 4).map((m) => (
                    <li key={m.id} className="rounded-lg border border-[#1f1f1f] p-3">
                      <p className="text-[13px] text-white">Your property matched a buyer</p>
                      <p className="mt-1 text-xs text-[#888]">Looking for {m.requirement.tag} in {m.requirement.city}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge tone={m.matchScore >= 80 ? "teal" : "gray"}>{m.matchScore >= 80 ? "HOT" : "WARM"} · {m.matchScore}%</Badge>
                        <span className="text-[11px] text-[#555]">{timeAgo(now)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Zap} title="No matches yet" subtitle="Post a property to get matched with buyers." actionHref="/properties/new" actionLabel="Post property +" />
              )}
            </section>
          </div>
          <div className="space-y-4">
            <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white"><Briefcase className="h-4 w-4 text-[#00C49A]" />Deal pipeline</p>
              {deals.length ? deals.slice(0, 4).map((d) => (
                <div key={d.id} className="mt-3 rounded-lg border border-[#1f1f1f] p-3">
                  <p className="truncate text-[13px] text-white">{d.id}</p>
                  <p className="text-xs text-[#00C49A]">{formatINR(Number(d.valueInr ?? 0))}</p>
                </div>
              )) : <EmptyState icon={Briefcase} title="No active deals" subtitle="Deals are created when a buyer progresses on your listing." />}
            </section>
            <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
              <p className="text-sm font-medium text-white">Listing performance</p>
              <p className="mt-2 text-xs text-[#888]">{listingViews} total views · {totalMatches} total matches</p>
              {properties.slice(0, 4).map((p) => (
                <div key={p.id} className="mt-2 flex items-center justify-between text-xs text-[#888]">
                  <p className="max-w-[65%] truncate">{p.title}</p>
                  <p className="inline-flex items-center gap-2"><Eye className="h-3 w-3" />{p.views ?? 0} · <Zap className="h-3 w-3 text-[#00C49A]" />{p.matches?.length ?? 0}</p>
                </div>
              ))}
            </section>
            <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
              <p className="mb-3 text-sm font-medium text-white">Quick actions</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link href="/properties/new" className="rounded-lg border border-[#1f1f1f] p-3 hover:border-[#00C49A]">Post property</Link>
                <Link href="/search" className="rounded-lg border border-[#1f1f1f] p-3 hover:border-[#00C49A]">Search buyers</Link>
                <Link href="/services-hub" className="rounded-lg border border-[#1f1f1f] p-3 hover:border-[#00C49A]">Get legal help</Link>
                <Link href="/reputation" className="rounded-lg border border-[#1f1f1f] p-3 hover:border-[#00C49A]">View reputation</Link>
                {!canReadLeads ? (
                  <Link
                    href="/services-hub"
                    className="col-span-2 rounded-lg border border-[#EF9F2730] bg-[#EF9F2710] p-3 text-[#EF9F27] hover:border-[#EF9F27]"
                  >
                    Request CRM access
                  </Link>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{greeting}, {user?.name ?? "Broker"}</h1>
          {orgName ? <Badge tone="teal" className="mt-2">{orgName}</Badge> : null}
        </div>
        <p className="text-sm text-[#888888]">
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        <StatCard
          icon={Building2}
          label="My listings"
          value={summary?.quickStats.myProperties ?? 0}
          subtext="Active + pipeline scope"
          delay={0}
        />
        <StatCard icon={Users} label="Active leads" value={leads.length} subtext={<span>{leads.filter((x) => x.pipelineStage === "LEAD").length} hot · {Math.max(leads.length - leads.filter((x) => x.pipelineStage === "LEAD").length, 0)} warm</span>} delay={0.1} />
        <StatCard icon={GitMerge} label="New matches" value={summary?.quickStats.myMatches ?? 0} subtext={`${hotMatches} hot matches`} delay={0.2} />
        <StatCard icon={Briefcase} label="Active deals" value={deals.length} subtext={`${formatINR(pipelineValue)} pipeline value`} delay={0.3} />
        <StatCard icon={Bell} label="Unread alerts" value={summary?.unreadCount ?? 0} subtext={<Link href="/notifications" className="text-[#00C49A]">View all →</Link>} delay={0.4} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="space-y-4">
          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-white"><GitMerge className="h-4 w-4 text-[#00C49A]" /> Recent matches</p>
              <Link href="/matches" className="text-xs text-[#00C49A]">View all</Link>
            </div>
            {summary?.recentMatches.length ? (
              <ul className="mt-3 divide-y divide-[#1f1f1f]">
                {summary.recentMatches.slice(0, 5).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f1f1f]"><Building2 className="h-4 w-4 text-[#555]" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{m.property.title}</p>
                      <p className="text-xs text-[#888]">→ {m.requirement.city}</p>
                    </div>
                    <Badge tone={m.matchScore >= 80 ? "teal" : "gray"}>{m.matchScore >= 80 ? `HOT · ${m.matchScore}%` : `${m.matchScore}%`}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3">
                <EmptyState icon={GitMerge} title="No matches yet" subtitle="Post your first listing to start getting matched." actionLabel="Post property →" actionHref="/properties/new" />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-white"><Users className="h-4 w-4 text-[#00C49A]" /> Recent leads</p>
              <Link href="/crm" className="text-xs text-[#00C49A]">Open CRM →</Link>
            </div>
            {leads.length ? (
              <ul className="mt-3 divide-y divide-[#1f1f1f]">
                {leads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f1f1f] text-xs text-[#00C49A]">{getInitials(lead.leadName)}</div>
                      <div>
                        <p className="text-sm text-white">{lead.leadName}</p>
                        <p className="text-xs text-[#888]">{lead.source}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge tone="gray">{lead.pipelineStage ?? "LEAD"}</Badge>
                      <p className="mt-1 text-xs text-[#555]">{timeAgo(lead.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3">
                <EmptyState icon={Users} title="No leads yet" subtitle="Convert hot matches into leads from the matches page." actionLabel="Add lead →" actionHref="/crm" />
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-white"><Briefcase className="h-4 w-4 text-[#00C49A]" /> Deal pipeline</p>
            {["LEAD", "MATCH", "SITE_VISIT", "NEGOTIATION", "LEGAL", "CLOSURE"].map((stage) => {
              const count = deals.filter((d) => d.stage === stage).length;
              const max = Math.max(deals.length, 1);
              return (
                <div key={stage} className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-[#888]"><span>{stage.replace("_", " ")}</span><span className="text-white">{count}</span></div>
                  <div className="h-2 rounded-full bg-[#1f1f1f]"><div className="h-2 rounded-full bg-[#00C49A] transition-all duration-700" style={{ width: `${(count / max) * 100}%` }} /></div>
                </div>
              );
            })}
            <p className="mt-3 text-xs text-[#888]">{deals.length} deals active · {formatINR(pipelineValue)} total value</p>
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">Quick actions</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/properties/new" className="rounded-lg border border-[#1f1f1f] p-3 text-sm hover:border-[#00C49A]">Post property</Link>
              <Link href="/requirements/new" className="rounded-lg border border-[#1f1f1f] p-3 text-sm hover:border-[#00C49A]">Post requirement</Link>
              <Link href="/crm" className="rounded-lg border border-[#1f1f1f] p-3 text-sm hover:border-[#00C49A]">Add lead</Link>
              <Link href="/deals/new" className="rounded-lg border border-[#1f1f1f] p-3 text-sm hover:border-[#00C49A]">New deal</Link>
            </div>
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck className="h-4 w-4 text-[#00C49A]" /> Compliance</p>
              <Link href="/compliance" className="text-xs text-[#00C49A]">View all →</Link>
            </div>
            {summary?.digestStrip?.length ? (
              <ul className="mt-3 space-y-2">
                {summary.digestStrip.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-[#888]">{item.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-sm text-[#00C49A]"><CheckCircle className="h-4 w-4" /> All clear</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
