"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle, Search } from "lucide-react";
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
};

const STAGES = ["LEAD", "MATCH", "SITE_VISIT", "NEGOTIATION", "LEGAL", "LOAN", "INSURANCE", "PAYMENT", "CLOSURE"] as const;

export default function DealsPage() {
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
          {deals.map((d) => {
            const si = STAGES.indexOf(d.stage as (typeof STAGES)[number]);
            const idx = si >= 0 ? si : 2;
            const filled = Math.min(10, Math.max(1, Math.ceil(((idx + 1) / STAGES.length) * 10)));
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
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span
                          key={`${d.id}-p-${i}`}
                          className={`h-2 w-2 rounded-full ${i < filled ? "bg-[#378ADD]" : "bg-[#333333]"}`}
                        />
                      ))}
                    </div>
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
        {deals.length === 0 ? (
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
          className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm"
        />
        <select className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm">
          <option>All stages</option>
          <option>Lead</option>
          <option>Match</option>
          <option>Site Visit</option>
          <option>Negotiation</option>
          <option>Legal</option>
          <option>Loan</option>
          <option>Insurance</option>
          <option>Payment</option>
          <option>Closure</option>
        </select>
      </div>
      <ul className="mt-6 space-y-2">
        {deals.map((d) => (
          <li
            key={d.id}
            className={`rounded-lg border bg-zinc-900/40 px-4 py-3 ${
              d.slaBreachCount ? "border-l-4 border-l-[#FF6B6B] border-[#1f1f1f]" : "border-[#1f1f1f]"
            }`}
          >
            <Link href={`/deals/${d.id}`} className="font-medium text-teal-400 hover:underline">
              {d.property?.title ?? d.institution?.city ?? "Deal"} · {d.stage}
            </Link>
            <p className="text-xs text-zinc-500">
              Value {formatINR(Number(d.valueInr ?? 0))} · Health {d.dealHealthScore ?? "—"} · updated{" "}
              {new Date(d.updatedAt).toLocaleString()}
            </p>
            {user?.role === "SELLER" ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#00C49A]">
                <CheckCircle className="h-3 w-3" />
                Verified buyer
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
              {["LEAD", "MATCH", "SITE_VISIT", "NEGOTIATION", "LEGAL", "LOAN", "INSURANCE", "PAYMENT", "CLOSURE"].map((s) => (
                <span key={s} className={`h-2 w-2 rounded-full ${s === d.stage ? "bg-[#00C49A]" : "bg-[#333]"}`} title={s} />
              ))}
              {d.stage === "CLOSURE" ? <CheckCircle className="h-3 w-3 text-[#00C49A]" /> : null}
            </div>
          </li>
        ))}
      </ul>
      {deals.length === 0 && (
        <div className="mt-8 rounded-xl border border-[#1a1a1a] bg-[#111111] p-8 text-center">
          <Search className="mx-auto h-10 w-10 text-[#444444]" />
          <p className="mt-3 text-base font-medium text-white">No deals in this workspace</p>
          <p className="mt-1 text-sm text-[#888888]">Open a deal from matches when you are ready to progress a transaction.</p>
        </div>
      )}
    </div>
  );
}
