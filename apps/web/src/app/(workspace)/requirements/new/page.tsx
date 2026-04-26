"use client";

import { ChevronLeft, MapPin, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

const PT = ["RESIDENTIAL", "COMMERCIAL", "PLOT", "INSTITUTIONAL"] as const;
const DT = ["SALE", "RENT"] as const;
const UR = ["IMMEDIATE", "WITHIN_30_DAYS", "FLEXIBLE"] as const;

export default function NewRequirementPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    budgetMin: "",
    budgetMax: "",
    city: "",
    areas: "",
    propertyType: "RESIDENTIAL",
    dealType: "SALE",
    areaSqftMin: "",
    areaSqftMax: "",
    urgency: "FLEXIBLE",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setLoading(true);
    const areas = form.areas.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      await apiFetch("/requirements", {
        method: "POST",
        token,
        body: JSON.stringify({
          budgetMin: Number(form.budgetMin),
          budgetMax: Number(form.budgetMax),
          city: form.city,
          areas: areas.length ? areas : [form.city],
          propertyType: form.propertyType,
          dealType: form.dealType,
          areaSqftMin: Number(form.areaSqftMin),
          areaSqftMax: Number(form.areaSqftMax),
          urgency: form.urgency,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["requirements"] });
      await queryClient.invalidateQueries({ queryKey: ["requirements-mine"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-all"] });
      await queryClient.invalidateQueries({ queryKey: ["matches"] });
      router.push("/requirements");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/requirements" className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-white">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-2 text-xl font-semibold">Post requirement</h1>
      <form onSubmit={submit} className="mt-6 space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            Budget min
            <div className="mt-1 flex rounded-lg border border-zinc-700 bg-zinc-900">
              <span className="px-3 py-2 text-zinc-500">₹</span>
            <input
              required
              type="number"
                className="w-full bg-transparent px-3 py-2 outline-none"
              value={form.budgetMin}
              onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
            />
            </div>
          </label>
          <label className="block">
            Budget max
            <div className="mt-1 flex rounded-lg border border-zinc-700 bg-zinc-900">
              <span className="px-3 py-2 text-zinc-500">₹</span>
              <input
              required
              type="number"
                className="w-full bg-transparent px-3 py-2 outline-none"
              value={form.budgetMax}
              onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
            />
            </div>
          </label>
        </div>
        <p className="text-xs text-zinc-500">
          = {formatINR(Number(form.budgetMin || 0))} - {formatINR(Number(form.budgetMax || 0))}
        </p>
        <label className="block">
          City
          <div className="mt-1 flex items-center rounded border border-zinc-700 bg-zinc-900">
            <MapPin className="ml-2 h-4 w-4 text-zinc-500" />
            <input
            required
              className="w-full bg-transparent px-3 py-2 outline-none"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
          </div>
        </label>
        <label className="block">
          Areas (comma-separated)
          <input
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.areas}
            onChange={(e) => setForm((f) => ({ ...f, areas: e.target.value }))}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Property type
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.propertyType}
              onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}
            >
              {PT.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deal type
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.dealType}
              onChange={(e) => setForm((f) => ({ ...f, dealType: e.target.value }))}
            >
              {DT.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Sqft min
            <input
              required
              type="number"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.areaSqftMin}
              onChange={(e) => setForm((f) => ({ ...f, areaSqftMin: e.target.value }))}
            />
          </label>
          <label>
            Sqft max
            <input
              required
              type="number"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.areaSqftMax}
              onChange={(e) => setForm((f) => ({ ...f, areaSqftMax: e.target.value }))}
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {UR.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setForm((f) => ({ ...f, urgency: u }))}
              className={`rounded-lg border px-3 py-2 text-xs ${form.urgency === u ? "border-[#00C49A] text-[#00C49A]" : "border-zinc-700 text-zinc-400"}`}
            >
              {u === "IMMEDIATE" ? "🔥 HOT" : u === "WITHIN_30_DAYS" ? "~ WARM" : "FLEXIBLE"}
            </button>
          ))}
        </div>
        {user?.role === "NRI" ? (
          <label className="flex cursor-default items-center gap-3 rounded-lg border border-[#E85D8A40] bg-[#E85D8A10] px-3 py-3">
            <input type="checkbox" checked readOnly className="h-4 w-4 accent-[#E85D8A]" aria-readonly />
            <span className="text-sm text-white">I am a remote buyer (NRI/OCI)</span>
          </label>
        ) : null}
        {err && <p className="text-red-400">{err}</p>}
        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white">
          {loading ? "Posting..." : "Post requirement"} <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
