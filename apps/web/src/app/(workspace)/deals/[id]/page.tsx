"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Handshake,
  HeartPulse,
  Home,
  Landmark,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DealChatPanel } from "@/components/deal-chat-panel";
import { apiFetch, apiUrl, getUserFacingErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";

type DealSla = {
  limitHours: number | null;
  hoursInStage: number;
  overHours: number | null;
  status: "none" | "on_track" | "at_risk" | "breached";
};

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
  stageTasks?: Partial<Record<string, StageTask[]>>;
  sla?: DealSla;
};
type StageTask = {
  key: string;
  label: string;
  required: boolean;
  done: boolean;
  notes: string;
};

type Doc = { id: string; type: string; storageKey: string; createdAt: string };
type DealDoc = Doc & { uploadedById?: string; uploadedBy?: { id: string; name: string | null } };
type StageAdvanceMeta = {
  from?: string;
  to?: string;
  remark?: string;
  version?: number;
  note?: string;
};
type Act = {
  id: string;
  action: string;
  createdAt: string;
  userId: string | null;
  metadata?: StageAdvanceMeta & {
    taskLabel?: string;
    key?: string;
    source?: string;
    done?: boolean;
  };
  user?: { id: string; name: string | null; role?: string | null } | null;
};
type ServiceHistoryEntry = {
  at: string;
  userId: string;
  userName?: string | null;
  action: string;
  detail?: string;
  from?: string;
  to?: string;
  partnerId?: string;
  partnerName?: string;
};

type Svc = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  partnerId?: string | null;
  requestHistory?: ServiceHistoryEntry[] | null;
  partner?: { id: string; name: string; type: string; city?: string | null } | null;
  createdBy?: { id: string; name: string | null; email?: string | null } | null;
};

const SERVICE_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type DealOffer = {
  id: string;
  amountInr: string | number;
  notes: string | null;
  createdAt: string;
  offeredBy: { id: string; name: string | null; role?: string | null };
};
type PartnerRow = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  city: string | null;
};
type PartnerListResponse = { data: PartnerRow[]; total: number; hasMore: boolean };

type ComplianceAlertRow = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: { id: string; name: string | null } | null;
};

type DdEvidence = {
  id: string;
  kind: string;
  title: string | null;
  url: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null };
  document?: { id: string; storageKey: string; type: string } | null;
};

type DdItem = {
  id: string;
  key: string;
  label: string;
  required: boolean;
  status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  notes: string | null;
  dueAt: string | null;
  assigneeUserId: string | null;
  assignee: { id: string; name: string | null; role: string | null } | null;
  evidence: DdEvidence[];
};

type DdCaseView = {
  case: {
    id: string;
    status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
    requiredDone: number;
    requiredTotal: number;
  };
  items: DdItem[];
  members: { id: string; name: string | null; role: string | null }[];
};

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
        pendingPayoutAt: string | null;
        payoutReference: string | null;
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

const ORDERED_STAGES = [
  "LEAD",
  "REQUIREMENT",
  "MATCH",
  "SITE_VISIT",
  "NEGOTIATION",
  "LEGAL",
  "LOAN",
  "INSURANCE",
  "PAYMENT",
  "CLOSURE",
] as const;

function formatHoursInStage(h: number): string {
  if (h < 72) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function stageLabel(s: string): string {
  return s.replaceAll("_", " ");
}

function stageIcon(stage: string) {
  const map = {
    LEAD: <Sparkles className="h-3.5 w-3.5" />,
    REQUIREMENT: <FileCheck2 className="h-3.5 w-3.5" />,
    MATCH: <Handshake className="h-3.5 w-3.5" />,
    SITE_VISIT: <Home className="h-3.5 w-3.5" />,
    NEGOTIATION: <Handshake className="h-3.5 w-3.5" />,
    LEGAL: <ShieldCheck className="h-3.5 w-3.5" />,
    LOAN: <Landmark className="h-3.5 w-3.5" />,
    INSURANCE: <ShieldCheck className="h-3.5 w-3.5" />,
    PAYMENT: <Landmark className="h-3.5 w-3.5" />,
    CLOSURE: <CheckCircle2 className="h-3.5 w-3.5" />,
  };
  return map[stage as keyof typeof map] ?? <Sparkles className="h-3.5 w-3.5" />;
}

function slaHeadline(sla: DealSla | undefined): string | null {
  if (!sla || sla.status === "none") return null;
  const spent = formatHoursInStage(sla.hoursInStage);
  if (sla.limitHours == null) return `${spent} in current stage`;
  const lim =
    sla.limitHours < 72
      ? `${sla.limitHours}h SLA`
      : `${(sla.limitHours / 24).toFixed(1)}d SLA`;
  if (sla.status === "breached") return `Over SLA · ${spent} (${lim})`;
  if (sla.status === "at_risk") return `At risk · ${spent} / ${lim}`;
  return `On track · ${spent} / ${lim}`;
}

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token, user } = useAuth();
  const router = useRouter();
  const [deal, setDeal] = useState<DealDetail | null | undefined>(undefined);
  const [docs, setDocs] = useState<DealDoc[]>([]);
  const [activity, setActivity] = useState<Act[]>([]);
  const [services, setServices] = useState<Svc[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [coEmail, setCoEmail] = useState("");
  const [coPct, setCoPct] = useState("");
  const [fraud, setFraud] = useState<string | null>(null);
  const [dd, setDd] = useState<DdCaseView | null>(null);
  const [ddBusyItemId, setDdBusyItemId] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<EscrowStatusPayload | undefined>(undefined);
  const [escrowBusy, setEscrowBusy] = useState(false);
  const [tab, setTab] = useState<"overview" | "timeline" | "documents" | "chat">("overview");
  const [advanceRemark, setAdvanceRemark] = useState("");
  const [stageTasks, setStageTasks] = useState<Partial<Record<string, StageTask[]>>>({});
  const [taskSavingKey, setTaskSavingKey] = useState<string | null>(null);
  const [offers, setOffers] = useState<DealOffer[]>([]);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [offerSaving, setOfferSaving] = useState(false);
  const [docCategory, setDocCategory] = useState<"AGREEMENT" | "ID_PROOF" | "PROPERTY_DOCS">("AGREEMENT");
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadProgress, setDocUploadProgress] = useState(0);
  const [selectedDocFiles, setSelectedDocFiles] = useState<File[]>([]);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [dealNote, setDealNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [partnerType, setPartnerType] = useState<"legal" | "loan" | "insurance">("legal");
  const [partnerAssignBusy, setPartnerAssignBusy] = useState(false);
  const [serviceBusyId, setServiceBusyId] = useState<string | null>(null);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlertRow[] | undefined>(undefined);
  const [complianceResolveId, setComplianceResolveId] = useState<string | null>(null);

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
        setStageTasks(d?.stageTasks ?? {});
        if (d) {
          setCoEmail(d.coBrokerInviteEmail ?? "");
          setCoPct(d.commissionSplitPct != null ? String(d.commissionSplitPct) : "");
        }
      })
      .catch(() => setDeal(null));
    apiFetch<{
      logs: Act[];
      documents: DealDoc[];
      services: Svc[];
      offers?: DealOffer[];
    }>(`/deals/${id}/timeline`, {
      token,
    })
      .then((x) => {
        setActivity(x.logs ?? []);
        setDocs(x.documents ?? []);
        setServices(x.services ?? []);
        setOffers(x.offers ?? []);
      })
      .catch(() => {
        setActivity([]);
        setDocs([]);
        setServices([]);
        setOffers([]);
      });
    void apiFetch<ComplianceAlertRow[]>(`/compliance/deals/${id}/alerts`, { token })
      .then((rows) => setComplianceAlerts(Array.isArray(rows) ? rows : []))
      .catch(() => setComplianceAlerts([]));
    loadEscrow();
  }, [id, token, loadEscrow]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token || !(isBroker || isAdmin)) {
      setPartners([]);
      return;
    }
    let cancelled = false;
    void apiFetch<PartnerListResponse>("/partners?limit=200", { token })
      .then((res) => {
        if (cancelled) return;
        setPartners(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setPartners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, isBroker, isAdmin]);

  const tokenRupee = useMemo(() => (deal ? tokenAmountRupee(deal) : 0), [deal]);

  async function advance() {
    if (!token) return;
    if (!advanceRemark.trim()) {
      setErr("Please add a remark before advancing stage.");
      return;
    }
    setErr(null);
    try {
      await apiFetch(`/deals/${id}/advance`, {
        method: "POST",
        token,
        body: JSON.stringify({ remark: advanceRemark.trim() }),
      });
      setAdvanceRemark("");
      load();
      router.refresh();
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not advance stage. Complete required tasks and try again."));
    }
  }

  async function moveBack() {
    if (!token) return;
    if (!advanceRemark.trim()) {
      setErr("Please add a remark before moving back.");
      return;
    }
    setErr(null);
    try {
      await apiFetch(`/deals/${id}/move-back`, {
        method: "POST",
        token,
        body: JSON.stringify({ remark: advanceRemark.trim() }),
      });
      setAdvanceRemark("");
      load();
      router.refresh();
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not move stage back. Please try again."));
    }
  }

  async function saveStageTask(task: StageTask, patch: Partial<Pick<StageTask, "done" | "notes">>) {
    if (!token || !deal) return;
    const compoundKey = `${deal.stage}:${task.key}`;
    setTaskSavingKey(compoundKey);
    setErr(null);
    try {
      const response = await apiFetch<{
        stageTasks?: Partial<Record<string, StageTask[]>>;
        stage?: string;
        autoAdvanced?: boolean;
      }>(`/deals/${id}/stage-tasks`, {
        method: "POST",
        token,
        body: JSON.stringify({
          stage: deal.stage,
          key: task.key,
          done: patch.done,
          notes: patch.notes,
        }),
      });
      if (response.stageTasks) setStageTasks(response.stageTasks);
      if (response.stage) {
        setDeal((prev) => (prev ? { ...prev, stage: response.stage! } : prev));
      }
      if (response.autoAdvanced) {
        toast.success("Pipeline advanced — required tasks complete.");
        load();
      }
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not save task update. Please try again."));
    } finally {
      setTaskSavingKey(null);
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

  async function assignPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedPartnerId) return;
    setPartnerAssignBusy(true);
    setErr(null);
    try {
      await apiFetch("/partners/assign-to-deal", {
        method: "POST",
        token,
        body: JSON.stringify({
          dealId: id,
          partnerId: selectedPartnerId,
          type: partnerType,
        }),
      });
      toast.success("Partner assigned to deal");
      setSelectedPartnerId("");
      load();
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not assign partner. Please try again."));
    } finally {
      setPartnerAssignBusy(false);
    }
  }

  async function patchServiceStatus(
    svcId: string,
    status: (typeof SERVICE_STATUSES)[number],
  ) {
    if (!token) return;
    setServiceBusyId(svcId);
    setErr(null);
    try {
      await apiFetch(`/services/requests/${svcId}/status`, {
        method: "PUT",
        token,
        body: JSON.stringify({ status }),
      });
      load();
      toast.success("Service status updated");
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not update service status."));
    } finally {
      setServiceBusyId(null);
    }
  }

  async function reassignServicePartner(svcId: string, newPartnerId: string) {
    if (!token || !newPartnerId) return;
    setServiceBusyId(svcId);
    setErr(null);
    try {
      await apiFetch(`/services/requests/${svcId}/partner`, {
        method: "PUT",
        token,
        body: JSON.stringify({ partnerId: newPartnerId }),
      });
      load();
      toast.success("Partner updated for this request");
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not assign partner."));
    } finally {
      setServiceBusyId(null);
    }
  }

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !offerAmount.trim()) return;
    setOfferSaving(true);
    setErr(null);
    try {
      await apiFetch(`/deals/${id}/offers`, {
        method: "POST",
        token,
        body: JSON.stringify({
          amountInr: Number(offerAmount),
          notes: offerNotes.trim() || undefined,
        }),
      });
      setOfferAmount("");
      setOfferNotes("");
      load();
      toast.success("Offer saved");
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not save offer. Please try again."));
    } finally {
      setOfferSaving(false);
    }
  }

  async function uploadDealDocuments(files: File[]) {
    if (!token || !files.length) return;
    setDocUploading(true);
    setDocUploadProgress(0);
    try {
      let success = 0;
      for (const [idx, file] of files.entries()) {
        const form = new FormData();
        form.append("file", file);
        form.append("type", docCategory);
        const headers = new Headers();
        headers.set("Authorization", `Bearer ${token}`);
        const res = await fetch(apiUrl(`/documents/deal/${id}/files`), {
          method: "POST",
          headers,
          body: form,
        });
        if (!res.ok) continue;
        success += 1;
        setDocUploadProgress(Math.round(((idx + 1) / files.length) * 100));
      }
      if (success) {
        toast.success(`Uploaded ${success} document(s).`);
        setSelectedDocFiles([]);
        load();
      } else {
        toast.error("No documents uploaded. Please try again.");
      }
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Document upload failed. Please upload PDF/images and try again."));
    } finally {
      setDocUploading(false);
      setTimeout(() => setDocUploadProgress(0), 500);
    }
  }

  async function deleteDocument(docId: string) {
    if (!token) return;
    setDeletingDocId(docId);
    setErr(null);
    try {
      await apiFetch(`/documents/${docId}`, { method: "DELETE", token });
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Document deleted");
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not delete document. Please try again."));
    } finally {
      setDeletingDocId(null);
    }
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
    const r = await apiFetch<DdCaseView>(`/dd/deal/${id}`, { token });
    setDd(r);
  }

  async function updateDdStatus(itemId: string, status: DdItem["status"]) {
    if (!token) return;
    setDdBusyItemId(itemId);
    try {
      await apiFetch(`/dd/items/${itemId}/status`, {
        method: "POST",
        token,
        body: JSON.stringify({ status }),
      });
      await loadDd();
      toast.success("DD item updated");
    } catch {
      toast.error("Could not update DD item");
    } finally {
      setDdBusyItemId(null);
    }
  }

  async function assignDdItem(itemId: string, assigneeUserId: string) {
    if (!token) return;
    setDdBusyItemId(itemId);
    try {
      await apiFetch(`/dd/items/${itemId}/assign`, {
        method: "POST",
        token,
        body: JSON.stringify({ assigneeUserId: assigneeUserId || null }),
      });
      await loadDd();
      toast.success("DD assignee updated");
    } catch {
      toast.error("Could not assign DD item");
    } finally {
      setDdBusyItemId(null);
    }
  }

  async function addDdEvidence(itemId: string) {
    if (!token) return;
    const url = window.prompt("Paste evidence URL (or leave blank to cancel)");
    if (!url || !url.trim()) return;
    setDdBusyItemId(itemId);
    try {
      await apiFetch(`/dd/items/${itemId}/evidence`, {
        method: "POST",
        token,
        body: JSON.stringify({
          kind: "link",
          title: "External evidence",
          url: url.trim(),
        }),
      });
      await loadDd();
      toast.success("Evidence attached");
    } catch {
      toast.error("Could not attach evidence");
    } finally {
      setDdBusyItemId(null);
    }
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
      toast.success("Payout requested — admin confirms after manual transfer");
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

  const stageHistory = activity
    .filter((a) => a.action === "DEAL_STAGE_ADVANCED" || a.action === "DEAL_STAGE_MOVED_BACK")
    .map((a) => ({
      ...a,
      from: a.metadata?.from ?? "—",
      to: a.metadata?.to ?? "—",
      remark: a.metadata?.remark ?? "No remark",
      version: a.metadata?.version ?? 0,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const currentStageTasks = stageTasks[deal.stage] ?? [];
  const completedCount = currentStageTasks.filter((t) => t.done).length;
  const latestOfferId = offers.length ? offers[offers.length - 1]!.id : null;
  const timelineEvents = [
    ...activity
      .filter((a) =>
        [
          "DEAL_STAGE_ADVANCED",
          "DEAL_STAGE_MOVED_BACK",
          "DEAL_NOTE_ADDED",
          "DEAL_OFFER_CREATED",
          "DEAL_STAGE_TASK_UPDATED",
          "DEAL_CREATED",
        ].includes(a.action),
      )
      .map((a) => ({
        id: `log-${a.id}`,
        createdAt: a.createdAt,
        text:
          a.action === "DEAL_STAGE_ADVANCED"
            ? `${a.user?.name || "User"} advanced pipeline → ${String(a.metadata?.to ?? "").replaceAll("_", " ")}${a.metadata?.remark ? ` (${a.metadata.remark})` : ""}`
            : a.action === "DEAL_STAGE_MOVED_BACK"
              ? `${a.user?.name || "User"} moved back → ${String(a.metadata?.to ?? "").replaceAll("_", " ")}`
              : a.action === "DEAL_NOTE_ADDED"
                ? `${a.user?.name || "User"} added note${a.metadata?.note ? `: ${a.metadata.note}` : ""}`
                : a.action === "DEAL_STAGE_TASK_UPDATED"
                  ? `${a.user?.name || "User"} ${a.metadata?.done === false ? "reopened" : "completed"} task “${a.metadata?.taskLabel ?? a.metadata?.key ?? "task"}”`
                  : a.action === "DEAL_CREATED"
                    ? `Deal opened${a.metadata?.source === "accepted_match" ? " from accepted match" : ""}`
                    : a.action === "DEAL_OFFER_CREATED"
                      ? `${a.user?.name || "User"} made an offer`
                      : `${a.user?.name || "User"} — ${a.action}`,
      })),
    ...docs.map((d) => ({
      id: `doc-${d.id}`,
      createdAt: d.createdAt,
      text: `${d.uploadedBy?.name || d.uploadedById || "User"} uploaded ${d.type.replaceAll("_", " ")}`,
    })),
    ...offers.map((o) => ({
      id: `offer-${o.id}`,
      createdAt: o.createdAt,
      text: `${o.offeredBy?.name || o.offeredBy?.role || "User"} made offer ${formatINR(Number(o.amountInr))}`,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  async function submitDealNote(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !dealNote.trim()) return;
    setNoteSaving(true);
    setErr(null);
    try {
      await apiFetch(`/deals/${id}/notes`, {
        method: "POST",
        token,
        body: JSON.stringify({ note: dealNote.trim() }),
      });
      setDealNote("");
      load();
      toast.success("Note added");
    } catch (e) {
      setErr(getUserFacingErrorMessage(e, "Could not add note. Please try again."));
    } finally {
      setNoteSaving(false);
    }
  }

  async function resolveComplianceAlert(alertId: string) {
    if (!token) return;
    setComplianceResolveId(alertId);
    try {
      await apiFetch(`/compliance/alerts/${alertId}/resolve`, { method: "POST", token });
      toast.success("Marked complete");
      const rows = await apiFetch<ComplianceAlertRow[]>(`/compliance/deals/${id}/alerts`, { token });
      setComplianceAlerts(Array.isArray(rows) ? rows : []);
    } catch {
      toast.error("Could not resolve");
    } finally {
      setComplianceResolveId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6">
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
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-[76rem] items-stretch gap-2">
          {ORDERED_STAGES.map((st, i) => {
            const rawIdx = ORDERED_STAGES.findIndex((s) => s === deal.stage);
            const activeIdx = rawIdx >= 0 ? rawIdx : 0;
            const past = i < activeIdx;
            const current = i === activeIdx;
            const sla = deal.sla;
            return (
              <div key={st} className="flex min-w-[7rem] flex-1 items-center gap-2">
                <div
                  className={`group flex min-w-0 flex-1 flex-col rounded-xl border px-2 py-2.5 text-center text-[11px] leading-tight transition-all sm:text-xs ${
                    current
                      ? sla?.status === "breached"
                        ? "border-red-500/70 bg-red-950/35 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]"
                        : sla?.status === "at_risk"
                          ? "border-amber-500/60 bg-amber-950/30 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]"
                          : "border-[#00C49A] bg-[#00C49A]/12 shadow-[0_0_0_1px_rgba(0,196,154,0.4)]"
                      : past
                        ? "border-zinc-600/80 bg-zinc-900/70 text-zinc-300"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-500"
                  }`}
                >
                  <span
                    className={`mx-auto mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                      current
                        ? "border-current bg-black/20"
                        : past
                          ? "border-zinc-500/70 bg-zinc-800/40"
                          : "border-zinc-700/80 bg-zinc-900/40"
                    }`}
                  >
                    {stageIcon(st)}
                  </span>
                  <span
                    className={`font-semibold leading-snug whitespace-normal break-words ${
                      current ? "text-zinc-100" : ""
                    }`}
                  >
                    {stageLabel(st)}
                  </span>
                  {current && slaHeadline(sla) ? (
                    <span className="mt-1 block text-[10px] font-normal normal-case text-zinc-300/90">
                      {slaHeadline(sla)}
                    </span>
                  ) : null}
                </div>
                {i < ORDERED_STAGES.length - 1 ? (
                  <span className={`shrink-0 text-sm ${past ? "text-[#00C49A]/60" : "text-zinc-700"}`}>→</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          SLA breaches: <strong className="text-zinc-200">{deal.slaBreachCount}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <HeartPulse className="h-4 w-4 text-emerald-300" />
          Health: <strong className="text-zinc-200">{deal.dealHealthScore ?? "—"}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4 text-sky-300" />
          In stage since {new Date(deal.stageEnteredAt).toLocaleString()}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Completing all required tasks on <strong className="text-zinc-400">Lead</strong> or{" "}
        <strong className="text-zinc-400">Match</strong> advances the deal automatically when rules allow (e.g. NDA for
        institutional listings).
      </p>
      <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Stage tasks</h2>
        <p className="mt-1 text-xs text-zinc-400">
          {completedCount}/{currentStageTasks.length} tasks completed
        </p>
        {currentStageTasks.length ? (
          <ul className="mt-3 space-y-2">
            {currentStageTasks.map((task) => {
              const busy = taskSavingKey === `${deal.stage}:${task.key}`;
              return (
                <li
                  key={task.key}
                  className="grid gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 sm:grid-cols-[minmax(220px,1fr)_2fr]"
                >
                  <label className="flex items-start gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={task.done}
                      disabled={busy || !(isBroker || isAdmin)}
                      onChange={(e) => void saveStageTask(task, { done: e.target.checked })}
                    />
                    <span className="leading-snug">
                      {task.label}{" "}
                      {task.required ? <span className="text-[10px] text-amber-300">(required)</span> : null}
                    </span>
                  </label>
                  <textarea
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200"
                    rows={3}
                    value={task.notes ?? ""}
                    readOnly={!(isBroker || isAdmin)}
                    placeholder="Optional notes"
                    onChange={(e) =>
                      setStageTasks((prev) => ({
                        ...prev,
                        [deal.stage]: (prev[deal.stage] ?? []).map((t) =>
                          t.key === task.key ? { ...t, notes: e.target.value } : t,
                        ),
                      }))
                    }
                    onBlur={(e) => void saveStageTask(task, { notes: e.target.value })}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">No predefined tasks for this stage.</p>
        )}
      </section>

      {tab === "timeline" ? (
        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <h2 className="text-lg font-medium text-zinc-200">Timeline</h2>
          <form onSubmit={submitDealNote} className="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <label className="text-sm text-zinc-300">
              Add note
              <textarea
                rows={2}
                value={dealNote}
                onChange={(e) => setDealNote(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                placeholder="Add timeline note"
              />
            </label>
            <button
              type="submit"
              disabled={noteSaving}
              className="mt-2 rounded bg-teal-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              {noteSaving ? "Saving..." : "Add note"}
            </button>
          </form>
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-sm font-medium text-zinc-300">Activity timeline</p>
            {timelineEvents.length ? (
              <ul className="relative mt-3 space-y-0 border-l border-zinc-700 pl-4">
                {timelineEvents.map((ev) => (
                  <li key={ev.id} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[#00C49A]" aria-hidden />
                    <p className="text-[11px] text-zinc-500">
                      {new Date(ev.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-200">{ev.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-600">No activity yet.</p>
            )}
          </div>
          <details className="mt-4 rounded border border-zinc-800 bg-zinc-950/50 p-2 text-xs text-zinc-500">
            <summary className="cursor-pointer text-zinc-400">Raw activity log</summary>
            <ul className="mt-2 max-h-[40vh] space-y-1 overflow-auto font-mono text-[11px]">
              {activity.map((a) => (
                <li key={a.id}>
                  {new Date(a.createdAt).toISOString()} · {a.action}
                </li>
              ))}
              {!activity.length ? <li className="text-zinc-600">No rows.</li> : null}
            </ul>
          </details>
        </section>
      ) : null}

      {tab === "documents" ? (
        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <h2 className="text-lg font-medium text-zinc-200">Documents</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-[200px_1fr]">
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as "AGREEMENT" | "ID_PROOF" | "PROPERTY_DOCS")}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="AGREEMENT">Agreement</option>
              <option value="ID_PROOF">ID Proof</option>
              <option value="PROPERTY_DOCS">Property docs</option>
            </select>
            <input
              type="file"
              multiple
              accept=".pdf,image/*"
              disabled={docUploading || !(isBroker || isAdmin)}
              onChange={(e) => setSelectedDocFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-zinc-200"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={docUploading || !selectedDocFiles.length || !(isBroker || isAdmin)}
              onClick={() => void uploadDealDocuments(selectedDocFiles)}
              className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {docUploading ? "Uploading..." : "Upload documents"}
            </button>
            {selectedDocFiles.length ? (
              <span className="text-xs text-zinc-500">{selectedDocFiles.length} file(s) selected</span>
            ) : null}
          </div>
          {docUploading || docUploadProgress > 0 ? (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded bg-zinc-800">
                <div
                  className="h-full bg-teal-500 transition-all"
                  style={{ width: `${docUploadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">Upload progress: {docUploadProgress}%</p>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-zinc-500">
            Upload PDF or image files. Category, uploader, and timestamp are saved with each document.
          </p>
          <p className="mt-2 text-xs text-zinc-400">Upload history</p>
          <ul className="mt-3 space-y-1 text-sm text-zinc-400">
            {docs.map((d) => (
              <li key={d.id} className="rounded border border-zinc-800 bg-zinc-900/30 px-3 py-2">
                <p className="text-zinc-200">{d.type.replaceAll("_", " ")}</p>
                <p className="text-xs text-zinc-500">
                  Uploaded by {d.uploadedBy?.name || d.uploadedById || "Unknown"} ·{" "}
                  {new Date(d.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={d.storageKey}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-teal-300"
                  >
                    View
                  </a>
                  <a
                    href={d.storageKey}
                    download
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                  >
                    Download
                  </a>
                  {(isBroker || isAdmin) ? (
                    <button
                      type="button"
                      disabled={deletingDocId === d.id}
                      onClick={() => void deleteDocument(d.id)}
                      className="rounded border border-red-800/70 px-2 py-1 text-xs text-red-300 disabled:opacity-40"
                    >
                      {deletingDocId === d.id ? "Deleting..." : "Delete"}
                    </button>
                  ) : null}
                </div>
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

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-lg font-medium text-zinc-200">Compliance</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Automated checks for NDA and RERA. Resolve when you have addressed an item; alerts reopen if the underlying gap
          remains (for example NDA still pending).
        </p>
        {complianceAlerts === undefined ? (
          <p className="mt-2 text-sm text-zinc-500">Loading compliance…</p>
        ) : complianceAlerts.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No compliance alerts on record for this deal.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {complianceAlerts.map((a) => {
              const open = a.status === "OPEN";
              const high = String(a.severity).toUpperCase() === "HIGH";
              const med = String(a.severity).toUpperCase() === "MEDIUM";
              return (
                <li
                  key={a.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    open && high
                      ? "border-l-4 border-l-red-400 border-red-900/40 bg-red-950/20"
                      : open && med
                        ? "border-l-4 border-l-amber-400 border-amber-900/40 bg-amber-950/15"
                        : open
                          ? "border-l-4 border-l-zinc-500 border-zinc-800 bg-zinc-900/40"
                          : "border-zinc-800 bg-zinc-900/30 opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-200">{a.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">{a.body}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${
                        open ? "bg-zinc-800 text-amber-200" : "bg-zinc-800/80 text-zinc-500"
                      }`}
                    >
                      {a.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span>{String(a.severity).toUpperCase()}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="uppercase tracking-wide">{a.type.replaceAll("_", " ")}</span>
                    {!open && a.resolvedAt ? (
                      <>
                        <span className="text-zinc-600">·</span>
                        <span>
                          {a.resolvedBy?.name ? `${a.resolvedBy.name} · ` : ""}
                          {new Date(a.resolvedAt).toLocaleString()}
                        </span>
                      </>
                    ) : null}
                    {open ? (
                      <button
                        type="button"
                        disabled={complianceResolveId === a.id}
                        onClick={() => void resolveComplianceAlert(a.id)}
                        className="ml-auto rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:border-[#00C49A] hover:text-[#00C49A] disabled:opacity-40"
                      >
                        {complianceResolveId === a.id ? "…" : "Resolve"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
                      Request seller payout
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
            {escrow.account.status === "PENDING_PAYOUT" && (
              <div className="rounded border border-amber-900/40 bg-amber-950/25 px-3 py-2 text-amber-100">
                <p className="font-medium">Awaiting manual payout</p>
                <p className="mt-1 text-xs text-amber-200/80">
                  Transfer {formatINR(Math.round(escrow.account.amountPaise / 100))} to the seller outside the app.
                  Admin will mark released after entering the bank/Razorpay reference.
                </p>
                {escrow.account.pendingPayoutAt ? (
                  <p className="mt-2 text-[11px] text-amber-200/60">
                    Requested {new Date(escrow.account.pendingPayoutAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            )}
            {escrow.account.status === "RELEASED" && escrow.account.releasedAt && (
              <div>
                <p>Released on {new Date(escrow.account.releasedAt).toLocaleString()}</p>
                {escrow.account.payoutReference ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    Payout reference: <span className="font-mono">{escrow.account.payoutReference}</span>
                  </p>
                ) : null}
              </div>
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

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-lg font-medium text-zinc-200">Legal / loan / insurance</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Track service requests for this deal. Status: OPEN → IN_PROGRESS → COMPLETED. History shows who made each
          change.
        </p>
        {services.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No service requests yet. Create one from the form below or the services hub.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {services.map((s) => {
              const history = Array.isArray(s.requestHistory) ? s.requestHistory : [];
              const st = s.status;
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium capitalize text-zinc-200">{s.type}</span>
                      <span
                        className={`ml-2 rounded px-2 py-0.5 text-[11px] font-medium ${
                          st === "COMPLETED"
                            ? "bg-emerald-900/50 text-emerald-200"
                            : st === "CANCELLED"
                              ? "bg-zinc-800 text-zinc-500"
                              : st === "IN_PROGRESS"
                                ? "bg-amber-900/40 text-amber-200"
                                : "bg-sky-900/40 text-sky-200"
                        }`}
                      >
                        {st.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Updated {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Partner:{" "}
                    <span className="text-zinc-300">
                      {s.partner?.name ?? "— unassigned —"}
                    </span>
                    {s.partner?.city ? ` · ${s.partner.city}` : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Opened by: {s.createdBy?.name ?? s.createdBy?.email ?? "—"} · {new Date(s.createdAt).toLocaleString()}
                  </p>
                  {isBroker || isAdmin ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <label className="text-xs text-zinc-500">
                        Status
                        <select
                          className="ml-1 mt-0.5 block rounded border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-zinc-200"
                          value={st}
                          disabled={serviceBusyId === s.id}
                          onChange={(e) =>
                            void patchServiceStatus(
                              s.id,
                              e.target.value as (typeof SERVICE_STATUSES)[number],
                            )
                          }
                        >
                          {SERVICE_STATUSES.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-zinc-500">
                        Reassign partner
                        <select
                          className="ml-1 mt-0.5 block min-w-[12rem] rounded border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-zinc-200"
                          value=""
                          disabled={serviceBusyId === s.id}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) void reassignServicePartner(s.id, v);
                            e.target.value = "";
                          }}
                        >
                          <option value="">Choose partner…</option>
                          {partners
                            .filter(
                              (p) =>
                                p.type.toLowerCase() === s.type.toLowerCase() ||
                                p.type.toLowerCase() === "all",
                            )
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} · {p.type}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                  {history.length > 0 ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-teal-500 hover:underline">
                        History ({history.length})
                      </summary>
                      <ul className="mt-2 space-y-1 border-l border-zinc-700 pl-3 text-[11px] text-zinc-400">
                        {[...history].reverse().map((h, idx) => (
                          <li key={`${h.at}-${idx}`}>
                            <span className="text-zinc-500">{new Date(h.at).toLocaleString()}</span> —{" "}
                            <span className="text-zinc-300">{h.userName ?? h.userId.slice(0, 8)}</span>: {h.action}
                            {h.detail ? ` — ${h.detail}` : ""}
                            {h.from && h.to ? ` (${h.from} → ${h.to})` : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {(isBroker || isAdmin) && (
        <div className="mt-6 max-w-xl rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <label className="block text-sm text-zinc-300">
            Stage change remark
            <textarea
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              rows={2}
              placeholder="Add reason for this stage change..."
              value={advanceRemark}
              onChange={(e) => setAdvanceRemark(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => advance()}
            className="mt-3 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-500"
          >
            Advance to next stage
          </button>
          {ORDERED_STAGES.indexOf(deal.stage as (typeof ORDERED_STAGES)[number]) > 0 ? (
            <button
              type="button"
              onClick={() => moveBack()}
              className="ml-2 mt-3 rounded-lg border border-zinc-600 px-4 py-2 font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Move back
            </button>
          ) : null}
        </div>
      )}

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-lg font-medium text-zinc-200">Offer management</h2>
        <form onSubmit={submitOffer} className="mt-3 grid gap-2">
          <label className="text-sm text-zinc-300">
            Offer amount (INR)
            <input
              required
              type="number"
              min={1}
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              placeholder="5000000"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Notes
            <textarea
              rows={2}
              value={offerNotes}
              onChange={(e) => setOfferNotes(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              placeholder="Optional note for this offer"
            />
          </label>
          <button
            type="submit"
            disabled={offerSaving}
            className="w-fit rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {offerSaving ? "Saving..." : "Submit offer"}
          </button>
        </form>
        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-300">Offer history</p>
          {offers.length ? (
            <ul className="mt-2 space-y-2">
              {offers.map((o) => {
                const actor = o.offeredBy?.name || o.offeredBy?.role || "User";
                const amountText = formatINR(Number(o.amountInr));
                const isLatest = o.id === latestOfferId;
                return (
                  <li
                    key={o.id}
                    className={`rounded border px-3 py-2 text-sm ${
                      isLatest ? "border-teal-600 bg-teal-950/30" : "border-zinc-800 bg-zinc-900/40"
                    }`}
                  >
                    <p className="text-zinc-200">
                      {actor} {"\u2192"} {amountText}{" "}
                      {isLatest ? <span className="ml-2 text-xs text-teal-300">Latest offer</span> : null}
                    </p>
                    {o.notes ? <p className="mt-1 text-xs text-zinc-400">{o.notes}</p> : null}
                    <p className="mt-1 text-[11px] text-zinc-500">{new Date(o.createdAt).toLocaleString()}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">No offers yet.</p>
          )}
        </div>
      </section>

      <section className="mt-10 border-t border-zinc-800 pt-6">
        <h2 className="text-lg font-medium text-zinc-200">Co-Broker (Manual)</h2>
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
        <p className="mt-2 text-xs text-zinc-500">
          Phase 2: broker directory, invite flow, and acceptance tracking.
        </p>
      </section>

      {(isBroker || isAdmin) ? (
        <section className="mt-10 border-t border-zinc-800 pt-6">
          <h2 className="text-lg font-medium text-zinc-200">Assign partner</h2>
          <form onSubmit={assignPartner} className="mt-3 space-y-2 text-sm">
            <label className="block">
              Service type
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
                value={partnerType}
                onChange={(e) => setPartnerType(e.target.value as "legal" | "loan" | "insurance")}
              >
                <option value="legal">Legal</option>
                <option value="loan">Loan</option>
                <option value="insurance">Insurance</option>
              </select>
            </label>
            <label className="block">
              Partner
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
              >
                <option value="">Select partner</option>
                {partners
                  .filter(
                    (p) =>
                      p.type.toLowerCase() === partnerType ||
                      p.type.toLowerCase() === "all",
                  )
                  .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.type}{p.city ? ` · ${p.city}` : ""}{p.phone ? ` · ${p.phone}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={partnerAssignBusy || !selectedPartnerId}
              className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-200 disabled:opacity-40"
            >
              {partnerAssignBusy ? "Saving..." : "Assign partner"}
            </button>
          </form>
        </section>
      ) : null}

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
        {dd ? (
          <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-zinc-400">
              Case status: <span className="text-zinc-200">{dd.case.status.replaceAll("_", " ")}</span> · Required{" "}
              {dd.case.requiredDone}/{dd.case.requiredTotal}
            </p>
            <ul className="mt-3 space-y-2">
              {dd.items.map((item) => (
                <li key={item.id} className="rounded border border-zinc-800 bg-zinc-950/40 p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-zinc-200">
                      {item.label}
                      {item.required ? <span className="ml-1 text-amber-300">(required)</span> : null}
                    </p>
                    <select
                      value={item.status}
                      disabled={ddBusyItemId === item.id || !(isBroker || isAdmin)}
                      onChange={(e) => void updateDdStatus(item.id, e.target.value as DdItem["status"])}
                      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span>
                      Assignee:{" "}
                      <strong className="text-zinc-300">{item.assignee?.name ?? "Unassigned"}</strong>
                    </span>
                    {(isBroker || isAdmin) ? (
                      <select
                        value={item.assigneeUserId ?? ""}
                        disabled={ddBusyItemId === item.id}
                        onChange={(e) => void assignDdItem(item.id, e.target.value)}
                        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200"
                      >
                        <option value="">Assign…</option>
                        {dd.members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name ?? m.id} · {String(m.role ?? "USER")}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <span>Evidence: {item.evidence.length}</span>
                    {(isBroker || isAdmin) ? (
                      <button
                        type="button"
                        disabled={ddBusyItemId === item.id}
                        onClick={() => void addDdEvidence(item.id)}
                        className="ml-auto rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-[#00C49A] hover:text-[#00C49A] disabled:opacity-40"
                      >
                        Add evidence link
                      </button>
                    ) : null}
                  </div>
                  {item.evidence.length ? (
                    <ul className="mt-2 space-y-1 text-[11px] text-zinc-500">
                      {item.evidence.slice(0, 3).map((ev) => (
                        <li key={ev.id} className="flex flex-wrap items-center gap-2">
                          <span className="text-zinc-400">{ev.title || ev.kind}</span>
                          {ev.url ? (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#00C49A] hover:underline"
                            >
                              Open
                            </a>
                          ) : null}
                          <span>· {ev.uploadedBy?.name || "User"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <p className="mt-8 text-xs text-zinc-600">
        Module 39–40: document versioning and orchestration rules apply before data room unlock.
      </p>
        </>
      ) : null}
    </div>
  );
}
