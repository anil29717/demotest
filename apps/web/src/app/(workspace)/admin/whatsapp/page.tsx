"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl } from "@/lib/api";

type Metrics = {
  webhooksReceived: number;
  webhooksDeduped: number;
  signatureRejected: number;
  leadsCreatedFromWa: number;
  avgProcessLatencyMsLast100: number;
};

type IngestRow = {
  id: string;
  dedupeKey: string | null;
  intent: string | null;
  messageType: string | null;
  fromWaId: string | null;
  leadId: string | null;
  createdAt: string;
};

export default function AdminWhatsappPage() {
  const { token, user } = useAuth();
  const role = user?.role;
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ingests, setIngests] = useState<IngestRow[]>([]);
  const [testTo, setTestTo] = useState("");
  const [testBody, setTestBody] = useState("AR Buildwel admin test");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const [m, rows] = await Promise.all([
      apiFetch<Metrics>("/admin/whatsapp/metrics", { token }),
      apiFetch<IngestRow[]>("/admin/whatsapp/ingests?take=25", { token }),
    ]);
    setMetrics(m);
    setIngests(rows);
  }

  async function sendTest() {
    if (!token) return;
    setMsg(null);
    const res = await fetch(apiUrl("/admin/whatsapp/test-outbound"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: testTo.trim(), body: testBody }),
    });
    const j = (await res.json()) as { sent?: boolean; detail?: string };
    setMsg(JSON.stringify(j));
  }

  useEffect(() => {
    if (token && role === "ADMIN") void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable for mount refresh
  }, [token, role]);

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (role !== "ADMIN")
    return <p className="text-sm text-zinc-500">Admin only.</p>;

  return (
    <div className="mx-auto max-w-3xl text-sm">
      <h1 className="text-xl font-semibold">WhatsApp ops</h1>
      <p className="mt-1 text-zinc-500">
        Metrics, recent ingests, outbound test. See{" "}
        <code className="text-xs text-zinc-400">doc/runbooks/whatsapp-meta.md</code>.
      </p>
      <button
        type="button"
        className="mt-4 rounded bg-teal-600 px-3 py-2 text-white"
        onClick={() => void load()}
      >
        Refresh
      </button>
      {metrics && (
        <dl className="mt-6 grid grid-cols-2 gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs">
          <dt className="text-zinc-500">Received</dt>
          <dd>{metrics.webhooksReceived}</dd>
          <dt className="text-zinc-500">Deduped</dt>
          <dd>{metrics.webhooksDeduped}</dd>
          <dt className="text-zinc-500">Signature rejected</dt>
          <dd>{metrics.signatureRejected}</dd>
          <dt className="text-zinc-500">Leads from WA</dt>
          <dd>{metrics.leadsCreatedFromWa}</dd>
          <dt className="text-zinc-500">Avg latency (ms, last 100)</dt>
          <dd>{metrics.avgProcessLatencyMsLast100}</dd>
        </dl>
      )}
      <div className="mt-8 rounded border border-zinc-800 p-4">
        <p className="text-xs font-medium text-zinc-400">Test outbound (Cloud API)</p>
        <input
          className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          placeholder="+9198…"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
        />
        <textarea
          className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          rows={2}
          value={testBody}
          onChange={(e) => setTestBody(e.target.value)}
        />
        <button
          type="button"
          className="mt-2 rounded border border-zinc-600 px-3 py-1.5 text-zinc-200"
          onClick={() => void sendTest()}
        >
          Send test
        </button>
        {msg && <p className="mt-2 text-xs text-amber-300">{msg}</p>}
      </div>
      <h2 className="mt-8 text-sm font-medium text-zinc-300">Recent ingests</h2>
      <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto text-xs text-zinc-400">
        {ingests.map((r) => (
          <li key={r.id} className="rounded border border-zinc-800/80 px-2 py-1.5">
            <span className="text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>{" "}
            <span className="text-zinc-300">{r.messageType ?? "?"}</span> intent{" "}
            <span className="text-teal-500/90">{r.intent ?? "—"}</span>
            {r.fromWaId && <> from {r.fromWaId}</>}
            {r.leadId && <> → lead {r.leadId}</>}
          </li>
        ))}
      </ul>
    </div>
  );
}
