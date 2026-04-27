"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Landmark,
  MapPin,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";

type Role =
  | "ADMIN"
  | "BROKER"
  | "BUYER"
  | "SELLER"
  | "NRI"
  | "HNI"
  | "INSTITUTIONAL_BUYER"
  | "INSTITUTIONAL_SELLER";

const EXPERIENCE_OPTIONS = ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"];
const BROKER_SPECIALIZATIONS = ["Residential", "Commercial", "Luxury", "Industrial", "Institutional", "NRI deals"];
const BUYER_PROPERTY_TYPES = ["Residential", "Commercial", "Plot"];
const NRI_PURPOSES = ["Buy property", "Sell property", "Rental income", "Monitor property", "Investment"];
const HNI_ASSET_CLASSES = ["Residential", "Commercial", "Distressed", "Bank Auction", "Institutional"];
const INSTITUTION_TYPES = ["K-12 School", "College", "University"];
const ORG_TYPES = ["PE Fund", "Education Group", "Family Office", "Trust", "Corporate", "Other"];
const SELLER_INTENTS = ["Sale", "Lease", "JV", "Management Takeover"];
const OPERATING_CITY_OPTIONS = [
  "Guangzhou",
  "Shanghai",
  "Tokyo",
  "Delhi",
  "Jakarta",
  "Mumbai",
  "Manila",
  "Mexico City",
  "Seoul",
  "Dhaka",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Pune",
  "Jaipur",
  "Lucknow",
  "Surat",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Bhopal",
  "Beijing",
  "Bangkok",
  "Singapore",
  "Karachi",
  "Kuala Lumpur",
  "Dubai",
  "London",
  "Paris",
  "Berlin",
  "Madrid",
  "Rome",
  "Moscow",
  "Amsterdam",
  "Vienna",
  "Istanbul",
  "New York City",
  "Los Angeles",
  "Chicago",
  "Sao Paulo",
  "Toronto",
  "Buenos Aires",
  "Rio de Janeiro",
  "Lagos",
  "Cairo",
  "Johannesburg",
  "Nairobi",
  "Kinshasa",
  "Sydney",
  "Melbourne",
  "Auckland",
] as const;

const roleColor: Record<string, string> = {
  BROKER: "text-[#00C49A] border-[#00C49A40]",
  SELLER: "text-[#5BAD8F] border-[#5BAD8F40]",
  BUYER: "text-[#58A6FF] border-[#58A6FF40]",
  NRI: "text-[#A78BFA] border-[#A78BFA40]",
  HNI: "text-[#F59E0B] border-[#F59E0B40]",
  INSTITUTIONAL_BUYER: "text-[#22D3EE] border-[#22D3EE40]",
  INSTITUTIONAL_SELLER: "text-[#34D399] border-[#34D39940]",
  ADMIN: "text-[#E5E7EB] border-[#E5E7EB40]",
};

const finalRedirect: Record<string, string> = {
  BROKER: "/dashboard",
  SELLER: "/properties/new",
  BUYER: "/matches",
  NRI: "/verticals/nri",
  HNI: "/verticals/hni",
  INSTITUTIONAL_BUYER: "/institutions",
  INSTITUTIONAL_SELLER: "/institutions",
  ADMIN: "/dashboard",
};

function toggleChip(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const role = (user?.role ?? "BUYER") as Role;
  const totalSteps = role === "BROKER" ? 4 : role === "ADMIN" ? 1 : 2;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState((user as { email?: string } | null)?.email ?? "");
  const [whatsapp, setWhatsapp] = useState(
    (user as { whatsapp?: string; phone?: string } | null)?.whatsapp ??
      (user as { whatsapp?: string; phone?: string } | null)?.phone ??
      "",
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [reraId, setReraId] = useState("");
  const [experience, setExperience] = useState(EXPERIENCE_OPTIONS[1]);
  const [gstNumber, setGstNumber] = useState("");
  const [brokerSpecialization, setBrokerSpecialization] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [primaryCity, setPrimaryCity] = useState("");
  const [orgMode, setOrgMode] = useState<"independent" | "team">("independent");
  const [orgName, setOrgName] = useState("");
  const [joinMode, setJoinMode] = useState<"join" | "create">("join");
  const [inviteCode, setInviteCode] = useState("");
  const inviteToken = searchParams.get("invite") ?? "";

  const [hasProperty, setHasProperty] = useState(true);
  const [sellerPropertyType, setSellerPropertyType] = useState("Residential");
  const [sellerCity, setSellerCity] = useState("");
  const [sellerPrice, setSellerPrice] = useState("");

  const [buyerTypes, setBuyerTypes] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [buyerCityInput, setBuyerCityInput] = useState("");
  const [buyerCities, setBuyerCities] = useState<string[]>([]);
  const [urgency, setUrgency] = useState("WARM");

  const [nriCountry, setNriCountry] = useState("");
  const [nriCity, setNriCity] = useState("");
  const [nriZone, setNriZone] = useState("");
  const [nriPurpose, setNriPurpose] = useState<string[]>([]);

  const [hniMin, setHniMin] = useState("");
  const [hniMax, setHniMax] = useState("");
  const [hniAssets, setHniAssets] = useState<string[]>([]);
  const [hniCityInput, setHniCityInput] = useState("");
  const [hniCities, setHniCities] = useState<string[]>([]);

  const [instOrgName, setInstOrgName] = useState("");
  const [instOrgType, setInstOrgType] = useState(ORG_TYPES[0]);
  const [instBudgetMin, setInstBudgetMin] = useState("");
  const [instBudgetMax, setInstBudgetMax] = useState("");
  const [instTargetTypes, setInstTargetTypes] = useState<string[]>([]);

  const [instSellerType, setInstSellerType] = useState(INSTITUTION_TYPES[0]);
  const [instIntent, setInstIntent] = useState<string[]>([]);
  const [instSellerCity, setInstSellerCity] = useState("");
  const [instSellerPrice, setInstSellerPrice] = useState("");

  const initials = useMemo(() => {
    const source = name.trim() || user?.name || "User";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [name, user?.name]);

  function addTag(value: string, setter: (next: string[]) => void, current: string[]) {
    const trimmed = value.trim();
    if (!trimmed || current.includes(trimmed)) return;
    setter([...current, trimmed]);
  }

  function removeTag(value: string, setter: (next: string[]) => void, current: string[]) {
    setter(current.filter((x) => x !== value));
  }

  function canContinue(): boolean {
    if (!name.trim()) return false;
    if (role === "BROKER" && step === 2 && !reraId.trim()) return false;
    if (
      role === "BROKER" &&
      step === 4 &&
      orgMode === "team" &&
      joinMode === "create" &&
      !orgName.trim()
    )
      return false;
    if (role === "BROKER" && step === totalSteps && cities.length === 0) return false;
    if (role === "NRI" && step === 2 && !nriCountry.trim()) return false;
    if (role === "INSTITUTIONAL_BUYER" && step === 2 && !instOrgName.trim()) return false;
    return true;
  }

  async function handleContinue() {
    if (!token) return;
    setSaving(true);
    try {
      const profileData: Record<string, unknown> = {};

      if (step === 1 && name.trim()) {
        profileData.name = name.trim();
      }

      if (role === "BROKER" && step === 2 && reraId.trim()) {
        profileData.reraId = reraId.trim();
      }

      if (role === "BROKER" && step === 3 && cities.length > 0) {
        profileData.serviceAreas = cities;
      }

      if (Object.keys(profileData).length > 0) {
        await apiFetch("/user/profile", {
          method: "PUT",
          token,
          body: JSON.stringify(profileData),
        }).catch(() => {
          console.warn("Step save failed silently");
        });
      }

      setStep((prev) => Math.min(totalSteps, prev + 1));
    } finally {
      setSaving(false);
    }
  }

  async function completeSetup() {
    if (!token) return;
    setSaving(true);
    try {
      const roleNeedsOrg =
        role === "BROKER" || role === "INSTITUTIONAL_BUYER" || role === "INSTITUTIONAL_SELLER";
      if (roleNeedsOrg) {
        const memberships = await apiFetch<{ organizationId: string }[]>("/organizations/mine", {
          token,
        }).catch(() => []);
        if (!memberships.length) {
          if (role === "BROKER") {
            if (orgMode === "independent") {
              toast.error("Brokers must join or create an organization.");
              return;
            }
            if (joinMode === "join") {
              const code = inviteCode.trim();
              if (!code && !inviteToken) {
                toast.error("Enter invite code or use an invite link.");
                return;
              }
              await apiFetch("/organizations/join", {
                method: "POST",
                token,
                body: JSON.stringify({ code: code || undefined, token: inviteToken || undefined }),
              });
            } else {
              await apiFetch("/organizations", {
                method: "POST",
                token,
                body: JSON.stringify({
                  name: orgName.trim(),
                  reraNumber: reraId.trim() || undefined,
                  gstNumber: gstNumber.trim() || undefined,
                }),
              });
            }
          } else {
            const code = inviteCode.trim();
            if (!instOrgName.trim() && !inviteToken && !code) {
              toast.error("Institutional roles must join or create an organization.");
              return;
            }
            if (inviteToken || code) {
              await apiFetch("/organizations/join", {
                method: "POST",
                token,
                body: JSON.stringify({ token: inviteToken || undefined, code: code || undefined }),
              });
            } else {
              await apiFetch("/organizations", {
                method: "POST",
                token,
                body: JSON.stringify({ name: instOrgName.trim() }),
              });
            }
          }
        }
      }

      if (role === "BROKER" && cities.length > 0) {
        await apiFetch("/user/profile", {
          method: "PUT",
          token,
          body: JSON.stringify({
            serviceAreas: cities,
            name: name.trim() || undefined,
            reraId: reraId.trim() || undefined,
          }),
        });
      }

      await apiFetch("/user/onboarding", {
        method: "PUT",
        token,
        body: JSON.stringify({ step: "complete" }),
      });
      toast.success("Profile complete! Welcome to AR Buildwel.");
      router.push(finalRedirect[role] ?? "/dashboard");
    } catch (err: unknown) {
      let message = "Failed to complete setup. Please try again.";
      if (err instanceof Error) {
        message = err.message;
      }
      if (
        message.toLowerCase().includes("service area") ||
        message.toLowerCase().includes("servicearea")
      ) {
        message = "Please add at least one city where you operate before completing setup.";
      }
      toast.error(message);
    } finally {
      setSaving(false);
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

  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-white">Complete your profile</h1>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleColor[role] ?? roleColor.ADMIN}`}>
            Setting up as: {role}
          </span>
        </div>
        <p className="mt-2 text-xs text-[#888888]">
          Step {step} of {totalSteps}
        </p>
        <div className="mt-2 h-2 rounded-full bg-[#1f1f1f]">
          <div className="h-2 rounded-full bg-[#00C49A] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5 text-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <UserCircle className="h-8 w-8 text-[#00C49A]" />
              Tell us about yourself
            </h2>
            <label className="block">
              Full name <span className="text-[#FF6B6B]">*</span>
              <input
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <div>
              <p>Profile photo (optional)</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#333333] bg-[#0b0b0b] text-sm font-semibold text-[#a3a3a3]">
                  {photoPreview ? (
                    <Image src={photoPreview} alt="Profile preview" width={80} height={80} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    initials
                  )}
                </div>
                <label className="cursor-pointer rounded-lg border border-dashed border-[#444444] px-3 py-2 text-xs text-[#a3a3a3] hover:border-[#00C49A] hover:text-[#00C49A]">
                  Upload photo or drag & drop
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      setPhotoPreview(url);
                    }}
                  />
                </label>
              </div>
            </div>
            <label className="block">
              Email address
              <input
                type="email"
                placeholder="your@email.com"
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              WhatsApp number (for deal alerts)
              <input
                type="tel"
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </label>
          </div>
        )}

        {role === "BROKER" && step === 2 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <ShieldCheck className="h-7 w-7 text-[#00C49A]" />
              Professional credentials
            </h2>
            <label className="block">
              RERA ID <span className="text-[#FF6B6B]">*</span>
              <input
                placeholder="MH/RERA/A123456"
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={reraId}
                onChange={(e) => setReraId(e.target.value)}
              />
            </label>
            <label className="block">
              Years of experience
              <select
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                {EXPERIENCE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              GST number
              <input
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
              />
            </label>
            <div>
              <p>Specialization</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {BROKER_SPECIALIZATIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setBrokerSpecialization((prev) => toggleChip(prev, item))}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      brokerSpecialization.includes(item)
                        ? "border-[#00C49A] bg-[#00C49A20] text-[#00C49A]"
                        : "border-[#333333] text-[#a3a3a3]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {role === "BROKER" && step === 3 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <MapPin className="h-7 w-7 text-[#00C49A]" />
              Where do you operate?
            </h2>
            <div>
              <p>Cities you operate in</p>
              <div className="mt-1 flex gap-2">
                <input
                  list="operating-city-options"
                  className="w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(cityInput, setCities, cities);
                      setCityInput("");
                    }
                  }}
                  placeholder="Select or type city"
                />
                <datalist id="operating-city-options">
                  {OPERATING_CITY_OPTIONS.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => {
                    addTag(cityInput, setCities, cities);
                    setCityInput("");
                  }}
                  className="rounded-lg border border-[#333333] px-3 py-2 text-xs text-[#a3a3a3] hover:border-[#00C49A] hover:text-[#00C49A]"
                >
                  Add city
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => removeTag(city, setCities, cities)}
                    className="rounded-full border border-[#333333] px-3 py-1 text-xs text-[#a3a3a3]"
                  >
                    {city} ×
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              Primary city
              <select
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={primaryCity}
                onChange={(e) => setPrimaryCity(e.target.value)}
              >
                <option value="">Select</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {role === "BROKER" && step === 4 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Building2 className="h-7 w-7 text-[#00C49A]" />
              Your organization
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setOrgMode("independent")}
                className={`rounded-xl border p-4 text-left ${orgMode === "independent" ? "border-[#00C49A] bg-[#00C49A10]" : "border-[#333333]"}`}
              >
                <p className="font-medium text-white">I work independently</p>
                <p className="mt-1 text-xs text-[#888888]">Your listings are personal</p>
              </button>
              <button
                type="button"
                onClick={() => setOrgMode("team")}
                className={`rounded-xl border p-4 text-left ${orgMode === "team" ? "border-[#00C49A] bg-[#00C49A10]" : "border-[#333333]"}`}
              >
                <p className="font-medium text-white">I&apos;m part of a team</p>
                <p className="mt-1 text-xs text-[#888888]">Join an org or create one</p>
              </button>
            </div>
            {orgMode === "team" && (
              <div className="space-y-3">
                <label className="block">
                  Organization name
                  <input
                    className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setJoinMode("join")}
                    className={`rounded-lg border px-3 py-2 text-xs ${joinMode === "join" ? "border-[#00C49A] text-[#00C49A]" : "border-[#333333] text-[#a3a3a3]"}`}
                  >
                    Join with invite code
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinMode("create")}
                    className={`rounded-lg border px-3 py-2 text-xs ${joinMode === "create" ? "border-[#00C49A] text-[#00C49A]" : "border-[#333333] text-[#a3a3a3]"}`}
                  >
                    Create new org
                  </button>
                </div>
                {joinMode === "join" && (
                  <input
                    placeholder="Invite code"
                    className="w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>
        )}
        {role === "BROKER" && step === totalSteps && cities.length === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <span className="text-xs text-amber-400">
              ⚠ You must add at least one operating city in Step 3 before completing setup.
            </span>
          </div>
        )}

        {role === "SELLER" && step === 2 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Building2 className="h-7 w-7 text-[#00C49A]" />
              About your property
            </h2>
            <div className="inline-flex rounded-lg border border-[#333333] p-1">
              <button
                type="button"
                onClick={() => setHasProperty(true)}
                className={`rounded px-3 py-1 ${hasProperty ? "bg-[#00C49A] text-black" : "text-[#a3a3a3]"}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setHasProperty(false)}
                className={`rounded px-3 py-1 ${!hasProperty ? "bg-[#00C49A] text-black" : "text-[#a3a3a3]"}`}
              >
                No
              </button>
            </div>
            {hasProperty ? (
              <div className="space-y-3">
                <label className="block">
                  Property type
                  <select
                    className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                    value={sellerPropertyType}
                    onChange={(e) => setSellerPropertyType(e.target.value)}
                  >
                    {BUYER_PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  City
                  <input
                    className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                    value={sellerCity}
                    onChange={(e) => setSellerCity(e.target.value)}
                  />
                </label>
                <label className="block">
                  Approximate price (Rs Cr)
                  <input
                    className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                    value={sellerPrice}
                    onChange={(e) => setSellerPrice(e.target.value)}
                  />
                </label>
                <p className="text-xs text-[#888888]">You can add full details after setup.</p>
              </div>
            ) : (
              <p className="text-sm text-[#888888]">No problem - you can list anytime from your dashboard.</p>
            )}
          </div>
        )}

        {role === "BUYER" && step === 2 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Search className="h-7 w-7 text-[#00C49A]" />
              What are you looking for?
            </h2>
            <div>
              <p>Property type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {BUYER_PROPERTY_TYPES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setBuyerTypes((prev) => toggleChip(prev, item))}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      buyerTypes.includes(item) ? "border-[#00C49A] text-[#00C49A]" : "border-[#333333] text-[#a3a3a3]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                Budget min (Rs Cr)
                <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
              </label>
              <label className="block">
                Budget max (Rs Cr)
                <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
              </label>
            </div>
            <div>
              <p>Preferred cities</p>
              <input
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={buyerCityInput}
                onChange={(e) => setBuyerCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(buyerCityInput, setBuyerCities, buyerCities);
                    setBuyerCityInput("");
                  }
                }}
                placeholder="Type city and press Enter"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {buyerCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => removeTag(city, setBuyerCities, buyerCities)}
                    className="rounded-full border border-[#333333] px-3 py-1 text-xs text-[#a3a3a3]"
                  >
                    {city} ×
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p>Urgency</p>
              <div className="mt-2 inline-flex rounded-lg border border-[#333333] p-1">
                {["HOT 🔥", "WARM", "FLEXIBLE"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setUrgency(item)}
                    className={`rounded px-3 py-1 text-xs ${urgency === item ? "bg-[#00C49A] text-black" : "text-[#a3a3a3]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#888888]">
              We&apos;ll create your first requirement automatically and start matching.
            </p>
          </div>
        )}

        {role === "NRI" && step === 2 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Globe className="h-7 w-7 text-[#00C49A]" />
              Your NRI profile
            </h2>
            <label className="block">
              Country of residence <span className="text-[#FF6B6B]">*</span>
              <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={nriCountry} onChange={(e) => setNriCountry(e.target.value)} />
            </label>
            <label className="block">
              City abroad
              <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={nriCity} onChange={(e) => setNriCity(e.target.value)} />
            </label>
            <label className="block">
              Time zone (e.g. EST / GMT+4)
              <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={nriZone} onChange={(e) => setNriZone(e.target.value)} />
            </label>
            <div>
              <p>Purpose</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {NRI_PURPOSES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setNriPurpose((prev) => toggleChip(prev, item))}
                    className={`rounded-full border px-3 py-1 text-xs ${nriPurpose.includes(item) ? "border-[#00C49A] text-[#00C49A]" : "border-[#333333] text-[#a3a3a3]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {role === "HNI" && step === 2 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <TrendingUp className="h-7 w-7 text-[#00C49A]" />
              Investment preferences
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                Min ticket size (Rs Cr)
                <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={hniMin} onChange={(e) => setHniMin(e.target.value)} />
              </label>
              <label className="block">
                Max ticket size (Rs Cr)
                <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={hniMax} onChange={(e) => setHniMax(e.target.value)} />
              </label>
            </div>
            <div>
              <p>Asset classes</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HNI_ASSET_CLASSES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setHniAssets((prev) => toggleChip(prev, item))}
                    className={`rounded-full border px-3 py-1 text-xs ${hniAssets.includes(item) ? "border-[#00C49A] text-[#00C49A]" : "border-[#333333] text-[#a3a3a3]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p>Target cities</p>
              <input
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={hniCityInput}
                onChange={(e) => setHniCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(hniCityInput, setHniCities, hniCities);
                    setHniCityInput("");
                  }
                }}
                placeholder="Type city and press Enter"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {hniCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => removeTag(city, setHniCities, hniCities)}
                    className="rounded-full border border-[#333333] px-3 py-1 text-xs text-[#a3a3a3]"
                  >
                    {city} ×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {role === "INSTITUTIONAL_BUYER" && step === 2 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Landmark className="h-7 w-7 text-[#00C49A]" />
              Your organization
            </h2>
            <label className="block">
              Organization name <span className="text-[#FF6B6B]">*</span>
              <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={instOrgName} onChange={(e) => setInstOrgName(e.target.value)} />
            </label>
            <label className="block">
              Invite code (optional, if joining existing org)
              <input
                placeholder="ORG-INVITE-CODE"
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </label>
            <label className="block">
              Organization type
              <select className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={instOrgType} onChange={(e) => setInstOrgType(e.target.value)}>
                {ORG_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                Acquisition budget min (Rs Cr)
                <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={instBudgetMin} onChange={(e) => setInstBudgetMin(e.target.value)} />
              </label>
              <label className="block">
                Acquisition budget max (Rs Cr)
                <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={instBudgetMax} onChange={(e) => setInstBudgetMax(e.target.value)} />
              </label>
            </div>
            <div>
              <p>Target institution types</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {INSTITUTION_TYPES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setInstTargetTypes((prev) => toggleChip(prev, item))}
                    className={`rounded-full border px-3 py-1 text-xs ${instTargetTypes.includes(item) ? "border-[#00C49A] text-[#00C49A]" : "border-[#333333] text-[#a3a3a3]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {role === "INSTITUTIONAL_SELLER" && step === 2 && (
          <div className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Landmark className="h-7 w-7 text-[#00C49A]" />
              Your institution
            </h2>
            <label className="block">
              Institution type
              <select className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={instSellerType} onChange={(e) => setInstSellerType(e.target.value)}>
                {INSTITUTION_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Invite code (optional, if joining existing org)
              <input
                placeholder="ORG-INVITE-CODE"
                className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </label>
            <div>
              <p>Transaction intent</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SELLER_INTENTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setInstIntent((prev) => toggleChip(prev, item))}
                    className={`rounded-full border px-3 py-1 text-xs ${instIntent.includes(item) ? "border-[#00C49A] text-[#00C49A]" : "border-[#333333] text-[#a3a3a3]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              City
              <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={instSellerCity} onChange={(e) => setInstSellerCity(e.target.value)} />
            </label>
            <label className="block">
              Asking price range (Rs Cr, optional)
              <input className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0b0b0b] px-3 py-2 text-white" value={instSellerPrice} onChange={(e) => setInstSellerPrice(e.target.value)} />
            </label>
            <p className="text-xs text-[#888888]">Institution name kept confidential on platform.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        {step === 1 ? (
          <button
            type="button"
            className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-[#a3a3a3]"
            onClick={() => router.push("/dashboard")}
          >
            Skip for now
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[#333333] px-4 py-2 text-sm text-[#a3a3a3]"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {step < totalSteps ? (
          <button
            type="button"
            disabled={!canContinue()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00C49A] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void handleContinue()}
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!canContinue() || saving}
            className="rounded-lg bg-[#00C49A] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void completeSetup()}
          >
            {saving ? "Completing..." : "Complete setup ✓"}
          </button>
        )}
      </div>
    </div>
  );
}
