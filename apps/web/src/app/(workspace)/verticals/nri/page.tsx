"use client";

import {
  Banknote,
  BookOpen,
  Building2,
  CheckCircle,
  FileText,
  Globe,
  Home,
  MessageSquare,
  Phone,
  Scale,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR, getInitials, timeAgo } from "@/lib/format";
import { httpStatusFromError } from "@/lib/nri-ui";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

const EXTRAS_KEY = "arbuildwel-nri-profile-extras";

type NriApiProfile = {
  country: string | null;
  assignedManager: string | null;
  serviceNotes: string | null;
};

type NriExtras = {
  cityAbroad: string;
  contactTime: string;
  timeZone: string;
  nriType: "NRI" | "OCI" | "PIO";
  purposes: string[];
};

const PURPOSE_OPTIONS = [
  "Buy property",
  "Sell property",
  "Rental income",
  "Monitor property",
  "Investment",
  "Education trust",
] as const;

type PropRow = {
  id: string;
  title: string;
  city: string;
  areaPublic: string;
  localityPublic?: string;
  price: unknown;
  areaSqft?: number;
  propertyType?: string;
  dealType?: string;
  status?: string;
  imageUrls?: string[];
  matches?: { id: string }[];
};

type SvcReq = { id: string; type: string; status: string; createdAt: string; organizationId?: string };

const defaultExtras = (): NriExtras => ({
  cityAbroad: "",
  contactTime: "MORNING",
  timeZone: "",
  nriType: "NRI",
  purposes: [],
});

function loadExtras(): NriExtras {
  if (typeof window === "undefined") return defaultExtras();
  try {
    const raw = localStorage.getItem(EXTRAS_KEY);
    if (!raw) return defaultExtras();
    const o = JSON.parse(raw) as Partial<NriExtras>;
    return { ...defaultExtras(), ...o, purposes: Array.isArray(o.purposes) ? o.purposes : [] };
  } catch {
    return defaultExtras();
  }
}

function saveExtras(e: NriExtras) {
  try {
    localStorage.setItem(EXTRAS_KEY, JSON.stringify(e));
  } catch {
    /* ignore */
  }
}

function digitsForTel(s: string | null | undefined): string | null {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d : null;
}

type ModalKind =
  | "monitoring"
  | "tenant"
  | "legal"
  | "loan"
  | "sale"
  | "tax";

const MODAL_OPTIONS: {
  kind: ModalKind;
  title: string;
  desc: string;
  icon: typeof Home;
  apiType: "legal" | "loan" | "insurance";
}[] = [
  {
    kind: "monitoring",
    title: "Property monitoring",
    desc: "Regular inspection, maintenance coordination, photo updates",
    icon: Home,
    apiType: "legal",
  },
  {
    kind: "tenant",
    title: "Tenant management",
    desc: "Find tenant, collect rent, handle issues",
    icon: Users,
    apiType: "legal",
  },
  {
    kind: "legal",
    title: "Legal assistance",
    desc: "Title check, POA, sale deed, due diligence",
    icon: Scale,
    apiType: "legal",
  },
  {
    kind: "loan",
    title: "NRI home loan",
    desc: "Connect with NRI-friendly banks and NBFCs",
    icon: Banknote,
    apiType: "loan",
  },
  {
    kind: "sale",
    title: "Property sale",
    desc: "List, match, and close sale remotely",
    icon: TrendingUp,
    apiType: "legal",
  },
  {
    kind: "tax",
    title: "Tax / FEMA support",
    desc: "TDS filing, repatriation, Form 15CA/CB",
    icon: FileText,
    apiType: "insurance",
  },
];

function pipelineDot(status: string, idx: number): "done" | "current" | "pending" {
  const order = ["open", "assigned", "in_progress", "completed"];
  const u = status.toLowerCase();
  const i = order.indexOf(u);
  if (i < 0) return "pending";
  if (idx < i) return "done";
  if (idx === i) return "current";
  return "pending";
}

export default function NriVerticalPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"profile" | "properties" | "requests">("profile");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<NriApiProfile | null>(null);
  const [extras, setExtras] = useState<NriExtras>(defaultExtras);
  const [formCountry, setFormCountry] = useState("");
  const [properties, setProperties] = useState<PropRow[]>([]);
  const [requests, setRequests] = useState<SvcReq[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPick, setModalPick] = useState<ModalKind | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      const p = await apiFetch<NriApiProfile>("/verticals/nri/profile", { token });
      setProfile(p);
      setFormCountry(p?.country ?? "");
    } catch (err) {
      const st = httpStatusFromError(err);
      if (st === 404 || st === 400 || st === 403) {
        setProfile(null);
        setFormCountry("");
      } else if (st == null || (st && st >= 500)) {
        toast.error("Something went wrong loading your profile.");
      }
    }
  }, [token]);

  const loadProperties = useCallback(async () => {
    if (!token) return;
    const rows = await apiFetch<PropRow[]>("/properties/mine", { token }).catch(() => []);
    setProperties(rows);
  }, [token]);

  const loadRequests = useCallback(async () => {
    if (!token) return;
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
    setExtras(loadExtras());
  }, []);

  useEffect(() => {
    if (!token || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([loadProfile(), loadProperties(), loadRequests()]).finally(() => setLoading(false));
  }, [token, user, loadProfile, loadProperties, loadRequests]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await apiFetch("/verticals/nri/profile", {
        method: "PUT",
        token,
        body: JSON.stringify({ country: formCountry.trim() || undefined }),
      });
      saveExtras(extras);
      toast.success("Profile saved");
      await loadProfile();
    } catch {
      toast.error("Could not save profile.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitServiceRequest() {
    if (!token || !orgId || !modalPick) return;
    const opt = MODAL_OPTIONS.find((o) => o.kind === modalPick);
    if (!opt) return;
    setSubmitting(true);
    try {
      await apiFetch("/services/requests", {
        method: "POST",
        token,
        body: JSON.stringify({ organizationId: orgId, type: opt.apiType }),
      });
      toast.success("Request submitted");
      setModalOpen(false);
      setModalPick(null);
      await loadRequests();
    } catch {
      toast.error("Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = useMemo(() => {
    let forSale = 0;
    let onRent = 0;
    let monitoring = 0;
    for (const p of properties) {
      const st = String(p.status ?? "active").toLowerCase();
      const dt = String(p.dealType ?? "SALE").toUpperCase();
      if (st === "withdrawn" || st === "inactive") monitoring += 1;
      else if (dt === "RENT") onRent += 1;
      else forSale += 1;
    }
    return { forSale, onRent, monitoring };
  }, [properties]);

  if (!token) {
    return (
      <p className="text-sm text-[#888]">
        <Link href="/login" className="text-[#00C49A] hover:underline">
          Log in
        </Link>{" "}
        for NRI workspace.
      </p>
    );
  }

  if (user?.role !== "NRI") {
    return (
      <p className="text-sm text-[#888]">
        This workspace is for NRI accounts.{" "}
        <Link href="/dashboard" className="text-[#00C49A] hover:underline">
          Back to dashboard
        </Link>
      </p>
    );
  }

  if (loading) return <LoadingSkeleton rows={4} />;

  const manager = profile?.assignedManager?.trim() ?? "";
  const telDigits = digitsForTel(manager);
  const telHref = telDigits ? `tel:+${telDigits.replace(/^\+/, "")}` : null;
  const waHref = telDigits ? `https://wa.me/${telDigits.replace(/^\+/, "")}` : "/services-hub";

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-[#e4e4e4]">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2">
            <Globe className="h-7 w-7 text-[#E85D8A]" />
            <h1 className="text-2xl font-semibold text-white">NRI Workspace</h1>
          </div>
          <p className="mt-1 max-w-xl text-sm text-[#888]">Manage your Indian properties from anywhere in the world.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[#1a1a1a] pb-2">
        {(
          [
            { id: "profile" as const, label: "Profile" },
            { id: "properties" as const, label: "My Properties" },
            { id: "requests" as const, label: "Service Requests" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border border-[#E85D8A40] bg-[#E85D8A12] text-[#E85D8A]"
                : "border border-transparent text-[#888] hover:bg-[#ffffff08]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "profile" ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-6"
          >
            <form
              onSubmit={saveProfile}
              className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6"
            >
              <div className="mb-6 flex items-start gap-2">
                <User className="mt-0.5 h-5 w-5 text-[#00C49A]" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Your NRI profile</h2>
                  <p className="text-sm text-[#888]">Used to assign your manager and route your service requests.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-[#888]">Country of residence</span>
                  <span className="mt-1 flex items-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3">
                    <Globe className="h-4 w-4 text-[#555]" />
                    <input
                      className="w-full bg-transparent py-2.5 text-sm outline-none"
                      placeholder="e.g. United States"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                    />
                  </span>
                </label>
                <label className="block text-sm">
                  <span className="text-[#888]">City abroad</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2.5 text-sm outline-none focus:border-[#E85D8A55]"
                    placeholder="e.g. New York"
                    value={extras.cityAbroad}
                    onChange={(e) => setExtras((x) => ({ ...x, cityAbroad: e.target.value }))}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-[#888]">Best time to reach you (IST)</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2.5 text-sm outline-none"
                    value={extras.contactTime}
                    onChange={(e) => setExtras((x) => ({ ...x, contactTime: e.target.value }))}
                  >
                    <option value="MORNING">Morning (9–12)</option>
                    <option value="AFTERNOON">Afternoon (12–5)</option>
                    <option value="EVENING">Evening (5–9)</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[#888]">Your time zone</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2.5 text-sm outline-none"
                    placeholder="e.g. EST / PST / GMT+4"
                    value={extras.timeZone}
                    onChange={(e) => setExtras((x) => ({ ...x, timeZone: e.target.value }))}
                  />
                </label>
              </div>

              <div className="mt-6 border-t border-[#1a1a1a] pt-6">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                  <ShieldCheck className="h-4 w-4 text-[#00C49A]" />
                  Your assigned manager
                </p>
                {manager ? (
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E85D8A20] text-xs font-semibold text-[#E85D8A]">
                        {getInitials(manager)}
                      </div>
                      <div>
                        <p className="text-sm text-white">{manager}</p>
                        <span className="mt-1 inline-block rounded border border-[#00C49A40] bg-[#00C49A12] px-2 py-0.5 text-[10px] font-medium text-[#00C49A]">
                          Assigned
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {telHref ? (
                        <a
                          href={telHref}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#1a1a1a] text-[#00C49A] hover:bg-[#00C49A12]"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      ) : null}
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#1a1a1a] text-[#00C49A] hover:bg-[#00C49A12]"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm italic text-[#888]">
                    Will be assigned within 24 hours of profile completion
                  </p>
                )}
              </div>

              <div className="mt-6">
                <p className="text-sm text-[#888]">NRI type</p>
                <div className="mt-2 inline-flex rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-1">
                  {(["NRI", "OCI", "PIO"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setExtras((x) => ({ ...x, nriType: k }))}
                      className={`rounded-md px-4 py-2 text-xs font-medium ${
                        extras.nriType === k
                          ? "border border-[#E85D8A55] text-[#E85D8A]"
                          : "text-[#666] hover:text-[#aaa]"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-[#888]">Why are you on AR Buildwel?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PURPOSE_OPTIONS.map((p) => {
                    const on = extras.purposes.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setExtras((x) => ({
                            ...x,
                            purposes: on ? x.purposes.filter((t) => t !== p) : [...x.purposes, p],
                          }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          on
                            ? "border-[#E85D8A] bg-[#E85D8A18] text-[#E85D8A]"
                            : "border-[#1a1a1a] bg-[#0a0a0a] text-[#888] hover:border-[#333]"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-8 w-full rounded-lg bg-[#00C49A] py-3 text-sm font-semibold text-black hover:opacity-95 disabled:opacity-50"
              >
                Save NRI profile
              </button>
            </form>

            <section id="guidance" className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
              <div className="mb-4 inline-flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#00C49A]" />
                <h2 className="text-lg font-semibold text-white">NRI property guidelines</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4">
                  <CheckCircle className="h-6 w-6 text-[#00C49A]" />
                  <p className="mt-2 text-sm font-medium text-white">Allowed purchases</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#888]">
                    Residential property · Commercial property · Plots (non-agricultural) · NRI housing schemes
                  </p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4">
                  <XCircle className="h-6 w-6 text-red-400" />
                  <p className="mt-2 text-sm font-medium text-white">Not allowed</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#888]">
                    Agricultural land · Plantation property · Farmhouse without special RBI permission
                  </p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4">
                  <Banknote className="h-6 w-6 text-[#FFB347]" />
                  <p className="mt-2 text-sm font-medium text-white">Key taxes</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#888]">
                    20% TDS on sale · Capital gains tax · Rental income taxable · DTAA benefits available
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-[#555]">
                This is general information. Consult a CA for your specific situation.
              </p>
            </section>
          </motion.div>
        ) : null}

        {tab === "properties" ? (
          <motion.div
            key="properties"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap gap-4 rounded-xl border border-[#1a1a1a] bg-[#111111] px-4 py-3 text-sm">
              <span className="text-[#00C49A]">For Sale · {stats.forSale}</span>
              <span className="text-[#378ADD]">On Rent · {stats.onRent}</span>
              <span className="text-[#888]">Monitoring · {stats.monitoring}</span>
            </div>
            {properties.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No properties listed"
                subtitle="Add your Indian property to track it from your workspace."
                actionHref="/properties/new"
                actionLabel="List your property"
              />
            ) : (
              <ul className="space-y-3">
                {properties.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#1a1a1a] bg-[#111111] p-4 sm:flex-row sm:items-center"
                  >
                    {p.imageUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrls[0]} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a]">
                        <Building2 className="h-8 w-8 text-[#444]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{p.title}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#888]">
                        <Building2 className="h-3 w-3" />
                        {p.areaPublic} · {p.city}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#888]">
                        <span>{formatINR(Number(p.price ?? 0))}</span>
                        <span>·</span>
                        <span>{p.areaSqft ?? 0} sqft</span>
                        <span>·</span>
                        <span className="rounded border border-[#333] px-1.5 py-0.5">{p.propertyType ?? "—"}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <select
                        className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-2 py-1.5 text-xs text-white outline-none"
                        defaultValue={
                          String(p.dealType ?? "").toUpperCase() === "RENT"
                            ? "rent"
                            : String(p.status ?? "").toLowerCase() === "withdrawn"
                              ? "mon"
                              : String(p.status ?? "").toLowerCase() === "inactive"
                                ? "vacant"
                                : "sale"
                        }
                        onChange={async (e) => {
                          const v = e.target.value;
                          if (!token) return;
                          try {
                            if (v === "sale") {
                              await apiFetch(`/properties/${p.id}/status`, {
                                method: "PATCH",
                                token,
                                body: JSON.stringify({ status: "active" }),
                              });
                              await apiFetch(`/properties/${p.id}`, {
                                method: "PATCH",
                                token,
                                body: JSON.stringify({ dealType: "SALE" }),
                              });
                            } else if (v === "rent") {
                              await apiFetch(`/properties/${p.id}/status`, {
                                method: "PATCH",
                                token,
                                body: JSON.stringify({ status: "active" }),
                              });
                              await apiFetch(`/properties/${p.id}`, {
                                method: "PATCH",
                                token,
                                body: JSON.stringify({ dealType: "RENT" }),
                              });
                            } else if (v === "vacant") {
                              await apiFetch(`/properties/${p.id}/status`, {
                                method: "PATCH",
                                token,
                                body: JSON.stringify({ status: "inactive" }),
                              });
                            } else if (v === "mon") {
                              await apiFetch(`/properties/${p.id}/status`, {
                                method: "PATCH",
                                token,
                                body: JSON.stringify({ status: "withdrawn" }),
                              });
                            }
                            toast.success("Updated");
                            await loadProperties();
                          } catch {
                            toast.error("Could not update property.");
                          }
                        }}
                      >
                        <option value="sale">For Sale</option>
                        <option value="rent">On Rent</option>
                        <option value="vacant">Vacant</option>
                        <option value="mon">Monitoring</option>
                      </select>
                      {String(p.dealType ?? "").toUpperCase() === "SALE" ? (
                        <p className="text-xs text-[#00C49A]">⚡ {p.matches?.length ?? 0} matches</p>
                      ) : null}
                      {String(p.dealType ?? "").toUpperCase() === "RENT" ? (
                        <p className="text-xs text-[#00C49A]">{formatINR(Number(p.price ?? 0))}/mo</p>
                      ) : null}
                      <Link href={`/properties/${p.id}`} className="text-xs text-[#00C49A] hover:underline">
                        Manage →
                      </Link>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 border-t border-[#1a1a1a] pt-3 sm:border-0 sm:pt-0">
                      {(
                        [
                          { q: "monitor", label: "Monitoring" },
                          { q: "rental", label: "Rental mgmt" },
                          { q: "legal", label: "Legal" },
                        ] as const
                      ).map((c) => (
                        <Link
                          key={c.q}
                          href={`/services-hub?propertyId=${encodeURIComponent(p.id)}&type=${c.q}`}
                          className="rounded-full border border-[#333] px-2 py-1 text-[10px] text-[#888] hover:border-[#E85D8A55] hover:text-[#E85D8A]"
                        >
                          Request: {c.label}
                        </Link>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ) : null}

        {tab === "requests" ? (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setModalPick(null);
                  setModalOpen(true);
                }}
                className="rounded-lg border border-[#E85D8A55] bg-[#E85D8A10] px-4 py-2 text-sm font-medium text-[#E85D8A] hover:bg-[#E85D8A18]"
              >
                + New request
              </button>
            </div>
            {requests.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No service requests yet"
                subtitle="Legal, loans, tax, and property management — start from the catalog."
                actionHref="/services-hub"
                actionLabel="Request a service"
              />
            ) : (
              <ul className="space-y-4">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded border border-[#00C49A40] bg-[#00C49A12] px-2 py-0.5 text-[11px] font-medium uppercase text-[#00C49A]">
                        {r.type}
                      </span>
                      <span className="text-[11px] text-[#555]">{timeAgo(r.createdAt)}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      {(["open", "assigned", "in_progress", "completed"] as const).map((step, idx) => {
                        const dot = pipelineDot(r.status, idx);
                        return (
                          <div key={step} className="flex flex-1 items-center gap-1">
                            <span
                              className={`relative flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${
                                dot === "done"
                                  ? "bg-[#00C49A]"
                                  : dot === "current"
                                    ? "bg-[#E85D8A] ring-2 ring-[#E85D8A55]"
                                    : "bg-[#333]"
                              }`}
                            />
                            {idx < 3 ? <div className="h-px flex-1 bg-[#2a2a2a]" /> : null}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-[#555]">
                      PENDING → ASSIGNED → IN PROGRESS → COMPLETED
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-white">What do you need help with?</h3>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModalPick(null);
                }}
                className="rounded p-1 text-[#888] hover:bg-[#222]"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {MODAL_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const sel = modalPick === opt.kind;
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => setModalPick(opt.kind)}
                    className={`rounded-xl border p-4 text-left transition ${
                      sel ? "border-[#E85D8A] bg-[#E85D8A12]" : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333]"
                    }`}
                  >
                    <Icon className={`h-8 w-8 ${sel ? "text-[#E85D8A]" : "text-[#00C49A]"}`} />
                    <p className="mt-2 text-sm font-semibold text-white">{opt.title}</p>
                    <p className="mt-1 text-xs text-[#888]">{opt.desc}</p>
                    <span className="mt-3 inline-block text-xs text-[#00C49A]">Select</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!modalPick || !orgId || submitting}
              onClick={() => void submitServiceRequest()}
              className="mt-6 w-full rounded-lg bg-[#00C49A] py-3 text-sm font-semibold text-black disabled:opacity-40"
            >
              Submit request
            </button>
            {!orgId ? (
              <p className="mt-2 text-center text-xs text-amber-400">
                Join an organization on the platform to submit service requests.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
