"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

type Plan = { id: string; name: string; priceInrAnnual?: number; entitlements: string[] };

export default function BillingPage() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [out, setOut] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ plans: Plan[] }>("/billing/plans", { token }).then((r) => setPlans(r.plans));
  }, [token]);

  async function checkout() {
    if (!token) return;
    const payload =
      user?.role === "NRI"
        ? { plan: "NRI Services (annual)", sku: "nri_services" as const }
        : { plan: "Broker Pro (annual)", sku: "broker_pro" as const };
    const res = await apiFetch<{ url: string; message: string }>("/billing/checkout-session", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
    setOut(`${res.message}\n${res.url}`);
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>{" "}
        for subscription checkout.
      </p>
    );

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold"><CreditCard className="h-5 w-5 text-[#00C49A]" />Billing</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {user?.role === "SELLER"
          ? "Choose a plan for your selling journey."
          : user?.role === "NRI"
            ? "Concierge, tax packs, and priority routing for NRIs."
            : "Choose a plan that fits your workflow."}
      </p>
      {user?.role === "SELLER" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <p className="text-sm font-semibold text-white">Seller Basic</p>
            <p className="mt-1 text-xl text-[#00C49A]">Free</p>
            <p className="mt-2 text-xs text-[#888]">Up to 3 listings · Basic match notifications · Platform support</p>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <p className="text-sm font-semibold text-white">Seller Pro</p>
            <p className="mt-1 text-xl text-[#00C49A]">{formatINR(9999)}/yr</p>
            <p className="mt-2 text-xs text-[#888]">Unlimited listings · Priority placement · Valuation report · Dedicated RM</p>
          </div>
        </div>
      ) : null}
      {user?.role === "NRI" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E85D8A33] bg-[#111111] p-4">
            <p className="text-sm font-semibold text-white">NRI Services</p>
            <p className="mt-1 text-xl text-[#E85D8A]">{formatINR(14999)}/yr</p>
            <p className="mt-2 text-xs text-[#888]">Tax pack · Concierge routing · Priority manager assignment</p>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
            <p className="text-sm font-semibold text-white">Pay as you go</p>
            <p className="mt-1 text-xl text-[#00C49A]">Free</p>
            <p className="mt-2 text-xs text-[#888]">Open service requests individually without a subscription.</p>
          </div>
        </div>
      ) : null}
      {plans.length > 0 && (
        <ul className="mt-4 space-y-2 text-xs text-zinc-400">
          {plans.map((p) => (
            <li key={p.id} className="rounded border border-zinc-800 px-3 py-2">
              <span className="font-medium text-zinc-200">{p.name}</span>{" "}
              {p.priceInrAnnual != null && <span>— ₹{p.priceInrAnnual}/yr</span>}
              <p className="text-zinc-500">{p.entitlements.join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => void checkout()}
        className="mt-6 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-500"
      >
        {user?.role === "SELLER" ? "Subscribe" : user?.role === "NRI" ? "Subscribe to NRI Services" : "Subscribe to Broker Pro"}
      </button>
      {out && (
        <pre className="mt-6 whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
          {out}
        </pre>
      )}
    </div>
  );
}
