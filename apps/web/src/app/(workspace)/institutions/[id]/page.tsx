"use client";

import {
  FolderLock,
  Landmark,
  LockKeyhole,
  MapPin,
  TrendingUp,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/format";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

type Detail = {
  id: string;
  institutionType: string;
  city: string;
  maskedSummary: string | null;
  askingPriceCr: unknown;
  locked?: boolean;
  institutionName?: string;
  studentEnrollment?: number | null;
  latitude?: number;
  longitude?: number;
  verificationStatus?: string;
  dealScore?: number;
  createdAt?: string;
};

const PIPE = [
  "Intent",
  "Buyer qualification",
  "NDA",
  "Data room",
  "Site visit",
  "Valuation",
  "Legal DD",
  "Offer",
  "Closure",
] as const;

export default function InstitutionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token, user } = useAuth();
  const [row, setRow] = useState<Detail | null | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orgName, setOrgName] = useState<string>("");
  const [purpose, setPurpose] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [docs, setDocs] = useState<{ id: string; type: string; createdAt: string }[]>([]);
  const [dealId, setDealId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (token) {
      return apiFetch<Detail>(`/institutions/${id}`, { token })
        .then(setRow)
        .catch(() => setRow(null));
    }
    return apiFetch<Detail>(`/institutions/preview/${id}`)
      .then(setRow)
      .catch(() => setRow(null));
  }, [id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || user?.role !== "INSTITUTIONAL_BUYER") return;
    void apiFetch<{ name?: string }[]>("/organizations/mine", { token })
      .then((o) => setOrgName(o[0]?.name?.trim() || "Your organization"))
      .catch(() => setOrgName("Your organization"));
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || !row || row.locked) return;
    void apiFetch<{ id: string; institution?: { id: string } | null }[]>("/deals", { token })
      .then((deals) => {
        const linked = deals.find((d) => d.institution?.id === id);
        setDealId(linked?.id ?? null);
      })
      .catch(() => setDealId(null));
  }, [token, row, id]);

  useEffect(() => {
    if (!token || !dealId || row?.locked) {
      setDocs([]);
      return;
    }
    void apiFetch<{ id: string; type: string; createdAt: string }[]>(`/documents/deal/${dealId}`, { token })
      .then(setDocs)
      .catch(() => setDocs([]));
  }, [token, dealId, row?.locked]);

  async function signNda() {
    if (!token) {
      setMsg("Log in to continue.");
      return;
    }
    setMsg(null);
    setBusy(true);
    try {
      await apiFetch("/nda/sign", {
        method: "POST",
        token,
        body: JSON.stringify({ institutionId: id }),
      });
      setMsg("NDA request submitted. Our team will review within one to two business days.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (row === undefined) return <LoadingSkeleton rows={2} />;
  if (row === null) {
    return (
      <p className="text-sm text-[#888888]">
        <Link href="/institutions" className="text-[#00C49A]">
          ← Back
        </Link>
        <span className="mt-4 block">This listing could not be opened.</span>
      </p>
    );
  }

  const isInstBuyer = user?.role === "INSTITUTIONAL_BUYER";
  const locked = row.locked === true;
  const showInstBuyerGate = isInstBuyer && locked;

  const priceInr = Number(row.askingPriceCr ?? 0) * 10000000;

  return (
    <div className="mx-auto max-w-3xl text-white">
      <Link href="/institutions" className="text-sm text-[#888888] transition hover:text-[#00C49A]">
        ← Institutions
      </Link>

      <div className="relative mt-4">
        <div className={showInstBuyerGate ? "pointer-events-none blur-sm" : ""}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#1a1a1a] bg-[#111111] px-2 py-0.5 text-xs text-[#888888]">{row.institutionType}</span>
            {!locked ? (
              <span className="rounded-md border border-[#7F77DD40] bg-[#7F77DD12] px-2 py-0.5 text-xs text-[#7F77DD]">Institution</span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold">
            {locked ? row.maskedSummary ?? "Confidential listing" : row.institutionName ?? "Institution"}
          </h1>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-[#888888]">
            <MapPin className="h-4 w-4" />
            {row.city}
            {!locked ? <span className="text-[#555555]"> · Full address available under confidentiality</span> : null}
          </p>
          <p className="mt-4 text-lg font-semibold text-[#00C49A]">{formatINR(priceInr)}</p>

          {!locked ? (
            <>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Students enrolled", value: row.studentEnrollment != null ? String(row.studentEnrollment) : "—" },
                  { label: "Campus", value: "On file" },
                  { label: "Established", value: "—" },
                  { label: "Accreditation", value: row.verificationStatus ?? "—" },
                  { label: "Deal score", value: row.dealScore != null ? String(Math.round(row.dealScore)) : "—" },
                  { label: "Listed", value: row.createdAt ? timeAgo(row.createdAt) : "—" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-[#555555]">{s.label}</p>
                    <p className="mt-1 text-sm font-medium text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              <section className="mt-8 rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-[#00C49A]" />
                  Financial overview
                </p>
                <p className="mt-2 text-sm text-[#888888]">Figures below are shared under your active confidentiality arrangement.</p>
                <ul className="mt-4 space-y-2 text-sm text-[#cccccc]">
                  <li>EBITDA multiple — available in your data room pack</li>
                  <li>Enrollment trend — summarized with annual reports</li>
                  <li>Fee structure — redacted public ranges where applicable</li>
                </ul>
              </section>

              <section className="mt-6">
                <p className="text-sm font-medium text-white">Institutional pipeline</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PIPE.map((label, i) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <span
                        className={`h-3 w-3 rounded-full ${i <= 2 ? "bg-[#7F77DD] shadow-[0_0_0_4px_rgba(127,119,221,0.2)]" : "bg-[#333333]"}`}
                      />
                      <span className="max-w-[72px] text-center text-[9px] text-[#555555]">{label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8 rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                  <FolderLock className="h-4 w-4 text-[#7F77DD]" />
                  Documents
                </p>
                {docs.length ? (
                  <ul className="mt-4 space-y-2">
                    {docs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm">
                        <span className="inline-flex items-center gap-2 text-[#cccccc]">
                          <FileText className="h-4 w-4 text-[#888888]" />
                          {d.type}
                        </span>
                        <span className="text-xs text-[#555555]">{d.createdAt ? timeAgo(d.createdAt) : ""}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[#888888]">No documents uploaded yet by the seller.</p>
                )}
              </section>

              <p className="mt-8 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-3 text-sm text-[#888888]">
                Contact is handled only through the platform — direct contact details are not shown here.
              </p>
            </>
          ) : null}
        </div>

        <AnimatePresence>
          {showInstBuyerGate ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-start rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a]/95 px-6 py-10 text-center"
            >
              <LockKeyhole className="h-12 w-12 text-amber-400" />
              <p className="mt-4 text-base font-semibold text-white">Sign NDA to access full institution details</p>
              <p className="mt-2 max-w-md text-sm text-[#888888]">This listing contains confidential information.</p>

              <div className="mt-8 w-full max-w-md space-y-4 text-left">
                <div>
                  <label className="text-xs text-[#888888]">Your organization</label>
                  <p className="mt-1 rounded-lg border border-[#1a1a1a] bg-[#111111] px-3 py-2 text-sm text-white">{orgName || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-[#888888]">Purpose of acquisition</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#00C49A]"
                  >
                    <option value="">Select purpose</option>
                    <option value="expansion">Expansion</option>
                    <option value="new_market">New market entry</option>
                    <option value="investment">Investment</option>
                    <option value="takeover">Management takeover</option>
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-[#888888]">Budget from (₹ Cr)</label>
                    <input
                      type="number"
                      className="mt-1 h-11 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#00C49A]"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888888]">Budget to (₹ Cr)</label>
                    <input
                      type="number"
                      className="mt-1 h-11 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#00C49A]"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signNda()}
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-amber-500 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {busy ? "Submitting…" : "Request NDA access"}
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {!isInstBuyer && locked ? (
        <div className="mt-8 rounded-lg border border-amber-900/50 bg-amber-950/20 p-6 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-amber-300" />
          <p className="mt-3 text-base font-medium text-white">Confidential listing</p>
          <p className="mt-1 text-sm text-[#888888]">Request access to view the full profile.</p>
          <button
            type="button"
            onClick={() => void signNda()}
            disabled={busy}
            className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Request NDA access"}
          </button>
        </div>
      ) : null}

      {!isInstBuyer && !locked ? (
        <div className="mt-6 rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
            <Landmark className="h-4 w-4 text-[#00C49A]" />
            Data room
          </p>
          <p className="mt-2 text-sm text-[#888888]">Documents and institution details are available for verified users.</p>
        </div>
      ) : null}

      {msg ? <p className="mt-6 text-sm text-[#888888]">{msg}</p> : null}
    </div>
  );
}
