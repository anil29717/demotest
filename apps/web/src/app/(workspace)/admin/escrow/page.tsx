"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

type EscrowRow = {
  id: string;
  dealId: string;
  amountPaise: number;
  status: string;
  pendingPayoutAt: string | null;
  payoutReference: string | null;
  releasedAt: string | null;
  holder: { id: string; name: string };
  beneficiary: { id: string; name: string };
  deal: {
    id: string;
    stage: string;
    requirement: { userId: string; city: string };
  };
};

const FILTERS = [
  { value: "", label: "All statuses" },
  { value: "HELD", label: "Held" },
  { value: "PENDING_PAYOUT", label: "Pending payout" },
  { value: "RELEASED", label: "Released" },
];

export default function AdminEscrowPage() {
  const { token } = useAuth();
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EscrowRow[]>([]);
  const [refs, setRefs] = useState<Record<string, string>>({});

  const query = filter ? `?status=${encodeURIComponent(filter)}` : "";

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await apiFetch<EscrowRow[]>(`/escrow/admin${query}`, { token });
      setRows(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load escrow accounts");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmPayout(dealId: string) {
    if (!token) return;
    const payoutReference = (refs[dealId] ?? "").trim();
    if (!payoutReference) {
      toast.error("Enter payout reference number");
      return;
    }
    try {
      await apiFetch(`/escrow/deals/${dealId}/confirm-payout`, {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutReference }),
      });
      toast.success("Payout confirmed");
      setRefs((r) => ({ ...r, [dealId]: "" }));
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Confirm failed");
    }
  }

  const pending = useMemo(() => rows.filter((r) => r.status === "PENDING_PAYOUT"), [rows]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Escrow</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manual payout (beta): broker requests release → pay seller outside the app → confirm reference here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-500">
            Filter
            <select
              className="ml-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {FILTERS.map((f) => (
                <option key={f.value || "all"} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-amber-200/90">Needs payout confirmation</h2>
          <ul className="space-y-4">
            {pending.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-zinc-300"
              >
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-[11px] uppercase text-zinc-500">Deal</p>
                    <p className="font-medium text-zinc-100">{r.deal?.id.slice(0, 12)}… · {r.deal?.stage}</p>
                    <p className="text-xs text-zinc-500">{r.deal?.requirement.city}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-zinc-500">Buyer (holder)</p>
                    <p>{r.holder.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-zinc-500">Seller</p>
                    <p>{r.beneficiary.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-zinc-500">Amount</p>
                    <p className="font-semibold text-zinc-100">{formatINR(Math.round(r.amountPaise / 100))}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <label className="flex-1 min-w-[200px]">
                    <span className="text-[11px] text-zinc-500">Payout reference number</span>
                    <input
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      placeholder="Bank UTR / Razorpay payout id"
                      value={refs[r.dealId] ?? ""}
                      onChange={(e) => setRefs((s) => ({ ...s, [r.dealId]: e.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void confirmPayout(r.dealId)}
                    className="rounded-lg bg-[#00C49A] px-4 py-2 text-sm font-medium text-black hover:opacity-90"
                  >
                    Confirm payout
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">All escrow accounts</h2>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No escrow records.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Deal</th>
                  <th className="px-3 py-2">Buyer</th>
                  <th className="px-3 py-2">Seller</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.map((r) => (
                  <tr key={r.id} className="text-zinc-300">
                    <td className="px-3 py-2 font-medium">{r.status}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.dealId.slice(0, 10)}…</td>
                    <td className="px-3 py-2">{r.holder.name}</td>
                    <td className="px-3 py-2">{r.beneficiary.name}</td>
                    <td className="px-3 py-2">{formatINR(Math.round(r.amountPaise / 100))}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{r.payoutReference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
