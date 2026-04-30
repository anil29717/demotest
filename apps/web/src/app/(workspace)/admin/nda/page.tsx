"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, getUserFacingErrorMessage } from "@/lib/api";

type NdaRow = {
  id: string;
  userId: string;
  institutionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  purpose?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  organizationName?: string | null;
  requestedAt?: string | null;
  signedAt?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  user?: { id: string; name: string | null; role: string | null };
  reviewedBy?: { id: string; name: string | null; role: string | null } | null;
  institution?: { id: string; institutionName: string; institutionType: string; city: string };
};

export default function AdminNdaPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<NdaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setErr(null);
    setLoading(true);
    const qs = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
    apiFetch<NdaRow[]>(`/nda/requests${qs}`, { token })
      .then((data) => {
        setRows(data);
      })
      .catch((e) => {
        setErr(getUserFacingErrorMessage(e, "Could not load NDA requests."));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") return;
    const id = window.setInterval(() => {
      load();
    }, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, user?.role, load]);

  async function review(row: NdaRow, action: "approve" | "reject") {
    if (!token) return;
    const key = `${action}-${row.id}`;
    setBusyKey(key);
    setErr(null);
    try {
      const path = action === "approve" ? "/nda/approve" : "/nda/reject";
      await apiFetch(path, {
        method: "POST",
        token,
        body: JSON.stringify({
          userId: row.userId,
          institutionId: row.institutionId,
          reviewNote: reviewNote[row.id] || undefined,
        }),
      });
      await load();
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, `Could not ${action} request.`));
    } finally {
      setBusyKey(null);
    }
  }

  if (!token) {
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );
  }
  if (user?.role !== "ADMIN") return <p className="text-zinc-500">Admin only</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-zinc-100">NDA requests</h1>
      <p className="mt-1 text-sm text-zinc-500">Review institutional confidentiality access requests.</p>
      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs text-zinc-500">
          Status
          <select
            className="ml-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PENDING" | "APPROVED" | "REJECTED")}
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-[#00C49A] hover:text-[#00C49A]"
        >
          Refresh
        </button>
      </div>
      {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
      {loading ? <p className="mt-2 text-sm text-zinc-500">Loading NDA requests…</p> : null}

      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
            <p className="text-zinc-100">
              {r.institution?.institutionName || "Institution"} ({r.institution?.city || "—"})
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Requester: {r.user?.name || r.userId} ({r.user?.role || "—"}) · Status: {r.status}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Purpose: {r.purpose || "—"} · Budget: {r.budgetMin ?? "—"} to {r.budgetMax ?? "—"} Cr · Org:{" "}
              {r.organizationName || "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Requested: {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—"}
              {r.reviewedAt ? ` · Reviewed: ${new Date(r.reviewedAt).toLocaleString()}` : ""}
            </p>
            {r.status === "PENDING" ? (
              <div className="mt-3">
                <textarea
                  rows={2}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
                  placeholder="Review note (optional)"
                  value={reviewNote[r.id] ?? ""}
                  onChange={(e) => setReviewNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void review(r, "approve")}
                    disabled={busyKey === `approve-${r.id}` || busyKey === `reject-${r.id}`}
                    className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-300 disabled:opacity-40"
                  >
                    {busyKey === `approve-${r.id}` ? "Approving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void review(r, "reject")}
                    disabled={busyKey === `approve-${r.id}` || busyKey === `reject-${r.id}`}
                    className="rounded border border-rose-700 px-2 py-1 text-xs text-rose-300 disabled:opacity-40"
                  >
                    {busyKey === `reject-${r.id}` ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Reviewed by {r.reviewedBy?.name || r.reviewedBy?.id || "—"}
                {r.reviewNote ? ` · Note: ${r.reviewNote}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
      {!rows.length ? <p className="mt-4 text-sm text-zinc-600">No NDA requests found.</p> : null}
    </div>
  );
}
