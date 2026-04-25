"use client";

import { Award, CheckCircle, Clock, Globe, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

export default function ReputationPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<{
    reputationScore: number;
    closedDealsAttributed: number;
    note: string;
  } | null>(null);
  const [graph, setGraph] = useState<{
    nodes: { id: string; kind: string }[];
    edges: { from: string; to: string; kind: string; weight: number }[];
    note?: string;
  } | null>(null);

  const { isLoading, refetch } = useQuery({
    queryKey: ["reputation", user?.id, token],
    enabled: Boolean(token && user?.id),
    queryFn: async () => {
      const userId = user?.id ?? "";
      const [score, graphData] = await Promise.all([
        apiFetch("/reputation/me", { token: token ?? undefined }).catch(() => null),
        apiFetch("/reputation/graph/me", { token: token ?? undefined }).catch(() => null),
        apiFetch(`/reviews/target/${userId}?limit=20&offset=0`, { token: token ?? undefined }).catch(() => []),
      ]);
      setData(score as { reputationScore: number; closedDealsAttributed: number; note: string } | null);
      setGraph(
        graphData as {
          nodes: { id: string; kind: string }[];
          edges: { from: string; to: string; kind: string; weight: number }[];
          note?: string;
        } | null,
      );
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

  if (user?.role === "NRI") {
    if (isLoading || !data) return <PageSkeleton count={3} type="card" />;
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
          <Award className="h-6 w-6 text-[#00C49A]" />
          My reputation
        </h1>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-sm">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-[#E85D8A40] text-4xl font-semibold text-white">
                {Math.round(data.reputationScore)}
              </div>
              <div className="flex-1">
                <p className="text-[#888]">Trust score</p>
                <ul className="mt-3 space-y-2 text-xs text-[#888]">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#E85D8A]" />
                    Identity verified (NRI/OCI documentation)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-[#00C49A]" />
                    Transaction history on platform
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#00C49A]" />
                    Response time to managers
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="h-3.5 w-3.5 text-[#00C49A]" />
                    Reviews from brokers after verified activity
                  </li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#E85D8A40] bg-[#E85D8A12] px-3 py-1 text-xs font-medium text-[#E85D8A]">
                    <Globe className="h-3.5 w-3.5" />
                    Verified NRI
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#00C49A40] bg-[#00C49A12] px-3 py-1 text-xs font-medium text-[#00C49A]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trusted investor
                  </span>
                </div>
              </div>
            </div>
          </div>
        <p className="text-xs text-[#555]">
          Reviews appear after verified transactions with brokers or sellers on the platform.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold"><Award className="h-5 w-5 text-[#00C49A]" />{user?.role === "SELLER" ? "My reputation" : "Reputation"}</h1>
      <p className="mt-1 text-sm text-zinc-500">{user?.role === "SELLER" ? "Your seller trust score on AR Buildwel." : "Your trust score and platform standing"}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded bg-teal-600 px-4 py-2 text-sm text-white"
        >
          Refresh score
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
        >
          Load review graph
        </button>
      </div>
      {(isLoading && !data) ? <PageSkeleton count={3} type="card" /> : null}
      {data && (
        <div className="mt-6 rounded border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
          <div className="flex items-center gap-6">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#00C49A40] text-4xl font-semibold">{Math.round(data.reputationScore)}</div>
            <div>
              <p className="text-zinc-300">Trust Score</p>
              <p className="mt-1 text-xs text-zinc-500">Closed deals: {data.closedDealsAttributed}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1"><ShieldCheck className="h-3 w-3 text-[#00C49A]" />Verified Seller</span>
                <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1"><Clock className="h-3 w-3 text-emerald-300" />Responsive Seller</span>
                <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1"><CheckCircle className="h-3 w-3 text-amber-300" />Deal Closer</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {graph && (
        <div className="mt-6 rounded border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-400">
          <p className="font-medium text-zinc-300">Network position</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <p className="rounded bg-zinc-800 px-2 py-2">Connected to {graph.nodes.length} brokers</p>
            <p className="rounded bg-zinc-800 px-2 py-2">{graph.edges.length} co-broking deals</p>
            <p className="rounded bg-zinc-800 px-2 py-2">Network trust: {graph.edges.length > 4 ? "High" : graph.edges.length > 1 ? "Medium" : "Low"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
