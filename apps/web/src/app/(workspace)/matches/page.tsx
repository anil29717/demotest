"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, getUserFacingErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/skeleton";

type MatchBreakdownRow = {
  key: string;
  label: string;
  rawScore: number;
  weight: number;
  contribution: number;
  percentOfRuleScore: number;
};

type MatchFactors = {
  location?: number;
  budget?: number;
  propertyType?: number;
  dealType?: number;
  areaSqft?: number;
  urgency?: number;
  ruleScore?: number;
  breakdown?: MatchBreakdownRow[];
  summaryLine?: string;
  scoringVersion?: number;
  sub?: Record<string, unknown>;
};

type MatchRow = {
  id: string;
  matchScore: number;
  hotMatch: boolean;
  status: string;
  /** Set when user converted this match to a CRM lead */
  convertedToLead?: boolean;
  matchFactors?: MatchFactors;
  mlScore?: number | null;
  combinedScore?: number | null;
  mlConfidence?: number | null;
  mlExplanation?: Record<string, unknown> | null;
  property: {
    id: string;
    title: string;
    city: string;
    price: unknown;
    postedById: string;
  };
  requirement: {
    id: string;
    city: string;
    tag: string;
    userId: string;
  };
};

type OrgRow = { id: string; name?: string; organizationId?: string; isActive?: boolean };

type MatchHeatFilter = "all" | "hot" | "normal";
type MatchSortMode = "score" | "price_asc" | "price_desc";

export default function MatchesPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [view, setView] = useState<"all" | "property" | "requirement" | "history">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [contacting, setContacting] = useState<string | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations-mine", token],
    enabled: Boolean(token),
    queryFn: () => apiFetch<OrgRow[]>("/organizations/mine", { token: token ?? undefined }).catch(() => []),
    staleTime: 0,
  });
  const activeOrg = orgs.find((o) => o.isActive) ?? orgs[0] ?? null;
  const activeOrgId = activeOrg ? activeOrg.organizationId || activeOrg.id : null;
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  /** Secondary filter: minimum combined % (server-side). */
  const [minCutoff, setMinCutoff] = useState<number | null>(null);
  const [heat, setHeat] = useState<MatchHeatFilter>("all");
  const [sortBy, setSortBy] = useState<MatchSortMode>("score");

  const { isLoading, refetch, isFetching, isRefetching } = useQuery({
    queryKey: ["matches", token, view, minCutoff, heat, sortBy],
    enabled: Boolean(token),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (heat === "hot") qs.set("heat", "hot");
      if (heat === "normal") qs.set("heat", "normal");
      if (minCutoff != null && Number.isFinite(minCutoff)) {
        qs.set("minScore", String(minCutoff));
      }
      if (sortBy !== "score") qs.set("sort", sortBy);
      const suffix = qs.toString();
      const path = `/matching/me${suffix ? `?${suffix}` : ""}`;
      const data = await apiFetch<MatchRow[]>(path, { token: token ?? undefined }).catch(() => []);
      setRows(data);
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  async function refresh() {
    setRefreshing(true);
    try {
      const result = await refetch();
      if (Array.isArray(result.data)) setRows(result.data);
    } finally {
      setRefreshing(false);
    }
  }

  const showRefreshSpin = refreshing || isFetching || isRefetching;

  async function mark(id: string, status: "VIEWED" | "ACCEPTED" | "REJECTED") {
    if (!token) return;
    const body: { status: string; accepted?: boolean } = { status };
    if (status === "ACCEPTED") body.accepted = true;
    if (status === "REJECTED") body.accepted = false;
    await apiFetch(`/matching/matches/${id}/status`, {
      method: "PUT",
      token,
      body: JSON.stringify(body),
    });
    void refetch();
  }

  async function convertMatchToLead(m: MatchRow) {
    if (!token) return;
    const repeat = matchHasLeadRecord(m);
    setConvertingLeadId(m.id);
    try {
      await apiFetch("/leads", {
        method: "POST",
        token,
        body: JSON.stringify({
          leadName: m.requirement.tag ? `${m.requirement.tag} • ${m.requirement.city}` : m.property.title,
          source: `match:${m.matchScore}`,
          pipelineStage: "MATCH",
          propertyId: m.property.id,
          requirementId: m.requirement.id,
        }),
      });
      toast.success(
        repeat
          ? "Another lead added to CRM."
          : "Converted to lead. It will appear in CRM leads.",
      );
      await mark(m.id, "ACCEPTED");
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (e) {
      toast.error(getUserFacingErrorMessage(e, "Could not convert match to lead. Please try again."));
    } finally {
      setConvertingLeadId(null);
    }
  }

  async function setMatchStatus(id: string, status: "VIEWED" | "ACCEPTED" | "REJECTED") {
    if (!token) return;
    setStatusSavingId(id);
    try {
      await mark(id, status);
      toast.success(
        status === "ACCEPTED" ? "Marked accepted" : status === "REJECTED" ? "Marked rejected" : "Marked viewed",
      );
    } catch (e) {
      toast.error(getUserFacingErrorMessage(e, "Could not update status. Please try again."));
      void refetch();
    } finally {
      setStatusSavingId(null);
    }
  }

  /** API may return ACTIVE for new matches; broker UI treats that as Viewed in the dropdown until updated. */
  function matchStatusSelectValue(status: string): "VIEWED" | "ACCEPTED" | "REJECTED" {
    const u = String(status).toUpperCase();
    if (u === "ACCEPTED") return "ACCEPTED";
    if (u === "REJECTED") return "REJECTED";
    if (u === "VIEWED") return "VIEWED";
    return "VIEWED";
  }

  function ruleScoreFromMatch(m: MatchRow): number | null {
    const r = m.matchFactors?.ruleScore;
    return typeof r === "number" ? r : null;
  }

  function scoreTooltip(m: MatchRow): string {
    const f = m.matchFactors;
    if (!f) return "";
    const lines = [
      f.summaryLine ?? "",
      `Combined (stored): ${m.matchScore}%`,
      `Rule: ${f.ruleScore ?? "—"}`,
      `Location (weighted): ${f.location?.toFixed(1) ?? "—"}`,
      `Budget (weighted): ${f.budget?.toFixed(1) ?? "—"}`,
      `Type (weighted): ${f.propertyType?.toFixed(1) ?? "—"}`,
      `Area (weighted): ${f.areaSqft?.toFixed(1) ?? "—"}`,
      m.mlConfidence != null ? `AI confidence: ${(m.mlConfidence * 100).toFixed(0)}%` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }

  function isHistoryStatus(status: string): boolean {
    const s = status.toUpperCase();
    return s === "ACCEPTED" || s === "REJECTED";
  }

  function isRejectedStatus(status: string): boolean {
    return String(status).toUpperCase() === "REJECTED";
  }

  function matchHasLeadRecord(m: MatchRow): boolean {
    return Boolean(m.convertedToLead) || String(m.status).toUpperCase() === "ACCEPTED";
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>{" "}
        to see matches.
      </p>
    );
  if (isLoading) return <PageSkeleton count={4} type="card" />;

  if (user?.role === "NRI" || user?.role === "BUYER") {
    const isBuyer = user?.role === "BUYER";
    const buyerRows = rows.filter((m) => user?.id === m.requirement.userId);
    const filteredNri = buyerRows;

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
              <Zap className={`h-7 w-7 ${isBuyer ? "text-[#378ADD]" : "text-[#00C49A]"}`} />
              Matched properties
            </h1>
            <p className="mt-1 text-sm text-[#888]">Properties matching what you are looking for.</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={showRefreshSpin}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm font-medium text-[#ccc] hover:border-[#00C49A40] hover:text-[#00C49A] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${showRefreshSpin ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-xs text-[#888]">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as MatchSortMode)}
              className="min-w-[12rem] rounded border border-[#333] bg-[#111] px-2 py-1.5 text-[#ccc] [color-scheme:dark]"
            >
              <option value="score">Combined score (best first)</option>
              <option value="price_asc">Price · low to high</option>
              <option value="price_desc">Price · high to low</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#888]">
            <span>Match tier</span>
            <select
              value={heat}
              onChange={(e) => setHeat(e.target.value as MatchHeatFilter)}
              className="min-w-[10rem] rounded border border-[#333] bg-[#111] px-2 py-1.5 text-[#ccc] [color-scheme:dark]"
            >
              <option value="all">All</option>
              <option value="hot">Hot</option>
              <option value="normal">Normal</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#888]">
            <span>Min combined %</span>
            <select
              value={minCutoff == null ? "" : String(minCutoff)}
              onChange={(e) => {
                const v = e.target.value;
                setMinCutoff(v === "" ? null : Number(v));
              }}
              className="min-w-[9rem] rounded border border-[#333] bg-[#111] px-2 py-1.5 text-[#ccc] [color-scheme:dark]"
            >
              <option value="">Any</option>
              {[60, 65, 70, 75, 80, 85, 90].map((n) => (
                <option key={n} value={String(n)}>
                  ≥ {n}%
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="mt-2 space-y-4">
          {filteredNri.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4 text-sm text-[#ccc]"
            >
              <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[#555]">
                    <ClipboardList className="h-3 w-3" />
                    My requirement
                  </p>
                  <p className="mt-1 text-white">
                    {m.requirement.city} · {m.requirement.tag}
                  </p>
                </div>
                <ArrowRight className="hidden h-5 w-5 shrink-0 text-[#555] md:block" />
                <div className="min-w-0 flex-1 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[#555]">
                    <Building2 className="h-3 w-3" />
                    Matched property
                  </p>
                  <p className="mt-1 font-medium text-white">
                    <Link href={`/properties/${m.property.id}`} className="hover:text-[#00C49A] hover:underline">
                      {m.property.title}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-[#888]">
                    {m.property.city} · {formatINR(Number(m.property.price ?? 0))}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={isBuyer ? "blue" : "teal"}>{m.matchScore}% fit</Badge>
                <button
                  type="button"
                  onClick={() => setContacting(m.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    isBuyer
                      ? "border-[#378ADD40] bg-[#378ADD12] text-[#378ADD] hover:border-[#00C49A] hover:text-[#00C49A]"
                      : "border-[#00C49A40] bg-[#00C49A12] text-[#00C49A]"
                  }`}
                >
                  Express interest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void mark(m.id, "VIEWED");
                    toast.success("Saved to your list");
                  }}
                  className="rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#888] hover:border-[#555]"
                >
                  Save property
                </button>
              </div>
            </li>
          ))}
        </ul>
        {buyerRows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-[#1a1a1a] bg-[#111111] p-8 text-center">
            <Zap className="mx-auto h-10 w-10 text-[#555]" />
            <p className="mt-3 text-base font-medium text-white">No matches yet</p>
            <p className="mt-1 text-sm text-[#888]">Post a requirement to get matched with available properties.</p>
            <Link
              href="/requirements/new"
              className="mt-5 inline-flex rounded-lg bg-[#00C49A] px-4 py-2 text-sm font-medium text-black"
            >
              Post requirement +
            </Link>
          </div>
        ) : null}
        {contacting ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
              <p className="text-sm text-white">Our team will connect you with the seller or broker for this property.</p>
              <p className="mt-2 text-xs text-[#888]">
                We route your interest through AR Buildwel. Listing parties do not receive your contact details until
                the platform approves the introduction.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setContacting(null)}
                  className="rounded border border-[#333] px-3 py-1.5 text-xs text-[#ccc]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContacting(null);
                    router.push("/services-hub");
                  }}
                  className="rounded bg-[#00C49A] px-3 py-1.5 text-xs font-medium text-black"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const filteredRows = rows.filter((m) => {
    if (view === "history") return isHistoryStatus(m.status);
    // Keep ACCEPTED (converted leads) in main views so users can add another lead
    if (isRejectedStatus(m.status)) return false;
    if (view === "all") return true;
    if (view === "property") return user?.id === m.property.postedById;
    return user?.id === m.requirement.userId;
  });

  return (
    <div>
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">{user?.role === "SELLER" ? <Zap className="h-6 w-6 text-[#00C49A]" /> : null} {user?.role === "SELLER" ? "Buyer matches" : "Your matches"}</h1>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {user?.role === "SELLER"
            ? "Buyers whose requirements match your listings."
            : "Combined % = rule (+ AI blend when available). Hot = ≥75% combined. Use filters to narrow."}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={showRefreshSpin}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-teal-600 hover:text-teal-300 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${showRefreshSpin ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {(user?.role === "SELLER"
          ? (["all"] as const)
          : (["all", "property", "requirement", "history"] as const)).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className={`rounded border px-2 py-1 ${
              view === k ? "border-teal-700 text-teal-300" : "border-zinc-700 text-zinc-500"
            }`}
          >
            {k === "all"
              ? "All"
              : k === "property"
                ? "Property-centric"
                : k === "requirement"
                  ? "Requirement-centric"
                  : "History"}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MatchSortMode)}
            className="min-w-[12rem] rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-zinc-200 [color-scheme:dark]"
          >
            <option value="score">Combined score (best first)</option>
            <option value="price_asc">Price · low to high</option>
            <option value="price_desc">Price · high to low</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          <span>Match tier</span>
          <select
            value={heat}
            onChange={(e) => setHeat(e.target.value as MatchHeatFilter)}
            className="min-w-[10rem] rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-zinc-200 [color-scheme:dark]"
          >
            <option value="all">All</option>
            <option value="hot">Hot</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          <span>Min combined %</span>
          <select
            value={minCutoff == null ? "" : String(minCutoff)}
            onChange={(e) => {
              const v = e.target.value;
              setMinCutoff(v === "" ? null : Number(v));
            }}
            className="min-w-[9rem] rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-zinc-200 [color-scheme:dark]"
          >
            <option value="">Any</option>
            {[60, 65, 70, 75, 80, 85, 90].map((n) => (
              <option key={n} value={String(n)}>
                ≥ {n}%
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
        <span>Quick min %:</span>
        {([null, 70, 75, 80] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => setMinCutoff(v)}
            className={`rounded border px-2 py-0.5 ${
              minCutoff === v ? "border-teal-600 text-teal-300" : "border-zinc-700 text-zinc-500"
            }`}
          >
            {v == null ? "Any" : `≥ ${v}%`}
          </button>
        ))}
      </div>
      <ul className="mt-6 space-y-3">
        {filteredRows.map((m) => {
          const role =
            user?.id === m.property.postedById
              ? "Your listing"
              : user?.id === m.requirement.userId
                ? "Your requirement"
                : "";
          return (
            <li
              key={m.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="font-medium text-teal-400"
                  title={scoreTooltip(m) || undefined}
                >
                  {m.matchScore}% combined
                </span>
                {m.mlConfidence != null &&
                  m.mlConfidence > 0.6 &&
                  m.mlScore != null && (
                    <span className="rounded bg-[#00C49A]/20 px-2 py-0.5 text-[10px] font-medium text-[#00C49A]">
                      AI {(m.mlScore as number).toFixed(0)}%
                    </span>
                  )}
                {ruleScoreFromMatch(m) != null && (
                  <span className="text-[10px] text-zinc-500">
                    Rule {Math.round(ruleScoreFromMatch(m) as number)}%
                  </span>
                )}
                {m.hotMatch && (
                  <span className="rounded bg-amber-900/40 px-2 py-0.5 text-xs text-amber-200">
                    Hot
                  </span>
                )}
                {role && <span className="text-xs text-zinc-500">{role}</span>}
              </div>
              <p className="mt-2 text-zinc-300">
                <Link href={`/properties/${m.property.id}`} className="hover:underline">
                  {m.property.title}
                </Link>{" "}
                · {m.property.city} · {formatINR(Number(m.property.price ?? 0))}
              </p>
              <p className="text-zinc-500">
                Buyer need: {m.requirement.city} · {m.requirement.tag} · status {m.status}
                {user?.role === "SELLER" ? <span className="ml-2 inline-flex items-center gap-1 text-[#00C49A]"><ShieldCheck className="h-3 w-3" />Verified buyer</span> : null}
              </p>
              {m.matchFactors?.breakdown?.length ? (
                <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs">
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">
                    Why {Math.round(Number(m.matchFactors?.ruleScore ?? m.matchScore))}% rule score?
                  </summary>
                  {m.matchFactors?.summaryLine ? (
                    <p className="mt-2 text-sm text-zinc-300">{m.matchFactors.summaryLine}</p>
                  ) : null}
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[280px] text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="py-1 pr-2 font-medium">Factor</th>
                          <th className="py-1 pr-2 font-medium">Raw</th>
                          <th className="py-1 pr-2 font-medium">Wt</th>
                          <th className="py-1 pr-2 font-medium">Pts</th>
                          <th className="py-1 font-medium">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.matchFactors.breakdown.map((row) => (
                          <tr key={row.key} className="border-b border-zinc-800/80 text-zinc-300">
                            <td className="py-1.5 pr-2">{row.label}</td>
                            <td className="py-1.5 pr-2">{row.rawScore.toFixed(0)}</td>
                            <td className="py-1.5 pr-2">{(row.weight * 100).toFixed(0)}%</td>
                            <td className="py-1.5 pr-2">{row.contribution.toFixed(1)}</td>
                            <td className="py-1.5">{row.percentOfRuleScore.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-600">
                    Combined display score may differ from rule score when the AI service blends scores. Accept/reject
                    trains future ranking via feedback export.
                  </p>
                </details>
              ) : (
                <p className="mt-2 text-[11px] text-zinc-600">
                  Run matching again or refresh to load detailed score breakdown for this pair.
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <label className="inline-flex items-center gap-2 text-zinc-500">
                  <span className="shrink-0">Status</span>
                  <select
                    value={matchStatusSelectValue(m.status)}
                    disabled={statusSavingId === m.id}
                    onChange={(e) => {
                      const v = e.target.value as "VIEWED" | "ACCEPTED" | "REJECTED";
                      void setMatchStatus(m.id, v);
                    }}
                    className="min-w-[9.5rem] rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-zinc-200 [color-scheme:dark] disabled:opacity-50"
                  >
                    <option value="VIEWED">Viewed</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
                {user?.role === "SELLER" ? (
                  <button
                    type="button"
                    onClick={() => setContacting(m.id)}
                    className="rounded border border-emerald-700 px-2 py-1 text-emerald-300"
                  >
                    Contact platform
                  </button>
                ) : !isRejectedStatus(m.status) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {matchHasLeadRecord(m) ? (
                      <span className="inline-flex items-center gap-1 rounded border border-teal-800/60 bg-teal-950/35 px-2 py-1 text-[11px] font-medium text-teal-300">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Lead in CRM
                      </span>
                    ) : null}
                    <button
                      type="button"
                      disabled={convertingLeadId === m.id}
                      onClick={() => void convertMatchToLead(m)}
                      className="inline-flex items-center gap-1.5 rounded border border-teal-700 px-2.5 py-1.5 text-teal-300 hover:border-teal-500 hover:bg-teal-950/30 disabled:opacity-50"
                    >
                      {convertingLeadId === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {convertingLeadId === m.id
                        ? "Converting…"
                        : matchHasLeadRecord(m)
                          ? "Add another lead"
                          : "Convert to lead"}
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-zinc-400">
                    Rejected
                  </span>
                )}
              </div>
              {user?.role !== "SELLER" ? (
                <Link
                  href={`/deals/new?propertyId=${m.property.id}&requirementId=${m.requirement.id}`}
                  className="mt-2 inline-block text-xs text-teal-500 hover:underline"
                >
                  Start deal (pick org on form)
                </Link>
              ) : null}
            </li>
          );
          })}
      </ul>
      {filteredRows.length === 0 && (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-zinc-300">
            {view === "history"
              ? "No history yet."
              : "No active matches yet — post a listing or requirement."}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Our matching engine automatically pairs your listings with buyer requirements. Post
            your first listing or requirement to get started.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/properties/new"
              className="rounded bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-500"
            >
              Post a property →
            </Link>
            <Link
              href="/requirements/new"
              className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Post a requirement →
            </Link>
          </div>
        </div>
      )}
      {contacting ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="text-sm text-white">AR Buildwel will connect you with this buyer.</p>
            <p className="mt-1 text-xs text-[#888]">A platform representative will connect you with this buyer.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setContacting(null)} className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button>
              <button type="button" onClick={() => setContacting(null)} className="rounded bg-[#00C49A] px-3 py-1.5 text-xs text-black">Confirm</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
