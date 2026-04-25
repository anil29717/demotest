"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, MapPin, Target, TrendingUp, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

type Hni = { ticketMinCr: number | null; ticketMaxCr: number | null };
type Hit = { id: string; title: string; city: string; price: unknown; propertyType?: string; distressedLabel?: string };
type Deal = {
  id: string;
  stage: string;
  valueInr?: unknown;
  property?: { id: string; title: string; city: string; imageUrls?: string[] } | null;
};

const ASSET_OPTIONS = [
  "Residential",
  "Commercial",
  "Industrial",
  "Distressed",
  "Bank auction",
  "Institutional",
] as const;

const HORIZON_OPTS = ["Short term < 1yr", "Medium 1–3yr", "Long term 3yr+"] as const;
const RETURN_OPTS = ["8–12%", "12–18%", "18%+", "Capital appreciation only"] as const;

function statusFromError(error: unknown): number | null {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (raw.includes("404") || raw.toLowerCase().includes("not found")) return 404;
  if (raw.includes("403") || raw.toLowerCase().includes("forbidden")) return 403;
  if (raw.includes("400") || raw.toLowerCase().includes("bad request")) return 400;
  try {
    const parsed = JSON.parse(raw) as { statusCode?: number };
    return typeof parsed.statusCode === "number" ? parsed.statusCode : null;
  } catch {
    return null;
  }
}

export default function HniVerticalPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"prefs" | "portfolio">("prefs");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ticketMinCr: "", ticketMaxCr: "" });
  const [assets, setAssets] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [horizon, setHorizon] = useState<(typeof HORIZON_OPTS)[number]>("Medium 1–3yr");
  const [expectedReturn, setExpectedReturn] = useState<(typeof RETURN_OPTS)[number]>("12–18%");
  const [saving, setSaving] = useState(false);
  const [curated, setCurated] = useState<Hit[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const loadCurated = useCallback(async () => {
    if (!token) return;
    const [auction, distressed] = await Promise.all([
      apiFetch<{ hits?: Hit[] }>("/search/properties?isBankAuction=true", { token }),
      apiFetch<{ hits?: Hit[] }>("/search/properties?distressedLabel=high_opportunity", { token }),
    ]);
    const merged = [...(auction.hits ?? []), ...(distressed.hits ?? [])];
    setCurated(Array.from(new Map(merged.map((h) => [h.id, h])).values()));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const profile = await apiFetch<Hni>("/verticals/hni/profile", { token });
        if (!cancelled) {
          setForm({
            ticketMinCr: profile?.ticketMinCr != null ? String(profile.ticketMinCr) : "",
            ticketMaxCr: profile?.ticketMaxCr != null ? String(profile.ticketMaxCr) : "",
          });
        }
      } catch (error) {
        const status = statusFromError(error);
        if (status === 404 || status === 400 || status === 403) {
          if (!cancelled) setForm({ ticketMinCr: "", ticketMaxCr: "" });
        } else if (status == null || status >= 500) {
          toast.error("Could not load profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadCurated();
  }, [token, loadCurated]);

  useEffect(() => {
    if (!token || tab !== "portfolio") return;
    void apiFetch<Deal[]>("/deals", { token })
      .then(setDeals)
      .catch(() => setDeals([]));
  }, [token, tab]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch("/verticals/hni/profile", {
        method: "PUT",
        token,
        body: JSON.stringify({
          ticketMinCr: form.ticketMinCr ? Number(form.ticketMinCr) : undefined,
          ticketMaxCr: form.ticketMaxCr ? Number(form.ticketMaxCr) : undefined,
        }),
      });
      const next = await apiFetch<Hni>("/verticals/hni/profile", { token });
      setForm({
        ticketMinCr: next?.ticketMinCr != null ? String(next.ticketMinCr) : "",
        ticketMaxCr: next?.ticketMaxCr != null ? String(next.ticketMaxCr) : "",
      });
      toast.success("Investment profile saved.");
      await loadCurated();
    } catch {
      toast.error("Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  function toggleAsset(a: string) {
    setAssets((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  function addCity() {
    const c = cityInput.trim();
    if (!c) return;
    if (!cities.includes(c)) setCities((x) => [...x, c]);
    setCityInput("");
  }

  const minN = form.ticketMinCr ? Number(form.ticketMinCr) : NaN;
  const maxN = form.ticketMaxCr ? Number(form.ticketMaxCr) : NaN;
  const preview =
    Number.isFinite(minN) && Number.isFinite(maxN) ? `₹${minN} Cr – ₹${maxN} Cr range` : "Enter min and max to preview";

  if (!token) {
    return (
      <p className="text-sm text-[#888888]">
        <Link href="/login" className="text-[#00C49A]">
          Log in
        </Link>{" "}
        to open the HNI workspace.
      </p>
    );
  }

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
          <TrendingUp className="h-7 w-7 text-[#F0922B]" />
          HNI Workspace
        </h1>
        <p className="mt-1 text-sm text-[#888888]">High-value investment management.</p>
      </div>

      <div className="flex gap-2 rounded-lg border border-[#1a1a1a] bg-[#111111] p-1">
        {(
          [
            { id: "prefs" as const, label: "Investment preferences" },
            { id: "portfolio" as const, label: "My portfolio" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-[#00C49A] text-black" : "text-[#888888] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "prefs" ? (
        <div className="space-y-6">
          <motion.form
            onSubmit={save}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6"
          >
            <p className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Target className="h-5 w-5 text-[#F0922B]" />
              Investment profile
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-[#888888]">
                Min ticket (Cr)
                <div className="mt-1 flex h-12 overflow-hidden rounded-lg border border-[#1a1a1a]">
                  <span className="flex items-center border-r border-[#1a1a1a] bg-[#1a1a1a] px-3 text-sm text-[#888888]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    className="min-w-0 flex-1 bg-[#0d0d0d] px-3 text-sm text-white outline-none"
                    value={form.ticketMinCr}
                    onChange={(e) => setForm((f) => ({ ...f, ticketMinCr: e.target.value }))}
                  />
                  <span className="flex items-center border-l border-[#1a1a1a] bg-[#1a1a1a] px-3 text-xs text-[#888888]">
                    Cr
                  </span>
                </div>
              </label>
              <label className="block text-xs text-[#888888]">
                Max ticket (Cr)
                <div className="mt-1 flex h-12 overflow-hidden rounded-lg border border-[#1a1a1a]">
                  <span className="flex items-center border-r border-[#1a1a1a] bg-[#1a1a1a] px-3 text-sm text-[#888888]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    className="min-w-0 flex-1 bg-[#0d0d0d] px-3 text-sm text-white outline-none"
                    value={form.ticketMaxCr}
                    onChange={(e) => setForm((f) => ({ ...f, ticketMaxCr: e.target.value }))}
                  />
                  <span className="flex items-center border-l border-[#1a1a1a] bg-[#1a1a1a] px-3 text-xs text-[#888888]">
                    Cr
                  </span>
                </div>
              </label>
            </div>
            <p className="mt-3 text-sm text-[#00C49A]">{preview}</p>

            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[#555555]">Asset classes</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ASSET_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAsset(a)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    assets.includes(a)
                      ? "border-[#F0922B] bg-[#F0922B20] text-[#F0922B]"
                      : "border-[#1a1a1a] text-[#888888] hover:border-[#333333]"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[#555555]">Geography</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cities.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-1 text-xs text-white"
                >
                  {c}
                  <button type="button" className="text-[#888888] hover:text-white" onClick={() => setCities((x) => x.filter((y) => y !== c))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCity();
                  }
                }}
                placeholder="City name"
                className="h-10 flex-1 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#00C49A]"
              />
              <button type="button" onClick={addCity} className="rounded-lg border border-[#1a1a1a] px-3 text-sm text-[#00C49A] hover:bg-[#ffffff08]">
                Add
              </button>
            </div>

            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[#555555]">Investment horizon</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {HORIZON_OPTS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizon(h)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    horizon === h ? "border-[#F0922B] bg-[#F0922B15] text-[#F0922B]" : "border-[#1a1a1a] text-[#888888]"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>

            <label className="mt-6 block text-xs text-[#888888]">
              Expected return
              <select
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value as (typeof RETURN_OPTS)[number])}
                className="mt-1 h-12 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#00C49A]"
              >
                {RETURN_OPTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-[11px] text-[#444444]">Horizon, return targets, and geography are kept in this session for your planning view.</p>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-[#00C49A] text-sm font-semibold text-black disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save investment profile"}
            </button>
          </motion.form>

          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-lg font-semibold text-white">
                <Zap className="h-5 w-5 text-[#F0922B]" />
                Deals matching your profile
              </p>
              <Link href="/matches" className="text-xs text-[#00C49A]">
                View all →
              </Link>
            </div>
            {curated.length ? (
              <ul className="mt-4 space-y-3">
                {curated.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#888888]">
                        <MapPin className="h-3 w-3" />
                        {item.city}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#00C49A]">{formatINR(Number(item.price ?? 0))}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[#888888]">No curated rows yet. Adjust ticket size and save.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {deals.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No portfolio deals yet"
              subtitle="As you progress transactions, they will appear here with value and stage."
              actionHref="/matches"
              actionLabel="Explore matches"
            />
          ) : (
            <>
              <div className="grid gap-3 rounded-xl border border-[#1a1a1a] bg-[#111111] p-4 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] uppercase text-[#888888]">Total value</p>
                  <p className="mt-1 text-lg font-semibold text-[#00C49A]">
                    {formatINR(deals.reduce((s, d) => s + Number(d.valueInr ?? 0), 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[#888888]">Active</p>
                  <p className="mt-1 text-lg font-semibold text-white">{deals.filter((d) => d.stage !== "CLOSURE").length}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[#888888]">Closed</p>
                  <p className="mt-1 text-lg font-semibold text-white">{deals.filter((d) => d.stage === "CLOSURE").length}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[#888888]">Avg return</p>
                  <p className="mt-1 text-lg font-semibold text-[#888888]">—</p>
                </div>
              </div>
              <ul className="space-y-4">
                {deals.map((d) => (
                  <motion.li
                    key={d.id}
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4"
                  >
                    <div className="flex flex-wrap gap-4">
                      {d.property?.imageUrls?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.property.imageUrls[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#0d0d0d]">
                          <BarChart3 className="h-6 w-6 text-[#444444]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">{d.property?.title ?? "Opportunity"}</p>
                        <p className="text-xs text-[#888888]">{d.property?.city}</p>
                        <p className="mt-2 text-sm text-[#00C49A]">{formatINR(Number(d.valueInr ?? 0))}</p>
                        <span className="mt-2 inline-block rounded border border-[#1a1a1a] px-2 py-0.5 text-[10px] text-[#888888]">
                          {d.stage}
                        </span>
                        <div className="mt-3 flex gap-1">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span key={`stage-${d.id}-${i}`} className={`h-2 w-2 rounded-full ${i < 4 ? "bg-[#F0922B]" : "bg-[#333]"}`} />
                          ))}
                        </div>
                        <Link href={`/deals/${d.id}`} className="mt-3 inline-block text-xs text-[#00C49A]">
                          View deal →
                        </Link>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
