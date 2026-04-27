"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

export default function NewBuilderProjectPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    city: "",
    locality: "",
    reraProjectId: "",
    priceMin: "",
    priceMax: "",
    description: "",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    try {
      await apiFetch("/builder/projects", {
        token,
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          city: form.city,
          locality: form.locality || undefined,
          reraProjectId: form.reraProjectId,
          priceMin: Number(form.priceMin),
          priceMax: form.priceMax ? Number(form.priceMax) : undefined,
          description: form.description || undefined,
        }),
      });
      router.push("/builder/projects");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-zinc-100">Add project</h1>
      <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <input required placeholder="Project title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="City" value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          <input placeholder="Locality" value={form.locality} onChange={(e) => setForm((s) => ({ ...s, locality: e.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </div>
        <input required placeholder="RERA Project ID" value={form.reraProjectId} onChange={(e) => setForm((s) => ({ ...s, reraProjectId: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input required type="number" min={1} placeholder="Price min" value={form.priceMin} onChange={(e) => setForm((s) => ({ ...s, priceMin: e.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          <input type="number" min={1} placeholder="Price max" value={form.priceMax} onChange={(e) => setForm((s) => ({ ...s, priceMax: e.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </div>
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} rows={4} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        <button disabled={busy || !token} className="rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-semibold text-black disabled:opacity-60">
          {busy ? "Creating..." : "Create project"}
        </button>
      </form>
    </div>
  );
}
