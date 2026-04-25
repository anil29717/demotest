"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  delay = 0,
  iconClassName = "text-[#00C49A]",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  delay?: number;
  /** Tailwind color classes for the icon, e.g. `text-[#E85D8A]` */
  iconClassName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5 shadow-[0_0_0_1px_#1f1f1f,0_4px_24px_rgba(0,0,0,0.4)] transition hover:border-[#00C49A33]"
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconClassName}`} />
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#888888]">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-[#888888]">{subtext}</p> : null}
    </motion.div>
  );
}
