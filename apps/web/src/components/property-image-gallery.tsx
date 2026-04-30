"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { resolvePropertyImageUrlForDisplay } from "@/lib/property-images";

const PLACEHOLDER = "/placeholder-property.png";

type Props = {
  title: string;
  imageUrls: string[] | null | undefined;
  className?: string;
};

export function PropertyImageGallery({ title, imageUrls, className = "" }: Props) {
  const resolved = (imageUrls ?? [])
    .map((u) => resolvePropertyImageUrlForDisplay(u))
    .filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [imageUrls]);

  const main = resolved.length ? resolved[Math.min(index, resolved.length - 1)]! : "";
  const hasMany = resolved.length > 1;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!resolved.length) return;
      setIndex((i) => (i + dir + resolved.length) % resolved.length);
    },
    [resolved.length],
  );

  return (
    <section className={`overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#111111] ${className}`}>
      <div className="relative aspect-video w-full bg-[#0a0a0a]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main || PLACEHOLDER}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = PLACEHOLDER;
          }}
        />
        {hasMany ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {resolved.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Image ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition ${i === index ? "w-6 bg-[#00C49A]" : "w-2 bg-white/40 hover:bg-white/60"}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {resolved.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-[#1f1f1f] p-3 scrollbar-thin">
          {resolved.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === index ? "border-[#00C49A]" : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-16 w-24 object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
            </button>
          ))}
        </div>
      ) : resolved.length === 0 ? (
        <div className="flex items-center gap-2 border-t border-[#1f1f1f] px-4 py-3 text-xs text-[#888888]">
          <ImageIcon className="h-4 w-4 shrink-0" />
          No photos yet — placeholder shown above.
        </div>
      ) : null}
    </section>
  );
}

export function PropertyImageGallerySkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#111111]">
      <div className="aspect-video w-full animate-pulse bg-[#1a1a1a]" />
      <div className="flex gap-2 border-t border-[#1f1f1f] p-3">
        <div className="h-16 w-24 shrink-0 animate-pulse rounded-lg bg-[#1a1a1a]" />
        <div className="h-16 w-24 shrink-0 animate-pulse rounded-lg bg-[#1a1a1a]" />
        <div className="h-16 w-24 shrink-0 animate-pulse rounded-lg bg-[#1a1a1a]" />
      </div>
    </div>
  );
}
