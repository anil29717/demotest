"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  FileCheck2,
  Flag,
  Handshake,
  MapPinned,
  Search,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type Deal = {
  id: string;
  stage: string;
  valueInr?: unknown;
  dealHealthScore: number | null;
  slaBreachCount?: number;
  stageEnteredAt?: string;
  updatedAt: string;
  property: { id: string; title: string; city: string; imageUrls?: string[] } | null;
  institution: { id: string; city: string } | null;
  closureProbability?: { probability: number; label: "High" | "Medium" | "At risk" };
};

const STAGES = [
  "LEAD",
  "REQUIREMENT",
  "MATCH",
  "SITE_VISIT",
  "NEGOTIATION",
  "LEGAL",
  "LOAN",
  "INSURANCE",
  "PAYMENT",
  "CLOSURE",
] as const;
const STAGE_LABEL: Record<(typeof STAGES)[number], string> = {
  LEAD: "Lead",
  REQUIREMENT: "Requirement",
  MATCH: "Match",
  SITE_VISIT: "Site Visit",
  NEGOTIATION: "Negotiation",
  LEGAL: "Legal",
  LOAN: "Loan",
  INSURANCE: "Insurance",
  PAYMENT: "Payment",
  CLOSURE: "Closure",
};

export default function DealsPage() {
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  function stageIcon(stage: (typeof STAGES)[number]) {
    if (stage === "LEAD") return <Sparkles className="h-3.5 w-3.5" />;
    if (stage === "MATCH") return <Handshake className="h-3.5 w-3.5" />;
    if (stage === "SITE_VISIT") return <MapPinned className="h-3.5 w-3.5" />;
    if (stage === "NEGOTIATION") return <Briefcase className="h-3.5 w-3.5" />;
    if (stage === "LEGAL") return <FileCheck2 className="h-3.5 w-3.5" />;
    return <Flag className="h-3.5 w-3.5" />;
  }

  function pipeline(stageRaw: string) {
    const stage = (STAGES.includes(stageRaw as (typeof STAGES)[number]) ? stageRaw : "LEAD") as (typeof STAGES)[number];
    const activeIdx = STAGES.indexOf(stage);
    return (
      <div className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="flex items-start">
          {STAGES.map((s, idx) => {
            const done = idx < activeIdx;
            const active = idx === activeIdx;
            return (
              <div key={s} className="flex min-w-0 flex-1 items-center">
                <div className="flex min-w-0 flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                      done
                        ? "border-teal-500 bg-teal-500 text-black"
                        : active
                          ? "border-[#00C49A] bg-[#00C49A]/15 text-[#00C49A]"
                          : "border-zinc-700 bg-zinc-900 text-zinc-500"
                    }`}
                    title={STAGE_LABEL[s]}
                  >
                    {done ? <CheckCircle className="h-4 w-4" /> : stageIcon(s)}
                  </div>
                  <span
                    className={`mt-1 text-[10px] ${
                      active ? "text-[#00C49A]" : done ? "text-teal-300" : "text-zinc-500"
                    }`}
                  >
                    {STAGE_LABEL[s]}
                  </span>
                </div>
                {idx < STAGES.length - 1 ? (
                  <div className="mb-4 h-[2px] flex-1 bg-zinc-800">
                    <div
                      className={`h-full ${idx < activeIdx ? "bg-teal-500" : idx === activeIdx ? "bg-[#00C49A]/60" : "bg-transparent"}`}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function probabilityBadge(cp?: { probability: number; label: string }) {
    if (!cp) return null;
    const tone =
      cp.probability >= 70
        ? "border-emerald-800 text-emerald-300"
        : cp.probability >= 40
          ? "border-amber-800 text-amber-300"
          : "border-red-800 text-red-300";
    const text = cp.probability >= 70 ? "High chance" : cp.probability >= 40 ? "Medium" : "At risk";
    return (
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${tone}`}
        title="Based on stage, time, broker history, property quality, recent activity"
      >
        {text} · {cp.probability}%
      </span>
    );
  }

  const { token, user } = useAuth();
  const { data: deals = [], isLoading: loading } = useQuery({
    queryKey: ["deals", token, user?.role],
    enabled: Boolean(token),
    queryFn: () =>
      apiFetch<Deal[]>("/deals?limit=20", { token: token ?? undefined }).catch(
        () => [],
      ),
    staleTime: 1000 * 60 * 1,
  });
  const filteredDeals = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return deals.filter((d) => {
      const stageOk =
        stageFilter === "ALL" || String(d.stage).toUpperCase() === stageFilter;
      if (!stageOk) return false;
      if (!needle) return true;
      const title = d.property?.title ?? d.institution?.city ?? "";
      return (
        title.toLowerCase().includes(needle) ||
        d.id.toLowerCase().includes(needle)
      );
    });
  }, [deals, q, stageFilter]);

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (user?.role === "BUYER") {
    if (loading) return <PageSkeleton count={3} type="card" />;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
            <Briefcase className="h-7 w-7 text-[#378ADD]" />
            My deals
          </h1>
          <p className="mt-1 text-sm text-[#888888]">Transactions you are part of as a buyer.</p>
        </div>
        <ul className="space-y-4">
          {filteredDeals.map((d) => {
            return (
              <motion.li
                key={d.id}
                whileHover={{ y: -2 }}
                className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4"
              >
                <div className="flex flex-wrap gap-4">
                  {d.property?.imageUrls?.[0] ? (
                    <div className="relative h-20 w-24">
                      <Image src={d.property.imageUrls[0]} alt={d.property.title} fill className="rounded-lg object-cover" />
                    </div>
                  ) : (
                    <div className="relative h-20 w-24 overflow-hidden rounded-lg bg-[#0d0d0d]">
                      <Image src="/placeholder-property.png" alt="placeholder" fill className="object-cover opacity-50" />
                      <Briefcase className="h-8 w-8 text-[#444444]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{d.property?.title ?? d.institution?.city ?? "Transaction"}</p>
                    <p className="text-sm text-[#00C49A]">{formatINR(Number(d.valueInr ?? 0))}</p>
                    <Badge tone="blue" className="mt-2">
                      {d.stage}
                    </Badge>
                    <div className="mt-2">{probabilityBadge(d.closureProbability)}</div>
                    {pipeline(d.stage)}
                    <p className="mt-2 text-xs text-[#888888]">Seller: verified counterparty (masked)</p>
                    {d.slaBreachCount ? <p className="mt-1 text-xs text-amber-300">SLA attention suggested</p> : null}
                    <p className="mt-1 text-xs text-[#555555]">Updated {timeAgo(d.updatedAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/deals/${d.id}`} className="rounded-lg border border-[#1a1a1a] px-3 py-1.5 text-xs text-[#00C49A] hover:border-[#00C49A]">
                        View timeline
                      </Link>
                      <Link href="/services-hub" className="rounded-lg border border-[#1a1a1a] px-3 py-1.5 text-xs text-[#888888] hover:text-white">
                        Contact platform
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
        {filteredDeals.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No active deals"
            subtitle="Browse properties to find your next home. When a transaction starts, it will show up here."
            actionHref="/search"
            actionLabel="Search"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between gap-4">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
            <Briefcase className="h-6 w-6 text-[#00C49A]" />
            {user?.role === "SELLER" ? "My deals" : "Deals"}
          </h1>
          {user?.role === "SELLER" ? <p className="text-sm text-[#888]">Active transactions on your properties.</p> : null}
        </div>
        {user?.role !== "SELLER" ? (
          <Link href="/deals/new" className="rounded-lg bg-[#00C49A] px-3 py-1.5 text-sm text-black">
            New deal
          </Link>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          placeholder="Search by property, buyer..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm"
        >
          <option value="ALL">All stages</option>
          <option value="LEAD">Lead</option>
          <option value="REQUIREMENT">Requirement</option>
          <option value="MATCH">Match</option>
          <option value="SITE_VISIT">Site Visit</option>
          <option value="NEGOTIATION">Negotiation</option>
          <option value="LEGAL">Legal</option>
          <option value="LOAN">Loan</option>
          <option value="INSURANCE">Insurance</option>
          <option value="PAYMENT">Payment</option>
          <option value="CLOSURE">Closure</option>
        </select>
      </div>
      <ul className="mt-6 space-y-2">
        {filteredDeals.map((d) => (
          <li
            key={d.id}
            className={`rounded-lg border bg-zinc-900/40 px-4 py-3 ${
              d.slaBreachCount ? "border-l-4 border-l-[#FF6B6B] border-[#1f1f1f]" : "border-[#1f1f1f]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Link href={`/deals/${d.id}`} className="font-medium text-teal-400 hover:underline">
                {d.property?.title ?? d.institution?.city ?? "Deal"} · {d.stage}
              </Link>
              <Link
                href={`/deals/${d.id}`}
                className="inline-flex items-center gap-1 rounded border border-teal-700/60 px-2.5 py-1 text-xs font-medium text-teal-300 hover:bg-teal-900/20"
              >
                Open details
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="text-xs text-zinc-500">
              Value {formatINR(Number(d.valueInr ?? 0))} · Health {d.dealHealthScore ?? "—"} · updated{" "}
              {new Date(d.updatedAt).toLocaleString()}
            </p>
            <div className="mt-1">{probabilityBadge(d.closureProbability)}</div>
            {user?.role === "SELLER" ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#00C49A]">
                <CheckCircle className="h-3 w-3" />
                Verified buyer
              </p>
            ) : null}
            {pipeline(d.stage)}
          </li>
        ))}
      </ul>
      {filteredDeals.length === 0 && (
        <div className="mt-8 rounded-xl border border-[#1a1a1a] bg-[#111111] p-8 text-center">
          <Search className="mx-auto h-10 w-10 text-[#444444]" />
          <p className="mt-3 text-base font-medium text-white">No deals in this workspace</p>
          <p className="mt-1 text-sm text-[#888888]">Open a deal from matches when you are ready to progress a transaction.</p>
        </div>
      )}
    </div>
  );
}
