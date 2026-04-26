"use client";

import { ClipboardList, Flame, MapPin, Maximize2, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

type Req = {
  id: string;
  city: string;
  areas: string[];
  budgetMin: unknown;
  budgetMax: unknown;
  tag: string;
  urgency: string;
  propertyType?: string;
  dealType?: string;
  createdAt?: string;
  areaSqftMin?: number;
  areaSqftMax?: number;
  active?: boolean;
};

function relativeTime(iso?: string): string {
  if (!iso) return "Recently posted";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "Recently posted";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function urgencyBadgeClass(urgency: string): string {
  if (urgency === "IMMEDIATE" || urgency === "HOT") return "bg-red-900/40 text-red-200 border-red-800/70";
  if (urgency === "WITHIN_30_DAYS" || urgency === "WARM")
    return "bg-amber-900/40 text-amber-200 border-amber-800/70";
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
}

export default function RequirementsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [dealType, setDealType] = useState("ALL");
  const [urgency, setUrgency] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const isBuyerRole = ["NRI", "BUYER", "INSTITUTIONAL_BUYER"].includes(user?.role ?? "");

  const { data: mineList = [], isLoading: loadingMine } = useQuery({
    queryKey: ["requirements-mine", token],
    enabled: Boolean(token) && isBuyerRole,
    queryFn: () =>
      apiFetch<Req[]>("/requirements/mine?limit=20&offset=0", { token: token ?? undefined })
        .catch(() => []),
    staleTime: 1000 * 60 * 2,
  });

  const { data: allList = [], isLoading: loadingAll } = useQuery({
    queryKey: ["requirements", user?.role, token],
    enabled: Boolean(token) && !isBuyerRole,
    queryFn: () =>
      apiFetch<Req[]>("/requirements?limit=20&offset=0", {
        token: token ?? undefined,
      }).catch(() => []),
    staleTime: 1000 * 60 * 2,
  });
  const publicList = isBuyerRole ? mineList : allList;
  const loading = loadingMine || loadingAll;
  void queryClient;
  const rows = useMemo(
    () =>
      publicList.filter((r) => {
        const hay = `${r.city} ${r.areas.join(" ")}`.toLowerCase();
        if (q && !hay.includes(q.toLowerCase())) return false;
        if (type !== "ALL" && r.propertyType !== type) return false;
        if (dealType !== "ALL" && r.dealType !== dealType) return false;
        if (urgency !== "ALL" && !(r.urgency ?? r.tag).includes(urgency)) return false;
        if (status === "ACTIVE" && r.active === false) return false;
        return true;
      }),
    [dealType, publicList, q, status, type, urgency],
  );

  if (user?.role === "NRI" || user?.role === "BUYER" || user?.role === "INSTITUTIONAL_BUYER") {
    const isBuyer = user?.role === "BUYER";
    const isInstBuyer = user?.role === "INSTITUTIONAL_BUYER";
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
              <ClipboardList
                className={`h-7 w-7 ${isBuyer ? "text-[#378ADD]" : isInstBuyer ? "text-[#7F77DD]" : "text-[#00C49A]"}`}
              />
              My requirements
            </h1>
            <p className="mt-1 text-sm text-[#888]">
              {isInstBuyer
                ? "Acquisition targets for institutional assets."
                : isBuyer
                  ? "Properties you are looking for."
                  : "Properties you are looking to buy or rent in India."}
            </p>
          </div>
          <Link
            href="/requirements/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-medium text-black"
          >
            Post requirement +
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by city, area..."
            className="min-w-56 rounded-lg border border-[#1a1a1a] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#00C49A]"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-[#1a1a1a] bg-[#111111] px-3 py-2 text-sm text-[#888]"
          >
            <option value="ALL">All types</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="PLOT">Plot</option>
            <option value="INSTITUTIONAL">Institutional</option>
          </select>
          <select
            value={dealType}
            onChange={(e) => setDealType(e.target.value)}
            className="rounded-lg border border-[#1a1a1a] bg-[#111111] px-3 py-2 text-sm text-[#888]"
          >
            <option value="ALL">All deals</option>
            <option value="SALE">Sale</option>
            <option value="RENT">Rent</option>
          </select>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="rounded-lg border border-[#1a1a1a] bg-[#111111] px-3 py-2 text-sm text-[#888]"
          >
            <option value="ALL">All urgency</option>
            <option value="IMMEDIATE">Hot</option>
            <option value="WITHIN_30_DAYS">Warm</option>
            <option value="FLEXIBLE">Flexible</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-[#1a1a1a] bg-[#111111] px-3 py-2 text-sm text-[#888]"
          >
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="MATCHED">Matched</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <section className="mt-6">
          {loading ? (
            <PageSkeleton count={4} type="card" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No requirements yet"
              subtitle="Post a requirement to get matched with properties in India."
              actionLabel="Post requirement +"
              actionHref="/requirements/new"
            />
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4 text-sm text-[#ccc]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-semibold text-white">{r.city}</p>
                    <div className="flex flex-col items-end gap-1">
                      {isBuyer ? (
                        <Badge tone="blue" className="border-[#378ADD40]">
                          Posted by me
                        </Badge>
                      ) : isInstBuyer ? (
                        <Badge className="border border-[#7F77DD40] bg-[#7F77DD12] text-[#7F77DD]">Posted by me</Badge>
                      ) : (
                        <Badge tone="rose">Remote buyer</Badge>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyBadgeClass(r.urgency || r.tag)}`}
                      >
                        {(r.urgency || r.tag || "FLEXIBLE").replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.areas.map((a) => (
                      <span key={a} className="rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[11px] text-[#888]">
                        {a}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-base font-medium text-[#00C49A]">
                    {formatINR(Number(r.budgetMin ?? 0))} - {formatINR(Number(r.budgetMax ?? 0))}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/matches?requirement=${r.id}`}
                      className="rounded border border-[#00C49A40] px-3 py-1.5 text-xs text-[#00C49A] hover:bg-[#00C49A12]"
                    >
                      View matches
                    </Link>
                    {isBuyer || isInstBuyer ? (
                      <>
                        <Link
                          href={`/requirements/new?id=${r.id}`}
                          className={`rounded border px-3 py-1.5 text-xs hover:bg-[#ffffff08] ${
                            isInstBuyer
                              ? "border-[#7F77DD40] text-[#7F77DD]"
                              : "border-[#378ADD40] text-[#378ADD] hover:bg-[#378ADD12]"
                          }`}
                        >
                          Edit
                        </Link>
                        <span className="rounded border border-[#333333] px-3 py-1.5 text-xs text-[#888888]">
                          Close requirement
                        </span>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between gap-4">
        <h1 className="text-2xl font-semibold">Requirements</h1>
        <Link href="/requirements/new" className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white">
          Post requirement
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by city, area..." className="min-w-56 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm outline-none focus:border-[#00C49A]" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm"><option value="ALL">All types</option><option value="RESIDENTIAL">Residential</option><option value="COMMERCIAL">Commercial</option><option value="PLOT">Plot</option><option value="INSTITUTIONAL">Institutional</option></select>
        <select value={dealType} onChange={(e) => setDealType(e.target.value)} className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm"><option value="ALL">All deals</option><option value="SALE">Sale</option><option value="RENT">Rent</option></select>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm"><option value="ALL">All urgency</option><option value="IMMEDIATE">Hot</option><option value="WITHIN_30_DAYS">Warm</option><option value="FLEXIBLE">Flexible</option></select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm"><option value="ALL">All status</option><option value="ACTIVE">Active</option><option value="MATCHED">Matched</option><option value="CLOSED">Closed</option></select>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-300">Active requirements</h2>
        {loading ? (
          <PageSkeleton count={4} type="card" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No requirements posted"
            subtitle="Post requirement +"
            actionLabel="Post requirement +"
            actionHref="/requirements/new"
          />
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold text-zinc-100">{r.city}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyBadgeClass(r.urgency || r.tag)}`}
                >
                  {(r.urgency || r.tag || "FLEXIBLE").replaceAll("_", " ")}{(r.urgency || r.tag).includes("IMMEDIATE") ? " 🔥" : ""}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.areas.map((a) => (
                  <span key={a} className="rounded-md bg-[#1f1f1f] px-2 py-0.5 text-[11px] text-[#888]">{a}</span>
                ))}
              </div>
              <p className="mt-2 text-base font-medium text-teal-300">
                {formatINR(Number(r.budgetMin ?? 0))} - {formatINR(Number(r.budgetMax ?? 0))}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[#888]">
                <p className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />Budget</p>
                <p className="inline-flex items-center gap-1"><Maximize2 className="h-3 w-3" />{r.areaSqftMin ?? 0}-{r.areaSqftMax ?? 0}</p>
                <p className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.dealType ?? "SALE"}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                  {r.propertyType ?? "PROPERTY"}
                </span>
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                  {r.dealType ?? "SALE"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                <p className="inline-flex items-center gap-1"><Flame className="h-3 w-3" />Posted {relativeTime(r.createdAt)}</p>
                <span>0 matches</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/matches?requirement=${r.id}`} className="rounded border border-teal-800/70 px-3 py-1.5 text-xs text-teal-300 hover:bg-teal-950/40">View matches</Link>
                <Link href={`/deals/new?requirementId=${r.id}`} className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">Create deal</Link>
              </div>
            </li>
          ))}
          </ul>
        )}
      </section>
    </div>
  );
}
