"use client";

import { ArrowRight, Handshake, Shield, Star, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { getInitials } from "@/lib/format";

type Partner = { id: string; type: string; name: string; verified: boolean };

function toPartnerRows(input: unknown): Partner[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (p): p is Partner =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as { id?: unknown }).id === "string" &&
      typeof (p as { type?: unknown }).type === "string" &&
      typeof (p as { name?: unknown }).name === "string" &&
      typeof (p as { verified?: unknown }).verified === "boolean",
  );
}

export default function PartnersPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Partner[]>([]);
  const [form, setForm] = useState({ type: "legal", name: "" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        if (!cancelled) setRows([]);
        return;
      }
      try {
        const data = await apiFetch<unknown>("/partners", { token });
        if (!cancelled) setRows(toPartnerRows(data));
      } catch {
        if (!cancelled) setRows([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    await apiFetch("/partners", {
      method: "POST",
      token,
      body: JSON.stringify({ type: form.type, name: form.name }),
    });
    setForm({ type: form.type, name: "" });
    const next = await apiFetch<unknown>("/partners", { token });
    setRows(toPartnerRows(next));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold"><Handshake className="h-5 w-5 text-[#00C49A]" />Partner network</h1>
        <button className="rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-medium text-black">Add partner +</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3"><p className="inline-flex items-center gap-1 text-xs text-[#888]"><Users className="h-3 w-3" />Total partners</p><p className="mt-1 text-xl font-semibold">{rows.length}</p></div>
        <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3"><p className="inline-flex items-center gap-1 text-xs text-[#888]"><ArrowRight className="h-3 w-3" />Active referrals</p><p className="mt-1 text-xl font-semibold">{Math.max(0, rows.length - 1)}</p></div>
        <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3"><p className="inline-flex items-center gap-1 text-xs text-[#888]"><TrendingUp className="h-3 w-3" />Commission earned</p><p className="mt-1 text-xl font-semibold text-[#00C49A]">₹2.40 L</p></div>
      </div>
      <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <li key={p.id} className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1f1f1f] text-sm text-[#00C49A]">{getInitials(p.name)}</div>
              <div>
                <p className="text-sm font-semibold text-white">{p.name}</p>
                <p className="text-xs text-[#888]">{p.type}</p>
              </div>
            </div>
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-[#00C49A]"><Star className="h-3 w-3" />4.8 (12 reviews)</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#1f1f1f] px-2 py-0.5 text-xs text-[#888]"><Shield className="h-3 w-3" />{p.verified ? "Verified" : "Pending"}</p>
            <p className="mt-3 text-xs text-[#888]">3 referrals · ₹80K earned</p>
            <button className="mt-3 w-full rounded-md bg-[#00C49A] px-3 py-2 text-xs font-medium text-black">Refer client →</button>
          </li>
        ))}
      </ul>
      {token ? (
        <form onSubmit={add} className="mt-8 space-y-3 text-sm">
          <p className="font-medium text-zinc-300">Add partner (broker)</p>
          <div className="flex gap-2">
            <select
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-2"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="legal">Legal</option>
              <option value="loan">Loan</option>
              <option value="insurance">Insurance</option>
            </select>
            <input
              required
              placeholder="Firm name"
              className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <button type="submit" className="rounded bg-teal-600 px-3 py-2 text-white">
              Add
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/login" className="text-teal-400">
            Log in
          </Link>{" "}
          to add partners.
        </p>
      )}
    </div>
  );
}
