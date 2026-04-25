"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] px-6 py-10 text-center shadow-[0_0_0_1px_#1f1f1f,0_4px_24px_rgba(0,0,0,0.4)]">
      <Icon className="mx-auto h-12 w-12 text-[#555555]" />
      <p className="mt-4 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-[#888888]">{subtitle}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex rounded-lg border border-[#00C49A40] bg-[#00C49A14] px-4 py-2 text-sm font-medium text-[#00C49A] hover:bg-[#00C49A1F]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
