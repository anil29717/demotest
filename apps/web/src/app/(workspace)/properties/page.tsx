"use client";

import { Activity, ArrowUpDown, Building2, Edit, Eye, GitMerge, MapPin, Maximize2, Search, ShieldCheck, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

type Prop = {
  id: string;
  title: string;
  city: string;
  areaPublic: string;
  localityPublic?: string;
  price: unknown;
  areaSqft?: number;
  propertyType?: string;
  dealType?: string;
  isBankAuction?: boolean;
  distressedLabel?: string;
  status?: string;
  trustScore?: number;
  matches?: { id: string }[];
  imageUrls?: string[];
};

export default function PropertiesPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [nriTab, setNriTab] = useState<"mine" | "browse">("mine");
  const [q, setQ] = useState("");
  const [propertyType, setPropertyType] = useState("ALL");
  const [dealType, setDealType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("NEWEST");

  const { data: mineRows = [], isLoading: loadingMine } = useQuery({
    queryKey: ["properties-mine", token],
    enabled: Boolean(token) && user?.role === "NRI",
    queryFn: () =>
      apiFetch<Prop[]>("/properties/mine?limit=20&offset=0", { token: token ?? undefined })
        .catch(() => []),
    staleTime: 1000 * 60 * 2,
  });

  const { data: marketRows = [], isLoading: loadingMarket } = useQuery({
    queryKey: ["properties-market", token],
    enabled: Boolean(token) && user?.role === "NRI",
    queryFn: () =>
      apiFetch<Prop[]>("/properties?limit=20&offset=0", { token: token ?? undefined })
        .catch(() => []),
    staleTime: 1000 * 60 * 2,
  });

  const { data: allRows = [], isLoading: loadingAll } = useQuery({
    queryKey: ["properties", user?.role, token],
    enabled: Boolean(token) && user?.role !== "NRI",
    queryFn: () =>
      apiFetch<Prop[]>("/properties?limit=20&offset=0", {
        token: token ?? undefined,
      }).catch(() => []),
    staleTime: 1000 * 60 * 2,
  });
  const loading = loadingMine || loadingMarket || loadingAll;
  void queryClient;

  const sourceRows = user?.role === "NRI" ? (nriTab === "mine" ? mineRows : marketRows) : allRows;

  const filtered = useMemo(() => {
    const next = sourceRows.filter((row) => {
      const hay = `${row.title} ${row.city} ${row.areaPublic} ${row.localityPublic ?? ""}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (propertyType === "BANK_AUCTION" && !row.isBankAuction) return false;
      if (propertyType === "DISTRESSED" && row.distressedLabel !== "high_opportunity") return false;
      if (!["ALL", "BANK_AUCTION", "DISTRESSED"].includes(propertyType) && row.propertyType !== propertyType) return false;
      if (dealType !== "ALL" && row.dealType !== dealType) return false;
      if (status !== "ALL" && (row.status ?? "active").toUpperCase() !== status) return false;
      return true;
    });
    if (sort === "PRICE_LOW") next.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    if (sort === "PRICE_HIGH") next.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    if (sort === "MATCHES") next.sort((a, b) => (b.matches?.length ?? 0) - (a.matches?.length ?? 0));
    return next;
  }, [sourceRows, dealType, propertyType, q, sort, status]);

  if (user?.role === "NRI") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
              <Building2 className="h-7 w-7 text-[#00C49A]" />
              My Indian properties
            </h1>
            <p className="mt-1 text-sm text-[#888]">Properties you own or are looking to buy in India.</p>
          </div>
          <Link
            href="/properties/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-medium text-black"
          >
            List property +
          </Link>
        </div>
        <div className="flex gap-2 rounded-lg border border-[#1a1a1a] bg-[#111111] p-1">
          <button
            type="button"
            onClick={() => setNriTab("mine")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
              nriTab === "mine" ? "bg-[#00C49A14] text-[#00C49A]" : "text-[#888] hover:text-white"
            }`}
          >
            My listings
          </button>
          <button
            type="button"
            onClick={() => setNriTab("browse")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
              nriTab === "browse" ? "bg-[#00C49A14] text-[#00C49A]" : "text-[#888] hover:text-white"
            }`}
          >
            Marketplace
          </button>
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          <label className="relative min-w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#888]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, city, locality..."
              className="w-full rounded-lg border border-[#1f1f1f] bg-[#111111] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#00C49A]"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 text-sm text-[#888]">
            <Building2 className="h-4 w-4" />
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="bg-transparent py-2 outline-none"
            >
              <option value="ALL">All types</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="PLOT">Plot</option>
              <option value="BANK_AUCTION">Bank Auction</option>
              <option value="DISTRESSED">Distressed</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 text-sm text-[#888]">
            <Tag className="h-4 w-4" />
            <select value={dealType} onChange={(e) => setDealType(e.target.value)} className="bg-transparent py-2 outline-none">
              <option value="ALL">All</option>
              <option value="SALE">Sale</option>
              <option value="RENT">Rent</option>
              <option value="LEASE">Lease</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 text-sm text-[#888]">
            <Activity className="h-4 w-4" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-transparent py-2 outline-none">
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="SOLD">Sold</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 text-sm text-[#888]">
            <ArrowUpDown className="h-4 w-4" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent py-2 outline-none">
              <option value="NEWEST">Newest first</option>
              <option value="PRICE_LOW">Price: low-high</option>
              <option value="PRICE_HIGH">Price: high-low</option>
              <option value="MATCHES">Most matches</option>
            </select>
          </label>
        </div>
        {loading ? (
          <PageSkeleton count={6} type="property" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={nriTab === "mine" ? "No properties listed" : "No listings match filters"}
            subtitle={nriTab === "mine" ? "List your Indian property to track it from abroad." : "Try adjusting filters or search."}
            actionLabel={nriTab === "mine" ? "List property +" : undefined}
            actionHref={nriTab === "mine" ? "/properties/new" : undefined}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#111111] transition hover:border-[#00C49A33]"
              >
                <Link href={`/properties/${p.id}`} className="block">
                  <div className="relative">
                    {p.imageUrls?.[0] ? (
                      <div className="relative h-52 w-full">
                        <Image
                          src={p.imageUrls[0]}
                          alt={p.title}
                          fill
                          className="object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-property.png";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="relative h-52 w-full">
                        <Image src="/placeholder-property.png" alt={p.title} fill className="object-cover" />
                      </div>
                    )}
                    <div className="absolute left-2 top-2 rounded-md bg-[#00C49A20] px-2 py-1 text-[10px] text-[#00C49A]">
                      {p.dealType ?? "SALE"}
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="truncate text-sm font-semibold text-white">{p.title}</p>
                    <p className="flex items-center gap-1 text-xs text-[#888]">
                      <MapPin className="h-3 w-3" /> {p.localityPublic ?? p.areaPublic} · {p.city}
                    </p>
                    <div className="flex items-end justify-between">
                      <p className="text-lg font-semibold text-white">{formatINR(Number(p.price ?? 0))}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#888]">
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#1f1f1f] px-2 py-1">
                        <GitMerge className="h-3 w-3" />
                        {p.matches?.length ?? 0} matches
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#1f1f1f] px-2 py-1">
                        <ShieldCheck className="h-3 w-3" />
                        {p.status ?? "active"}
                      </span>
                    </div>
                  </div>
                </Link>
                {nriTab === "mine" && String(p.dealType ?? "").toUpperCase() === "RENT" ? (
                  <div className="border-t border-[#1f1f1f] px-4 pb-3">
                    <span className="inline-block rounded border border-[#00C49A40] bg-[#00C49A12] px-2 py-1 text-[11px] font-medium text-[#00C49A]">
                      {formatINR(Number(p.price ?? 0))}/mo income
                    </span>
                  </div>
                ) : null}
                {nriTab === "mine" ? (
                  <div className="border-t border-[#1f1f1f] p-3">
                    <Link
                      href="/verticals/nri"
                      className="block w-full rounded-lg border border-[#E85D8A40] py-2 text-center text-xs font-medium text-[#E85D8A] hover:bg-[#E85D8A10]"
                    >
                      Request service
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">My listings</h1>
          {user?.role === "SELLER" ? <p className="text-sm text-[#888]">Manage your property listings</p> : null}
        </div>
        <Link
          href="/properties/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-medium text-black"
        >
          <Building2 className="h-4 w-4" />
          Post property
        </Link>
      </div>
      {user?.role === "SELLER" ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#1a1a1a] bg-[#111111] px-5 py-3 text-sm">
          <p className="inline-flex items-center gap-1 text-[#00C49A]"><Building2 className="h-4 w-4" />{allRows.filter((r)=>String(r.status ?? "ACTIVE").toUpperCase()==="ACTIVE").length} Active</p>
          <div className="h-5 w-px bg-[#1a1a1a]" />
          <p className="inline-flex items-center gap-1 text-[#888]"><Eye className="h-4 w-4" />{allRows.filter((r)=>String(r.status ?? "").toUpperCase()==="PAUSED").length} Paused</p>
          <div className="h-5 w-px bg-[#1a1a1a]" />
          <p className="inline-flex items-center gap-1 text-emerald-400"><ShieldCheck className="h-4 w-4" />{allRows.filter((r)=>String(r.status ?? "").toUpperCase()==="SOLD").length} Sold</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 overflow-x-auto">
        <label className="relative min-w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#888]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, city, locality..." className="w-full rounded-lg border border-[#1f1f1f] bg-[#111111] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#00C49A]" />
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 text-sm text-[#888]">
          <Building2 className="h-4 w-4" />
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="bg-transparent py-2 outline-none">
            <option value="ALL">All types</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="PLOT">Plot</option>
            <option value="BANK_AUCTION">Bank Auction</option>
            <option value="DISTRESSED">Distressed</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 text-sm text-[#888]">
          <Tag className="h-4 w-4" />
          <select value={dealType} onChange={(e) => setDealType(e.target.value)} className="bg-transparent py-2 outline-none">
            <option value="ALL">All</option>
            <option value="SALE">Sale</option>
            <option value="RENT">Rent</option>
            <option value="LEASE">Lease</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 text-sm text-[#888]">
          <Activity className="h-4 w-4" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-transparent py-2 outline-none">
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="SOLD">Sold</option>
            <option value="PENDING">Pending</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 text-sm text-[#888]">
          <ArrowUpDown className="h-4 w-4" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent py-2 outline-none">
            <option value="NEWEST">Newest first</option>
            <option value="PRICE_LOW">Price: low-high</option>
            <option value="PRICE_HIGH">Price: high-low</option>
            <option value="MATCHES">Most matches</option>
          </select>
        </label>
      </div>

      {loading ? (
        <PageSkeleton count={6} type="property" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No listings yet"
          subtitle="Post your first property to start getting matched with buyers."
          actionLabel="Post property +"
          actionHref="/properties/new"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#111111] transition hover:-translate-y-0.5 hover:border-[#00C49A33]"
            >
              <div className="relative">
                {p.imageUrls?.[0] ? (
                <div className="relative h-52 w-full">
                  <Image
                    src={p.imageUrls[0]}
                    alt={p.title}
                    fill
                    className="object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-property.png";
                    }}
                  />
                </div>
              ) : (
                  <div className="relative h-52 w-full">
                    <Image src="/placeholder-property.png" alt={p.title} fill className="object-cover" />
                  </div>
                )}
                <div className="absolute left-2 top-2 rounded-md bg-[#00C49A20] px-2 py-1 text-[10px] text-[#00C49A]">
                  {p.dealType ?? "SALE"}
                </div>
                {p.isBankAuction ? <div className="absolute right-2 top-2 rounded-md bg-amber-500/20 px-2 py-1 text-[10px] text-amber-300">AUCTION</div> : null}
              </div>
              <div className="space-y-2 p-4">
                <p className="truncate text-sm font-semibold text-white">{p.title}</p>
                <p className="flex items-center gap-1 text-xs text-[#888]"><MapPin className="h-3 w-3" /> {p.localityPublic ?? p.areaPublic} · {p.city}</p>
                <div className="flex items-end justify-between">
                  <p className="text-lg font-semibold text-white">
                  {p.city} · {formatINR(Number(p.price ?? 0))}
                </p>
                  <p className="text-xs text-[#888]">{Number(p.areaSqft ?? 0) > 0 ? `${Math.round(Number(p.price ?? 0) / Number(p.areaSqft ?? 1))}/sqft` : "—"}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#1f1f1f] px-2 py-1"><Maximize2 className="h-3 w-3" />{p.areaSqft ?? 0} sqft</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#1f1f1f] px-2 py-1"><GitMerge className="h-3 w-3" />{p.matches?.length ?? 0} matches</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#1f1f1f] px-2 py-1"><ShieldCheck className="h-3 w-3" />{p.status ?? "active"}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-2 text-xs text-[#888]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#1f1f1f] px-2 py-1">
                    <span className={`h-2 w-2 rounded-full ${(p.status ?? "active") === "active" ? "bg-[#00C49A]" : "bg-[#555]"}`} />
                    {(p.status ?? "active").toUpperCase()}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" />
                    <Edit className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
