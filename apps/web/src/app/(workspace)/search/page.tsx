"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Gavel, Search, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl } from "@/lib/api";
import { formatINR } from "@/lib/format";
import toast from "react-hot-toast";

type Hit = {
  id: string;
  title: string;
  city: string;
  price: unknown;
  areaSqft: number;
  distressedLabel?: string;
};
type Saved = { id: string; name: string; filters: unknown; createdAt: string };

type PropertyTypeOpt = "" | "RESIDENTIAL" | "COMMERCIAL" | "PLOT" | "INSTITUTIONAL";
type DealTypeOpt = "" | "SALE" | "RENT";
type BankAuctionOpt = "" | "true" | "false";

type FiltersState = {
  q: string;
  city: string;
  propertyType: PropertyTypeOpt;
  dealType: DealTypeOpt;
  minPrice: string;
  maxPrice: string;
  minAreaSqft: string;
  maxAreaSqft: string;
  isBankAuction: BankAuctionOpt;
  distressedLabel: string;
};

const emptyFilters = (): FiltersState => ({
  q: "",
  city: "",
  propertyType: "",
  dealType: "",
  minPrice: "",
  maxPrice: "",
  minAreaSqft: "",
  maxAreaSqft: "",
  isBankAuction: "",
  distressedLabel: "",
});

function buildQueryString(f: FiltersState): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.city.trim()) p.set("city", f.city.trim());
  if (f.propertyType) p.set("propertyType", f.propertyType);
  if (f.dealType) p.set("dealType", f.dealType);
  const minP = f.minPrice.trim();
  const maxP = f.maxPrice.trim();
  const minA = f.minAreaSqft.trim();
  const maxA = f.maxAreaSqft.trim();
  if (minP && Number.isFinite(Number(minP))) p.set("minPrice", String(Number(minP)));
  if (maxP && Number.isFinite(Number(maxP))) p.set("maxPrice", String(Number(maxP)));
  if (minA && Number.isFinite(Number(minA))) p.set("minAreaSqft", String(Number(minA)));
  if (maxA && Number.isFinite(Number(maxA))) p.set("maxAreaSqft", String(Number(maxA)));
  if (f.isBankAuction === "true" || f.isBankAuction === "false") {
    p.set("isBankAuction", f.isBankAuction);
  }
  if (f.distressedLabel.trim()) p.set("distressedLabel", f.distressedLabel.trim());
  return p.toString();
}

function hasRunnableFilters(f: FiltersState): boolean {
  return buildQueryString(f).length > 0;
}

function filtersToSavePayload(f: FiltersState): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (f.q.trim()) o.q = f.q.trim();
  if (f.city.trim()) o.city = f.city.trim();
  if (f.propertyType) o.propertyType = f.propertyType;
  if (f.dealType) o.dealType = f.dealType;
  if (f.minPrice.trim() && Number.isFinite(Number(f.minPrice))) o.minPrice = Number(f.minPrice);
  if (f.maxPrice.trim() && Number.isFinite(Number(f.maxPrice))) o.maxPrice = Number(f.maxPrice);
  if (f.minAreaSqft.trim() && Number.isFinite(Number(f.minAreaSqft))) {
    o.minAreaSqft = Number(f.minAreaSqft);
  }
  if (f.maxAreaSqft.trim() && Number.isFinite(Number(f.maxAreaSqft))) {
    o.maxAreaSqft = Number(f.maxAreaSqft);
  }
  if (f.isBankAuction === "true") o.isBankAuction = true;
  if (f.isBankAuction === "false") o.isBankAuction = false;
  if (f.distressedLabel.trim()) o.distressedLabel = f.distressedLabel.trim();
  return o;
}

function summarizeSavedFilters(filters: unknown): string {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return "(no filters)";
  }
  const o = filters as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o.q === "string" && o.q) parts.push(`“${o.q}”`);
  if (typeof o.city === "string" && o.city) parts.push(o.city);
  if (typeof o.propertyType === "string" && o.propertyType) parts.push(o.propertyType);
  if (typeof o.dealType === "string" && o.dealType) parts.push(o.dealType);
  if (o.minPrice != null || o.maxPrice != null) {
    parts.push(`price ${o.minPrice ?? "—"}–${o.maxPrice ?? "—"}`);
  }
  if (o.minAreaSqft != null || o.maxAreaSqft != null) {
    parts.push(`sqft ${o.minAreaSqft ?? "—"}–${o.maxAreaSqft ?? "—"}`);
  }
  if (o.isBankAuction === true) parts.push("bank auction");
  if (o.isBankAuction === false) parts.push("not auction");
  if (typeof o.distressedLabel === "string" && o.distressedLabel) {
    parts.push(`label:${o.distressedLabel}`);
  }
  return parts.length ? parts.join(" · ") : "(no filters)";
}

export default function SearchPage() {
  const { token, user } = useAuth();
  const [f, setF] = useState<FiltersState>(() => emptyFilters());
  const [hits, setHits] = useState<Hit[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [saveName, setSaveName] = useState("");
  const [busy, setBusy] = useState(false);
  const [nriFriendly, setNriFriendly] = useState(false);
  const { refetch: refreshSaved } = useQuery({
    queryKey: ["saved-searches", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const data = await apiFetch<Saved[]>("/search/saved", { token: token ?? undefined }).catch(() => []);
      setSaved(data);
      return data;
    },
  });

  async function runSearch() {
    const qs = buildQueryString(f);
    const url = qs ? apiUrl(`/search/properties?${qs}`) : apiUrl("/search/properties");
    const res = await fetch(url).then((r) => r.json());
    setHits(res.hits ?? []);
    setNote(res.note ?? "");
  }

  async function saveCurrent() {
    if (!token || !hasRunnableFilters(f)) return;
    setBusy(true);
    try {
      const filters = filtersToSavePayload(f);
      const name =
        saveName.trim() ||
        (f.q.trim() ? `Search: ${f.q.trim()}` : `Search: ${summarizeSavedFilters(filters)}`);
      await apiFetch("/search/saved", {
        method: "POST",
        token,
        body: JSON.stringify({ name, filters }),
      });
      setSaveName("");
      await refreshSaved();
      toast.success("Search saved. You can manage alerts in notification settings.");
    } finally {
      setBusy(false);
    }
  }

  async function runSaved(id: string) {
    if (!token) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ hits: Hit[]; note?: string }>(`/search/saved/${id}/run`, {
        token,
      });
      setHits(res.hits ?? []);
      setNote(res.note ?? "");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSaved(id: string) {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/search/saved/${id}`, { method: "DELETE", token });
      await refreshSaved();
    } finally {
      setBusy(false);
    }
  }

  const displayHits =
    user?.role === "NRI" && nriFriendly
      ? hits.filter((h) => String(h.distressedLabel ?? "").toLowerCase() !== "disputed")
      : hits;

  function applySavedToForm(filters: unknown) {
    const base = emptyFilters();
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
      setF(base);
      return;
    }
    const o = filters as Record<string, unknown>;
    setF({
      q: typeof o.q === "string" ? o.q : "",
      city: typeof o.city === "string" ? o.city : "",
      propertyType:
        o.propertyType === "RESIDENTIAL" ||
        o.propertyType === "COMMERCIAL" ||
        o.propertyType === "PLOT" ||
        o.propertyType === "INSTITUTIONAL"
          ? o.propertyType
          : "",
      dealType: o.dealType === "SALE" || o.dealType === "RENT" ? o.dealType : "",
      minPrice: o.minPrice != null ? String(o.minPrice) : "",
      maxPrice: o.maxPrice != null ? String(o.maxPrice) : "",
      minAreaSqft: o.minAreaSqft != null ? String(o.minAreaSqft) : "",
      maxAreaSqft: o.maxAreaSqft != null ? String(o.maxAreaSqft) : "",
      isBankAuction:
        o.isBankAuction === true ? "true" : o.isBankAuction === false ? "false" : "",
      distressedLabel: typeof o.distressedLabel === "string" ? o.distressedLabel : "",
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
        {user?.role === "SELLER" || user?.role === "NRI" || user?.role === "BUYER" ? (
          <Search className={`h-5 w-5 ${user?.role === "BUYER" ? "text-[#378ADD]" : "text-[#00C49A]"}`} />
        ) : null}
        {user?.role === "NRI"
          ? "Find properties in India"
          : user?.role === "SELLER"
            ? "Market search"
            : user?.role === "BUYER"
              ? "Find your property"
              : "Property search"}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {user?.role === "NRI"
          ? "Search across all active listings."
          : user?.role === "SELLER"
            ? "Search active listings to understand market pricing."
            : user?.role === "BUYER"
              ? "Refine by city, budget, and property type — results update when you search."
              : "Search across all active listings."}
      </p>

      <div className="mt-6 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div>
          <label className="text-xs font-medium text-zinc-500">Keywords</label>
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            placeholder="Title, city, locality…"
            value={f.q}
            onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-500">City contains</label>
            <input
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              placeholder="e.g. Mumbai"
              value={f.city}
              onChange={(e) => setF((s) => ({ ...s, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Distressed label</label>
            <input
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              placeholder="e.g. standard"
              value={f.distressedLabel}
              onChange={(e) => setF((s) => ({ ...s, distressedLabel: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Property type</label>
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.propertyType}
              onChange={(e) =>
                setF((s) => ({ ...s, propertyType: e.target.value as PropertyTypeOpt }))
              }
            >
              <option value="">Any</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="PLOT">Plot</option>
              <option value="INSTITUTIONAL">Institutional</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Deal type</label>
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.dealType}
              onChange={(e) => setF((s) => ({ ...s, dealType: e.target.value as DealTypeOpt }))}
            >
              <option value="">Any</option>
              <option value="SALE">Sale</option>
              <option value="RENT">Rent</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Min price</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.minPrice}
              onChange={(e) => setF((s) => ({ ...s, minPrice: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Max price</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.maxPrice}
              onChange={(e) => setF((s) => ({ ...s, maxPrice: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Min area (sqft)</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.minAreaSqft}
              onChange={(e) => setF((s) => ({ ...s, minAreaSqft: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Max area (sqft)</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.maxAreaSqft}
              onChange={(e) => setF((s) => ({ ...s, maxAreaSqft: e.target.value }))}
            />
          </div>
          {user?.role !== "BUYER" ? (
            <div>
              <label className="text-xs font-medium text-zinc-500">Bank auction</label>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                value={f.isBankAuction}
                onChange={(e) =>
                  setF((s) => ({ ...s, isBankAuction: e.target.value as BankAuctionOpt }))
                }
              >
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          ) : null}
        </div>
        {user?.role === "NRI" ? (
          <label className="flex cursor-pointer items-center gap-3 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2">
            <Gavel className="h-4 w-4 text-[#00C49A]" />
            <div className="flex-1">
              <p className="text-sm text-zinc-200">NRI-friendly properties</p>
              <p className="text-[11px] text-zinc-500">Hide listings flagged as disputed title.</p>
            </div>
            <input
              type="checkbox"
              checked={nriFriendly}
              onChange={(e) => setNriFriendly(e.target.checked)}
              className="h-4 w-4 accent-[#00C49A]"
            />
          </label>
        ) : null}
        <button
          type="button"
          disabled={busy || !hasRunnableFilters(f)}
          onClick={() => void runSearch()}
          className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {note && <p className="mt-3 text-xs text-zinc-500">{note}</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {displayHits.map((h) => (
          <li key={h.id}>
            <Link href={`/properties/${h.id}`} className="text-teal-400 hover:underline">
              {h.title}
            </Link>
            <span className="text-zinc-500">
              {" "}
              · {h.city} · {formatINR(Number(h.price ?? 0))} · {h.areaSqft} sqft
            </span>
          </li>
        ))}
      </ul>

      {user?.role === "BUYER" && displayHits.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-xl border border-[#1a1a1a] bg-[#111111] p-5"
        >
          <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
            <Bell className="h-4 w-4 text-[#378ADD]" />
            Set up an alert
          </p>
          <p className="mt-1 text-sm text-[#888888]">Get notified when new properties match this search.</p>
          <button
            type="button"
            disabled={busy || !hasRunnableFilters(f) || !token}
            onClick={() => void saveCurrent()}
            className="mt-4 rounded-lg bg-[#00C49A] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Save this search
          </button>
        </motion.div>
      ) : null}

      {user?.role === "SELLER" && displayHits.length > 1 ? (
        <div className="mt-8 rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-white"><TrendingUp className="h-4 w-4 text-[#00C49A]" />Price comparison</p>
          <p className="mt-1 text-xs text-[#888]">Your listing vs market average</p>
          {(() => {
            const avg = displayHits.reduce((sum, h) => sum + Number(h.price ?? 0), 0) / displayHits.length;
            return <p className="mt-2 text-sm text-[#888]">Market avg: <span className="text-[#00C49A]">{formatINR(avg)}</span></p>;
          })()}
        </div>
      ) : null}

      {token && (
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-medium text-zinc-300">Save current search</h2>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-500">Name (optional)</label>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="e.g. Mumbai resale under 2Cr"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={busy || !hasRunnableFilters(f)}
              onClick={() => void saveCurrent()}
              className="rounded border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              Save
            </button>
          </div>

          <h2 className="mt-8 text-sm font-medium text-zinc-300">Saved searches</h2>
          {saved.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">None yet.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {saved.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded border border-zinc-800 bg-zinc-900/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-200">{s.name}</p>
                    <p className="text-xs text-zinc-500">{summarizeSavedFilters(s.filters)}</p>
                    <p className="text-[10px] text-zinc-600">
                      Saved {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runSaved(s.id)}
                      className="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-500 disabled:opacity-50"
                    >
                      Run
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => applySavedToForm(s.filters)}
                      className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Load into form
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteSaved(s.id)}
                      className="rounded border border-red-900/60 px-3 py-1 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!token && (
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/login" className="text-teal-400">
            Log in
          </Link>{" "}
          to save searches and run saved searches.
        </p>
      )}
    </div>
  );
}
