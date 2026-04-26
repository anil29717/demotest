"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { PageSkeleton } from "@/components/ui/skeleton";

type N = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "matches" | "deals" | "compliance" | "system">("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", token],
    enabled: Boolean(token),
    queryFn: () =>
      apiFetch<N[]>("/notifications?limit=50", { token: token ?? undefined }).catch(
        () => [],
      ),
    staleTime: 1000 * 30,
  });

  async function markRead(id: string) {
    if (!token) return;
    await apiFetch(`/notifications/${id}/read`, { method: "PUT", token });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAllRead() {
    if (!token) return;
    await Promise.all(items.filter((n) => !n.read).map((n) => apiFetch(`/notifications/${n.id}/read`, { method: "PUT", token })));
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );
  if (isLoading) return <PageSkeleton count={6} type="row" />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold"><Bell className="h-6 w-6 text-[#00C49A]" />Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500">Your activity alerts and deal updates.</p>
        </div>
        <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-2 rounded border border-[#1f1f1f] px-3 py-2 text-xs text-[#888]">
          <CheckCheck className="h-4 w-4 text-[#00C49A]" />
          Mark all read
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {(["all", "matches", "deals", "compliance", "system"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full border px-3 py-1 ${tab === t ? "border-[#00C49A] bg-[#00C49A1A] text-[#00C49A]" : "border-[#1f1f1f] text-[#888]"}`}>{t[0]!.toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      <ul className="mt-6 space-y-3">
        {items
          .filter((n) => {
            const title = n.title.toLowerCase();
            if (tab === "all") return true;
            if (tab === "matches") return title.includes("match");
            if (tab === "deals") return title.includes("deal");
            if (tab === "compliance") return title.includes("compliance");
            return !title.includes("match") && !title.includes("deal") && !title.includes("compliance");
          })
          .map((n) => (
          <li
            key={n.id}
            className={`rounded-lg border px-4 py-3 text-sm ${
              n.read ? "border-zinc-800 bg-zinc-900/20" : "border-l-2 border-l-[#00C49A] border-zinc-800 bg-zinc-900/40"
            }`}
          >
            <p className="font-medium">{n.title}</p>
            <p className="text-zinc-400">{n.body}</p>
            <p className="mt-1 text-xs text-zinc-600">{timeAgo(n.createdAt)}</p>
            {!n.read && (
              <button
                type="button"
                onClick={() => markRead(n.id)}
                className="mt-2 text-xs text-teal-400 hover:underline"
              >
                Mark read
              </button>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="mt-8 text-zinc-500">
          No notifications yet. Activity from matches, deals, and compliance alerts will appear
          here.
        </p>
      )}
    </div>
  );
}
