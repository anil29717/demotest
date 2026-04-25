"use client";

import type { ReactNode } from "react";

type BadgeTone = "default" | "teal" | "red" | "amber" | "blue" | "gray" | "rose";

const toneClass: Record<BadgeTone, string> = {
  default: "border-[#1f1f1f] bg-[#111111] text-[#888888]",
  teal: "border-[#00C49A40] bg-[#00C49A1A] text-[#00C49A]",
  red: "border-[#FF6B6B40] bg-[#FF6B6B1A] text-[#FF6B6B]",
  amber: "border-[#FFB34740] bg-[#FFB3471A] text-[#FFB347]",
  blue: "border-[#378ADD40] bg-[#378ADD1A] text-[#7FB8FF]",
  gray: "border-[#2f2f2f] bg-[#1a1a1a] text-[#888888]",
  rose: "border-[#E85D8A40] bg-[#E85D8A12] text-[#E85D8A]",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
