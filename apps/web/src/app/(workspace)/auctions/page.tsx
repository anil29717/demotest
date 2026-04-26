"use client";

import { Banknote, CreditCard, FileText, Gavel, Home, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

type Auction = {
  id: string;
  source: string;
  title: string;
  city: string;
  emdAmount: unknown;
  startPrice: unknown;
  auctionDate: string | null;
  status?: string;
};

export default function AuctionsPage() {
  const { token, user } = useAuth();
  const [err, setErr] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["auctions", token],
    enabled: Boolean(token),
    queryFn: () =>
      apiFetch<Auction[]>("/verticals/auctions", { token: token ?? undefined }).catch(() => {
        setErr("Could not load auctions");
        return [];
      }),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <PageSkeleton count={3} type="card" />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold"><Gavel className="h-5 w-5 text-amber-300" />Bank auction inventory</h1>
      <p className="mt-1 text-sm text-zinc-500">Verified high-opportunity bank auction inventory.</p>
      {err && <p className="mt-4 text-sm text-red-400">{err}</p>}
      <ul className="mt-6 space-y-3">
        {rows.map((a) => (
          <li
            key={a.id}
            className="overflow-hidden rounded-lg border border-[#1f1f1f] bg-[#111111] text-sm"
          >
            <div className="border-l-4 border-amber-400 px-4 py-3">
              <p className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] text-amber-300"><Gavel className="h-3 w-3" />HIGH-OPPORTUNITY DEAL</p>
              <p className="mt-2 font-medium text-zinc-100">{a.title}</p>
              <p className="text-zinc-500">{a.city} · Source: {a.source}</p>
              {a.auctionDate && (
                <div className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                  <span>📅</span>
                  <span>
                    {new Date(a.auctionDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="ml-1 text-gray-500">({timeAgo(a.auctionDate)})</span>
                </div>
              )}
            </div>
            <div className="grid gap-2 border-t border-[#1f1f1f] px-4 py-3 sm:grid-cols-4">
              <p className="inline-flex items-center gap-1 text-xs text-[#888]"><Banknote className="h-3 w-3" />Reserve {formatINR(Number(a.startPrice ?? 0))}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[#888]"><CreditCard className="h-3 w-3" />EMD {formatINR(Number(a.emdAmount ?? 0))}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[#888]"><Home className="h-3 w-3" />Vacant</p>
              <p className="inline-flex items-center gap-1 text-xs text-[#888]"><Scale className="h-3 w-3" />Clear</p>
            </div>
            <div className="flex items-center justify-between border-t border-[#1f1f1f] px-4 py-2">
              <span className="rounded-full bg-[#00C49A1A] px-2 py-0.5 text-xs text-[#00C49A]">HIGH liquidity</span>
              <span className="inline-flex gap-2 text-xs">
                <Link className="inline-flex items-center gap-1 rounded border border-[#1f1f1f] px-2 py-1 text-[#888]" href={`/dd/property/${a.id}/checklist`}><FileText className="h-3 w-3" />DD Checklist</Link>
                <button type="button" className="rounded bg-[#00C49A] px-2 py-1 text-black">
                  {user?.role === "HNI" ? "Add to portfolio tracker" : "Add to CRM"}
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      {!rows.length && !err && !isLoading ? <EmptyState icon={Gavel} title="No auctions listed" subtitle="Add auction +" actionLabel="Add auction +" actionHref="/auctions/new" /> : null}
    </div>
  );
}
