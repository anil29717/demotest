"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Clock3,
  Edit2,
  Mail,
  MessageSquare,
  Monitor,
  Phone,
  ShieldCheck,
  Upload,
  UserCircle,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { getInitials, timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

type Role =
  | "ADMIN"
  | "BROKER"
  | "BUYER"
  | "SELLER"
  | "NRI"
  | "HNI"
  | "INSTITUTIONAL_BUYER"
  | "INSTITUTIONAL_SELLER";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  trustScore: number;
  verified: boolean;
  serviceAreas?: string[];
  reraId?: string | null;
  notificationPrefs?: Record<string, unknown>;
  onboardingStep?: string;
  reputationScore?: number;
  createdAt: string;
};

type NotificationPrefs = {
  dailyDigest?: boolean;
  matchAlerts?: boolean;
  slaWarnings?: boolean;
  digestHourLocal?: number;
  digestMinuteLocal?: number;
  whatsappDigest?: boolean;
  whatsappDigestTo?: string;
  emailMatchAlerts?: boolean;
  emailDailyDigest?: boolean;
};

/** UI-only keys (stripped before PUT /user/notification-preferences). */
type NotificationDraft = NotificationPrefs & {
  inAppAlerts?: boolean;
  dealUpdates?: boolean;
};

type NriProfile = {
  country?: string | null;
};

type HniProfile = {
  ticketMinCr?: number | null;
  ticketMaxCr?: number | null;
};

type ProfileExtras = {
  whatsapp: string;
  bio: string;
  gstNumber: string;
  experience: string;
  brokerSpecializations: string[];
  buyerTypes: string[];
  buyerCities: string[];
  buyerUrgency: string;
  sellerTypes: string[];
  sellerCities: string[];
  sellerReason: string;
  nriCityAbroad: string;
  nriTimeZone: string;
  nriType: "NRI" | "OCI" | "PIO";
  nriPurpose: string[];
  hniAssets: string[];
  hniGeography: string[];
  hniHorizon: string;
  hniExpectedReturn: string;
  instOrgName: string;
  instOrgType: string;
  instBudgetMin: string;
  instBudgetMax: string;
  buyerBudgetMin: string;
  buyerBudgetMax: string;
  instTargetTypes: string[];
  instSellerType: string;
  instIntent: string[];
  instSellerCity: string;
  instSellerPrice: string;
};

type TabId = "profile" | "credentials" | "preferences" | "security";

const STORAGE_KEY = "arbuildwel-profile-extras-v1";
const CURRENCY_KEY = "arbuildwel-price-format";
const EXPERIENCE_OPTIONS = ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"];
const BROKER_SPECIALIZATIONS = ["Residential", "Commercial", "Luxury", "Industrial", "Institutional", "NRI deals"];
const BUYER_TYPES = ["Residential", "Commercial", "Plot"];
const NRI_PURPOSES = ["Buy property", "Sell property", "Rental income", "Monitor property", "Investment"];
const HNI_ASSET_CLASSES = ["Residential", "Commercial", "Distressed", "Bank Auction", "Institutional"];
const INSTITUTION_TYPES = ["K-12 School", "College", "University"];
const ORG_TYPES = ["PE Fund", "Education Group", "Family Office", "Trust", "Corporate", "Other"];
const SELLER_INTENTS = ["Sale", "Lease", "JV", "Management Takeover"];

const roleBadge: Record<Role, string> = {
  BROKER: "text-[#00C49A] border-[#00C49A40] bg-[#00C49A14]",
  SELLER: "text-[#5BAD8F] border-[#5BAD8F40] bg-[#5BAD8F14]",
  BUYER: "text-[#58A6FF] border-[#58A6FF40] bg-[#58A6FF14]",
  NRI: "text-[#A78BFA] border-[#A78BFA40] bg-[#A78BFA14]",
  HNI: "text-[#F59E0B] border-[#F59E0B40] bg-[#F59E0B14]",
  INSTITUTIONAL_BUYER: "text-[#22D3EE] border-[#22D3EE40] bg-[#22D3EE14]",
  INSTITUTIONAL_SELLER: "text-[#34D399] border-[#34D39940] bg-[#34D39914]",
  ADMIN: "text-[#E5E7EB] border-[#E5E7EB40] bg-[#E5E7EB14]",
};

const roleDescriptions: Record<Role, string> = {
  BROKER: "Real estate broker managing listings and deals",
  BUYER: "Looking for properties to purchase or rent",
  SELLER: "Listing properties for sale or rent",
  NRI: "Non-resident Indian managing Indian properties",
  HNI: "High net worth investor in premium assets",
  INSTITUTIONAL_BUYER: "Acquiring institutional education assets",
  INSTITUTIONAL_SELLER: "Listing institutional assets for sale",
  ADMIN: "Platform administrator",
};

function defaultExtras(): ProfileExtras {
  return {
    whatsapp: "",
    bio: "",
    gstNumber: "",
    experience: "",
    brokerSpecializations: [],
    buyerTypes: [],
    buyerCities: [],
    buyerUrgency: "WARM",
    sellerTypes: [],
    sellerCities: [],
    sellerReason: "",
    nriCityAbroad: "",
    nriTimeZone: "",
    nriType: "NRI",
    nriPurpose: [],
    hniAssets: [],
    hniGeography: [],
    hniHorizon: "Medium 1-3 years",
    hniExpectedReturn: "12-18%",
    instOrgName: "",
    instOrgType: ORG_TYPES[0] ?? "Other",
    instBudgetMin: "",
    instBudgetMax: "",
    buyerBudgetMin: "",
    buyerBudgetMax: "",
    instTargetTypes: [],
    instSellerType: INSTITUTION_TYPES[0] ?? "K-12 School",
    instIntent: [],
    instSellerCity: "",
    instSellerPrice: "",
  };
}

function loadExtras(): ProfileExtras {
  if (typeof window === "undefined") return defaultExtras();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultExtras();
    const parsed = JSON.parse(raw) as Partial<ProfileExtras>;
    return { ...defaultExtras(), ...parsed };
  } catch {
    return defaultExtras();
  }
}

function toggleChip(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function maskPhone(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "Not set";
  if (digits.length < 4) return `+91 ••••${digits}`;
  return `+91 ••••••${digits.slice(-4)}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, token, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [newCity, setNewCity] = useState("");
  const [currencyDisplay, setCurrencyDisplay] = useState("cr");
  const [extras, setExtras] = useState<ProfileExtras>(defaultExtras);
  const [draft, setDraft] = useState({ name: "", email: "" });
  const [brokerRera, setBrokerRera] = useState("");
  const [brokerCities, setBrokerCities] = useState<string[]>([]);
  const [nriCountry, setNriCountry] = useState("");
  const [hniMin, setHniMin] = useState("");
  const [hniMax, setHniMax] = useState("");
  const [notifDraft, setNotifDraft] = useState<NotificationDraft>({
    dailyDigest: true,
    matchAlerts: true,
    slaWarnings: true,
    digestHourLocal: 9,
    digestMinuteLocal: 30,
    inAppAlerts: true,
    dealUpdates: true,
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "settings") setActiveTab("preferences");
  }, [searchParams]);

  useEffect(() => {
    setExtras(loadExtras());
    if (typeof window !== "undefined") {
      const v = localStorage.getItem(CURRENCY_KEY);
      if (v) setCurrencyDisplay(v);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
  }, [extras]);

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id, token],
    enabled: Boolean(token) && Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
    queryFn: () => apiFetch<Profile>("/user/profile", { token: token ?? undefined }),
  });

  const orgsQuery = useQuery({
    queryKey: ["orgs", token],
    enabled:
      Boolean(token) &&
      (user?.role === "BROKER" ||
        user?.role === "INSTITUTIONAL_BUYER" ||
        user?.role === "INSTITUTIONAL_SELLER"),
    queryFn: () => apiFetch<{ id: string; name: string }[]>("/organizations/mine", { token: token ?? undefined }).catch(() => []),
  });

  const nriQuery = useQuery({
    queryKey: ["nri-profile", token],
    enabled: Boolean(token) && user?.role === "NRI",
    queryFn: () => apiFetch<NriProfile>("/verticals/nri/profile", { token: token ?? undefined }).catch(() => null),
  });

  const hniQuery = useQuery({
    queryKey: ["hni-profile", token],
    enabled: Boolean(token) && user?.role === "HNI",
    queryFn: () => apiFetch<HniProfile>("/verticals/hni/profile", { token: token ?? undefined }).catch(() => null),
  });

  const notifQuery = useQuery({
    queryKey: ["notif-prefs", token],
    enabled: Boolean(token),
    queryFn: async () => {
      if (!token) return {};
      try {
        return await apiFetch<NotificationPrefs>("/user/notification-preferences", { token });
      } catch {
        const p = await apiFetch<{ notificationPrefs?: NotificationPrefs }>("/user/profile", { token }).catch(() => ({}));
        return (p as { notificationPrefs?: NotificationPrefs }).notificationPrefs ?? {};
      }
    },
  });

  useEffect(() => {
    if (nriQuery.data?.country != null) setNriCountry(nriQuery.data.country ?? "");
  }, [nriQuery.data]);

  useEffect(() => {
    if (!hniQuery.data) return;
    setHniMin(hniQuery.data.ticketMinCr != null ? String(hniQuery.data.ticketMinCr) : "");
    setHniMax(hniQuery.data.ticketMaxCr != null ? String(hniQuery.data.ticketMaxCr) : "");
  }, [hniQuery.data]);

  useEffect(() => {
    if (!notifQuery.data) return;
    setNotifDraft((prev) => ({
      ...prev,
      ...notifQuery.data,
      digestHourLocal:
        typeof notifQuery.data.digestHourLocal === "number" ? notifQuery.data.digestHourLocal : prev.digestHourLocal,
      digestMinuteLocal:
        typeof notifQuery.data.digestMinuteLocal === "number"
          ? notifQuery.data.digestMinuteLocal
          : prev.digestMinuteLocal,
      inAppAlerts: prev.inAppAlerts ?? true,
      dealUpdates: prev.dealUpdates ?? true,
    }));
  }, [notifQuery.data]);

  useEffect(() => {
    if (!profileQuery.data) return;
    const p = profileQuery.data;
    setDraft({
      name: p.name ?? "",
      email: p.email ?? "",
    });
    setBrokerRera(p.reraId ?? "");
    setBrokerCities(p.serviceAreas ?? []);
    if (p.role === "INSTITUTIONAL_BUYER" && p.name?.trim()) {
      setExtras((prev) => (prev.instOrgName.trim() ? prev : { ...prev, instOrgName: p.name ?? "" }));
    }
  }, [profileQuery.data]);

  const profile = profileQuery.data;
  const role = (profile?.role ?? user?.role ?? "BUYER") as Role;
  const orgName = orgsQuery.data?.[0]?.name ?? "";

  const loading = profileQuery.isLoading;
  const hasError = profileQuery.isError;

  async function saveBasicInfo() {
    if (!token || !profile) return;
    if (!draft.name.trim() || draft.name.trim().length < 2) {
      toast.error("Full name must be at least 2 characters.");
      return;
    }
    if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    try {
      await apiFetch("/user/profile", {
        method: "PUT",
        token,
        body: JSON.stringify({
          name: draft.name.trim(),
          email: draft.email.trim() || undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await refreshProfile();
      setIsEditingBasic(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  async function saveCredentials() {
    if (!token) return;
    try {
      let apiSaved = false;
      if (role === "BROKER") {
        await apiFetch("/user/profile", {
          method: "PUT",
          token,
          body: JSON.stringify({
            reraId: brokerRera.trim() || undefined,
            serviceAreas: brokerCities.length ? brokerCities : undefined,
          }),
        });
        await queryClient.invalidateQueries({ queryKey: ["profile"] });
        await refreshProfile();
        apiSaved = true;
      }
      if (role === "INSTITUTIONAL_BUYER") {
        await apiFetch("/user/profile", {
          method: "PUT",
          token,
          body: JSON.stringify({
            name: extras.instOrgName.trim() || undefined,
          }),
        });
        await queryClient.invalidateQueries({ queryKey: ["profile"] });
        await refreshProfile();
        apiSaved = true;
      }
      if (role === "NRI") {
        await apiFetch("/verticals/nri/profile", {
          method: "PUT",
          token,
          body: JSON.stringify({ country: nriCountry.trim() || undefined }),
        });
        await queryClient.invalidateQueries({ queryKey: ["nri-profile"] });
        apiSaved = true;
      }
      if (role === "HNI") {
        await apiFetch("/verticals/hni/profile", {
          method: "PUT",
          token,
          body: JSON.stringify({
            ticketMinCr: hniMin ? Number(hniMin) : undefined,
            ticketMaxCr: hniMax ? Number(hniMax) : undefined,
          }),
        });
        await queryClient.invalidateQueries({ queryKey: ["hni-profile"] });
        apiSaved = true;
      }
      if (apiSaved) await refreshProfile();
      setIsEditingCredentials(false);
      toast.success(apiSaved ? "Credentials updated" : "Saved on this device (no API fields for this role)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update credentials");
    }
  }

  async function savePreferences() {
    if (!token) return;
    try {
      const { inAppAlerts, dealUpdates, ...apiPrefs } = notifDraft;
      void inAppAlerts;
      void dealUpdates;
      await apiFetch("/user/notification-preferences", {
        method: "PUT",
        token,
        body: JSON.stringify(apiPrefs),
      });
      await queryClient.invalidateQueries({ queryKey: ["notif-prefs"] });
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    }
  }

  if (!token) {
    return (
      <EmptyState
        icon={UserCircle}
        title="Profile unavailable"
        subtitle="Please log in to view your profile."
      />
    );
  }

  if (loading) return <PageSkeleton count={3} type="card" />;

  if (hasError || !profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <EmptyState icon={UserCircle} title="Unable to load profile" subtitle="Please try again." />
        <button
          type="button"
          onClick={() => void profileQuery.refetch()}
          className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#ccc] hover:bg-[#ffffff08]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] space-y-6 px-2 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">My profile</h1>
        <p className="mt-1 text-sm text-[#888888]">Manage your account and preferences</p>
      </header>

      <div className="overflow-x-auto border-b border-[#1a1a1a]">
        <div className="flex min-w-max gap-6">
          {(["profile", "credentials", "preferences", "security"] as TabId[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-2 text-sm capitalize transition ${
                activeTab === tab
                  ? "border-b-[#00C49A] text-[#00C49A]"
                  : "border-b-transparent text-[#888888] hover:text-[#cccccc]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "profile" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex w-full flex-col items-start sm:w-[170px]">
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#1a1a1a] text-[28px] font-semibold text-[#00C49A]">
                  {getInitials(profile.name || "User")}
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#888888] disabled:cursor-default"
                >
                  <Upload className="h-3 w-3" />
                  Change photo · Coming soon
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-white">{profile.name || "User"}</p>
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${roleBadge[role]}`}>{role}</span>
                <p className="inline-flex items-center gap-1 text-xs text-[#888888]">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email || "Not set"}
                </p>
                <p className="inline-flex items-center gap-1 text-xs text-[#888888]">
                  <Phone className="h-3.5 w-3.5" />
                  {maskPhone(extras.whatsapp)}
                </p>
                <p className="inline-flex items-center gap-1 text-xs text-[#888888]">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {timeAgo(profile.createdAt)}
                </p>
                {orgName ? (
                  <p className="inline-flex items-center gap-1 text-xs text-[#888888]">
                    <Building2 className="h-3.5 w-3.5" />
                    {orgName}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Basic information</h2>
              <button type="button" onClick={() => setIsEditingBasic((p) => !p)} className="text-[#888] hover:text-white">
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <label className="block">
                <p className="mb-1 text-xs text-[#888]">Full name</p>
                {isEditingBasic ? (
                  <input
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C49A]"
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  />
                ) : (
                  <p className="text-white">{profile.name || "Not set"}</p>
                )}
              </label>
              <label className="block">
                <p className="mb-1 text-xs text-[#888]">Email address</p>
                {isEditingBasic ? (
                  <input
                    type="email"
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C49A]"
                    value={draft.email}
                    onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                  />
                ) : (
                  <p className="text-white">{profile.email || "Not set"}</p>
                )}
              </label>
              <label className="block">
                <p className="mb-1 text-xs text-[#888]">WhatsApp number</p>
                {isEditingBasic ? (
                  <input
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C49A]"
                    value={extras.whatsapp}
                    onChange={(e) => setExtras((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="+91XXXXXXXXXX"
                  />
                ) : (
                  <p className="text-white">{extras.whatsapp || "Not set"}</p>
                )}
                <p className="mt-1 text-[11px] text-[#555]">Used for deal alerts and digest</p>
              </label>
              <label className="block sm:col-span-2">
                <p className="mb-1 text-xs text-[#888]">Short bio</p>
                {isEditingBasic ? (
                  <>
                    <textarea
                      rows={3}
                      maxLength={200}
                      className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C49A]"
                      value={extras.bio}
                      onChange={(e) => setExtras((p) => ({ ...p, bio: e.target.value }))}
                    />
                    <p className="mt-1 text-[11px] text-[#555]">{extras.bio.length}/200</p>
                  </>
                ) : (
                  <p className="text-white">{extras.bio || "Not added"}</p>
                )}
              </label>
            </div>
            {isEditingBasic ? (
              <div className="mt-4 flex items-center gap-2">
                <button type="button" onClick={() => void saveBasicInfo()} className="rounded-lg bg-[#00C49A] px-5 py-2 text-sm font-semibold text-black hover:bg-[#00A882]">
                  Save changes
                </button>
                <button type="button" onClick={() => setIsEditingBasic(false)} className="rounded-lg border border-[#2a2a2a] px-5 py-2 text-sm text-[#888]">
                  Cancel
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <h2 className="text-base font-semibold text-white">Account type</h2>
            <div className="mt-3 space-y-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-sm ${roleBadge[role]}`}>{role}</span>
              <p className="text-sm text-[#888]">{roleDescriptions[role]}</p>
              <p className="text-xs italic text-[#555]">To change your role, contact support. Role changes require admin approval.</p>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "credentials" ? (
        <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Credentials</h2>
            <button type="button" onClick={() => setIsEditingCredentials((p) => !p)} className="text-[#888] hover:text-white">
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
          {role === "BROKER" ? (
            <div className="space-y-4 text-sm">
              <label className="block">
                <p className="mb-1 text-xs text-[#888]">RERA registration ID</p>
                <input
                  disabled={!isEditingCredentials}
                  value={brokerRera}
                  className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                  onChange={(e) => setBrokerRera(e.target.value)}
                />
              </label>
              <label className="block">
                <p className="mb-1 text-xs text-[#888]">GST number (optional)</p>
                <input
                  disabled={!isEditingCredentials}
                  value={extras.gstNumber}
                  className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                  onChange={(e) => setExtras((p) => ({ ...p, gstNumber: e.target.value }))}
                />
              </label>
              <label className="block">
                <p className="mb-1 text-xs text-[#888]">Years of experience</p>
                <select
                  disabled={!isEditingCredentials}
                  value={extras.experience}
                  onChange={(e) => setExtras((p) => ({ ...p, experience: e.target.value }))}
                  className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                >
                  <option value="">Not set</option>
                  {EXPERIENCE_OPTIONS.map((e) => <option key={e}>{e}</option>)}
                </select>
              </label>
              <div>
                <p className="mb-1 text-xs text-[#888]">Specializations</p>
                <div className="flex flex-wrap gap-2">
                  {BROKER_SPECIALIZATIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, brokerSpecializations: toggleChip(p.brokerSpecializations, s) }))}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        extras.brokerSpecializations.includes(s)
                          ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] text-[#888]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-[#888]">Cities you operate in</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {brokerCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => isEditingCredentials && setBrokerCities((c) => c.filter((x) => x !== city))}
                      className="inline-flex items-center gap-1 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-xs text-[#888]"
                    >
                      {city} {isEditingCredentials ? "×" : ""}
                    </button>
                  ))}
                </div>
                {isEditingCredentials ? (
                  <div className="flex gap-2">
                    <input
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!newCity.trim()) return;
                          setBrokerCities((c) => (c.includes(newCity.trim()) ? c : [...c, newCity.trim()]));
                          setNewCity("");
                        }
                      }}
                      className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white"
                      placeholder="Type city and press Enter"
                    />
                  </div>
                ) : null}
              </div>
              {profile.verified ? (
                <p className="inline-flex items-center gap-1 text-xs text-[#00C49A]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  RERA verified
                </p>
              ) : (
                <p className="inline-flex items-center gap-1 text-xs text-[#EF9F27]">
                  <Clock3 className="h-3.5 w-3.5" />
                  Pending verification
                </p>
              )}
            </div>
          ) : null}
          {role === "NRI" ? (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[#888]">Country of residence</span>
                <input
                  disabled={!isEditingCredentials}
                  value={nriCountry}
                  onChange={(e) => setNriCountry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                />
              </label>
              <label className="block">
                <span className="text-[#888]">City abroad</span>
                <input
                  disabled={!isEditingCredentials}
                  value={extras.nriCityAbroad}
                  onChange={(e) => setExtras((p) => ({ ...p, nriCityAbroad: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                />
              </label>
              <label className="block">
                <span className="text-[#888]">Time zone</span>
                <input
                  disabled={!isEditingCredentials}
                  value={extras.nriTimeZone}
                  onChange={(e) => setExtras((p) => ({ ...p, nriTimeZone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                />
              </label>
              <div className="sm:col-span-2">
                <p className="text-[#888]">NRI type</p>
                <div className="mt-2 inline-flex rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-1">
                  {(["NRI", "OCI", "PIO"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, nriType: k }))}
                      className={`rounded-md px-3 py-1.5 text-xs ${
                        extras.nriType === k ? "border border-[#00C49A40] text-[#00C49A]" : "text-[#888]"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[#888]">Purpose</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {NRI_PURPOSES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() =>
                        setExtras((x) => ({
                          ...x,
                          nriPurpose: toggleChip(x.nriPurpose, p),
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        extras.nriPurpose.includes(p)
                          ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] text-[#888]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {role === "HNI" ? (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <label className="block">
                <span className="text-[#888]">Min ticket (Cr)</span>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isEditingCredentials}
                  value={hniMin}
                  onChange={(e) => setHniMin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                />
              </label>
              <label className="block">
                <span className="text-[#888]">Max ticket (Cr)</span>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isEditingCredentials}
                  value={hniMax}
                  onChange={(e) => setHniMax(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                />
              </label>
              <div className="sm:col-span-2">
                <p className="text-[#888]">Asset classes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HNI_ASSET_CLASSES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, hniAssets: toggleChip(p.hniAssets, a) }))}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        extras.hniAssets.includes(a)
                          ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] text-[#888]"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[#888]">Geography</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {extras.hniGeography.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, hniGeography: p.hniGeography.filter((x) => x !== c) }))}
                      className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-xs text-[#888]"
                    >
                      {c} ×
                    </button>
                  ))}
                </div>
                {isEditingCredentials ? (
                  <input
                    className="mt-2 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white"
                    placeholder="City and Enter"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (!v) return;
                      setExtras((p) => ({ ...p, hniGeography: p.hniGeography.includes(v) ? p.hniGeography : [...p.hniGeography, v] }));
                      (e.target as HTMLInputElement).value = "";
                    }}
                  />
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <p className="text-[#888]">Investment horizon</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Short term < 1yr", "Medium 1-3 years", "Long term 3yr+"].map((h) => (
                    <button
                      key={h}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, hniHorizon: h }))}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        extras.hniHorizon === h ? "border-[#00C49A40] text-[#00C49A]" : "border-[#2a2a2a] text-[#888]"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block sm:col-span-2">
                <span className="text-[#888]">Expected return</span>
                <select
                  disabled={!isEditingCredentials}
                  value={extras.hniExpectedReturn}
                  onChange={(e) => setExtras((p) => ({ ...p, hniExpectedReturn: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white disabled:opacity-80"
                >
                  {["8-12%", "12-18%", "18%+", "Capital appreciation only"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          {role === "BUYER" ? (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[#888]">Budget min (Cr)</span>
                  <input
                    type="number"
                    disabled={!isEditingCredentials}
                    className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                    value={extras.buyerBudgetMin}
                    onChange={(e) => setExtras((p) => ({ ...p, buyerBudgetMin: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-[#888]">Budget max (Cr)</span>
                  <input
                    type="number"
                    disabled={!isEditingCredentials}
                    className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                    value={extras.buyerBudgetMax}
                    onChange={(e) => setExtras((p) => ({ ...p, buyerBudgetMax: e.target.value }))}
                  />
                </label>
              </div>
              <div>
                <p className="text-[#888]">Property types</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BUYER_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, buyerTypes: toggleChip(p.buyerTypes, t) }))}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        extras.buyerTypes.includes(t)
                          ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] text-[#888]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[#888]">Preferred cities</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {extras.buyerCities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, buyerCities: p.buyerCities.filter((x) => x !== c) }))}
                      className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-xs text-[#888]"
                    >
                      {c} ×
                    </button>
                  ))}
                </div>
                {isEditingCredentials ? (
                  <input
                    className="mt-2 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white"
                    placeholder="City and Enter"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (!v) return;
                      setExtras((p) => ({ ...p, buyerCities: p.buyerCities.includes(v) ? p.buyerCities : [...p.buyerCities, v] }));
                      (e.target as HTMLInputElement).value = "";
                    }}
                  />
                ) : null}
              </div>
              <div>
                <p className="text-[#888]">Urgency</p>
                <div className="mt-2 inline-flex rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-1">
                  {["HOT", "WARM", "FLEXIBLE"].map((u) => (
                    <button
                      key={u}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, buyerUrgency: u }))}
                      className={`rounded px-3 py-1 text-xs ${
                        extras.buyerUrgency === u ? "bg-[#00C49A] text-black" : "text-[#888]"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {role === "SELLER" ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[#888]">Property types</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BUYER_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, sellerTypes: toggleChip(p.sellerTypes, t) }))}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        extras.sellerTypes.includes(t)
                          ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] text-[#888]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[#888]">Listing cities</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {extras.sellerCities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, sellerCities: p.sellerCities.filter((x) => x !== c) }))}
                      className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-xs text-[#888]"
                    >
                      {c} ×
                    </button>
                  ))}
                </div>
                {isEditingCredentials ? (
                  <input
                    className="mt-2 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white"
                    placeholder="City and Enter"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (!v) return;
                      setExtras((p) => ({ ...p, sellerCities: p.sellerCities.includes(v) ? p.sellerCities : [...p.sellerCities, v] }));
                      (e.target as HTMLInputElement).value = "";
                    }}
                  />
                ) : null}
              </div>
              <label className="block">
                <span className="text-[#888]">Reason for selling (optional)</span>
                <select
                  disabled={!isEditingCredentials}
                  value={extras.sellerReason}
                  onChange={(e) => setExtras((p) => ({ ...p, sellerReason: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                >
                  <option value="">Select</option>
                  <option value="Relocation">Relocation</option>
                  <option value="Liquidity">Liquidity</option>
                  <option value="Upgrade">Upgrade</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
          ) : null}
          {role === "INSTITUTIONAL_BUYER" ? (
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-[#888]">Organization name</span>
                <input
                  disabled={!isEditingCredentials}
                  value={extras.instOrgName}
                  onChange={(e) => setExtras((p) => ({ ...p, instOrgName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                />
              </label>
              <label className="block">
                <span className="text-[#888]">Organization type</span>
                <select
                  disabled={!isEditingCredentials}
                  value={extras.instOrgType}
                  onChange={(e) => setExtras((p) => ({ ...p, instOrgType: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                >
                  {ORG_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[#888]">Budget min (Cr)</span>
                  <input
                    type="number"
                    disabled={!isEditingCredentials}
                    value={extras.instBudgetMin}
                    onChange={(e) => setExtras((p) => ({ ...p, instBudgetMin: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-[#888]">Budget max (Cr)</span>
                  <input
                    type="number"
                    disabled={!isEditingCredentials}
                    value={extras.instBudgetMax}
                    onChange={(e) => setExtras((p) => ({ ...p, instBudgetMax: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                  />
                </label>
              </div>
              <div>
                <p className="text-[#888]">Target institution types</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {INSTITUTION_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, instTargetTypes: toggleChip(p.instTargetTypes, t) }))}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        extras.instTargetTypes.includes(t)
                          ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] text-[#888]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {role === "INSTITUTIONAL_SELLER" ? (
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-[#888]">Institution type</span>
                <select
                  disabled={!isEditingCredentials}
                  value={extras.instSellerType}
                  onChange={(e) => setExtras((p) => ({ ...p, instSellerType: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-[#888]">Transaction intent</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SELLER_INTENTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!isEditingCredentials}
                      onClick={() => setExtras((p) => ({ ...p, instIntent: toggleChip(p.instIntent, t) }))}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        extras.instIntent.includes(t)
                          ? "border-[#00C49A40] bg-[#00C49A15] text-[#00C49A]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] text-[#888]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-[#888]">City</span>
                <input
                  disabled={!isEditingCredentials}
                  value={extras.instSellerCity}
                  onChange={(e) => setExtras((p) => ({ ...p, instSellerCity: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                />
              </label>
              <label className="block">
                <span className="text-[#888]">Asking price range (Cr)</span>
                <input
                  disabled={!isEditingCredentials}
                  value={extras.instSellerPrice}
                  onChange={(e) => setExtras((p) => ({ ...p, instSellerPrice: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-white"
                />
              </label>
            </div>
          ) : null}
          {role === "ADMIN" ? <p className="text-sm text-[#888]">Admin credentials are managed by the system.</p> : null}
          {role !== "ADMIN" && isEditingCredentials ? (
            <div className="mt-4">
              <button type="button" onClick={() => void saveCredentials()} className="rounded-lg bg-[#00C49A] px-5 py-2 text-sm font-semibold text-black">
                Save credentials
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "preferences" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <h2 className="text-base font-semibold text-white">Notification settings</h2>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2">
                <span className="inline-flex items-center gap-2 text-[#ccc]">
                  <Bell className="h-4 w-4 text-[#00C49A]" />
                  In-app alerts
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(notifDraft.inAppAlerts)}
                  onChange={(e) => setNotifDraft((p) => ({ ...p, inAppAlerts: e.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2">
                <span className="inline-flex items-center gap-2 text-[#ccc]">
                  <MessageSquare className="h-4 w-4 text-[#00C49A]" />
                  WhatsApp digest
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(notifDraft.whatsappDigest)}
                  onChange={(e) => setNotifDraft((p) => ({ ...p, whatsappDigest: e.target.checked }))}
                />
              </label>
              {notifDraft.whatsappDigest ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs text-[#888]">
                    WhatsApp number (E.164)
                    <input
                      className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white"
                      value={notifDraft.whatsappDigestTo ?? ""}
                      onChange={(e) => setNotifDraft((p) => ({ ...p, whatsappDigestTo: e.target.value }))}
                      placeholder="+919876543210"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-[#888]">
                      Hour (0–23)
                      <input
                        type="number"
                        min={0}
                        max={23}
                        className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-2 py-2 text-sm text-white"
                        value={notifDraft.digestHourLocal ?? 9}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          setNotifDraft((p) => ({
                            ...p,
                            digestHourLocal: Number.isFinite(v) ? Math.min(23, Math.max(0, v)) : 9,
                          }));
                        }}
                      />
                    </label>
                    <label className="block text-xs text-[#888]">
                      Minute (0–59)
                      <input
                        type="number"
                        min={0}
                        max={59}
                        className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-2 py-2 text-sm text-white"
                        value={notifDraft.digestMinuteLocal ?? 30}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          setNotifDraft((p) => ({
                            ...p,
                            digestMinuteLocal: Number.isFinite(v) ? Math.min(59, Math.max(0, v)) : 30,
                          }));
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : null}
              <label className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 opacity-60">
                <span className="inline-flex items-center gap-2 text-[#ccc]">
                  <Mail className="h-4 w-4 text-[#00C49A]" />
                  Email (coming soon)
                </span>
                <input type="checkbox" disabled checked={false} />
              </label>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#555]">Alert types</p>
              {(
                [
                  { key: "matchAlerts" as const, label: "Match alerts", Icon: Zap },
                  { key: "slaWarnings" as const, label: "Compliance alerts", Icon: ShieldCheck },
                  { key: "dailyDigest" as const, label: "Daily digest", Icon: Bell },
                ] as const
              ).map(({ key, label, Icon }) => (
                <label key={key} className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-[#ccc]">
                    <Icon className="h-4 w-4 text-[#00C49A]" />
                    {label}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(notifDraft[key])}
                    onChange={(e) => setNotifDraft((p) => ({ ...p, [key]: e.target.checked }))}
                  />
                </label>
              ))}
              <label className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2">
                <span className="inline-flex items-center gap-2 text-[#ccc]">
                  <Briefcase className="h-4 w-4 text-[#00C49A]" />
                  Deal updates
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(notifDraft.dealUpdates)}
                  onChange={(e) => setNotifDraft((p) => ({ ...p, dealUpdates: e.target.checked }))}
                />
              </label>
            </div>
            <button type="button" onClick={() => void savePreferences()} className="mt-4 rounded-lg bg-[#00C49A] px-5 py-2 text-sm font-semibold text-black">
              Save preferences
            </button>
          </section>

          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <h2 className="text-base font-semibold text-white">Display preferences</h2>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <label className="block">
                <p className="mb-1 text-xs text-[#888]">Language</p>
                <select className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5 text-white">
                  <option>English</option>
                  <option disabled>Hindi (coming soon)</option>
                </select>
                <p className="mt-1 text-[11px] text-[#555]">More languages coming in Phase 2</p>
              </label>
              <div>
                <p className="mb-1 text-xs text-[#888]">Price format</p>
                <div className="inline-flex rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-1">
                  {[
                    { key: "cr", label: "₹ Cr" },
                    { key: "l", label: "₹ L" },
                    { key: "raw", label: "Raw ₹" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setCurrencyDisplay(opt.key);
                        if (typeof window !== "undefined") localStorage.setItem(CURRENCY_KEY, opt.key);
                      }}
                      className={`rounded px-3 py-1 text-xs ${currencyDisplay === opt.key ? "bg-[#00C49A] text-black" : "text-[#888]"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "security" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <h2 className="text-base font-semibold text-white">Active sessions</h2>
            <div className="mt-3 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-3 text-sm">
              <p className="inline-flex items-center gap-2 text-white">
                <Monitor className="h-4 w-4 text-[#00C49A]" />
                This device
                <span className="rounded border border-[#00C49A40] bg-[#00C49A15] px-2 py-0.5 text-[10px] text-[#00C49A]">Current session</span>
              </p>
              <p className="mt-1 text-xs text-[#888]">Last active: just now</p>
              <p className="mt-1 text-xs text-[#555]">Other session management coming in Phase 2</p>
            </div>
          </section>

          <section className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <h2 className="text-base font-semibold text-white">Login method</h2>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#888]">
              <Phone className="h-4 w-4 text-[#00C49A]" />
              {maskPhone(extras.whatsapp)}
            </p>
            <p className="mt-1 text-xs text-[#888]">Login via OTP to your registered mobile</p>
            <p className="mt-2 text-xs text-[#555]">Contact support to change your registered phone number.</p>
          </section>

          <section className="rounded-xl border border-[#FF444420] bg-[#111111] p-6">
            <h2 className="text-base font-semibold text-white">Account actions</h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white">Export my data</p>
                <p className="text-xs text-[#888]">Download all your data in CSV format</p>
              </div>
              <button type="button" onClick={() => router.push("/export")} className="rounded-lg border border-[#00C49A40] px-3 py-2 text-xs text-[#00C49A]">
                Export data
              </button>
            </div>
            <div className="my-4 h-px bg-[#2a2a2a]" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white">Delete account</p>
                <p className="text-xs text-[#888]">Permanently delete your account and all associated data.</p>
              </div>
              <button type="button" onClick={() => setIsDeleting(true)} className="rounded-lg border border-[#FF444440] px-3 py-2 text-xs text-[#FF4444]">
                Request deletion
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isDeleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
            <h3 className="text-base font-semibold text-white">Are you sure? This cannot be undone.</h3>
            <p className="mt-2 text-sm text-[#888]">Type DELETE to confirm request.</p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="mt-3 w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white"
              placeholder="DELETE"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setIsDeleting(false)} className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#888]">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm !== "DELETE") return toast.error("Please type DELETE to continue.");
                  setIsDeleting(false);
                  toast("Contact support@arbuildwel.com to delete your account.");
                }}
                className="rounded-lg border border-[#FF444440] px-4 py-2 text-sm text-[#FF4444]"
              >
                Request deletion
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
