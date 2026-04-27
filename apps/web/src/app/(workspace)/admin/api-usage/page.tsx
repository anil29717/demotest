"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/format";

type ApiStats = {
  totalCallsToday: number;
  totalCallsWeek: number;
  totalCallsMonth: number;
  totalRevenue: number;
  errorRate: number;
  avgResponseTime: number;
  topUsers: Array<{ name: string; prefix: string; totalCalls: number; lastUsedAt?: string | null }>;
  topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
  slowEndpoints: Array<{ endpoint: string; avgResponseTime: number }>;
};

export default function AdminApiUsagePage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    if (!token) return;
    void apiFetch<ApiStats>("/api-product/admin/stats", { token })
      .then((d) => {
        setStats(d);
        setUnsupported(false);
      })
      .catch(() => {
        setUnsupported(true);
        setStats(null);
      });
  }, [token]);

  if (unsupported) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
        <p className="text-lg font-medium text-zinc-100">API Product not configured</p>
        <p className="mt-2 text-sm text-zinc-500">
          `/api-product/admin/stats` is not available yet. This page will auto-enable once API Product is implemented.
        </p>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-zinc-500">Loading API usage...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold text-zinc-100">API usage</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Calls today" value={stats.totalCallsToday.toLocaleString()} />
        <Card label="Calls week" value={stats.totalCallsWeek.toLocaleString()} />
        <Card label="Calls month" value={stats.totalCallsMonth.toLocaleString()} />
        <Card label="Revenue" value={`₹${(stats.totalRevenue ?? 0).toLocaleString()}`} />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Top API users</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr><th className="text-left">Key name</th><th className="text-left">Prefix</th><th className="text-left">Calls</th><th className="text-left">Last used</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {stats.topUsers.map((u) => (
              <tr key={`${u.prefix}-${u.name}`} className="text-zinc-300">
                <td className="py-2">{u.name}</td>
                <td>{u.prefix}</td>
                <td>{u.totalCalls}</td>
                <td>{u.lastUsedAt ? timeAgo(u.lastUsedAt) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {stats.topUsers.length === 0 ? <p className="text-sm text-zinc-500">No API usage yet</p> : null}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Top endpoints</h2>
        <ul className="space-y-2 text-sm">
          {stats.topEndpoints.map((e) => (
            <li key={e.endpoint} className="flex items-center justify-between rounded border border-zinc-800 px-3 py-2 text-zinc-300">
              <span>{e.endpoint} · {e.count} calls</span>
              <span className={e.avgResponseTime > 500 ? "text-red-300" : e.avgResponseTime > 200 ? "text-amber-300" : "text-emerald-300"}>
                {e.avgResponseTime.toFixed(0)}ms
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="mb-1 text-sm font-medium text-zinc-300">Error rate</h2>
        <p className={stats.errorRate > 5 ? "text-3xl text-red-300" : stats.errorRate > 1 ? "text-3xl text-amber-300" : "text-3xl text-emerald-300"}>
          {stats.errorRate.toFixed(2)}%
        </p>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg text-zinc-100">{value}</p>
    </div>
  );
}

