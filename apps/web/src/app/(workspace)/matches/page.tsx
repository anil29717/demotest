"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ClipboardList, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/skeleton";

type MatchFactors = {
  location?: number;
  budget?: number;
  propertyType?: number;
  dealType?: number;
  areaSqft?: number;
  urgency?: number;
  ruleScore?: number;
};

type MatchRow = {
  id: string;
  matchScore: number;
  hotMatch: boolean;
  status: string;
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

export default function MatchesPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [view, setView] = useState<"all" | "property" | "requirement" | "hot">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [contacting, setContacting] = useState<string | null>(null);

  const { isLoading, refetch } = useQuery({
    queryKey: ["matches", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const data = await apiFetch<MatchRow[]>("/matching/me?limit=20&offset=0", { token: token ?? undefined }).catch(() => []);
      setRows(data);
      return data;
    },
  });

  async function refresh() {
    setRefreshing(true);
    void refetch();
    setTimeout(() => setRefreshing(false), 500);
  }

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

  function ruleScoreFromMatch(m: MatchRow): number | null {
    const r = m.matchFactors?.ruleScore;
    return typeof r === "number" ? r : null;
  }

  function scoreTooltip(m: MatchRow): string {
    const f = m.matchFactors;
    if (!f) return "";
    return [
      `Location (weighted): ${f.location?.toFixed(1) ?? "—"}`,
      `Budget (weighted): ${f.budget?.toFixed(1) ?? "—"}`,
      `Type (weighted): ${f.propertyType?.toFixed(1) ?? "—"}`,
      `Area (weighted): ${f.areaSqft?.toFixed(1) ?? "—"}`,
      m.mlConfidence != null ? `AI confidence: ${(m.mlConfidence * 100).toFixed(0)}%` : "",
    ]
      .filter(Boolean)
      .join("\n");
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
    const filteredNri = buyerRows.filter((m) => {
      if (view === "all") return true;
      return m.matchScore >= 80;
    });

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
            className="inline-flex items-center gap-1 self-start text-xs text-[#00C49A]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="flex gap-2 text-xs">
          {(["all", "hot"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={`rounded border px-2 py-1 ${
                view === k ? "border-[#00C49A] text-[#00C49A]" : "border-[#333] text-[#888]"
              }`}
            >
              {k === "all" ? "All" : "Hot only"}
            </button>
          ))}
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

  return (
    <div>
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">{user?.role === "SELLER" ? <Zap className="h-6 w-6 text-[#00C49A]" /> : null} {user?.role === "SELLER" ? "Buyer matches" : "Your matches"}</h1>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-sm text-zinc-500">{user?.role === "SELLER" ? "Buyers whose requirements match your listings." : "Rule-based scores. Hot = 80+ fit."}</p>
        <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1 text-xs text-[#00C49A]">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="mt-4 flex gap-2 text-xs">
        {(user?.role === "SELLER" ? (["all", "hot"] as const) : (["all", "property", "requirement", "hot"] as const)).map((k) => (
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
                  : "Hot only 🔥"}
          </button>
        ))}
      </div>
      <ul className="mt-6 space-y-3">
        {rows
          .filter((m) => {
            if (view === "all") return true;
            if (view === "property") return user?.id === m.property.postedById;
            if (view === "hot") return m.matchScore >= 80;
            return user?.id === m.requirement.userId;
          })
          .map((m) => {
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
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => void mark(m.id, "VIEWED")}
                  className="rounded border border-zinc-700 px-2 py-1 text-zinc-400"
                >
                  Mark viewed
                </button>
                {user?.role === "SELLER" ? (
                  <button type="button" onClick={() => setContacting(m.id)} className="rounded border border-emerald-700 px-2 py-1 text-emerald-300">Contact platform</button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void mark(m.id, "ACCEPTED")}
                    className="rounded border border-emerald-700 px-2 py-1 text-emerald-300"
                  >
                    Accept
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void mark(m.id, "REJECTED")}
                  className="rounded border border-rose-800 px-2 py-1 text-rose-300"
                >
                  Reject
                </button>
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
      {rows.length === 0 && (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-zinc-300">No matches yet — post a listing or requirement.</p>
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
