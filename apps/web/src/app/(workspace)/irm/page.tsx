"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

type Pref = {
  assetClasses: string[];
  geography: string[];
  minTicketCr: number | null;
  maxTicketCr: number | null;
};

type SearchHit = {
  id: string;
  title: string;
  city: string;
  price: unknown;
  propertyType?: string;
};

function pickPropertyType(assetClasses: string[]): string | null {
  const lowered = assetClasses.map((s) => s.toLowerCase());
  if (lowered.some((s) => s.includes("commercial") || s.includes("office") || s.includes("retail"))) {
    return "COMMERCIAL";
  }
  if (lowered.some((s) => s.includes("residential"))) return "RESIDENTIAL";
  if (lowered.some((s) => s.includes("plot"))) return "PLOT";
  if (lowered.some((s) => s.includes("institution"))) return "INSTITUTIONAL";
  return null;
}

const IRM_PURPOSE_KEY = "arbuildwel-nri-irm-investment-purpose";

export default function IrmPage() {
  const { token, user } = useAuth();
  const [form, setForm] = useState({
    assetClasses: "office,retail",
    geography: "mumbai,delhi",
    minTicketCr: "",
    maxTicketCr: "",
  });
  const [investmentPurpose, setInvestmentPurpose] = useState("SELF_USE");
  const [toast, setToast] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Pref | null>("/irm/preferences", { token }).then((p) => {
      if (!p) return;
      setForm({
        assetClasses: (p.assetClasses ?? []).join(","),
        geography: (p.geography ?? []).join(","),
        minTicketCr: p.minTicketCr != null ? String(p.minTicketCr) : "",
        maxTicketCr: p.maxTicketCr != null ? String(p.maxTicketCr) : "",
      });
    });
  }, [token]);

  useEffect(() => {
    if (user?.role !== "NRI" || typeof window === "undefined") return;
    const v = localStorage.getItem(IRM_PURPOSE_KEY);
    if (v) setInvestmentPurpose(v);
  }, [user?.role]);

  async function loadMatchesFromForm(nextForm = form) {
    if (!token) return;
    const assetClasses = nextForm.assetClasses.split(/[,\s]+/).filter(Boolean);
    const geography = nextForm.geography.split(/[,\s]+/).filter(Boolean);
    const q = new URLSearchParams();
    const propertyType = pickPropertyType(assetClasses);
    if (propertyType) q.set("propertyType", propertyType);
    if (geography[0]) q.set("city", geography[0]);
    const query = q.toString();
    const res = await apiFetch<{ hits?: SearchHit[] }>(
      `/search/properties${query ? `?${query}` : ""}`,
      { token },
    );
    setHits(res.hits ?? []);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setToast(null);
    await apiFetch("/irm/preferences", {
      method: "PUT",
      token,
      body: JSON.stringify({
        assetClasses: form.assetClasses.split(/[,\s]+/).filter(Boolean),
        geography: form.geography.split(/[,\s]+/).filter(Boolean),
        minTicketCr: form.minTicketCr ? Number(form.minTicketCr) : undefined,
        maxTicketCr: form.maxTicketCr ? Number(form.maxTicketCr) : undefined,
      }),
    });
    if (user?.role === "NRI" && typeof window !== "undefined") {
      try {
        localStorage.setItem(IRM_PURPOSE_KEY, investmentPurpose);
      } catch {
        /* ignore */
      }
    }
    setToast("Preferences saved");
    await loadMatchesFromForm(form);
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>{" "}
        for IRM preferences.
      </p>
    );

  const isNri = user?.role === "NRI";

  return (
    <div className={isNri ? "mx-auto max-w-6xl space-y-6" : "mx-auto max-w-lg"}>
      {isNri ? (
        <header>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
            <Target className="h-7 w-7 text-[#00C49A]" />
            Investment preferences
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Tell us what you&apos;re looking for — we&apos;ll surface matching deals.
          </p>
        </header>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Investor preference (IRM)</h1>
          <p className="mt-1 text-sm text-zinc-500">Ticket size, asset class, and geography for deal feed.</p>
        </>
      )}
      <div className={isNri ? "grid gap-6 lg:grid-cols-2" : ""}>
        <form onSubmit={save} className={`space-y-3 text-sm ${isNri ? "" : "mt-6"}`}>
        <label className="block">
          Asset classes (comma-separated)
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.assetClasses}
            onChange={(e) => setForm((f) => ({ ...f, assetClasses: e.target.value }))}
          />
        </label>
        <label className="block">
          Geography (comma-separated)
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.geography}
            onChange={(e) => setForm((f) => ({ ...f, geography: e.target.value }))}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Min ticket (Cr)
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.minTicketCr}
              onChange={(e) => setForm((f) => ({ ...f, minTicketCr: e.target.value }))}
            />
          </label>
          <label>
            Max ticket (Cr)
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.maxTicketCr}
              onChange={(e) => setForm((f) => ({ ...f, maxTicketCr: e.target.value }))}
            />
          </label>
        </div>
        {isNri ? (
          <label className="block">
            Investment purpose
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={investmentPurpose}
              onChange={(e) => setInvestmentPurpose(e.target.value)}
            >
              <option value="SELF_USE">Self use</option>
              <option value="RENTAL">Rental income</option>
              <option value="CAPITAL">Capital appreciation</option>
              <option value="DIVERSIFY">Portfolio diversification</option>
            </select>
          </label>
        ) : null}
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-500"
        >
          Save preferences
        </button>
      </form>
      <section className={isNri ? "rounded-xl border border-[#1a1a1a] bg-[#111111] p-4" : "mt-8"}>
        <h2 className={`font-medium ${isNri ? "text-white" : "text-zinc-200"} text-lg`}>
          {isNri ? "Matched deals" : "Matched opportunities"}
        </h2>
        {hits.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            No matching deals found yet. We&apos;ll notify you when new opportunities match your
            criteria.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {hits.map((h) => (
              <li key={h.id} className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-3">
                <p className="font-medium text-zinc-100">{h.title}</p>
                <p className="text-sm text-zinc-400">
                  {h.city} · {formatINR(Number(h.price ?? 0))}
                </p>
                <span className="mt-2 inline-block rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                  {h.propertyType ?? "PROPERTY"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
