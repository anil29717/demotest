"use client";

import {
  BookmarkPlus,
  Building2,
  Calendar,
  ChevronRight,
  GitMerge,
  Home,
  IndianRupee,
  MapPin,
  MessageCircle,
  Pencil,
  Ruler,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import {
  PropertyImageGallery,
  PropertyImageGallerySkeleton,
} from "@/components/property-image-gallery";

type Prop = {
  id: string;
  title: string;
  description: string | null;
  city: string;
  areaPublic: string;
  localityPublic: string;
  price: unknown;
  areaSqft: number;
  propertyType: string;
  dealType: string;
  trustScore: number;
  status?: string;
  presentationLabel?: string;
  imageUrls?: string[];
  createdAt?: string;
  matchCount?: number;
};

function statusPresentation(status: string | undefined) {
  const s = (status ?? "active").toLowerCase();
  if (s === "active")
    return { label: "Active", className: "border-emerald-500/40 bg-emerald-950/40 text-emerald-300" };
  if (s === "sold")
    return { label: "Sold", className: "border-zinc-600 bg-zinc-800/80 text-zinc-300" };
  if (s === "inactive")
    return { label: "Paused", className: "border-amber-500/35 bg-amber-950/30 text-amber-200" };
  if (s === "withdrawn")
    return { label: "Withdrawn", className: "border-zinc-600 bg-zinc-900 text-zinc-400" };
  return {
    label: status?.toUpperCase() ?? "—",
    className: "border-zinc-700 bg-zinc-900 text-zinc-300",
  };
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token, user } = useAuth();
  const [p, setP] = useState<Prop | null | undefined>(undefined);
  const [reviews, setReviews] = useState<
    { id: string; rating: number; comment: string | null; createdAt: string }[]
  >([]);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    apiFetch<Prop>(`/properties/${id}`)
      .then(setP)
      .catch(() => setP(null));
    apiFetch<{ id: string; rating: number; comment: string | null; createdAt: string }[]>(
      `/reviews/property/${id}`,
    )
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    if (!token) {
      setCanManage(false);
      return;
    }
    let cancelled = false;
    void apiFetch<{ id: string }[]>("/properties/mine", { token })
      .then((rows) => {
        if (!cancelled) setCanManage(rows.some((r) => r.id === id));
      })
      .catch(() => {
        if (!cancelled) setCanManage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const shareListing = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }, []);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMsg(null);
    await apiFetch(`/reviews/property/${id}`, {
      method: "POST",
      token,
      body: JSON.stringify({ rating: Number(rating), comment: comment || undefined }),
    });
    setComment("");
    setMsg("Review submitted for moderation.");
    toast.success("Thanks — your review will appear after moderation.");
  }

  const area = p ? Number(p.areaSqft ?? 0) : 0;
  const price = p ? Number(p.price ?? 0) : 0;
  const pricePerSqft = area > 0 ? Math.round(price / area) : 0;
  const stars = Math.max(1, Math.min(5, Number(rating)));
  const matchCount = p?.matchCount ?? 0;
  const statusUi = useMemo(() => statusPresentation(p?.status), [p?.status]);

  if (p === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mb-6 h-5 w-40 animate-pulse rounded bg-[#1a1a1a]" />
        <PropertyImageGallerySkeleton />
        <div className="mt-8 space-y-4">
          <div className="h-12 w-3/4 max-w-xl animate-pulse rounded-lg bg-[#1a1a1a]" />
          <div className="h-6 w-1/2 animate-pulse rounded bg-[#1a1a1a]" />
          <div className="grid gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[#141414]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (p === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Building2 className="mx-auto h-14 w-14 text-zinc-600" />
        <h1 className="mt-6 text-xl font-semibold text-white">Listing not found</h1>
        <p className="mt-2 text-sm text-zinc-500">It may have been removed or the link is incorrect.</p>
        <Link
          href="/properties"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#00C49A] px-5 py-2.5 text-sm font-semibold text-black"
        >
          Browse properties
        </Link>
      </div>
    );
  }

  const locationLine = `${p.city} · ${p.areaPublic}, ${p.localityPublic}`;
  const listedDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <Link href="/properties" className="transition hover:text-[#00C49A]">
          Properties
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        <span className="line-clamp-1 text-zinc-400">{p.title}</span>
      </nav>

      {/* Gallery */}
      <PropertyImageGallery title={p.title} imageUrls={p.imageUrls} className="shadow-[0_24px_80px_-24px_rgba(0,196,154,0.12)]" />

      {/* Title band */}
      <header className="relative mt-8 overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00C49A]/[0.06] via-transparent to-transparent" />
        <div className="relative p-6 sm:p-8">
          {p.presentationLabel ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">{p.presentationLabel}</p>
          ) : null}

          <div className="mt-3 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">{p.title}</h1>
              <p className="flex items-start gap-2 text-base leading-relaxed text-zinc-400">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#00C49A]" aria-hidden />
                <span>{locationLine}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusUi.className}`}
                >
                  {statusUi.label}
                </span>
                <span className="rounded-full border border-[#00C49A]/35 bg-[#00C49A]/10 px-3 py-1 text-xs font-medium text-[#00C49A]">
                  {p.dealType}
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300">
                  {p.propertyType}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-950/40 px-3 py-1 text-xs font-medium text-violet-200">
                  <GitMerge className="h-3.5 w-3.5" aria-hidden />
                  {matchCount} {matchCount === 1 ? "match" : "matches"}
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                  Trust {Math.round(Number(p.trustScore ?? 0))}%
                </span>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-[#1f1f1f] bg-[#111111] px-6 py-5 text-right lg:min-w-[240px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Asking price</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#00C49A] sm:text-4xl">{formatINR(price)}</p>
              {pricePerSqft ? (
                <p className="mt-2 text-sm text-zinc-500">{formatINR(pricePerSqft)} / sqft</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-600">— / sqft</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Quick metrics */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: IndianRupee,
            label: "Price",
            value: formatINR(price),
            sub: pricePerSqft ? `${formatINR(pricePerSqft)}/sqft` : undefined,
          },
          {
            icon: Ruler,
            label: "Area",
            value: `${area.toLocaleString()} sqft`,
            sub: "Built-up",
          },
          {
            icon: MapPin,
            label: "Location",
            value: p.city,
            sub: `${p.areaPublic}`,
          },
          {
            icon: GitMerge,
            label: "Matches",
            value: String(matchCount),
            sub: "Buyer fit count",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4 transition hover:border-[#00C49A]/25"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <item.icon className="h-4 w-4 text-[#00C49A]" aria-hidden />
              {item.label}
            </div>
            <p className="mt-2 truncate text-lg font-semibold text-white">{item.value}</p>
            {item.sub ? <p className="mt-0.5 truncate text-xs text-zinc-500">{item.sub}</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-[minmax(0,1fr)_300px] md:gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-12">
          {/* Description */}
          <section aria-labelledby="desc-heading">
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#1f1f1f] pb-4">
              <h2 id="desc-heading" className="text-lg font-semibold tracking-tight text-white">
                Description
              </h2>
              {listedDate ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Listed {listedDate}
                </p>
              ) : null}
            </div>
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:text-zinc-300">
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-300">
                {p.description?.trim() || "No detailed description has been provided for this listing yet."}
              </p>
            </div>
          </section>

          {/* Property details */}
          <section aria-labelledby="details-heading">
            <h2 id="details-heading" className="mb-5 border-b border-[#1f1f1f] pb-4 text-lg font-semibold tracking-tight text-white">
              Property details
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Property type", value: p.propertyType, icon: Home },
                { label: "Transaction", value: p.dealType, icon: Sparkles },
                { label: "City", value: p.city, icon: MapPin },
                { label: "Area & locality", value: `${p.areaPublic}, ${p.localityPublic}`, icon: Building2 },
                { label: "Listing status", value: statusUi.label, icon: Star },
                { label: "Carpet / built-up", value: `${area.toLocaleString()} sqft`, icon: Ruler },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex gap-4 rounded-xl border border-[#1f1f1f] bg-[#111111] p-4 transition hover:bg-[#141414]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0d0d0d] text-[#00C49A]">
                    <row.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{row.label}</p>
                    <p className="mt-1 text-sm font-medium text-white">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="mb-5 border-b border-[#1f1f1f] pb-4 text-lg font-semibold tracking-tight text-white">
              Reviews
            </h2>
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
                  <p className="text-amber-300">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(Math.max(0, 5 - r.rating))}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">{r.comment ?? "No comment"}</p>
                  <p className="mt-2 text-xs text-zinc-600">{new Date(r.createdAt).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
            {!reviews.length ? (
              <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-8 text-center text-sm text-zinc-500">
                No published reviews yet. Be the first after you interact through the platform.
              </p>
            ) : null}

            {token ? (
              <form onSubmit={submitReview} className="mt-6 space-y-4 rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-5">
                <p className="text-sm font-medium text-white">Write a review</p>
                <div className="inline-flex items-center gap-1 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-amber-300">
                  {Array.from({ length: stars }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <label className="block text-xs text-zinc-500">
                  Rating
                  <select
                    className="mt-1.5 block w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map((x) => (
                      <option key={x} value={x}>
                        {x} stars
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  className="block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience (published after moderation)"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-medium text-white transition hover:border-[#00C49A]/50 hover:text-[#00C49A]"
                >
                  Submit review
                </button>
                {msg ? <p className="text-xs text-zinc-500">{msg}</p> : null}
              </form>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                <Link href="/login" className="text-[#00C49A] hover:underline">
                  Sign in
                </Link>{" "}
                to leave a review.
              </p>
            )}
          </section>
        </main>

        {/* Sidebar actions */}
        <aside className="space-y-6 md:sticky md:top-24 md:self-start md:w-[300px] lg:w-[320px]">
          <div className="rounded-2xl border border-[#1f1f1f] bg-gradient-to-b from-[#111111] to-[#0d0d0d] p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Actions</p>
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void shareListing()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#141414] px-4 py-3 text-sm font-medium text-white transition hover:border-[#00C49A]/40 hover:bg-[#1a1a1a]"
              >
                <Share2 className="h-4 w-4" />
                Share listing
              </button>
              <Link
                href="/matches"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#141414] px-4 py-3 text-sm font-medium text-white transition hover:border-[#00C49A]/40"
              >
                <Sparkles className="h-4 w-4" />
                View matches
              </Link>
              <Link
                href="/search"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#141414] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600"
              >
                Search similar
              </Link>
              {canManage ? (
                <Link
                  href="/properties"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#00C49A]/30 bg-[#00C49A]/10 px-4 py-3 text-sm font-semibold text-[#00C49A] transition hover:bg-[#00C49A]/15"
                >
                  <Pencil className="h-4 w-4" />
                  Manage my listings
                </Link>
              ) : null}
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C49A] px-4 py-3.5 text-sm font-semibold text-black shadow-[0_8px_30px_-8px_rgba(0,196,154,0.45)] transition hover:brightness-110"
              >
                <MessageCircle className="h-4 w-4" />
                Contact via platform
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-transparent px-4 py-3 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              >
                <BookmarkPlus className="h-4 w-4" />
                Save for later
              </button>
            </div>
            <p className="mt-5 border-t border-[#1f1f1f] pt-5 text-xs leading-relaxed text-zinc-500">
              Phone and email stay private. All enquiries route through the platform to protect buyers and sellers.
            </p>
            {user?.role ? (
              <p className="mt-2 text-[11px] text-zinc-600">Signed in as {user.role.replace(/_/g, " ").toLowerCase()}</p>
            ) : null}
          </div>
        </aside>
      </div>

      <footer className="mt-16 border-t border-[#1f1f1f] pt-8 text-center text-xs text-zinc-600">
        AR Buildwel — secure listings with controlled contact policy.
      </footer>
    </div>
  );
}
