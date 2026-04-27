"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { timeAgo } from "@/lib/format";

type RunRow = {
  id: string;
  source: string;
  startedAt: string;
  completedAt?: string | null;
  listingsFound: number;
  listingsImported: number;
  listingsSkipped: number;
  listingsFailed?: number;
  errors?: unknown;
  status: "RUNNING" | "COMPLETED" | "FAILED";
};

type CrawlerStatus = {
  stats?: {
    totalImported?: number;
    todayImported?: number;
    failedRuns?: number;
    lastRunAt?: string | null;
  };
  recentRuns?: RunRow[];
  bySource?: Array<{
    source: string;
    lastRun?: string | null;
    found?: number;
    imported?: number;
    skipped?: number;
    failed?: number;
  }>;
  qualityBuckets?: Array<{ label: string; count: number }>;
};

export default function AdminCrawlerPage() {
  const { token } = useAuth();
  const [data, setData] = useState<CrawlerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await apiFetch<CrawlerStatus>("/admin/crawler/status", { token });
      setData(d);
      setUnsupported(false);
    } catch (e) {
      setUnsupported(true);
      setData(null);
      if (e instanceof Error && !e.message.includes("404")) {
        toast.error(e.message);
      }
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runNow() {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch("/admin/crawler/trigger", { method: "POST", token });
      toast.success("Crawler started");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to trigger crawler");
    } finally {
      setBusy(false);
    }
  }

  const stats = data?.stats ?? {};
  const quality = useMemo(() => data?.qualityBuckets ?? [], [data?.qualityBuckets]);

  if (unsupported) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
        <p className="text-lg font-medium text-zinc-100">Crawler not yet configured</p>
        <p className="mt-2 text-sm text-zinc-500">
          The portal crawler will be set up in Wave 4. Admin trigger/status endpoints are not available yet.
        </p>
        <button
          type="button"
          disabled
          className="mt-5 cursor-not-allowed rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-500"
          title="Crawler service pending"
        >
          Run now
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Crawler</h1>
          <p className="text-sm text-zinc-500">Portal listing ingestion status</p>
        </div>
        <button
          type="button"
          onClick={() => void runNow()}
          disabled={busy}
          className="rounded-lg bg-[#00C49A] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {busy ? "Starting..." : "Run now"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total imported" value={Number(stats.totalImported ?? 0)} />
        <Stat label="Today's imports" value={Number(stats.todayImported ?? 0)} />
        <Stat label="Failed runs" value={Number(stats.failedRuns ?? 0)} />
        <Stat
          label="Last run"
          value={stats.lastRunAt ? timeAgo(stats.lastRunAt) : "Never"}
        />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Per-source breakdown</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th>Source</th><th>Last run</th><th>Found</th><th>Imported</th><th>Skipped</th><th>Failed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(data?.bySource ?? []).map((s) => (
              <tr key={s.source} className="text-zinc-300">
                <td className="py-2">{s.source}</td>
                <td>{s.lastRun ? timeAgo(s.lastRun) : "—"}</td>
                <td>{s.found ?? 0}</td>
                <td>{s.imported ?? 0}</td>
                <td>{s.skipped ?? 0}</td>
                <td>{s.failed ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data?.bySource?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No crawler runs yet</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Recent runs</h2>
        <ul className="space-y-2">
          {(data?.recentRuns ?? []).map((r) => (
            <li key={r.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">
              <p>
                {r.source} · <span className="font-medium">{r.status}</span> · {timeAgo(r.startedAt)}
              </p>
              <p className="text-xs text-zinc-500">
                found {r.listingsFound} · imported {r.listingsImported} · skipped {r.listingsSkipped} · failed {r.listingsFailed ?? 0}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Quality score distribution</h2>
        {(quality.length ? quality : [
          { label: "0-25", count: 0 },
          { label: "25-50", count: 0 },
          { label: "50-75", count: 0 },
          { label: "75-100", count: 0 },
        ]).map((b) => (
          <div key={b.label} className="mb-2">
            <div className="mb-1 flex justify-between text-xs text-zinc-500">
              <span>{b.label}</span><span>{b.count}</span>
            </div>
            <div className="h-2 rounded bg-zinc-800">
              <div className="h-2 rounded bg-[#00C49A]" style={{ width: `${Math.min(100, b.count)}%` }} />
            </div>
          </div>
        ))}
        <p className="mt-2 text-xs text-zinc-500">Import threshold: score 50+</p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg text-zinc-100">{value}</p>
    </div>
  );
}

