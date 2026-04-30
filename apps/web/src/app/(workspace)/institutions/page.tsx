"use client";

import { Landmark, Lock, MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, getUserFacingErrorMessage } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

type Inst = {
  id: string;
  institutionType: string;
  city: string;
  maskedSummary: string | null;
  askingPriceCr: unknown;
  studentEnrollment: number | null;
  createdAt?: string;
  locked?: boolean;
  ndaStatus?: string;
  isPoster?: boolean;
  transactionType?: string;
};

export default function InstitutionsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "nda" | "approved" | "mine" | "browse">("all");
  const [filterTx, setFilterTx] = useState<string>("ALL");

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["institutions", token],
    enabled: Boolean(token),
    queryFn: () =>
      apiFetch<Inst[]>("/institutions/me", {
        token: token ?? undefined,
      }),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  void queryClient;

  const activeTab = useMemo(() => {
    const role = user?.role;
    if (role === "INSTITUTIONAL_SELLER") {
      if (tab === "mine" || tab === "browse") return tab;
      return "mine";
    }
    if (role === "INSTITUTIONAL_BUYER") {
      if (tab === "all" || tab === "nda" || tab === "approved") return tab;
      return "all";
    }
    return tab;
  }, [user?.role, tab]);

  const filtered = useMemo(() => {
    let r = rows;
    if (user?.role === "INSTITUTIONAL_BUYER") {
      if (activeTab === "nda") r = r.filter((i) => i.ndaStatus === "PENDING");
      if (activeTab === "approved") r = r.filter((i) => i.ndaStatus === "APPROVED" || i.isPoster);
    }
    if (filterTx !== "ALL") {
      r = r.filter((i) => String(i.transactionType ?? "").toUpperCase() === filterTx);
    }
    return r;
  }, [rows, activeTab, filterTx, user?.role]);

  const isInstBuyer = user?.role === "INSTITUTIONAL_BUYER";
  const isInstSeller = user?.role === "INSTITUTIONAL_SELLER";
  const isHni = user?.role === "HNI";

  if (!token) {
    return (
      <p className="text-sm text-[#888888]">
        <Link href="/login" className="text-[#00C49A]">
          Log in
        </Link>{" "}
        to view institutional listings.
      </p>
    );
  }

  if (isLoading) return <PageSkeleton count={4} type="card" />;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">
        <p>Could not load institutional listings.</p>
        <p className="mt-2 text-xs text-red-300/90">{getUserFacingErrorMessage(error, "Unknown error")}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 rounded-lg border border-red-800 px-3 py-1.5 text-xs text-red-100 hover:bg-red-950/40"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
            <Landmark className="h-7 w-7 text-[#00C49A]" />
            {isInstSeller ? "My institution" : "Institutional listings"}
          </h1>
          <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-sm text-[#888888]">
            <Lock className="h-4 w-4 shrink-0" />
            Names stay masked until confidentiality access is approved.
          </p>
        </div>
        {user?.role !== "INSTITUTIONAL_BUYER" && user?.role !== "BUYER" && user?.role !== "HNI" ? (
          <Link
            href="/properties/new"
            className="shrink-0 rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-medium text-black hover:brightness-95"
          >
            {isInstSeller ? "Post institution +" : "Add listing +"}
          </Link>
        ) : null}
      </div>

      {isInstBuyer ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all" as const, label: "All listings" },
              { id: "nda" as const, label: "NDA requested" },
              { id: "approved" as const, label: "NDA approved" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                activeTab === t.id ? "border-[#7F77DD] bg-[#7F77DD15] text-[#7F77DD]" : "border-[#1a1a1a] text-[#888888]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {isInstSeller ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "mine" as const, label: "My listing" },
              { id: "browse" as const, label: "Browse other listings" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                activeTab === t.id ? "border-[#5BAD8F] bg-[#5BAD8F15] text-[#5BAD8F]" : "border-[#1a1a1a] text-[#888888]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {isInstBuyer ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#555555]">Transaction</span>
          <select
            value={filterTx}
            onChange={(e) => setFilterTx(e.target.value)}
            className="rounded-lg border border-[#1a1a1a] bg-[#111111] px-3 py-1.5 text-xs text-white"
          >
            <option value="ALL">All</option>
            <option value="SALE">Sale</option>
            <option value="LEASE">Lease</option>
            <option value="JV">JV</option>
            <option value="TAKEOVER">Takeover</option>
          </select>
        </div>
      ) : null}

      <ul className="grid gap-3 md:grid-cols-2">
        {filtered.map((i) => (
          <motion.li key={i.id} whileHover={{ y: -2 }} className="rounded-xl border border-[#1f1f1f] bg-[#111111]">
            <Link href={`/institutions/${i.id}`} className="block p-4 transition hover:border-[#00C49A]/30">
            <div className="flex items-center justify-between">
              <span className="rounded-md border border-[#1f1f1f] px-2 py-0.5 text-xs text-[#888888]">{i.institutionType}</span>
              <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                <Lock className="h-3 w-3" />
                {i.ndaStatus === "APPROVED" || i.isPoster ? "Unlocked" : "NDA"}
              </span>
            </div>
            <p className="mt-3 text-base font-semibold text-white">
              {i.maskedSummary ?? `Confidential — ${i.institutionType}`}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#888888]">
              <MapPin className="h-3 w-3" />
              {i.city}
            </p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-[#00C49A]">{formatINR(Number(i.askingPriceCr ?? 0) * 10000000)}</p>
              <p className="text-[#888888]">{i.studentEnrollment ? `~${i.studentEnrollment} students` : "Not disclosed"}</p>
            </div>
            {isHni ? (
              <div className="mt-2 inline-flex items-center gap-1 rounded border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                <TrendingUp className="h-3 w-3" />
                Yield &amp; enrollment highlights on request
              </div>
            ) : null}
            {isInstBuyer ? (
              <div className="mt-2 inline-flex items-center gap-1 rounded border border-[#7F77DD40] px-2 py-0.5 text-[10px] font-medium text-[#7F77DD]">
                <TrendingUp className="h-3 w-3" />
                EBITDA when disclosed
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between border-t border-[#1f1f1f] pt-2 text-xs text-[#888888]">
              <span>{i.createdAt ? timeAgo(i.createdAt) : "Recently posted"}</span>
              <span className="inline-flex items-center gap-1 text-[#00C49A]">
                <ShieldCheck className="h-3 w-3" />
                View details →
              </span>
            </div>
            </Link>
            {isInstBuyer ? (
              <div className="border-t border-[#1f1f1f] px-4 pb-4">
              <Link
                href={`/institutions/${i.id}`}
                className={`block w-full rounded-lg py-2 text-center text-sm font-semibold ${
                  i.ndaStatus === "PENDING"
                    ? "cursor-default border border-amber-800/50 bg-amber-950/30 text-amber-200"
                    : i.ndaStatus === "APPROVED" || i.isPoster
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-amber-500 text-black hover:bg-amber-400"
                }`}
              >
                {i.isPoster
                  ? "Your listing"
                  : i.ndaStatus === "PENDING"
                    ? "Access pending"
                    : i.ndaStatus === "APPROVED"
                      ? "View details"
                      : "Request Access"}
              </Link>
              </div>
            ) : null}
          </motion.li>
        ))}
      </ul>
      {!filtered.length && !isLoading ? (
        <EmptyState
          icon={Landmark}
          title="No institutional listings yet"
          subtitle="When listings are available, they will appear here with confidentiality controls."
          actionHref="/properties/new"
          actionLabel="Add listing +"
        />
      ) : null}
    </div>
  );
}
