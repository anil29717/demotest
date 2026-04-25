"use client";

import { Briefcase, Building2, FileText, FolderLock, Landmark, Scale, ShieldCheck, Users } from "lucide-react";
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
import { formatINR, timeAgo } from "@/lib/format";
import { httpStatusFromError } from "@/lib/nri-ui";

type Inst = {
  id: string;
  institutionType: string;
  city: string;
  maskedSummary: string | null;
  askingPriceCr: unknown;
  createdAt?: string;
};
type Deal = { id: string; stage: string; valueInr?: unknown };

export function InstitutionalSellerDashboardView() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<Inst[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [props, setProps] = useState<{ id: string; status?: string; createdAt?: string }[]>([]);
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [inst, dls, mine] = await Promise.all([
          apiFetch<Inst[]>("/institutions", { token }).catch(() => []),
          apiFetch<Deal[]>("/deals", { token }).catch(() => []),
          apiFetch<{ id: string; status?: string; createdAt?: string }[]>("/properties/mine", { token }).catch(() => []),
        ]);
        if (!cancelled) {
          setInstitutions(Array.isArray(inst) ? inst : []);
          setDeals(Array.isArray(dls) ? dls : []);
          setProps(Array.isArray(mine) ? mine : []);
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

  const activeProp = props.find((p) => String(p.status ?? "ACTIVE").toUpperCase() === "ACTIVE");
  const listingStatus = activeProp ? "Active" : props.length ? "Under review" : "Not posted";
  const primaryDeal = deals[0];
  const stages = [
    "Intent",
    "Buyer qualification",
    "NDA",
    "Data room",
    "Site visit",
    "Valuation",
    "Legal DD",
    "Offer",
    "Closure",
  ];
  const stageIdx = primaryDeal
    ? Math.min(8, Math.max(0, stages.findIndex((s) => s.toLowerCase().replace(/\s/g, "") === String(primaryDeal.stage).toLowerCase()) + 1 || 2))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {greeting}, {user?.name?.trim() || "there"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className="border border-[#5BAD8F30] bg-[#5BAD8F10] text-[#5BAD8F]">INST. SELLER</Badge>
            <span className="text-sm text-[#888888]">Confidential institutional listing</span>
          </div>
        </div>
        <p className="text-sm text-[#888888]">
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="NDA requests"
          value={0}
          iconClassName="text-[#5BAD8F]"
          subtext={<span className="text-[#888888]">Review incoming buyers</span>}
        />
        <StatCard
          icon={Users}
          label="Interested buyers"
          value={deals.length}
          iconClassName="text-[#5BAD8F]"
          subtext={<span className="text-[#888888]">Verified institutional interest</span>}
        />
        <StatCard
          icon={Briefcase}
          label="Deal pipeline stage"
          value={primaryDeal?.stage ?? "—"}
          iconClassName="text-[#00C49A]"
          subtext={<span className="text-[#888888]">Stage {stageIdx || 1} of 9</span>}
        />
        <StatCard
          icon={Building2}
          label="My listing"
          value={listingStatus}
          iconClassName="text-[#5BAD8F]"
          subtext={
            activeProp?.createdAt ? (
              <span className="text-[#888888]">Posted {timeAgo(activeProp.createdAt)}</span>
            ) : (
              <span className="text-[#888888]">Visibility &amp; masking</span>
            )
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">
              <FileText className="mr-2 inline h-4 w-4 text-[#5BAD8F]" />
              NDA requests
            </p>
            <p className="mt-1 text-xs text-[#888888]">Buyers requesting access to your institution data.</p>
            <p className="mt-3 text-xs text-[#555555]">Approving access shares full details and the data room.</p>
            <div className="mt-4">
              <EmptyState
                icon={FileText}
                title="No NDA requests in queue"
                subtitle="When buyers request access, they will appear here for your decision."
                actionHref="/institutions"
                actionLabel="Manage listing"
              />
            </div>
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <Briefcase className="h-4 w-4 text-[#00C49A]" />
              Active deal pipeline
            </p>
            <div className="mt-4 flex flex-wrap gap-1">
              {stages.map((s, i) => (
                <span
                  key={s}
                  className={`h-2 w-2 rounded-full ${i === stageIdx - 1 ? "animate-pulse bg-[#5BAD8F]" : i < stageIdx - 1 ? "bg-[#5BAD8F]" : "bg-[#333]"}`}
                  title={s}
                />
              ))}
            </div>
            {!primaryDeal ? (
              <p className="mt-3 text-sm text-[#888888]">No active deal yet. Progress starts when NDAs advance.</p>
            ) : (
              <p className="mt-3 text-sm text-[#cccccc]">
                Current focus: <span className="text-white">{primaryDeal.stage}</span>
              </p>
            )}
          </motion.section>
        </div>

        <div className="space-y-4">
          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <Landmark className="h-4 w-4 text-[#5BAD8F]" />
              My listing
            </p>
            {institutions[0] ? (
              <div className="mt-3 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-3">
                <p className="text-sm font-semibold text-white">{institutions[0].maskedSummary ?? "Confidential listing"}</p>
                <p className="mt-1 text-xs text-[#888888]">
                  {institutions[0].institutionType} · {institutions[0].city}
                </p>
                <p className="mt-2 text-[#00C49A]">{formatINR(Number(institutions[0].askingPriceCr ?? 0) * 10000000)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/institutions/${institutions[0].id}`} className="rounded-lg bg-[#5BAD8F] px-3 py-1.5 text-xs font-semibold text-black">
                    Edit listing
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Landmark}
                title="List your institution"
                subtitle="Get matched with verified institutional buyers under confidentiality."
                actionHref="/properties/new"
                actionLabel="Post institution +"
              />
            )}
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <FolderLock className="h-4 w-4 text-[#5BAD8F]" />
              Data room
            </p>
            <p className="mt-2 text-xs text-[#888888]">Upload financials, enrollment data, and statutory documents.</p>
            <div className="mt-3 space-y-1 text-xs text-[#888888]">
              <p>MOA / AOA</p>
              <p>Financial statements</p>
              <p>Enrollment data</p>
              <p>Regulatory certificates</p>
              <p>Land / building documents</p>
            </div>
            <Link href="/services-hub" className="mt-3 inline-block text-xs text-[#00C49A]">
              Request document help →
            </Link>
          </motion.section>

          <motion.section whileHover={{ y: -2 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="text-sm font-medium text-white">Quick actions</p>
            <div className="mt-3 grid gap-2 text-sm">
              <Link href="/institutions" className="rounded-lg border border-[#1a1a1a] px-3 py-2 hover:border-[#00C49A]">
                Review NDA requests →
              </Link>
              <Link href="/services-hub" className="rounded-lg border border-[#1a1a1a] px-3 py-2 hover:border-[#00C49A]">
                Document support →
              </Link>
              <Link href="/compliance" className="inline-flex items-center gap-2 rounded-lg border border-[#1a1a1a] px-3 py-2 hover:border-[#00C49A]">
                <ShieldCheck className="h-4 w-4" />
                View compliance →
              </Link>
              <Link href="/services-hub" className="inline-flex items-center gap-2 rounded-lg border border-[#1a1a1a] px-3 py-2 hover:border-[#00C49A]">
                <Scale className="h-4 w-4" />
                Legal support →
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
