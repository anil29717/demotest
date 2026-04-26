"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

type PlanRow = {
  id: string;
  name: string;
  annualAmountPaise: number;
  monthlyAmountPaise: number;
  features: string[];
  eligible: boolean;
  recommended: boolean;
  active: boolean;
};

type PlansResponse = {
  plans: PlanRow[];
  activeSubscription: {
    planName: string;
    status: string;
    currentPeriodEnd: string;
    amountPaise: number;
    interval: string;
  } | null;
  razorpayKeyId: string | null;
};

type InvoiceRow = {
  id: string;
  type: string;
  amountPaise: number;
  status: string;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
};

type CheckoutResponse = {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string | null;
  prefill?: { name?: string; email?: string; contact?: string };
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

export default function BillingPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<"annual" | "monthly">("annual");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const { data: plansData, error: plansError } = useQuery({
    queryKey: ["billing-plans"],
    enabled: !!token,
    queryFn: () => apiFetch<PlansResponse>("/billing/plans", { token: token! }),
  });

  const { data: invoices } = useQuery({
    queryKey: ["billing-invoices"],
    enabled: !!token,
    queryFn: () => apiFetch<InvoiceRow[]>("/billing/invoices", { token: token! }),
  });

  const publishableKey = useMemo(() => {
    const fromEnv = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    if (fromEnv) return fromEnv;
    return plansData?.razorpayKeyId?.trim() ?? "";
  }, [plansData?.razorpayKeyId]);

  const subscribe = useCallback(
    async (planId: string) => {
      if (!token) return;
      setLoadingPlanId(planId);
      try {
        const checkout = await apiFetch<CheckoutResponse>("/billing/checkout", {
          method: "POST",
          token,
          body: JSON.stringify({
            planId,
            interval: interval === "annual" ? "annual" : "monthly",
          }),
        });
        const key = publishableKey || checkout.razorpayKeyId?.trim() || "";
        if (!key) throw new Error("Missing Razorpay key — set NEXT_PUBLIC_RAZORPAY_KEY_ID");
        await loadRazorpayScript();
        if (!window.Razorpay) throw new Error("Razorpay unavailable");
        const Rp = window.Razorpay;
        const rzp = new Rp({
          key,
          order_id: checkout.orderId,
          currency: checkout.currency,
          name: "AR Buildwel",
          description: "Subscription",
          theme: { color: "#00C49A" },
          prefill: checkout.prefill,
          handler: async (res) => {
            try {
              await apiFetch("/billing/verify", {
                method: "POST",
                token,
                body: JSON.stringify({
                  razorpay_order_id: res.razorpay_order_id,
                  razorpay_payment_id: res.razorpay_payment_id,
                  razorpay_signature: res.razorpay_signature,
                }),
              });
              toast.success("Subscription activated");
              await queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
              await queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Verification failed");
            } finally {
              setLoadingPlanId(null);
            }
          },
          modal: {
            ondismiss: () => setLoadingPlanId(null),
          },
        });
        rzp.open();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Checkout failed");
        setLoadingPlanId(null);
      }
    },
    [interval, publishableKey, queryClient, token],
  );

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>{" "}
        for billing and subscriptions.
      </p>
    );

  return (
    <div className="mx-auto max-w-5xl px-2">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold">
        <CreditCard className="h-5 w-5 text-[#00C49A]" />
        Billing
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Plans, Razorpay checkout, and invoice history (Wave 1 Phase 2).
      </p>

      {plansData?.activeSubscription && (
        <div className="mt-4 rounded-xl border border-[#00C49A]/40 bg-[#00C49A]/10 px-4 py-3 text-sm text-zinc-200">
          <p className="font-medium text-[#00C49A]">Current plan</p>
          <p className="mt-1">
            {plansData.activeSubscription.planName.replace(/_/g, " ")} ·{" "}
            {plansData.activeSubscription.status} · renews{" "}
            {new Date(plansData.activeSubscription.currentPeriodEnd).toLocaleDateString("en-IN")}
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 text-sm">
        <span className="text-zinc-500">Billing cycle</span>
        <button
          type="button"
          onClick={() => setInterval("annual")}
          className={`rounded-lg px-3 py-1.5 font-medium ${
            interval === "annual" ? "bg-[#00C49A] text-black" : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Annual
        </button>
        <button
          type="button"
          onClick={() => setInterval("monthly")}
          className={`rounded-lg px-3 py-1.5 font-medium ${
            interval === "monthly" ? "bg-[#00C49A] text-black" : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Monthly
        </button>
      </div>

      {plansError && (
        <p className="mt-4 text-sm text-red-400">
          {plansError instanceof Error ? plansError.message : "Could not load plans"}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(plansData?.plans ?? []).map((p) => {
          const amountPaise =
            interval === "annual" ? p.annualAmountPaise : p.monthlyAmountPaise;
          const amountRupee = Math.round(amountPaise / 100);
          const busy = loadingPlanId === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 ${
                p.active ? "border-[#00C49A] bg-[#00C49A]/5" : "border-[#1f1f1f] bg-[#111111]"
              } ${p.recommended ? "ring-1 ring-[#00C49A]/50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  {p.recommended && (
                    <span className="mt-1 inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-right text-lg text-[#00C49A]">
                  {formatINR(amountRupee)}
                  <span className="block text-xs font-normal text-zinc-500">
                    /{interval === "annual" ? "yr" : "mo"}
                  </span>
                </p>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-zinc-400">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              {!p.eligible && (
                <p className="mt-3 text-xs text-amber-200/80">Not available for your role ({user?.role}).</p>
              )}
              {p.active && <p className="mt-3 text-xs text-[#00C49A]">This is your active plan.</p>}
              <button
                type="button"
                disabled={!p.eligible || p.active || busy}
                onClick={() => void subscribe(p.id)}
                className="mt-4 w-full rounded-lg bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Opening…" : "Subscribe now"}
              </button>
            </div>
          );
        })}
      </div>

      <section className="mt-12 border-t border-zinc-800 pt-8">
        <h2 className="text-lg font-medium text-zinc-200">Invoice history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-b border-zinc-900">
                  <td className="py-2 pr-4 text-zinc-300">
                    {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-2 pr-4">{inv.type}</td>
                  <td className="py-2 pr-4 text-zinc-200">
                    {formatINR(Math.round(inv.amountPaise / 100))}
                  </td>
                  <td className="py-2">{inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoices?.length && <p className="mt-3 text-sm text-zinc-600">No invoices yet.</p>}
        </div>
      </section>
    </div>
  );
}
