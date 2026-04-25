"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

type CaseRow = {
  id: string;
  status: string;
  score: number;
  reason: string | null;
  subjectUserId: string | null;
  propertyId: string | null;
  dealId: string | null;
  createdAt: string;
};

export default function AdminFraudPage() {
  const { token, user } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setCases(await apiFetch<CaseRow[]>("/admin/fraud/cases", { token }));
  }

  async function setStatus(id: string, status: CaseRow["status"]) {
    if (!token) return;
    setMsg(null);
    await apiFetch(`/admin/fraud/cases/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    });
    await load();
    setMsg(`Updated ${id} → ${status}`);
  }

  useEffect(() => {
    if (token && user?.role === "ADMIN") void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (user?.role !== "ADMIN") return <p className="text-zinc-500">Admin only.</p>;

  return (
    <div className="mx-auto max-w-3xl text-sm">
      <h1 className="text-xl font-semibold">Fraud cases</h1>
      <p className="mt-1 text-zinc-500">Open → review → blocked (listing inactive / trust hit) or cleared.</p>
      <button type="button" className="mt-4 rounded bg-teal-600 px-3 py-2 text-white" onClick={() => void load()}>
        Refresh
      </button>
      {msg && <p className="mt-2 text-xs text-teal-300">{msg}</p>}
      <ul className="mt-6 space-y-3">
        {cases.map((c) => (
          <li key={c.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs">
            <p className="font-mono text-zinc-400">{c.id}</p>
            <p className="mt-1 text-zinc-300">
              status=<strong>{c.status}</strong> score={c.score}
            </p>
            {c.reason && <p className="text-zinc-500">{c.reason}</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              {(["open", "review", "blocked", "cleared"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded border border-zinc-600 px-2 py-1 text-zinc-300"
                  onClick={() => void setStatus(c.id, s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
