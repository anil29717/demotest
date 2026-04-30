"use client";

import { AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

type Item = {
  id: string;
  severity: string;
  title: string;
  body: string;
  dealId?: string | null;
  kind?: string;
  resolvable?: boolean;
};

export default function CompliancePage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["compliance", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const r = await apiFetch<{ items?: Item[] }>("/compliance/feed", {
        token: token ?? undefined,
      }).catch(() => ({ items: [] }));
      return r.items ?? [];
    },
    staleTime: 1000 * 60 * 2,
  });

  async function resolveItem(item: Item) {
    if (!token || !item.resolvable) return;
    setResolvingId(item.id);
    try {
      await apiFetch(`/compliance/alerts/${item.id}/resolve`, {
        method: "POST",
        token,
      });
      toast.success("Marked complete");
      await queryClient.invalidateQueries({ queryKey: ["compliance", token] });
    } catch {
      toast.error("Could not resolve");
    } finally {
      setResolvingId(null);
    }
  }

  const groups = useMemo(() => {
    const inst = user?.role === "INSTITUTIONAL_BUYER" || user?.role === "INSTITUTIONAL_SELLER";
    if (!inst || !items.length) {
      return [{ id: "all", label: "All items", rows: items }];
    }
    const mid = Math.ceil(items.length / 2) || 1;
    return [
      { id: "deal-a", label: user?.role === "INSTITUTIONAL_BUYER" ? "Confidential deal" : "Your listing pipeline", rows: items.slice(0, mid) },
      { id: "deal-b", label: "Documentation & regulatory", rows: items.slice(mid) },
    ];
  }, [items, user?.role]);

  if (!token)
    return (
      <p className="text-sm text-[#888888]">
        <Link href="/login" className="text-[#00C49A]">
          Log in
        </Link>
      </p>
    );

  if (loading) return <PageSkeleton count={4} type="row" />;

  if (!items.length) {
    const emptyInst = user?.role === "INSTITUTIONAL_BUYER" || user?.role === "INSTITUTIONAL_SELLER";
    return (
      <div className="space-y-6">
        <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
            <ShieldCheck className="h-6 w-6 text-[#00C49A]" />
            {emptyInst ? "Due diligence & compliance" : "Compliance"}
          </h1>
          <p className="mt-1 text-sm text-[#888888]">
            {emptyInst
              ? user?.role === "INSTITUTIONAL_BUYER"
                ? "NDA coverage, documents, and regulatory checkpoints for your acquisitions."
                : "Data room completeness, buyer NDAs, and deal-stage requirements."
              : "Deal stage rules and regulatory alerts."}
          </p>
        </div>
        <EmptyState
          icon={CheckCircle}
          title={emptyInst ? "No open compliance tasks" : "All compliance items clear"}
          subtitle={
            emptyInst
              ? "When items appear, they will be grouped by deal and documentation track."
              : "Nothing needs your attention right now."
          }
          actionHref="/dashboard"
          actionLabel="Back to dashboard"
        />
      </div>
    );
  }

  const isInst = user?.role === "INSTITUTIONAL_BUYER" || user?.role === "INSTITUTIONAL_SELLER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
          <ShieldCheck className="h-6 w-6 text-[#00C49A]" />
          {isInst ? "Due diligence & compliance" : "Compliance"}
        </h1>
        <p className="mt-1 text-sm text-[#888888]">
          {isInst
            ? user?.role === "INSTITUTIONAL_BUYER"
              ? "NDA coverage, documents, and regulatory checkpoints for your acquisitions."
              : "Data room completeness, buyer NDAs, and deal-stage requirements."
            : "Deal stage rules and regulatory alerts."}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
          <p className="inline-flex items-center gap-1 text-xs text-[#FF6B6B]">
            <AlertTriangle className="h-3 w-3" />
            High
          </p>
          <p className="mt-1 text-xl text-white">{items.filter((i) => String(i.severity).toLowerCase() === "high").length}</p>
        </div>
        <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
          <p className="inline-flex items-center gap-1 text-xs text-[#FFB347]">
            <AlertCircle className="h-3 w-3" />
            Medium
          </p>
          <p className="mt-1 text-xl text-white">{items.filter((i) => String(i.severity).toLowerCase() === "medium").length}</p>
        </div>
        <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
          <p className="inline-flex items-center gap-1 text-xs text-[#00C49A]">
            <CheckCircle className="h-3 w-3" />
            Low
          </p>
          <p className="mt-1 text-xl text-white">{items.filter((i) => String(i.severity).toLowerCase() === "low").length}</p>
        </div>
      </div>

      {isInst ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <details key={g.id} className="group rounded-xl border border-[#1a1a1a] bg-[#111111] open:bg-[#111111]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-white marker:hidden [&::-webkit-details-marker]:hidden">
                <span>{g.label}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#888888] transition group-open:rotate-180" />
              </summary>
              <ul className="space-y-2 border-t border-[#1a1a1a] px-4 py-3 text-sm">
                {g.rows.length ? (
                  g.rows.map((i) => (
                    <motion.li
                      key={i.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`rounded-lg border bg-[#0a0a0a] px-4 py-3 ${
                        String(i.severity).toLowerCase() === "high"
                          ? "border-l-4 border-l-[#FF6B6B] border-[#1f1f1f]"
                          : String(i.severity).toLowerCase() === "medium"
                            ? "border-l-4 border-l-[#FFB347] border-[#1f1f1f]"
                            : "border-[#1f1f1f]"
                      }`}
                    >
                      <p className="font-medium text-zinc-200">{i.title}</p>
                      <p className="mt-1 text-zinc-400">{i.body}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                        <span>{String(i.severity).toUpperCase()}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {i.dealId ? (
                            <Link
                              href={`/deals/${i.dealId}`}
                              className="rounded border border-[#333333] px-2 py-0.5 text-[#00C49A] hover:border-[#00C49A]"
                            >
                              Deal
                            </Link>
                          ) : null}
                          {i.resolvable ? (
                            <button
                              type="button"
                              disabled={resolvingId === i.id}
                              onClick={() => void resolveItem(i)}
                              className="rounded border border-zinc-600 px-2 py-0.5 text-zinc-300 hover:border-[#00C49A] hover:text-[#00C49A] disabled:opacity-40"
                            >
                              {resolvingId === i.id ? "…" : "Resolve"}
                            </button>
                          ) : (
                            <span className="rounded border border-[#333333] px-2 py-0.5 text-[#888888]">Advisory</span>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  ))
                ) : (
                  <li className="text-sm text-[#888888]">No items in this group.</li>
                )}
              </ul>
            </details>
          ))}
        </div>
      ) : (
        <ul className="space-y-3 text-sm">
          {items.map((i) => (
            <li
              key={i.id}
              className={`rounded-lg border bg-zinc-900/50 px-4 py-3 ${
                String(i.severity).toLowerCase() === "high"
                  ? "border-l-4 border-l-[#FF6B6B] border-[#1f1f1f]"
                  : String(i.severity).toLowerCase() === "medium"
                    ? "border-l-4 border-l-[#FFB347] border-[#1f1f1f]"
                    : "border-l-4 border-l-[#555] border-[#1f1f1f]"
              }`}
            >
              <p className="font-medium text-zinc-200">{i.title}</p>
              <p className="mt-1 text-zinc-400">{i.body}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>{String(i.severity).toUpperCase()}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {i.dealId ? (
                    <Link
                      href={`/deals/${i.dealId}`}
                      className="rounded border border-zinc-600 px-2 py-1 text-[#00C49A] hover:border-[#00C49A]"
                    >
                      Open deal
                    </Link>
                  ) : null}
                  {i.resolvable ? (
                    <button
                      type="button"
                      disabled={resolvingId === i.id}
                      onClick={() => void resolveItem(i)}
                      className="rounded border border-zinc-700 px-2 py-1 hover:border-[#00C49A] disabled:opacity-40"
                    >
                      {resolvingId === i.id ? "…" : "Resolve"}
                    </button>
                  ) : (
                    <span className="text-zinc-600">Advisory</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
