"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/format";

type ApiKeyRow = {
  id: string;
  name: string;
  plan: string;
  keyPrefix: string;
  isActive: boolean;
  callsPerDay: number;
  callsPerMonth: number;
  totalCalls: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

export default function ApiProductPage() {
  const { token } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("My integration");
  const [plan, setPlan] = useState<"FREE" | "PRO" | "BUSINESS">("FREE");
  const [latestSecret, setLatestSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const rows = await apiFetch<ApiKeyRow[]>("/api-product/keys", { token });
      setKeys(rows);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    if (!token || busy || !name.trim()) return;
    setBusy(true);
    try {
      const created = await apiFetch<ApiKeyRow & { secret: string }>("/api-product/keys", {
        token,
        method: "POST",
        body: JSON.stringify({ name: name.trim(), plan }),
      });
      setLatestSecret(created.secret);
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!token || busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api-product/keys/${id}`, { token, method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold text-zinc-100">API Product</h1>
      <p className="text-sm text-zinc-500">
        Generate API keys and integrate with `GET /v1/properties`, `POST /v1/properties`, `GET /v1/requirements`, `POST /v1/requirements`.
      </p>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-sm font-medium text-zinc-300">Create key</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" placeholder="Key name" />
          <select value={plan} onChange={(e) => setPlan(e.target.value as "FREE" | "PRO" | "BUSINESS")} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="BUSINESS">BUSINESS</option>
          </select>
          <button disabled={busy || !token} onClick={() => void createKey()} className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {busy ? "Working..." : "Create API key"}
          </button>
        </div>
        {latestSecret ? (
          <div className="mt-3 rounded-lg border border-amber-700/60 bg-amber-950/30 p-3 text-xs text-amber-200">
            Save this key now (shown once): <code>{latestSecret}</code>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-sm font-medium text-zinc-300">Your keys</h2>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No API keys yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
                <div>
                  <p className="text-sm text-zinc-100">{k.name} <span className="text-zinc-500">({k.plan})</span></p>
                  <p className="text-xs text-zinc-500">{k.keyPrefix}... · Calls: {k.totalCalls} · Last used: {k.lastUsedAt ? timeAgo(k.lastUsedAt) : "Never"}</p>
                </div>
                <button disabled={!k.isActive || busy} onClick={() => void revoke(k.id)} className="rounded border border-red-700 px-2 py-1 text-xs text-red-300 disabled:opacity-60">
                  {k.isActive ? "Revoke" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
