"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { DealChatPanel } from "@/components/deal-chat-panel";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

type DealDetail = {
  id: string;
  stage: string;
  valueInr: string | number | null;
  slaBreachCount: number;
  dealHealthScore: number | null;
  stageEnteredAt: string;
  institutionId: string | null;
  coBrokerInviteEmail: string | null;
  commissionSplitPct: number | null;
  requirement: { id: string; userId: string; city: string };
  property: { id: string; title: string; price: string | number } | null;
  institution: { id: string; askingPriceCr: string | number } | null;
};

type Doc = { id: string; type: string; storageKey: string; createdAt: string };
type Act = { id: string; action: string; createdAt: string; userId: string | null };
type Svc = { id: string; type: "legal" | "loan" | "insurance"; status: string; createdAt: string };

type EscrowStatusPayload =
  | { exists: false }
  | {
      exists: true;
      account: {
        id: string;
        dealId: string;
        amountPaise: number;
        currency: string;
        status: string;
        heldAt: string | null;
        releasedAt: string | null;
        refundedAt: string | null;
        frozenAt: string | null;
      };
      transactions: { id: string; type: string; createdAt: string; amountPaise: number }[];
    };

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

function dealValueRupee(d: DealDetail): number {
  if (d.valueInr != null && d.valueInr !== "") return Number(d.valueInr);
  if (d.property?.price != null) return Number(d.property.price);
  if (d.institution?.askingPriceCr != null) {
    return Number(d.institution.askingPriceCr) * 10_000_000;
  }
  return 0;
}

function tokenAmountRupee(d: DealDetail): number {
  const v = dealValueRupee(d);
  return Math.max(10_000, Math.round(v * 0.02));
}

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token, user } = useAuth();
  const router = useRouter();
  const [deal, setDeal] = useState<DealDetail | null | undefined>(undefined);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activity, setActivity] = useState<Act[]>([]);
  const [services, setServices] = useState<Svc[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [coEmail, setCoEmail] = useState("");
  const [coPct, setCoPct] = useState("");
  const [fraud, setFraud] = useState<string | null>(null);
  const [dd, setDd] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<EscrowStatusPayload | undefined>(undefined);
  const [escrowBusy, setEscrowBusy] = useState(false);
  const [tab, setTab] = useState<"overview" | "timeline" | "documents" | "chat">("overview");

  const isBuyer = user?.role === "BUYER" && deal && user.id === deal.requirement.userId;
  const isAdmin = user?.role === "ADMIN";
  const isBroker = user?.role === "BROKER";

  const loadEscrow = useCallback(() => {
    if (!token) return;
    apiFetch<EscrowStatusPayload>(`/escrow/deals/${id}`, { token })
      .then(setEscrow)
      .catch(() => setEscrow({ exists: false }));
  }, [id, token]);

  const load = useCallback(() => {
    if (!token) return;
    apiFetch<DealDetail>(`/deals/${id}`, { token })
      .then((d) => {
        setDeal(d);
        if (d) {
          setCoEmail(d.coBrokerInviteEmail ?? "");
          setCoPct(d.commissionSplitPct != null ? String(d.commissionSplitPct) : "");
        }
      })
      .catch(() => setDeal(null));
    apiFetch<{ logs: Act[]; documents: Doc[]; services: Svc[] }>(`/deals/${id}/timeline`, {
      token,
    })
      .then((x) => {
        setActivity(x.logs ?? []);
        setDocs(x.documents ?? []);
        setServices(x.services ?? []);
      })
      .catch(() => {
        setActivity([]);
        setDocs([]);
        setServices([]);
      });
    loadEscrow();
  }, [id, token, loadEscrow]);

  useEffect(() => {
    load();
  }, [load]);

  const tokenRupee = useMemo(() => (deal ? tokenAmountRupee(deal) : 0), [deal]);

  async function advance() {
    if (!token) return;
    setErr(null);
    try {
      await apiFetch(`/deals/${id}/advance`, { method: "POST", token });
      load();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function saveCoBroker(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    await apiFetch(`/deals/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({
        coBrokerInviteEmail: coEmail || undefined,
        commissionSplitPct: coPct ? Number(coPct) : undefined,
      }),
    });
    load();
  }

  async function runFraud() {
    if (!token || !deal?.property?.id) return;
    const r = await apiFetch<{ risk: string; similarListingsInCity?: number }>(
      "/fraud/duplicate-check",
      {
        method: "POST",
        token,
        body: JSON.stringify({ propertyId: deal.property.id }),
      },
    );
    setFraud(`Risk: ${r.risk}${r.similarListingsInCity != null ? ` · similar in city: ${r.similarListingsInCity}` : ""}`);
  }

  async function loadDd() {
    if (!token) return;
    const r = await apiFetch<{ items?: { label: string; done: boolean }[] }>(`/dd/deal/${id}/checklist`, {
      token,
    });
    setDd(r.items?.map((i) => `${i.done ? "✓" : "○"} ${i.label}`).join("\n") ?? "");
  }

  async function payEscrowToken() {
    if (!token || !deal || !isBuyer) return;
    setEscrowBusy(true);
    try {
      const amount = tokenRupee;
      const checkout = await apiFetch<{
        orderId: string;
        amount: number;
        currency: string;
        razorpayKeyId: string | null;
      }>(`/escrow/deals/${id}/initiate`, {
        method: "POST",
        token,
        body: JSON.stringify({ amount }),
      });
      const key =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || checkout.razorpayKeyId?.trim() || "";
      if (!key) {
        toast.error("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID");
        return;
      }
      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error("Razorpay unavailable");
      const Rp = window.Razorpay;
      const rzp = new Rp({
        key,
        order_id: checkout.orderId,
        currency: checkout.currency,
        name: "AR Buildwel",
        description: "Deal escrow token",
        theme: { color: "#00C49A" },
        handler: async (res) => {
          try {
            await apiFetch(`/escrow/deals/${id}/confirm`, {
              method: "POST",
              token,
              body: JSON.stringify({
                razorpay_order_id: res.razorpay_order_id,
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_signature: res.razorpay_signature,
              }),
            });
            toast.success("Escrow payment confirmed");
            loadEscrow();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Confirmation failed");
          } finally {
            setEscrowBusy(false);
          }
        },
        modal: { ondismiss: () => setEscrowBusy(false) },
      });
      rzp.open();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Escrow initiate failed");
      setEscrowBusy(false);
    }
  }

  async function releaseEscrow() {
    if (!token) return;
    setEscrowBusy(true);
    try {
      await apiFetch(`/escrow/deals/${id}/release`, { method: "POST", token });
      toast.success("Escrow released");
      loadEscrow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Release failed");
    } finally {
      setEscrowBusy(false);
    }
  }

  async function freezeEscrow() {
    if (!token) return;
    setEscrowBusy(true);
    try {
      await apiFetch(`/escrow/deals/${id}/freeze`, { method: "POST", token });
      toast.success("Escrow frozen");
      loadEscrow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Freeze failed");
    } finally {
      setEscrowBusy(false);
    }
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (deal === undefined) return <p className="text-zinc-500">Loading…</p>;
  if (deal === null) return <p className="text-zinc-500">Not found or no access</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/deals" className="text-sm text-zinc-500 hover:text-teal-400">
        ← Deals
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Deal pipeline</h1>
      <div className="mt-3 flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
        {(
          [
            ["overview", "Overview"],
            ["timeline", "Timeline"],
            ["documents", "Documents"],
            ["chat", "Chat"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded px-3 py-1.5 text-sm ${
              tab === k ? "bg-zinc-800 text-teal-300" : "text-zinc-500 hover:bg-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-zinc-400">
        Stage: <strong className="text-zinc-200">{deal.stage}</strong>
      </p>
      <p className="text-sm text-zinc-500">
        SLA breaches: {deal.slaBreachCount} · Health: {deal.dealHealthScore ?? "—"} · Stage since{" "}
        {new Date(deal.stageEnteredAt).toLocaleString()}
      </p>

      {tab === "timeline" ? (
        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <h2 className="text-lg font-medium text-zinc-200">Timeline</h2>
          <ul className="mt-3 max-h-[60vh] space-y-1 overflow-auto font-mono text-xs text-zinc-500">
            {activity.map((a) => (
              <li key={a.id}>
                {new Date(a.createdAt).toISOString()} · {a.action}
              </li>
            ))}
            {!activity.length ? <p className="text-sm text-zinc-600">No activity yet.</p> : null}
          </ul>
        </section>
      ) : null}

      {tab === "documents" ? (
        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <h2 className="text-lg font-medium text-zinc-200">Documents</h2>
          <ul className="mt-3 space-y-1 text-sm text-zinc-400">
            {docs.map((d) => (
              <li key={d.id}>
                {d.type} · <span className="font-mono text-xs">{d.storageKey}</span>
              </li>
            ))}
          </ul>
          {!docs.length ? <p className="text-sm text-zinc-600">No documents yet.</p> : null}
        </section>
      ) : null}

      {tab === "chat" && token && user ? (
        <div className="mt-6">
          <DealChatPanel
            dealId={id}
            token={token}
            currentUserId={user.id}
            dealTitle={deal.property?.title ?? deal.institution?.id ?? `Deal ${id.slice(0, 8)}`}
            propertyId={deal.property?.id ?? null}
          />
        </div>
      ) : null}

      {tab === "overview" ? (
        <>
      {deal.stage === "CLOSURE" && (
        <div className="mt-4 rounded-lg border border-teal-900/50 bg-teal-950/20 px-3 py-2 text-sm text-teal-100">
          A platform fee of 0.3% of deal value will be invoiced. Check{" "}
          <Link href="/billing" className="text-[#00C49A] underline">
            billing
          </Link>{" "}
          for details.
        </div>
      )}

      {deal.institutionId && (
        <p className="mt-3 rounded border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          Institutional deal — buyer must sign NDA before advancing (Module 40).
        </p>
      )}
      {deal.property && (
        <p className="mt-4">
          Property:{" "}
          <Link href={`/properties/${deal.property.id}`} className="text-teal-400">
            {deal.property.title}
          </Link>
        </p>
      )}
      <p className="mt-2 text-sm">Requirement: {deal.requirement.city}</p>
      {err && <p className="mt-4 text-red-400">{err}</p>}

      <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-lg font-medium text-zinc-200">Escrow</h2>
        {escrow === undefined && <p className="mt-2 text-sm text-zinc-500">Loading escrow…</p>}
        {escrow && !escrow.exists && (
          <div className="mt-3 space-y-2 text-sm text-zinc-400">
            <p>No escrow yet. Token = max ₹10,000 or 2% of deal value ({formatINR(tokenRupee)}).</p>
            {isBuyer && (
              <button
                type="button"
                disabled={escrowBusy}
                onClick={() => void payEscrowToken()}
                className="rounded-lg bg-[#00C49A] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40"
              >
                {escrowBusy ? "Please wait…" : "Pay token amount"}
              </button>
            )}
          </div>
        )}
        {escrow?.exists === true && (
          <div className="mt-3 space-y-2 text-sm text-zinc-400">
            <p>
              Status:{" "}
              <span className="font-semibold text-zinc-200">{escrow.account.status}</span>
            </p>
            {escrow.account.status === "HELD" && (
              <>
                <p>
                  Amount held: {formatINR(Math.round(escrow.account.amountPaise / 100))} · Held{" "}
                  {escrow.account.heldAt
                    ? new Date(escrow.account.heldAt).toLocaleString()
                    : "—"}
                </p>
                {(isAdmin || isBroker) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={escrowBusy}
                      onClick={() => void releaseEscrow()}
                      className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
                    >
                      Release to seller
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={escrowBusy}
                        onClick={() => void freezeEscrow()}
                        className="rounded border border-amber-800 px-3 py-1.5 text-amber-200 hover:bg-amber-950/40"
                      >
                        Freeze (dispute)
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {escrow.account.status === "RELEASED" && escrow.account.releasedAt && (
              <p>Released on {new Date(escrow.account.releasedAt).toLocaleString()}</p>
            )}
            {escrow.account.status === "FROZEN" && (
              <p className="text-amber-200">Dispute in progress — escrow is frozen.</p>
            )}
            {escrow.account.status === "REFUNDED" && escrow.account.refundedAt && (
              <p>Refunded on {new Date(escrow.account.refundedAt).toLocaleString()}</p>
            )}
            {escrow.account.status === "INITIATED" && (
              <p className="text-zinc-500">Awaiting buyer payment…</p>
            )}
          </div>
        )}
      </section>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {(["legal", "loan", "insurance"] as const).map((k) => {
          const row = services.find((s) => s.type === k);
          return (
            <span key={k} className="rounded border border-zinc-700 px-2 py-1 text-zinc-400">
              {k}: {row?.status ?? "not started"}
            </span>
          );
        })}
      </div>
      {(isBroker || isAdmin) && (
        <button
          type="button"
          onClick={() => advance()}
          className="mt-6 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-500"
        >
          Advance to next stage
        </button>
      )}

      <section className="mt-10 border-t border-zinc-800 pt-6">
        <h2 className="text-lg font-medium text-zinc-200">Broker network (co-broke)</h2>
        <form onSubmit={saveCoBroker} className="mt-3 space-y-2 text-sm">
          <label className="block">
            Co-broker invite email
            <input
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={coEmail}
              onChange={(e) => setCoEmail(e.target.value)}
            />
          </label>
          <label className="block">
            Commission split (% to co-broker)
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={coPct}
              onChange={(e) => setCoPct(e.target.value)}
            />
          </label>
          <button type="submit" className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-200">
            Save
          </button>
        </form>
      </section>

      <section className="mt-10 border-t border-zinc-800 pt-6">
        <h2 className="text-lg font-medium text-zinc-200">Fraud & due diligence</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runFraud()}
            disabled={!deal.property}
            className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-40"
          >
            Duplicate check
          </button>
          <button type="button" onClick={() => void loadDd()} className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200">
            DD checklist
          </button>
        </div>
        {fraud && <p className="mt-2 text-xs text-zinc-400">{fraud}</p>}
        {dd && (
          <pre className="mt-2 whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
            {dd}
          </pre>
        )}
      </section>

      <p className="mt-8 text-xs text-zinc-600">
        Module 39–40: document versioning and orchestration rules apply before data room unlock.
      </p>
        </>
      ) : null}
    </div>
  );
}
