"use client";

type PageLoadingProps = {
  blocks?: number;
};

export function PageLoading({ blocks = 3 }: PageLoadingProps) {
  return (
    <div className="space-y-5">
      <div className="h-8 w-56 overflow-hidden rounded-md bg-zinc-900">
        <div className="h-full w-full animate-pulse bg-zinc-800/80" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: blocks }).map((_, idx) => (
          <div key={idx} className="relative h-24 overflow-hidden rounded-xl bg-zinc-900">
            <div className="absolute inset-0 animate-pulse bg-zinc-800/70" />
          </div>
        ))}
      </div>
      <div className="relative h-72 overflow-hidden rounded-xl bg-zinc-900">
        <div className="absolute inset-0 animate-pulse bg-zinc-800/65" />
      </div>
    </div>
  );
}
