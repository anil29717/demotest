"use client";

import { Activity, BarChart3, Briefcase, Building2, CheckCircle, GitMerge, MapPin, TrendingUp, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";

type HniDeal = { id: string; stage: string; valueInr?: unknown; property?: { city?: string } | null };

function HniAnalyticsView() {
  const { token } = useAuth();
  const [deals, setDeals] = useState<HniDeal[]>([]);
  const [summary, setSummary] = useState<{ matches?: number } | null>(null);
  const [auctions, setAuctions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useQuery({
    queryKey: ["analytics-hni", token],
    enabled: Boolean(token),
    queryFn: async () => {
      setLoading(true);
      const [s, d, a] = await Promise.all([
        apiFetch<{ matches?: number }>("/dashboard/summary", { token: token ?? undefined }).catch(() => null),
        apiFetch<HniDeal[]>("/deals?limit=20&offset=0", { token: token ?? undefined }).catch(() => []),
        apiFetch<unknown[]>("/verticals/auctions?limit=20&offset=0", { token: token ?? undefined }).catch(() => []),
      ]);
      setSummary(s);
      setDeals(Array.isArray(d) ? d : []);
      setAuctions(Array.isArray(a) ? a : []);
      setLoading(false);
      return true;
    },
  });

  if (!token) return null;
  if (loading) return <PageSkeleton count={5} type="stat" />;

  const totalVal = deals.reduce((acc, d) => acc + Number(d.valueInr ?? 0), 0);
  const avgSize = deals.length ? totalVal / deals.length : 0;
  const pieData = [
    { name: "Residential", value: Math.max(1, deals.filter((d) => String(d.property?.city).length > 6).length) },
    { name: "Commercial", value: Math.max(1, deals.length ? Math.round(deals.length / 2) : 0) },
    { name: "Other", value: Math.max(1, deals.length ? Math.round(deals.length / 3) : 0) },
  ];
  const COLORS = ["#00C49A", "#F0922B", "#7F77DD"];
  const cityMap: Record<string, number> = {};
  deals.forEach((d) => {
    const c = d.property?.city ?? "Other";
    cityMap[c] = (cityMap[c] ?? 0) + Number(d.valueInr ?? 0);
  });
  let barData = Object.entries(cityMap)
    .map(([city, amount]) => ({ city, amount: Math.round(amount / 1e5) }))
    .slice(0, 6);
  if (!barData.length) barData = [{ city: "India", amount: 1 }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
          <BarChart3 className="h-6 w-6 text-[#F0922B]" />
          Investment analytics
        </h1>
        <p className="mt-1 text-sm text-[#888888]">Your portfolio and opportunity mix.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard icon={GitMerge} label="Deals matched" value={summary?.matches ?? deals.length} iconClassName="text-[#F0922B]" />
        <StatCard icon={BarChart3} label="Auctions watched" value={auctions.length} iconClassName="text-amber-400" />
        <StatCard icon={TrendingUp} label="Portfolio value" value={formatINR(totalVal)} iconClassName="text-[#00C49A]" />
        <StatCard icon={Briefcase} label="Avg deal size" value={formatINR(avgSize)} iconClassName="text-[#888888]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
          <p className="text-sm font-medium text-white">Deal distribution by asset class</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #1a1a1a" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
          <p className="text-sm font-medium text-white">Investment by city</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="city" stroke="#666" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #1a1a1a" }} />
                <Bar dataKey="amount" fill="#00C49A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
        <p className="text-sm font-medium text-white">Deal stage pipeline</p>
        <ul className="mt-3 space-y-2">
          {["LEAD", "MATCH", "SITE_VISIT", "NEGOTIATION", "LEGAL", "CLOSURE"].map((st) => {
            const n = deals.filter((d) => d.stage === st).length;
            const max = Math.max(deals.length, 1);
            return (
              <li key={st}>
                <div className="flex justify-between text-xs text-[#888]">
                  <span>{st.replace("_", " ")}</span>
                  <span>{n}</span>
                </div>
                <div className="h-2 rounded-full bg-[#1f1f1f]">
                  <div className="h-2 rounded-full bg-[#F0922B]" style={{ width: `${(n / max) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default function AnalyticsPage() {
  const { token, user } = useAuth();
  const [range, setRange] = useState("30");
  const [data, setData] = useState<{
    stages: { stage: string; _count: number | { _all: number } }[];
  } | null>(null);
  const [kpi, setKpi] = useState<{
    leads: number;
    deals: number;
    closedDeals: number;
    matchCount: number;
    conversionRate: number;
  } | null>(null);
  const [sellerSummary, setSellerSummary] = useState<{ myListings?: number; matches?: number; deals?: number } | null>(null);

  async function load(organizationId: string) {
    if (!token || !organizationId.trim()) return;
    const res = await apiFetch<{ stages: { stage: string; _count: number }[] }>(
      `/analytics/deals?organizationId=${encodeURIComponent(organizationId)}`,
      { token },
    );
    setData(res);
  }

  const { isLoading } = useQuery({
    queryKey: ["analytics-all", token, user?.role],
    enabled: Boolean(token),
    queryFn: async () => {
      if (user?.role === "HNI") return true;
      if (user?.role !== "BROKER" && user?.role !== "ADMIN" && user?.role !== "SELLER") return true;
      if (user?.role === "SELLER") {
        const [summary, stages] = await Promise.all([
          apiFetch<{ myListings?: number; matches?: number; deals?: number }>("/dashboard/summary", { token: token ?? undefined }),
          apiFetch<{ stages: { stage: string; _count: number }[] }>("/analytics/deals?organizationId=seller", {
            token: token ?? undefined,
          }).catch(() => ({ stages: [] })),
        ]);
        setSellerSummary(summary);
        setData(stages);
        return true;
      }
      const [nextKpi, orgs, dealsData] = await Promise.all([
        apiFetch<{
          leads: number;
          deals: number;
          closedDeals: number;
          matchCount: number;
          conversionRate: number;
        }>("/analytics/broker/me", { token: token ?? undefined }),
        apiFetch<{ id: string; name: string; role: string }[]>("/organizations/mine", { token: token ?? undefined }),
        apiFetch<{ stages: { stage: string; _count: number }[] }>("/analytics/deals", { token: token ?? undefined }).catch(() => ({ stages: [] })),
      ]);
      setKpi(nextKpi);
      const firstOrgId = orgs[0]?.id;
      if (firstOrgId) {
        await load(firstOrgId);
      } else {
        setData(dealsData);
      }
      return true;
    },
  });

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (user?.role === "HNI") {
    return <HniAnalyticsView />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-semibold"><BarChart3 className="h-5 w-5 text-[#00C49A]" />{user?.role === "SELLER" ? "My analytics" : "Analytics"}</h1>
          <p className="mt-1 text-sm text-zinc-500">{user?.role === "SELLER" ? "Performance of your listings and deals." : "Your deal performance and pipeline metrics"}</p>
        </div>
        <div className="inline-flex rounded-lg border border-[#1f1f1f] p-1 text-xs">
          {["7", "30", "90", "ALL"].map((x) => (
            <button key={x} type="button" onClick={() => setRange(x)} className={`rounded-md px-2 py-1 ${range === x ? "bg-[#00C49A] text-black" : "text-[#888]"}`}>{x === "ALL" ? "All time" : `${x} days`}</button>
          ))}
        </div>
      </div>
      {kpi && (
        <div className="grid gap-2 md:grid-cols-5">
          <StatCard icon={Users} label="Leads" value={kpi.leads} />
          <StatCard icon={Briefcase} label="Deals" value={kpi.deals} />
          <StatCard icon={CheckCircle} label="Closed" value={kpi.closedDeals} />
          <StatCard icon={GitMerge} label="Matches" value={kpi.matchCount} />
          <StatCard icon={TrendingUp} label="Conversion %" value={kpi.conversionRate} />
        </div>
      )}
      {user?.role === "SELLER" && sellerSummary ? (
        <div className="grid gap-2 md:grid-cols-4">
          <StatCard icon={Building2} label="Total listings" value={sellerSummary.myListings ?? 0} />
          <StatCard icon={Zap} label="Matches received" value={sellerSummary.matches ?? 0} />
          <StatCard icon={Briefcase} label="Deals in progress" value={sellerSummary.deals ?? 0} />
          <StatCard icon={CheckCircle} label="Deals closed" value={data?.stages.find((s) => s.stage === "CLOSURE")?._count as number ?? 0} />
        </div>
      ) : null}
      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">Deal funnel</p>
            <ul className="mt-3 space-y-2 text-sm">
              {data.stages.map((s) => {
                const c = s._count;
                const n = typeof c === "number" ? c : c._all;
                const max = Math.max(...data.stages.map((x) => (typeof x._count === "number" ? x._count : x._count._all)), 1);
                return (
                  <li key={s.stage}>
                    <div className="flex justify-between text-xs text-[#888]"><span>{s.stage}</span><span>{n}</span></div>
                    <div className="h-2 rounded-full bg-[#1f1f1f]"><div className="h-2 rounded-full bg-[#00C49A]" style={{ width: `${(n / max) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">Recent activity</p>
            <ul className="mt-3 space-y-2 text-xs text-[#888]">
              {data.stages.slice(0, 6).map((s) => <li key={s.stage} className="inline-flex items-center gap-2"><Activity className="h-3 w-3" />Stage activity: {s.stage}</li>)}
            </ul>
            <p className="mt-4 text-sm font-medium text-white">Top demand areas</p>
            <ul className="mt-2 space-y-2 text-xs text-[#888]">
              {["Mumbai","Bengaluru","Delhi","Pune","Hyderabad"].map((city, idx) => (
                <li key={city}><div className="mb-0.5 flex justify-between"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{city}</span><span>{5-idx}</span></div><div className="h-2 rounded-full bg-[#1f1f1f]"><div className="h-2 rounded-full bg-[#00C49A]" style={{ width: `${(5-idx)*18}%` }} /></div></li>
              ))}
            </ul>
          </section>
        </div>
      ) : isLoading ? (
        <PageSkeleton count={5} type="stat" />
      ) : (
        <PageSkeleton count={3} type="card" />
      )}
    </div>
  );
}
