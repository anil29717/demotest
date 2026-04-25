"use client";

import { BarChart3, Gavel, MapPin, Scale, Target, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { httpStatusFromError } from "@/lib/nri-ui";

type Hit = {
  id: string;
  title: string;
  city: string;
  price: unknown;
  propertyType?: string;
  distressedLabel?: string;
};
type Auction = {
  id: string;
  title: string;
  city: string;
  auctionDate?: string | null;
  emdAmount?: unknown;
  startPrice?: unknown;
};
type Deal = { id: string; stage: string; valueInr?: unknown; property?: { title: string; city: string } | null };

const chips = ["All", "Residential", "Commercial", "Auction", "Distressed"] as const;

export function HniDashboardView() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chip, setChip] = useState<(typeof chips)[number]>("All");
  const [hits, setHits] = useState<Hit[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [hniMin, setHniMin] = useState<number | null>(null);
  const [hniMax, setHniMax] = useState<number | null>(null);

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [a, d, dist, prof] = await Promise.all([
          apiFetch<Auction[]>("/verticals/auctions", { token }).catch(() => []),
          apiFetch<Deal[]>("/deals", { token }).catch(() => []),
          apiFetch<{ hits?: Hit[] }>("/search/properties?distressedLabel=high_opportunity", { token }).catch(() => ({
            hits: [],
          })),
          apiFetch<{ ticketMinCr?: number | null; ticketMaxCr?: number | null }>("/verticals/hni/profile", {
            token,
          }).catch(() => null),
        ]);
        const aucHits = await apiFetch<{ hits?: Hit[] }>("/search/properties?isBankAuction=true", { token }).catch(
          () => ({ hits: [] }),
        );
        const merged = [...(dist.hits ?? []), ...(aucHits.hits ?? [])];
        const uniq = Array.from(new Map(merged.map((x) => [x.id, x])).values());
        if (!cancelled) {
          setAuctions(Array.isArray(a) ? a : []);
          setDeals(Array.isArray(d) ? d : []);
          setHits(uniq);
          if (prof) {
            setHniMin(prof.ticketMinCr ?? null);
            setHniMax(prof.ticketMaxCr ?? null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          const st = httpStatusFromError(e);
          if (st == null || st >= 500) toast.error("Could not load dashboard.", { duration: 3500 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const upcoming = useMemo(() => {
    const t0 = Date.now();
    const withDates = auctions
      .map((a) => {
        const t = a.auctionDate ? new Date(a.auctionDate).getTime() : NaN;
        return { a, t };
      })
      .filter((x) => Number.isFinite(x.t) && x.t > t0);
    withDates.sort((x, y) => x.t - y.t);
    return withDates.map((x) => x.a);
  }, [auctions]);

  const nextAuctionDays = useMemo(() => {
    const first = upcoming[0];
    if (!first?.auctionDate) return null;
    const d = Math.ceil((new Date(first.auctionDate).getTime() - Date.now()) / 86400000);
    return d;
  }, [upcoming]);

  const portfolioVal = deals.reduce((s, d) => s + Number(d.valueInr ?? 0), 0);

  const filteredHits = useMemo(() => {
    if (chip === "All") return hits;
    if (chip === "Residential") return hits.filter((x) => String(x.propertyType).toUpperCase().includes("RES"));
    if (chip === "Commercial") return hits.filter((x) => String(x.propertyType).toUpperCase().includes("COM"));
    if (chip === "Auction") return hits.filter((x) => /auction|bank/i.test(String(x.title)));
    if (chip === "Distressed") return hits.filter((x) => String(x.distressedLabel ?? "").length > 0);
    return hits;
  }, [chip, hits]);

  if (!token) return null;
  if (loading) return <LoadingSkeleton rows={3} />;

  const nextTone =
    nextAuctionDays != null && nextAuctionDays < 7 ? "text-red-400" : "text-amber-300";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {greeting}, {user?.name?.trim() || "there"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className="border border-[#F0922B30] bg-[#F0922B10] text-[#F0922B]">HNI</Badge>
            <span className="text-sm text-[#888888]">Your investment intelligence hub</span>
          </div>
        </div>
        <p className="text-sm text-[#888888]">
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <StatCard icon={Zap} label="Matched deals" value={hits.length} iconClassName="text-[#F0922B]" delay={0} />
        <StatCard
          icon={Gavel}
          label="Upcoming auctions"
          value={upcoming.length}
          iconClassName="text-amber-400"
          subtext={
            nextAuctionDays != null ? (
              <span className={nextTone}>
                Next: {nextAuctionDays} day{nextAuctionDays === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="text-[#888888]">Schedule updates here</span>
            )
          }
          delay={0.06}
        />
        <StatCard
          icon={TrendingUp}
          label="Est. portfolio value"
          value={formatINR(portfolioVal)}
          iconClassName="text-[#00C49A]"
          subtext={<span className="text-[#888888]">{deals.length} properties</span>}
          delay={0.12}
        />
        <StatCard
          icon={Target}
          label="Your ticket range"
          value={
            hniMin != null && hniMax != null ? (
              <span className="text-xl">
                ₹{hniMin}Cr – ₹{hniMax}Cr
              </span>
            ) : (
              "—"
            )
          }
          iconClassName="text-[#F0922B]"
          subtext={
            <Link href="/verticals/hni" className="text-[#00C49A] hover:underline">
              Edit preferences →
            </Link>
          }
          delay={0.18}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                  <Zap className="h-4 w-4 text-[#F0922B]" />
                  Investment opportunities
                </p>
                <p className="mt-0.5 text-xs text-[#888888]">Matched to your ticket size and preferences</p>
              </div>
              <Link href="/matches" className="text-xs text-[#00C49A]">
                View all →
              </Link>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChip(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    chip === c ? "border-[#F0922B] bg-[#F0922B20] text-[#F0922B]" : "border-[#1a1a1a] text-[#888888] hover:border-[#333]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {filteredHits.length ? (
              <ul className="space-y-3">
                {filteredHits.slice(0, 8).map((x) => {
                  const score = Math.min(100, Math.max(40, Math.round(Number(x.price ?? 0) / 1e7)));
                  const scoreColor = score > 70 ? "text-[#00C49A]" : score >= 50 ? "text-amber-300" : "text-red-400";
                  return (
                    <li key={x.id} className="flex gap-3 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-3">
                      <div className="h-16 w-16 shrink-0 rounded-lg bg-[#1a1a1a]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {x.distressedLabel ? (
                            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                              High-opportunity
                            </span>
                          ) : (
                            <span className="rounded border border-[#F0922B40] bg-[#F0922B15] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#F0922B]">
                              Curated
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[13px] font-semibold text-white">{x.title}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#888888]">
                          <MapPin className="h-3 w-3" />
                          {x.city}
                        </p>
                        <p className="mt-1 text-[15px] font-semibold text-[#00C49A]">{formatINR(Number(x.price ?? 0))}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
                        <p className="text-[10px] uppercase text-[#555555]">Score</p>
                        <span className="mt-2 inline-block rounded border border-[#333] px-2 py-0.5 text-[10px] text-[#888888]">
                          Liquidity
                        </span>
                        <button
                          type="button"
                          className="mt-2 block w-full rounded border border-[#F0922B] px-2 py-1 text-[11px] font-medium text-[#F0922B] transition hover:bg-[#F0922B15]"
                        >
                          Express interest →
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={Zap}
                title="No curated deals yet"
                subtitle="Set your ticket range and preferences to see opportunities tailored for you."
                actionHref="/verticals/hni"
                actionLabel="Set preferences →"
              />
            )}
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <Gavel className="h-4 w-4 text-amber-400" />
                Upcoming auctions
              </p>
              <Link href="/auctions" className="text-xs text-[#00C49A]">
                View all →
              </Link>
            </div>
            {upcoming.length ? (
              <ul className="divide-y divide-[#1a1a1a]">
                {upcoming.slice(0, 5).map((a) => {
                  const days = a.auctionDate
                    ? Math.ceil((new Date(a.auctionDate).getTime() - Date.now()) / 86400000)
                    : null;
                  const urgent = days != null && days < 7;
                  return (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Gavel className="h-4 w-4 shrink-0 text-amber-400" />
                        <p className="truncate text-[13px] font-medium text-white">{a.title}</p>
                      </div>
                      <div className="text-right text-xs text-[#888888]">
                        <p>
                          Reserve {formatINR(Number(a.startPrice ?? 0))} · EMD {formatINR(Number(a.emdAmount ?? 0))}
                        </p>
                        <p className={urgent ? "text-red-400" : "text-amber-300"}>
                          {days != null ? `${days} day${days === 1 ? "" : "s"}` : "Date TBC"}
                        </p>
                        <Link href="/auctions" className="text-[#00C49A] hover:underline">
                          View details →
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-[#888888]">No scheduled auctions in the feed right now.</p>
            )}
          </motion.section>
        </div>

        <div className="space-y-4">
          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <Target className="h-4 w-4 text-[#F0922B]" />
              Investment profile
            </p>
            <p className="mt-2 text-sm text-[#cccccc]">
              Ticket:{" "}
              {hniMin != null && hniMax != null ? (
                <span className="text-white">
                  ₹{hniMin}Cr – ₹{hniMax}Cr
                </span>
              ) : (
                <span className="text-[#888888]">Not set</span>
              )}
            </p>
            <p className="mt-2 text-xs text-[#888888]">Asset preferences and geography sync from your workspace.</p>
            <Link href="/verticals/hni" className="mt-3 inline-block text-xs text-[#00C49A] hover:underline">
              Edit preferences →
            </Link>
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <BarChart3 className="h-4 w-4 text-[#00C49A]" />
              Portfolio
            </p>
            {deals.length ? (
              <ul className="mt-3 space-y-2">
                {deals.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex justify-between gap-2 rounded-lg border border-[#1a1a1a] px-3 py-2 text-xs">
                    <span className="truncate text-white">{d.property?.title ?? "Deal"}</span>
                    <span className="shrink-0 text-[#00C49A]">{formatINR(Number(d.valueInr ?? 0))}</span>
                  </li>
                ))}
                <li className="border-t border-[#1a1a1a] pt-2 text-sm text-white">
                  Total invested <span className="text-[#00C49A]">{formatINR(portfolioVal)}</span>
                </li>
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#888888]">No investments tracked yet.</p>
            )}
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">Quick actions</p>
            <div className="mt-3 grid gap-2 text-sm">
              <Link href="/auctions" className="rounded-lg border border-[#1a1a1a] px-3 py-2 text-[#cccccc] hover:border-[#00C49A]">
                View all auctions →
              </Link>
              <Link href="/institutions" className="rounded-lg border border-[#1a1a1a] px-3 py-2 text-[#cccccc] hover:border-[#00C49A]">
                Institutional deals →
              </Link>
              <Link href="/verticals/hni" className="rounded-lg border border-[#1a1a1a] px-3 py-2 text-[#cccccc] hover:border-[#00C49A]">
                Update preferences →
              </Link>
              <Link href="/services-hub" className="inline-flex items-center gap-2 rounded-lg border border-[#1a1a1a] px-3 py-2 text-[#cccccc] hover:border-[#00C49A]">
                <Scale className="h-4 w-4" />
                Legal support →
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
