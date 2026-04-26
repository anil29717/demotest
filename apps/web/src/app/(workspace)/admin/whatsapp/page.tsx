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

type NlpStats = {
  totalMessages: number;
  nlpClassified: number;
  intentBreakdown: { intent: string | null; count: number }[];
  avgConfidence: number;
  routingRouted: number;
  routingSkipped: number;
  routingFailed: number;
  routingSuccessRate: number;
};

type IngestRow = {
  id: string;
  dedupeKey: string | null;
  intent: string | null;
  messageType: string | null;
  fromWaId: string | null;
  leadId: string | null;
  messageText: string | null;
  nlpIntent: string | null;
  nlpConfidence: number | null;
  nlpExtracted: unknown;
  routingStatus: string | null;
  routedAt: string | null;
  createdLeadId: string | null;
  createdRequirementId: string | null;
  createdAt: string;
};

const INTENT_BADGE: Record<string, string> = {
  BUY_INTENT: "bg-emerald-900/50 text-emerald-200",
  RENT_INTENT: "bg-sky-900/50 text-sky-200",
  SELL_INTENT: "bg-amber-900/50 text-amber-200",
  RENT_OUT_INTENT: "bg-violet-900/50 text-violet-200",
  INSTITUTIONAL_INQUIRY: "bg-purple-900/50 text-purple-200",
  PRICE_INQUIRY: "bg-cyan-900/50 text-cyan-200",
  STATUS_UPDATE: "bg-zinc-800 text-zinc-300",
  SUPPORT: "bg-rose-900/40 text-rose-200",
  UNKNOWN: "bg-zinc-800 text-zinc-500",
};

export default function AdminWhatsappPage() {
  const { token, user } = useAuth();
  const role = user?.role;
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [nlp, setNlp] = useState<NlpStats | null>(null);
  const [ingests, setIngests] = useState<IngestRow[]>([]);
  const [testTo, setTestTo] = useState("");
  const [testBody, setTestBody] = useState("AR Buildwel admin test");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const [m, n, rows] = await Promise.all([
      apiFetch<Metrics>("/admin/whatsapp/metrics", { token }),
      apiFetch<NlpStats>("/admin/whatsapp/nlp-stats", { token }),
      apiFetch<IngestRow[]>("/admin/whatsapp/ingests?take=25", { token }),
    ]);
    setMetrics(m);
    setNlp(n);
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

  if (role !== "ADMIN") return <p className="text-sm text-zinc-500">Admin only.</p>;

  return (
    <div className="mx-auto max-w-4xl text-sm">
      <h1 className="text-xl font-semibold">WhatsApp ops</h1>
      <p className="mt-1 text-zinc-500">
        Metrics, NLP routing stats, recent ingests, outbound test. See{" "}
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
          <dt className="text-zinc-500">Leads from WA (legacy)</dt>
          <dd>{metrics.leadsCreatedFromWa}</dd>
          <dt className="text-zinc-500">Avg latency (ms, last 100)</dt>
          <dd>{metrics.avgProcessLatencyMsLast100}</dd>
        </dl>
      )}
      {nlp && (
        <section className="mt-8 rounded border border-zinc-800 bg-zinc-900/30 p-4">
          <h2 className="text-sm font-medium text-zinc-200">NLP & routing</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
            <dt>Total ingests</dt>
            <dd className="text-zinc-200">{nlp.totalMessages}</dd>
            <dt>Classified (has intent)</dt>
            <dd className="text-zinc-200">{nlp.nlpClassified}</dd>
            <dt>Avg confidence</dt>
            <dd className="text-zinc-200">{(nlp.avgConfidence * 100).toFixed(1)}%</dd>
            <dt>ROUTED / SKIPPED / FAILED</dt>
            <dd className="text-zinc-200">
              {nlp.routingRouted} / {nlp.routingSkipped} / {nlp.routingFailed}
            </dd>
            <dt>Routing success rate</dt>
            <dd className="text-zinc-200">{(nlp.routingSuccessRate * 100).toFixed(1)}%</dd>
          </dl>
          <p className="mt-3 text-xs font-medium text-zinc-500">By intent</p>
          <ul className="mt-1 flex flex-wrap gap-2 text-xs">
            {nlp.intentBreakdown.map((i) => (
              <li key={i.intent ?? "null"} className="rounded border border-zinc-800 px-2 py-1 text-zinc-400">
                {i.intent ?? "—"}: <span className="text-zinc-200">{i.count}</span>
              </li>
            ))}
          </ul>
        </section>
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
      <ul className="mt-2 max-h-[32rem] space-y-3 overflow-y-auto text-xs text-zinc-400">
        {ingests.map((r) => {
          const badge = INTENT_BADGE[r.nlpIntent ?? "UNKNOWN"] ?? "bg-zinc-800 text-zinc-400";
          return (
            <li key={r.id} className="rounded border border-zinc-800/80 bg-zinc-950/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>
                <span className="text-zinc-300">{r.messageType ?? "?"}</span>
                {r.nlpIntent ? (
                  <span className={`rounded px-2 py-0.5 font-medium ${badge}`}>{r.nlpIntent}</span>
                ) : (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-500">— NLP —</span>
                )}
                {r.nlpConfidence != null && (
                  <span className="text-zinc-500">conf {(r.nlpConfidence * 100).toFixed(0)}%</span>
                )}
                {r.routingStatus && (
                  <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">
                    {r.routingStatus}
                  </span>
                )}
              </div>
              {r.messageText && <p className="mt-2 text-zinc-300">&ldquo;{r.messageText}&rdquo;</p>}
              <p className="mt-1 text-[10px] text-zinc-600">
                Meta intent: {r.intent ?? "—"} · from {r.fromWaId ?? "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {r.createdRequirementId && (
                  <Link href={`/requirements`} className="text-teal-500 hover:underline">
                    Requirement {r.createdRequirementId.slice(0, 8)}…
                  </Link>
                )}
                {r.createdLeadId && (
                  <Link href={`/crm`} className="text-teal-500 hover:underline">
                    Lead {r.createdLeadId.slice(0, 8)}…
                  </Link>
                )}
                {r.leadId && !r.createdLeadId && (
                  <span className="text-zinc-600">Legacy lead {r.leadId.slice(0, 8)}…</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
