"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Banknote, FileText, Home, Scale, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

type SvcReq = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  partner?: { name: string } | null;
};
type PartnerOpt = { id: string; name: string; type: string; city?: string | null };
type OrgRow = { id: string; name?: string; organizationId?: string; isActive?: boolean };

function BrokerServicesHub({
  token,
  user,
}: {
  token: string;
  user: { role?: string } | null;
}) {
  const [orgId, setOrgId] = useState("");
  const [dealId, setDealId] = useState("");
  const [type, setType] = useState<"legal" | "loan" | "insurance">("legal");
  const [partnerId, setPartnerId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [reqStatus, setReqStatus] = useState("IN_PROGRESS");
  const [svcRows, setSvcRows] = useState<SvcReq[]>([]);
  const [partnerOpts, setPartnerOpts] = useState<PartnerOpt[]>([]);
  const [svcTick, setSvcTick] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<OrgRow[]>("/organizations/mine", { token })
      .then((rows) => {
        if (cancelled) return;
        setOrgs(rows);
        const active = rows.find((r) => r.isActive) ?? rows[0];
        if (active && !orgId) setOrgId(active.organizationId || active.id);
      })
      .catch(() => {
        if (!cancelled) setOrgs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, orgId]);

  useEffect(() => {
    if (!token || !orgId.trim()) {
      setSvcRows([]);
      return;
    }
    let cancelled = false;
    void apiFetch<SvcReq[]>(`/services/requests?organizationId=${encodeURIComponent(orgId)}`, { token })
      .then((rows) => {
        if (!cancelled) setSvcRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setSvcRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, orgId, svcTick]);

  useEffect(() => {
    if (!token) {
      setPartnerOpts([]);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({ vertical: type, limit: "100" });
    void apiFetch<{ data: PartnerOpt[] }>(`/partners?${qs.toString()}`, { token })
      .then((r) => {
        if (cancelled) return;
        setPartnerOpts(Array.isArray(r?.data) ? r.data : []);
      })
      .catch(() => {
        if (!cancelled) setPartnerOpts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, type]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !orgId.trim()) return;
    setMsg(null);
    const row = await apiFetch<SvcReq>("/services/requests", {
      method: "POST",
      token,
      body: JSON.stringify({
        organizationId: orgId,
        type,
        dealId: dealId.trim() || undefined,
      }),
    });
    setMsg(`Created request ${row.id}`);
    setRequestId(row.id);
    setSvcTick((n) => n + 1);
  }

  async function assign() {
    if (!token || !requestId.trim() || !partnerId.trim()) return;
    await apiFetch(`/services/requests/${requestId}/partner`, {
      method: "PUT",
      token,
      body: JSON.stringify({ partnerId }),
    });
    setMsg("Partner assigned");
    setPartnerId("");
    setSvcTick((n) => n + 1);
  }

  async function updatePipelineStatus() {
    if (!token || !requestId.trim()) return;
    await apiFetch(`/services/requests/${requestId}/status`, {
      method: "PUT",
      token,
      body: JSON.stringify({ status: reqStatus }),
    });
    setMsg(`Status → ${reqStatus}`);
    setSvcTick((n) => n + 1);
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 text-sm">
      <div>
        <h1 className="text-xl font-semibold">{user?.role === "SELLER" ? "Services" : "Services hub"}</h1>
        <p className="mt-1 text-zinc-500">
          {user?.role === "SELLER" ? "Legal and financial support for your property sale." : "Legal, loan, and insurance services for your deals"}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
            <Scale className="h-6 w-6 text-violet-300" />
            <p className="mt-2 font-medium">Legal services</p>
            <button
              type="button"
              onClick={() => setType("legal")}
              className="mt-3 rounded border border-violet-500/40 px-2 py-1 text-xs text-violet-300"
            >
              Request legal service
            </button>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
            <Banknote className="h-6 w-6 text-blue-300" />
            <p className="mt-2 font-medium">Loan assistance</p>
            <button
              type="button"
              onClick={() => setType("loan")}
              className="mt-3 rounded border border-blue-500/40 px-2 py-1 text-xs text-blue-300"
            >
              Request loan support
            </button>
          </div>
          {user?.role === "SELLER" ? (
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
              <Banknote className="h-6 w-6 text-amber-300" />
              <p className="mt-2 font-medium">Property valuation</p>
              <button
                type="button"
                onClick={() => setType("legal")}
                className="mt-3 rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300"
              >
                Request valuation
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
              <Shield className="h-6 w-6 text-emerald-300" />
              <p className="mt-2 font-medium">Insurance</p>
              <button
                type="button"
                onClick={() => setType("insurance")}
                className="mt-3 rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300"
              >
                Request insurance
              </button>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            Organization ID
            <select
              required
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <option value="">Select organization</option>
              {orgs.map((org) => {
                const oid = org.organizationId || org.id;
                return (
                  <option key={oid} value={oid}>
                    {(org.name || "Organization")} ({oid})
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block">
            Deal ID (optional)
            <input
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
            />
          </label>
          <label className="block">
            Type
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              <option value="legal">Legal</option>
              <option value="loan">Loan</option>
              <option value="insurance">Insurance</option>
            </select>
          </label>
          <button type="submit" className="rounded bg-teal-600 px-4 py-2 text-white">
            Open request
          </button>
        </form>
        {msg && <p className="mt-2 text-teal-400">{msg}</p>}
      </div>
      <div className="border-t border-zinc-800 pt-6">
        <h2 className="font-medium text-zinc-300">Assign partner &amp; status</h2>
        <p className="text-zinc-500">
          Pick an open request and a partner for the same vertical (legal / loan / insurance). List refreshes when you
          open a new request.
        </p>
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-zinc-500">
            Service request
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
            >
              <option value="">Select request</option>
              {svcRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.type} · {r.status} · {r.id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            Partner (matches type: {type})
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">Select partner</option>
              {partnerOpts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.type}{p.city ? ` · ${p.city}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void assign()}
            className="rounded border border-zinc-600 px-3 py-2 text-zinc-200"
          >
            Assign partner
          </button>
          <label className="mt-4 block text-xs text-zinc-500">
            Pipeline status
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={reqStatus}
              onChange={(e) => setReqStatus(e.target.value)}
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void updatePipelineStatus()}
            className="mt-2 rounded border border-zinc-600 px-3 py-2 text-zinc-200"
          >
            Update status
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyerServicesHub({ token, title, subtitle }: { token: string; title: string; subtitle: string }) {
  const searchParams = useSearchParams();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SvcReq[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const orgs = await apiFetch<{ id: string }[]>("/organizations/mine", { token }).catch(() => []);
    const oid = orgs[0]?.id ?? null;
    setOrgId(oid);
    if (!oid) {
      setRequests([]);
      return;
    }
    const rows = await apiFetch<SvcReq[]>(`/services/requests?organizationId=${encodeURIComponent(oid)}`, {
      token,
    }).catch(() => []);
    setRequests(rows);
  }, [token]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function quickRequest(t: "legal" | "loan" | "insurance") {
    if (!orgId) {
      toast.error("Complete organization setup to submit requests.");
      return;
    }
    try {
      await apiFetch("/services/requests", {
        method: "POST",
        token,
        body: JSON.stringify({ organizationId: orgId, type: t }),
      });
      toast.success("Request submitted");
      await load();
    } catch {
      toast.error("Could not submit request.");
    }
  }

  const typeHint = searchParams.get("type");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
          <Scale className="h-7 w-7 text-[#378ADD]" />
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#888888]">{subtitle}</p>
        {typeHint ? <p className="mt-2 text-xs text-[#00C49A]">Showing options for: {typeHint}</p> : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
          <Scale className="h-8 w-8 text-[#378ADD]" />
          <h2 className="mt-3 text-lg font-semibold text-white">Legal</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888888]">
            <li>Sale agreement review</li>
            <li>Title verification</li>
            <li>Registration support</li>
            <li>Home inspection coordination</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("legal")}
            className="mt-4 w-full rounded-lg border border-[#378ADD40] py-2 text-sm font-medium text-[#378ADD] hover:bg-[#378ADD10]"
          >
            Request legal help
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5"
        >
          <Banknote className="h-8 w-8 text-[#00C49A]" />
          <h2 className="mt-3 text-lg font-semibold text-white">Loans</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888888]">
            <li>Home loan eligibility check</li>
            <li>Bank comparison support</li>
            <li>Pre-approval assistance</li>
            <li>NRI loan guidance (if applicable)</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("loan")}
            className="mt-4 w-full rounded-lg border border-[#00C49A40] py-2 text-sm font-medium text-[#00C49A] hover:bg-[#00C49A10]"
          >
            Request loan support
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 md:col-span-2"
        >
          <Shield className="h-8 w-8 text-amber-300" />
          <h2 className="mt-3 text-lg font-semibold text-white">Insurance</h2>
          <ul className="mt-3 grid gap-2 text-sm text-[#888888] sm:grid-cols-3">
            <li>Property insurance</li>
            <li>Home loan insurance</li>
            <li>Title insurance</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("insurance")}
            className="mt-4 w-full rounded-lg border border-amber-500/40 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/10"
          >
            Request insurance options
          </button>
        </motion.div>
      </div>

      <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
        <h2 className="text-lg font-semibold text-white">My requests</h2>
        {loading ? (
          <LoadingSkeleton rows={2} />
        ) : requests.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={FileText}
              title="No requests yet"
              subtitle="Submit a request above and our team will follow up."
              actionLabel="Alert preferences"
              actionHref="/settings/notifications"
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium uppercase text-[#00C49A]">{r.type}</span>
                  <span className="text-xs text-[#555555]">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-[#888888]">Status: {r.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function InstitutionalSellerServicesHub({ token }: { token: string }) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SvcReq[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const orgs = await apiFetch<{ id: string }[]>("/organizations/mine", { token }).catch(() => []);
    const oid = orgs[0]?.id ?? null;
    setOrgId(oid);
    if (!oid) {
      setRequests([]);
      return;
    }
    const rows = await apiFetch<SvcReq[]>(`/services/requests?organizationId=${encodeURIComponent(oid)}`, {
      token,
    }).catch(() => []);
    setRequests(rows);
  }, [token]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function quickRequest(t: "legal" | "loan" | "insurance") {
    if (!orgId) {
      toast.error("Complete organization setup to submit requests.");
      return;
    }
    try {
      await apiFetch("/services/requests", {
        method: "POST",
        token,
        body: JSON.stringify({ organizationId: orgId, type: t }),
      });
      toast.success("Request submitted");
      await load();
    } catch {
      toast.error("Could not submit request.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
          <Scale className="h-7 w-7 text-[#5BAD8F]" />
          Services
        </h1>
        <p className="mt-1 text-sm text-[#888888]">Support for your institution sale, lease, or joint venture.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
          <Scale className="h-8 w-8 text-[#5BAD8F]" />
          <h2 className="mt-3 text-lg font-semibold text-white">Legal</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888888]">
            <li>Sale agreement drafting</li>
            <li>Due diligence support</li>
            <li>Regulatory compliance (UGC / AICTE / CBSE)</li>
            <li>Land title verification</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("legal")}
            className="mt-4 w-full rounded-lg border border-[#5BAD8F40] py-2 text-sm font-medium text-[#5BAD8F] hover:bg-[#5BAD8F10]"
          >
            Request legal support
          </button>
        </motion.div>
        <motion.div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
          <Banknote className="h-8 w-8 text-[#00C49A]" />
          <h2 className="mt-3 text-lg font-semibold text-white">Financial</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888888]">
            <li>Valuation report</li>
            <li>EBITDA analysis</li>
            <li>Deal structuring advisory</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("loan")}
            className="mt-4 w-full rounded-lg border border-[#00C49A40] py-2 text-sm font-medium text-[#00C49A] hover:bg-[#00C49A10]"
          >
            Request financial advisory
          </button>
        </motion.div>
        <motion.div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
          <Shield className="h-8 w-8 text-amber-300" />
          <h2 className="mt-3 text-lg font-semibold text-white">Tax</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888888]">
            <li>Capital gains on institution sale</li>
            <li>Trust / society tax optimization</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("insurance")}
            className="mt-4 w-full rounded-lg border border-amber-500/40 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/10"
          >
            Request tax advisory
          </button>
        </motion.div>
      </div>
      <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
        <h2 className="text-lg font-semibold text-white">My requests</h2>
        {loading ? (
          <LoadingSkeleton rows={2} />
        ) : requests.length === 0 ? (
          <p className="mt-4 text-sm text-[#888888]">No requests yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-sm">
                <span className="font-medium uppercase text-[#5BAD8F]">{r.type}</span>
                <p className="mt-1 text-xs text-[#888888]">{timeAgo(r.createdAt)} · {r.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NriServicesHub({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SvcReq[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const orgs = await apiFetch<{ id: string }[]>("/organizations/mine", { token }).catch(() => []);
    const oid = orgs[0]?.id ?? null;
    setOrgId(oid);
    if (!oid) {
      setRequests([]);
      return;
    }
    const rows = await apiFetch<SvcReq[]>(`/services/requests?organizationId=${encodeURIComponent(oid)}`, {
      token,
    }).catch(() => []);
    setRequests(rows);
  }, [token]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function quickRequest(t: "legal" | "loan" | "insurance") {
    if (!orgId) {
      toast.error("Set up your organization access to submit requests.");
      return;
    }
    try {
      await apiFetch("/services/requests", {
        method: "POST",
        token,
        body: JSON.stringify({ organizationId: orgId, type: t }),
      });
      toast.success("Request submitted");
      await load();
    } catch {
      toast.error("Could not submit request.");
    }
  }

  const typeHint = searchParams.get("type");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
          <Scale className="h-7 w-7 text-violet-300" />
          NRI services
        </h1>
        <p className="mt-1 text-sm text-[#888]">Legal, financial, and property services for NRIs.</p>
        {typeHint ? (
          <p className="mt-2 text-xs text-[#00C49A]">Showing options for: {typeHint}</p>
        ) : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5"
        >
          <Scale className="h-8 w-8 text-violet-300" />
          <h2 className="mt-3 text-lg font-semibold text-white">Legal services</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888]">
            <li>Power of Attorney (POA) drafting</li>
            <li>Title verification</li>
            <li>Sale deed / Purchase agreement</li>
            <li>Property registration support</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("legal")}
            className="mt-4 w-full rounded-lg border border-violet-500/40 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/10"
          >
            Request legal service
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5"
        >
          <Banknote className="h-8 w-8 text-blue-300" />
          <h2 className="mt-3 text-lg font-semibold text-white">NRI loans & banking</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888]">
            <li>NRI home loan (partner banks)</li>
            <li>Loan against property</li>
            <li>NRE/NRO account guidance</li>
            <li>Repatriation assistance</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("loan")}
            className="mt-4 w-full rounded-lg border border-blue-500/40 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/10"
          >
            Request financial support
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5"
        >
          <FileText className="h-8 w-8 text-amber-300" />
          <h2 className="mt-3 text-lg font-semibold text-white">Tax & FEMA compliance</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888]">
            <li>TDS certificate (Form 15CA/CB)</li>
            <li>Capital gains calculation</li>
            <li>DTAA benefit filing</li>
            <li>Income tax return (India)</li>
            <li>FEMA compliance check</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("insurance")}
            className="mt-4 w-full rounded-lg border border-amber-500/40 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/10"
          >
            Request tax support
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5"
        >
          <Home className="h-8 w-8 text-[#E85D8A]" />
          <h2 className="mt-3 text-lg font-semibold text-white">Property management</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#888]">
            <li>Regular property monitoring</li>
            <li>Tenant finding & management</li>
            <li>Rent collection & transfer</li>
            <li>Maintenance coordination</li>
            <li>Vacant property watch</li>
          </ul>
          <button
            type="button"
            onClick={() => void quickRequest("legal")}
            className="mt-4 w-full rounded-lg border border-[#E85D8A55] py-2 text-sm font-medium text-[#E85D8A] hover:bg-[#E85D8A12]"
          >
            Request property management
          </button>
        </motion.div>
      </div>

      <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
        <h2 className="text-lg font-semibold text-white">My service requests</h2>
        {loading ? (
          <LoadingSkeleton rows={2} />
        ) : requests.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={FileText}
              title="No requests yet"
              subtitle="Choose a service above to open a request with your organization."
              actionLabel="Open NRI workspace"
              actionHref="/verticals/nri"
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium uppercase text-[#00C49A]">{r.type}</span>
                  <span className="text-xs text-[#555]">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-[#888]">Status: {r.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ServicesHubPage() {
  const { token, user } = useAuth();

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (user?.role === "NRI") {
    return (
      <Suspense fallback={<LoadingSkeleton rows={2} />}>
        <NriServicesHub token={token} />
      </Suspense>
    );
  }

  if (user?.role === "BUYER") {
    return (
      <Suspense fallback={<LoadingSkeleton rows={2} />}>
        <BuyerServicesHub
          token={token}
          title="Services"
          subtitle="Support for your property purchase — legal, loans, and insurance."
        />
      </Suspense>
    );
  }

  if (user?.role === "INSTITUTIONAL_BUYER") {
    return (
      <Suspense fallback={<LoadingSkeleton rows={2} />}>
        <BuyerServicesHub
          token={token}
          title="Legal & due diligence"
          subtitle="Specialist support for institutional acquisitions."
        />
      </Suspense>
    );
  }

  if (user?.role === "INSTITUTIONAL_SELLER") {
    return (
      <Suspense fallback={<LoadingSkeleton rows={2} />}>
        <InstitutionalSellerServicesHub token={token} />
      </Suspense>
    );
  }

  return <BrokerServicesHub token={token} user={user} />;
}
