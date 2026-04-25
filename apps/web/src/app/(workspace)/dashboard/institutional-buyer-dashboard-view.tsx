"use client";

import { ClipboardList, FileText, Landmark, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { httpStatusFromError } from "@/lib/nri-ui";

type Inst = {
  id: string;
  institutionType: string;
  city: string;
  maskedSummary: string | null;
  askingPriceCr: unknown;
  locked?: boolean;
};
type Req = { id: string; city: string; tag: string; urgency: string; active?: boolean };
type ComplianceItem = { id: string; severity?: string; title?: string };

export function InstitutionalBuyerDashboardView() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<Inst[]>([]);
  const [requirements, setRequirements] = useState<Req[]>([]);
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [inst, reqs, comp] = await Promise.all([
          apiFetch<Inst[]>("/institutions", { token }).catch(() => []),
          apiFetch<Req[]>("/requirements/mine", { token }).catch(() => []),
          apiFetch<{ items?: ComplianceItem[] } | ComplianceItem[]>("/compliance/feed", { token }).catch(() => []),
        ]);
        const items = Array.isArray(comp) ? comp : comp.items ?? [];
        if (!cancelled) {
          setInstitutions(Array.isArray(inst) ? inst : []);
          setRequirements(Array.isArray(reqs) ? reqs : []);
          setCompliance(items);
        }
      } catch (e) {
        if (!cancelled) {
          const st = httpStatusFromError(e);
          if (st == null || st >= 500) toast.error("Could not load dashboard.", { duration: 3500 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) return null;
  if (loading) return <LoadingSkeleton rows={3} />;

  const ndaApproved = institutions.filter((i) => i.locked === false).length;
  const ndaPending = institutions.length - ndaApproved;
  const pendingHigh = compliance.filter((c) => String(c.severity).toUpperCase() === "HIGH").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {greeting}, {user?.name?.trim() || "there"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className="border border-[#7F77DD30] bg-[#7F77DD10] text-[#7F77DD]">INST. BUYER</Badge>
            <span className="text-sm text-[#888888]">Institutional deal pipeline</span>
          </div>
        </div>
        <p className="text-sm text-[#888888]">
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <StatCard
          icon={Landmark}
          label="Available listings"
          value={institutions.length}
          iconClassName="text-[#7F77DD]"
          subtext={
            <span>
              <span className="text-[#7F77DD]">{ndaApproved} access</span>
              <span className="text-[#888888]"> · {ndaPending} gated</span>
            </span>
          }
        />
        <StatCard
          icon={FileText}
          label="Active NDAs"
          value={ndaApproved}
          iconClassName="text-[#7F77DD]"
          subtext={<span className="text-[#888888]">Signed &amp; active</span>}
        />
        <StatCard
          icon={ClipboardList}
          label="Acquisition targets"
          value={requirements.length}
          iconClassName="text-[#00C49A]"
          subtext={<span className="text-[#888888]">Posted by your team</span>}
        />
        <StatCard
          icon={ShieldCheck}
          label="Compliance"
          value={pendingHigh}
          iconClassName={pendingHigh > 0 ? "text-red-400" : "text-[#00C49A]"}
          subtext={
            pendingHigh === 0 ? (
              <span className="inline-flex items-center gap-1 text-[#00C49A]">All clear</span>
            ) : (
              <span className="text-red-400">{pendingHigh} items need attention</span>
            )
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <Landmark className="h-4 w-4 text-[#7F77DD]" />
                Available institutions
              </p>
              <Link href="/institutions" className="text-xs text-[#00C49A]">
                View all →
              </Link>
            </div>
            {institutions.length ? (
              <ul className="space-y-2">
                {institutions.slice(0, 5).map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2">
                    <div>
                      <p className="text-[13px] font-medium text-white">
                        {i.locked === false ? i.maskedSummary ?? "Listing" : "Confidential listing"}
                      </p>
                      <p className="text-xs text-[#888888]">
                        {i.institutionType} · {i.city}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#7F77DD]">{formatINR(Number(i.askingPriceCr ?? 0) * 10000000)}</p>
                      <Link href={`/institutions/${i.id}`} className="text-xs text-[#00C49A]">
                        Open →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Landmark}
                title="No listings in view"
                subtitle="Browse institutions and start your acquisition workflow."
                actionHref="/institutions"
                actionLabel="Browse institutions"
              />
            )}
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <ClipboardList className="h-4 w-4 text-[#00C49A]" />
                My acquisition targets
              </p>
              <Link href="/requirements/new" className="text-xs text-[#00C49A]">
                Post requirement +
              </Link>
            </div>
            {requirements.length ? (
              <ul className="space-y-2 text-sm">
                {requirements.slice(0, 5).map((r) => (
                  <li key={r.id} className="rounded-lg border border-[#1a1a1a] px-3 py-2 text-[#cccccc]">
                    {r.city} · {r.tag} · <span className="text-[#888888]">{r.urgency}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No acquisition targets"
                subtitle="Post a requirement to match institutional opportunities."
                actionHref="/requirements/new"
                actionLabel="Post requirement +"
              />
            )}
          </motion.section>
        </div>

        <div className="space-y-4">
          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <FileText className="h-4 w-4 text-[#7F77DD]" />
              NDA pipeline
            </p>
            <p className="mt-2 text-xs text-[#888888]">Track confidentiality requests across listings.</p>
            {institutions.length ? (
              <ul className="mt-3 space-y-2 text-xs text-[#888888]">
                {institutions.slice(0, 4).map((i) => (
                  <li key={i.id} className="flex justify-between gap-2 border-b border-[#1a1a1a] pb-2">
                    <span className="truncate text-white">{i.maskedSummary ?? "Confidential"}</span>
                    <span>{i.locked === false ? "Active" : "Review"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#888888]">No NDAs signed yet. Browse institutions to request access.</p>
            )}
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck className="h-4 w-4 text-[#00C49A]" />
              Due diligence checklist
            </p>
            {compliance.length ? (
              <ul className="mt-3 space-y-2">
                {compliance.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm text-[#cccccc]">
                    <span className={String(c.severity).toUpperCase() === "HIGH" ? "text-red-400" : "text-[#00C49A]"}>●</span>
                    {c.title ?? "Item"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#00C49A]">All compliance items clear</p>
            )}
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">Quick actions</p>
            <div className="mt-3 grid gap-2 text-sm">
              <Link href="/institutions" className="rounded-lg border border-[#1a1a1a] px-3 py-2 hover:border-[#00C49A]">
                Browse institutions →
              </Link>
              <Link href="/requirements/new" className="rounded-lg border border-[#1a1a1a] px-3 py-2 hover:border-[#00C49A]">
                Post acquisition requirement →
              </Link>
              <Link href="/compliance" className="rounded-lg border border-[#1a1a1a] px-3 py-2 hover:border-[#00C49A]">
                View compliance →
              </Link>
              <Link href="/services-hub" className="inline-flex items-center gap-2 rounded-lg border border-[#1a1a1a] px-3 py-2 hover:border-[#00C49A]">
                <Scale className="h-4 w-4" />
                Legal due diligence →
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
