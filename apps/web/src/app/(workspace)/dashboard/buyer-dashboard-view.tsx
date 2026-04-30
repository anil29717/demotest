"use client";

import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  ClipboardList,
  MapPin,
  Scale,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/format";
import { httpStatusFromError } from "@/lib/nri-ui";

type DashboardSummary = {
  unreadCount: number;
  quickStats: { myRequirements: number; myMatches: number };
  recentMatches: {
    id: string;
    matchScore: number;
    property: {
      id: string;
      title: string;
      city: string;
      price?: unknown;
      imageUrls?: string[];
      images?: string[];
      imageUrl?: string | null;
    };
    requirement: { id: string; city: string; tag: string };
  }[];
};

function resolvePropertyImageUrl(property: {
  images?: string[];
  imageUrls?: string[];
  imageUrl?: string | null;
}) {
  return (
    property.images?.[0]?.trim() ||
    property.imageUrls?.[0]?.trim() ||
    property.imageUrl?.trim() ||
    ""
  );
}

type ReqRow = {
  id: string;
  city: string;
  tag: string;
  urgency: string;
  active?: boolean;
  budgetMin?: unknown;
  budgetMax?: unknown;
};
type SavedRow = { id: string; name?: string; createdAt: string; filters?: unknown };
type DealRow = { id: string; stage: string; valueInr?: unknown; property?: { title: string; city: string } | null };

export function BuyerDashboardView() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [requirements, setRequirements] = useState<ReqRow[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [dash, reqs, sav, dls] = await Promise.all([
          apiFetch<DashboardSummary>("/dashboard/summary", { token }),
          apiFetch<ReqRow[]>("/requirements/mine", { token }).catch(() => []),
          apiFetch<SavedRow[]>("/search/saved", { token }).catch(() => []),
          apiFetch<DealRow[]>("/deals", { token }).catch(() => []),
        ]);
        if (!cancelled) {
          setSummary(dash);
          setRequirements(Array.isArray(reqs) ? reqs : []);
          setSaved(Array.isArray(sav) ? sav : []);
          setDeals(Array.isArray(dls) ? dls : []);
        }
      } catch (e) {
        if (!cancelled) {
          setSummary(null);
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

  if (!token) return null;
  if (loading) return <LoadingSkeleton rows={3} />;

  const activeReq = requirements.filter((r) => r.active !== false).length;
  const matchedReq = requirements.filter((r) => r.active === false).length;
  const matches = summary?.quickStats.myMatches ?? 0;
  const recent = summary?.recentMatches ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {greeting}, {user?.name?.trim() || "there"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className="border border-[#378ADD30] bg-[#378ADD10] text-[#378ADD]">BUYER</Badge>
            <span className="text-sm text-[#888888]">Find and secure your next property</span>
          </div>
        </div>
        <p className="text-sm text-[#888888]">
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label="My requirements"
          value={requirements.length}
          iconClassName="text-[#378ADD]"
          subtext={
            <span>
              <span className="text-[#378ADD]">{activeReq} active</span>
              <span className="text-[#888888]"> · {matchedReq} matched</span>
            </span>
          }
          delay={0}
        />
        <StatCard
          icon={Zap}
          label="Property matches"
          value={matches}
          iconClassName="text-[#00C49A]"
          subtext={<span className="text-[#888888]">New matches since your last visit</span>}
          delay={0.08}
        />
        <StatCard
          icon={Bookmark}
          label="Saved searches"
          value={saved.length}
          iconClassName="text-[#378ADD]"
          subtext={<span className="text-[#378ADD]">Running automatically</span>}
          delay={0.16}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <Zap className="h-4 w-4 text-[#00C49A]" />
                Matched properties
              </p>
              <Link href="/matches" className="text-xs text-[#00C49A]">
                View all →
              </Link>
            </div>
            {recent.length ? (
              <ul className="divide-y divide-[#1a1a1a]">
                {recent.slice(0, 5).map((m) => {
                  const imageUrl = resolvePropertyImageUrl(m.property);
                  return (
                  <li key={m.id} className="flex gap-3 py-3">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/placeholder-property.png";
                        }}
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#0d0d0d]">
                        <Building2 className="h-5 w-5 text-[#444444]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">{m.property.title}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#888888]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {m.property.city}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#00C49A]">{formatINR(Number(m.property.price ?? 0))}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone="gray" className="text-[10px]">
                        {m.matchScore}%
                      </Badge>
                      <Link href={`/search?q=${encodeURIComponent(m.property.city)}`} className="mt-2 block text-xs text-[#378ADD] hover:text-[#00C49A]">
                        View property
                      </Link>
                    </div>
                  </li>
                )})}
              </ul>
            ) : (
              <EmptyState
                icon={Zap}
                title="No matches yet"
                subtitle="Post a requirement so we can match you with listings that fit."
                actionHref="/requirements/new"
                actionLabel="Post requirement +"
              />
            )}
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <ClipboardList className="h-4 w-4 text-[#378ADD]" />
                My requirements
              </p>
              <Link
                href="/requirements/new"
                className="rounded-lg bg-[#378ADD] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
              >
                Post requirement +
              </Link>
            </div>
            {requirements.length ? (
              <ul className="space-y-2">
                {requirements.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2">
                    <div>
                      <p className="text-[13px] text-white">
                        {r.city} · {formatINR(Number(r.budgetMin ?? 0))} – {formatINR(Number(r.budgetMax ?? 0))}
                      </p>
                      <p className="text-xs text-[#888888]">{r.tag}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-[#378ADD30] bg-[#378ADD10] px-2 py-0.5 text-[10px] text-[#378ADD]">Posted by me</span>
                      <Badge tone="gray">{r.urgency}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No requirements yet"
                subtitle="Tell us what you are looking for to unlock matches."
                actionHref="/requirements/new"
                actionLabel="Post requirement +"
              />
            )}
          </motion.section>
        </div>

        <div className="space-y-4">
          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">Quick actions</p>
            <div className="mt-3 grid gap-2 text-sm">
              <Link href="/requirements/new" className="rounded-lg border border-[#1a1a1a] px-3 py-2.5 text-[#cccccc] transition hover:border-[#00C49A] hover:text-[#00C49A]">
                Post requirement →
              </Link>
              <Link href="/search" className="rounded-lg border border-[#1a1a1a] px-3 py-2.5 text-[#cccccc] transition hover:border-[#00C49A] hover:text-[#00C49A]">
                Search properties →
              </Link>
              <Link href="/services-hub" className="rounded-lg border border-[#1a1a1a] px-3 py-2.5 text-[#cccccc] transition hover:border-[#00C49A] hover:text-[#00C49A]">
                Get legal help →
              </Link>
              <Link href="/matches" className="rounded-lg border border-[#1a1a1a] px-3 py-2.5 text-[#cccccc] transition hover:border-[#00C49A] hover:text-[#00C49A]">
                View matches →
              </Link>
            </div>
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <Bell className="h-4 w-4 text-[#378ADD]" />
                Saved search alerts
              </p>
              <Link href="/settings/notifications" className="text-xs text-[#00C49A]">
                Manage alerts →
              </Link>
            </div>
            {saved.length ? (
              <ul className="space-y-2 text-sm text-[#888888]">
                {saved.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 rounded-lg border border-[#1a1a1a] px-3 py-2">
                    <span className="truncate text-white">{s.name || "Saved search"}</span>
                    <span className="shrink-0 text-xs">{timeAgo(s.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#888888]">Save a search to get alerts when new listings appear.</p>
            )}
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <Briefcase className="h-4 w-4 text-[#00C49A]" />
              Active deals
            </p>
            <p className="mt-1 text-xs text-[#888888]">{deals.length} in progress</p>
            <Link href="/deals" className="mt-3 inline-block text-xs text-[#00C49A]">
              Open deals →
            </Link>
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <Scale className="h-4 w-4 text-[#00C49A]" />
              Need support?
            </p>
            <p className="mt-2 text-xs text-[#888888]">Our team can connect you with sellers and documentation help.</p>
            <Link href="/services-hub" className="mt-3 inline-flex items-center gap-1 text-xs text-[#00C49A]">
              Contact via platform →
            </Link>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
