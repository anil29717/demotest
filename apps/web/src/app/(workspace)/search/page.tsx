"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Building2, Gavel, IndianRupee, MapPin, Maximize2, Search, SlidersHorizontal, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiFetchJsonWithHeaders } from "@/lib/api";
import { pickPrimaryImageUrl } from "@/lib/property-images";
import { formatINR, formatPriceFilterPreview } from "@/lib/format";
import toast from "react-hot-toast";

type SearchSortMode = "relevance" | "price_asc" | "price_desc" | "newest";

type Hit = {
  id: string;
  title: string;
  city: string;
  price: unknown;
  areaSqft: number;
  distressedLabel?: string;
  _score?: number;
  imageUrls?: string[];
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
  lat: string;
  lon: string;
  radiusKm: string;
};

type FacetBucket = { key: string; count: number };
type FacetsPayload = {
  types: FacetBucket[];
  dealTypes: FacetBucket[];
  cities: FacetBucket[];
  priceRange: { min: number; max: number; avg: number };
  priceHistogram: Array<{ key: number; doc_count: number }>;
} | null;

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
  lat: "",
  lon: "",
  radiusKm: "",
});

function filtersToSearchParams(f: FiltersState): URLSearchParams {
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
  const latN = f.lat.trim() ? Number(f.lat) : NaN;
  const lonN = f.lon.trim() ? Number(f.lon) : NaN;
  if (Number.isFinite(latN) && Number.isFinite(lonN)) {
    p.set("lat", String(latN));
    p.set("lon", String(lonN));
    if (f.radiusKm.trim() && Number.isFinite(Number(f.radiusKm))) {
      p.set("radiusKm", String(Number(f.radiusKm)));
    }
  }
  return p;
}

function buildQueryString(f: FiltersState): string {
  return filtersToSearchParams(f).toString();
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
  return parts.length ? parts.join(" · ") : "(no filters)";
}

const PAGE_LIMIT = 20;

export default function SearchPage() {
  const { token, user } = useAuth();
  const [f, setF] = useState<FiltersState>(() => emptyFilters());
  const [hits, setHits] = useState<Hit[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [saveName, setSaveName] = useState("");
  const [busy, setBusy] = useState(false);
  const [nriFriendly, setNriFriendly] = useState(false);
  const [sort, setSort] = useState<SearchSortMode>("relevance");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [searchFallback, setSearchFallback] = useState(false);
  const [facets, setFacets] = useState<FacetsPayload>(null);
  const [activeFacetType, setActiveFacetType] = useState("");
  const [activeFacetCity, setActiveFacetCity] = useState("");
  const [kwSuggestions, setKwSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const { refetch: refreshSaved } = useQuery({
    queryKey: ["saved-searches", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const data = await apiFetch<Saved[]>("/search/saved", { token: token ?? undefined }).catch(() => []);
      setSaved(data);
      return data;
    },
  });

  useEffect(() => {
    const q = f.q.trim();
    if (q.length < 2) {
      setKwSuggestions([]);
      return;
    }
    const id = window.setTimeout(() => {
      void Promise.all([
        apiFetch<string[]>(`/search/autocomplete?${new URLSearchParams({ q, field: "city" })}`),
        apiFetch<string[]>(`/search/autocomplete?${new URLSearchParams({ q, field: "locality" })}`),
      ])
        .then(([c, l]) => {
          const merged = [...new Set([...(c ?? []), ...(l ?? [])])].slice(0, 10);
          setKwSuggestions(merged);
        })
        .catch(() => setKwSuggestions([]));
    }, 280);
    return () => window.clearTimeout(id);
  }, [f.q]);

  useEffect(() => {
    const cityQ = f.city.trim();
    if (cityQ.length < 1) {
      setCitySuggestions([]);
      return;
    }
    const id = window.setTimeout(() => {
      void apiFetch<string[]>(
        `/search/autocomplete?${new URLSearchParams({ q: cityQ, field: "city" })}`,
      )
        .then((rows) => setCitySuggestions((rows ?? []).slice(0, 8)))
        .catch(() => setCitySuggestions([]));
    }, 220);
    return () => window.clearTimeout(id);
  }, [f.city]);

  async function runSearch(nextPage?: number, explicitSort?: SearchSortMode) {
    const pnum = nextPage ?? page;
    const srt = explicitSort ?? sort;
    if (explicitSort != null) setSort(explicitSort);
    const params = filtersToSearchParams(f);
    params.set("sort", srt);
    params.set("page", String(pnum));
    params.set("limit", String(PAGE_LIMIT));
    const path = `/search/properties?${params.toString()}`;
    const { data, headers } = await apiFetchJsonWithHeaders<{
      hits?: Hit[];
      total?: number;
      tookMs?: number;
      took?: number | null;
      note?: string;
      fallback?: boolean;
      facets?: FacetsPayload;
    }>(path);
    setHits(data.hits ?? []);
    setNote(data.note ?? "");
    setTotal(typeof data.total === "number" ? data.total : null);
    setTookMs(typeof data.took === "number" ? data.took : typeof data.tookMs === "number" ? data.tookMs : null);
    setSearchFallback(
      Boolean(data.fallback) || String(headers.get("X-Search-Fallback") ?? "").toLowerCase() === "true",
    );
    setFacets(data.facets ?? null);
    setPage(pnum);
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
      const runQs = new URLSearchParams({
        page: "1",
        limit: String(PAGE_LIMIT),
        sort,
      }).toString();
      const { data, headers } = await apiFetchJsonWithHeaders<{
        hits?: Hit[];
        total?: number;
        tookMs?: number;
        note?: string;
        fallback?: boolean;
      }>(`/search/saved/${id}/run?${runQs}`, { token });
      setHits(data.hits ?? []);
      setNote(data.note ?? "");
      setTotal(typeof data.total === "number" ? data.total : null);
      setTookMs(typeof data.tookMs === "number" ? data.tookMs : null);
      setSearchFallback(
        Boolean(data.fallback) || String(headers.get("X-Search-Fallback") ?? "").toLowerCase() === "true",
      );
      setPage(1);
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

  const minPricePreview = formatPriceFilterPreview(f.minPrice);
  const maxPricePreview = formatPriceFilterPreview(f.maxPrice);

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
      lat: o.lat != null ? String(o.lat) : "",
      lon: o.lon != null ? String(o.lon) : "",
      radiusKm: o.radiusKm != null ? String(o.radiusKm) : "",
    });
  }

  function toggleFacetType(value: string) {
    const next = activeFacetType === value ? "" : value;
    setActiveFacetType(next);
    setF((prev) => ({ ...prev, propertyType: (next as PropertyTypeOpt) || "" }));
  }

  function toggleFacetCity(value: string) {
    const next = activeFacetCity === value ? "" : value;
    setActiveFacetCity(next);
    setF((prev) => ({ ...prev, city: next }));
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

      <div className="mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
          <SlidersHorizontal className="h-4 w-4 text-[#00C49A]" />
          Search filters
        </p>
        <div className="relative">
          <label className="text-xs font-medium text-zinc-500">Keywords</label>
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            placeholder="Title, city, locality…"
            value={f.q}
            onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))}
            autoComplete="off"
          />
          {kwSuggestions.length > 0 ? (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded border border-zinc-700 bg-zinc-900 py-1 text-sm shadow-lg">
              {kwSuggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      setF((prev) => ({ ...prev, q: s }));
                      setKwSuggestions([]);
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <label className="text-xs font-medium text-zinc-500">City contains</label>
            <div className="mt-1 flex items-center rounded border border-zinc-700 bg-zinc-900">
              <MapPin className="ml-2 h-4 w-4 text-zinc-500" />
              <input
                className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                placeholder="e.g. Mumbai"
                value={f.city}
                onChange={(e) => setF((s) => ({ ...s, city: e.target.value }))}
                autoComplete="off"
              />
            </div>
            {citySuggestions.length > 0 ? (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-44 overflow-auto rounded border border-zinc-700 bg-zinc-900 py-1 text-sm shadow-lg">
                {citySuggestions.map((city, i) => (
                  <li key={`${city}-${i}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-zinc-200 hover:bg-zinc-800"
                      onClick={() => {
                        setF((prev) => ({ ...prev, city }));
                        setCitySuggestions([]);
                      }}
                    >
                      {city}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <label className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
              <Building2 className="h-3.5 w-3.5" />
              Property type
            </label>
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
            <label className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
              <IndianRupee className="h-3.5 w-3.5" />
              Min price
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.minPrice}
              onChange={(e) => setF((s) => ({ ...s, minPrice: e.target.value }))}
            />
            {minPricePreview ? (
              <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                <span className="font-medium text-[#00C49A]">{minPricePreview.compact}</span>
                {minPricePreview.compact !== minPricePreview.full ? (
                  <span className="text-zinc-600"> · {minPricePreview.full}</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div>
            <label className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
              <IndianRupee className="h-3.5 w-3.5" />
              Max price
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.maxPrice}
              onChange={(e) => setF((s) => ({ ...s, maxPrice: e.target.value }))}
            />
            {maxPricePreview ? (
              <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                <span className="font-medium text-[#00C49A]">{maxPricePreview.compact}</span>
                {maxPricePreview.compact !== maxPricePreview.full ? (
                  <span className="text-zinc-600"> · {maxPricePreview.full}</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div>
            <label className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
              <Maximize2 className="h-3.5 w-3.5" />
              Min area (sqft)
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.minAreaSqft}
              onChange={(e) => setF((s) => ({ ...s, minAreaSqft: e.target.value }))}
            />
          </div>
          <div>
            <label className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
              <Maximize2 className="h-3.5 w-3.5" />
              Max area (sqft)
            </label>
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
          <div>
            <label className="text-xs font-medium text-zinc-500">Latitude (optional)</label>
            <input
              type="number"
              step="any"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.lat}
              onChange={(e) => setF((s) => ({ ...s, lat: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Longitude (optional)</label>
            <input
              type="number"
              step="any"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.lon}
              onChange={(e) => setF((s) => ({ ...s, lon: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Radius km (optional)</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={f.radiusKm}
              onChange={(e) => setF((s) => ({ ...s, radiusKm: e.target.value }))}
            />
          </div>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-[12rem]">
            <label className="text-xs font-medium text-zinc-500">Sort</label>
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={sort}
              disabled={busy || !hasRunnableFilters(f)}
              onChange={(e) => {
                const v = e.target.value as SearchSortMode;
                void runSearch(1, v);
              }}
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price · low to high</option>
              <option value="price_desc">Price · high to low</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          <button
            type="button"
            disabled={busy || !hasRunnableFilters(f)}
            onClick={() => void runSearch(1)}
            className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </div>

      {(note || tookMs != null || total != null) && (
        <p className="mt-3 text-xs text-zinc-500">
          {total != null ? <>{total.toLocaleString()} properties found</> : null}
          {f.lat && f.lon && f.city.trim() ? <> · near {f.city.trim()}</> : null}
          {process.env.NODE_ENV === "development" && tookMs != null ? <> · ES: {tookMs}ms</> : null}
          {(total != null || tookMs != null) && note ? " · " : null}
          {note}
        </p>
      )}
      {searchFallback ? (
        <p className="mt-2 rounded border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
          Showing database-backed results while full-text search is unavailable (
          <span className="font-mono text-amber-100/90">X-Search-Fallback</span>).
        </p>
      ) : null}
      {(activeFacetType || activeFacetCity) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {activeFacetType ? (
            <button
              type="button"
              onClick={() => {
                toggleFacetType(activeFacetType);
                void runSearch(1);
              }}
              className="rounded-full border border-[#00C49A40] bg-[#00C49A15] px-2 py-1 text-[#00C49A]"
            >
              Type: {activeFacetType} ×
            </button>
          ) : null}
          {activeFacetCity ? (
            <button
              type="button"
              onClick={() => {
                toggleFacetCity(activeFacetCity);
                void runSearch(1);
              }}
              className="rounded-full border border-[#00C49A40] bg-[#00C49A15] px-2 py-1 text-[#00C49A]"
            >
              City: {activeFacetCity} ×
            </button>
          ) : null}
          {activeFacetType && activeFacetCity ? (
            <button
              type="button"
              onClick={() => {
                setActiveFacetType("");
                setActiveFacetCity("");
                setF((s) => ({ ...s, propertyType: "", city: "" }));
                void runSearch(1);
              }}
              className="text-zinc-500 underline"
            >
              Clear all filters
            </button>
          ) : null}
        </div>
      )}

      <div className={`mt-6 ${facets ? "grid gap-5 lg:grid-cols-[240px,1fr]" : ""}`}>
        {facets ? (
          <aside className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <section>
              <p className="text-[11px] uppercase tracking-wide text-[#555]">Property type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {facets.types.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      toggleFacetType(item.key);
                      void runSearch(1);
                    }}
                    className={`rounded-full border px-2 py-1 text-xs ${
                      activeFacetType === item.key
                        ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    {item.key} ({item.count})
                  </button>
                ))}
              </div>
            </section>
            <section>
              <p className="text-[11px] uppercase tracking-wide text-[#555]">City</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {facets.cities.slice(0, 5).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      toggleFacetCity(item.key);
                      void runSearch(1);
                    }}
                    className={`rounded-full border px-2 py-1 text-xs ${
                      activeFacetCity === item.key
                        ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    {item.key} ({item.count})
                  </button>
                ))}
              </div>
            </section>
            <section>
              <p className="text-[11px] uppercase tracking-wide text-[#555]">Price range</p>
              <p className="mt-2 text-sm text-zinc-300">
                {formatINR(Number(facets.priceRange.min ?? 0))} - {formatINR(Number(facets.priceRange.max ?? 0))}
              </p>
              <p className="text-[11px] text-zinc-500">(based on current results)</p>
            </section>
          </aside>
        ) : null}

        <div className="space-y-3">
          {displayHits.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">
              No matching listings yet. Try changing city, budget, or property type.
            </div>
          ) : null}
          {displayHits.map((h) => {
            const imageUrl = pickPrimaryImageUrl(h.imageUrls) || "/placeholder-property.png";
            return (
              <Link
                key={h.id}
                href={`/properties/${h.id}`}
                className="block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition hover:border-zinc-700"
              >
                <div className="grid gap-0 sm:grid-cols-[180px,1fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={h.title}
                    className="h-36 w-full object-cover sm:h-full"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/placeholder-property.png";
                    }}
                  />
                  <div className="space-y-2 p-4">
                    <p className="line-clamp-1 text-base font-semibold text-white">{h.title}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                        {h.city}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IndianRupee className="h-3.5 w-3.5 text-zinc-500" />
                        {formatINR(Number(h.price ?? 0))}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Maximize2 className="h-3.5 w-3.5 text-zinc-500" />
                        {h.areaSqft} sqft
                      </span>
                      {sort === "relevance" && typeof h._score === "number" ? (
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                          score {h._score.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {total != null && total > PAGE_LIMIT ? (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
          <button
            type="button"
            disabled={busy || page <= 1}
            onClick={() => void runSearch(page - 1)}
            className="rounded border border-zinc-600 px-3 py-1.5 hover:bg-zinc-800 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.max(1, Math.ceil(total / PAGE_LIMIT))}
          </span>
          <button
            type="button"
            disabled={busy || page >= Math.ceil(total / PAGE_LIMIT)}
            onClick={() => void runSearch(page + 1)}
            className="rounded border border-zinc-600 px-3 py-1.5 hover:bg-zinc-800 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

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
