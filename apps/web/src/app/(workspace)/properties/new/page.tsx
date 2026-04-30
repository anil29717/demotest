"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronLeft, FileText, Image as ImageIcon, Landmark, MapPin, Navigation, Send, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl, getUserFacingErrorMessage } from "@/lib/api";
import { resolvePropertyImageUrlForDisplay, validateImageFileForUpload } from "@/lib/property-images";
import { formatINR } from "@/lib/format";
import { toStructuredLocation, type StructuredLocation } from "@/lib/google-places";
import { citiesForState, INDIA_STATES } from "@/lib/india-locations";

const PT = ["RESIDENTIAL", "COMMERCIAL", "PLOT", "INSTITUTIONAL"] as const;
const DT = ["SALE", "RENT"] as const;
type OrgRow = { id: string; name?: string; organizationId?: string; isActive?: boolean };

export default function NewPropertyPage() {
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { token, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const areaInputRef = useRef<HTMLInputElement | null>(null);
  const localityInputRef = useRef<HTMLInputElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    propertyType: "RESIDENTIAL",
    dealType: "SALE",
    price: "",
    areaSqft: "",
    city: "",
    areaPublic: "",
    localityPublic: "",
    addressPrivate: "Private — not shown publicly",
    latitude: "28.6139",
    longitude: "77.209",
    organizationId: "",
    imageUrlsText: "",
    isHighOpportunity: false,
    reasonForSelling: "",
    timeline: "",
    negotiable: false,
    state: INDIA_STATES[0] ?? "Delhi",
    location: {
      place_name: "",
      city: "",
      area: "",
      state: "",
      lat: 28.6139,
      lng: 77.209,
    } as StructuredLocation,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    const imageUrls = form.imageUrlsText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await apiFetch("/properties", {
        method: "POST",
        token,
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          propertyType: form.propertyType,
          dealType: form.dealType,
          price: Number(form.price),
          areaSqft: Number(form.areaSqft),
          city: form.city,
          areaPublic: form.areaPublic,
          localityPublic: form.localityPublic,
          addressPrivate: form.addressPrivate,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          location: form.location,
          organizationId: form.organizationId || undefined,
          imageUrls: imageUrls.length ? imageUrls : undefined,
          isHighOpportunity: form.isHighOpportunity,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      await queryClient.invalidateQueries({ queryKey: ["properties-mine"] });
      await queryClient.invalidateQueries({ queryKey: ["properties-market"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-all"] });
      await queryClient.invalidateQueries({ queryKey: ["matches"] });
      router.push("/properties");
    } catch (e) {
      const message = getUserFacingErrorMessage(
        e,
        "Property could not be published. Please review your inputs and try again.",
      );
      setErr(message);
      toast.error(message, { duration: 5000 });
    }
  }

  async function mockUpload(files: FileList | null) {
    if (!token || !files?.length) return;
    setUploadMsg(null);
    setUploading(true);
    const urls: string[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const v = validateImageFileForUpload(file);
      if (!v.ok) {
        errors.push(`${file.name}: ${v.reason}`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(apiUrl("/properties/files"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const text = await res.text();
        if (!res.ok) {
          let detail = text;
          try {
            const j = JSON.parse(text) as { message?: string | string[] };
            if (Array.isArray(j.message)) detail = j.message.join(", ");
            else if (typeof j.message === "string") detail = j.message;
          } catch {
            /* raw text */
          }
          errors.push(`${file.name}: ${detail || res.statusText}`);
          continue;
        }
        let body: { url?: string };
        try {
          body = JSON.parse(text) as { url?: string };
        } catch {
          errors.push(`${file.name}: Invalid server response`);
          continue;
        }
        if (!body.url) {
          errors.push(`${file.name}: No URL returned`);
          continue;
        }
        urls.push(body.url);
      } catch (e) {
        errors.push(`${file.name}: ${getUserFacingErrorMessage(e, "Upload failed")}`);
      }
    }
    setUploading(false);
    if (urls.length) {
      setForm((f) => ({
        ...f,
        imageUrlsText: [f.imageUrlsText, ...urls].filter(Boolean).join("\n"),
      }));
      toast.success(
        urls.length === 1
          ? "Image uploaded. Confirm previews below, then publish."
          : `${urls.length} images uploaded. Confirm previews below, then publish.`,
      );
    }
    if (errors.length) {
      toast.error(errors.slice(0, 4).join(" · "), { duration: 6500 });
      setUploadMsg(
        errors.length > 4
          ? `${errors.length} files had issues — JPG/PNG only, max 15MB each.`
          : errors.join(" "),
      );
    } else if (!urls.length) {
      toast.error("No images uploaded.");
      setUploadMsg("Choose JPG or PNG files (max 15MB each).");
    }
  }

  useEffect(() => {
    const urls = form.imageUrlsText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    setSelectedFiles(urls);
  }, [form.imageUrlsText]);

  useEffect(() => {
    if (!token || user?.role === "SELLER") return;
    let cancelled = false;
    void apiFetch<OrgRow[]>("/organizations/mine", { token })
      .then((rows) => {
        if (cancelled) return;
        setOrgs(rows);
        const active = rows.find((row) => row.isActive) ?? rows[0];
        if (active && !form.organizationId) {
          const resolved = active.organizationId || active.id;
          setForm((f) => ({ ...f, organizationId: resolved }));
        }
      })
      .catch(() => {
        if (!cancelled) setOrgs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role, form.organizationId]);

  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      const g = (window as any).google;
      if (!g?.maps?.places || !areaInputRef.current || !localityInputRef.current) {
        attempts += 1;
        if (attempts > 20) window.clearInterval(timer);
        return;
      }
      window.clearInterval(timer);
      const fields = ["address_components", "geometry", "formatted_address", "name"];
      const areaAuto = new g.maps.places.Autocomplete(areaInputRef.current, { fields, types: ["geocode"] });
      const localityAuto = new g.maps.places.Autocomplete(localityInputRef.current, { fields, types: ["geocode"] });
      const applyPlace = (place: any, source: "city" | "area" | "locality") => {
        setForm((f) => {
          const structured = toStructuredLocation(place, {
            city: f.city,
            area: f.areaPublic,
            place_name: f.location.place_name,
            state: f.location.state,
            lat: Number(f.latitude),
            lng: Number(f.longitude),
          });
          return {
            ...f,
            city: structured.city || f.city,
            areaPublic:
              source === "area" || source === "locality"
                ? structured.area || place?.name || f.areaPublic
                : f.areaPublic,
            localityPublic:
              source === "locality"
                ? place?.name || structured.area || f.localityPublic
                : source === "area"
                  ? structured.area || f.localityPublic
                  : f.localityPublic,
            latitude: String(structured.lat ?? f.latitude),
            longitude: String(structured.lng ?? f.longitude),
            location: structured,
          };
        });
      };
      areaAuto.addListener("place_changed", () => applyPlace(areaAuto.getPlace(), "area"));
      localityAuto.addListener("place_changed", () => applyPlace(localityAuto.getPlace(), "locality"));
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>{" "}
        to post a listing.
      </p>
    );

  return (
    <div className="mx-auto w-full max-w-5xl [color-scheme:dark]">
      {googleMapsKey ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places`}
          strategy="afterInteractive"
        />
      ) : null}
      <div>
          <Link href="/properties" className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Post property</h1>
          {user?.role === "SELLER" ? (
            <p className="mt-2 text-sm text-[#888]">List your property and get matched with verified buyers automatically.</p>
          ) : (
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-amber-300">
              <ShieldAlert className="h-4 w-4" /> Do not include phone, email, or URLs — platform rule.
            </p>
          )}
          <form onSubmit={submit} className="mt-6 space-y-3 text-sm">
        <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
          <p className="mb-3 inline-flex items-center gap-2 font-medium text-white"><FileText className="h-4 w-4 text-[#00C49A]" /> Basic details</p>
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          Title
          <input
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label className="block sm:col-span-2">
          Description
          <textarea
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <p className="mt-1 text-right text-xs text-zinc-500">{form.description.length}/500</p>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Type
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.propertyType}
              onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}
            >
              {PT.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deal
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.dealType}
              onChange={(e) => setForm((f) => ({ ...f, dealType: e.target.value }))}
            >
              {DT.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>
        </div>
        </section>
        <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
          <p className="mb-3 font-medium text-white">Pricing & size</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Price (INR)
            <input
              required
              type="number"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </label>
          <label>
            Area (sqft)
            <input
              required
              type="number"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.areaSqft}
              onChange={(e) => setForm((f) => ({ ...f, areaSqft: e.target.value }))}
            />
          </label>
        </div>
          <p className="text-xs text-zinc-500">Live: {formatINR(Number(form.price || 0))}</p>
        </section>
        <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
          <p className="mb-3 inline-flex items-center gap-2 font-medium text-white">
            <MapPin className="h-4 w-4 text-[#00C49A]" /> <span>Location</span>
          </p>
          <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 inline-flex items-center gap-1">State <Landmark className="h-3.5 w-3.5 text-[#888]" /></span>
            <select
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 [color-scheme:dark]"
              value={form.state}
              onChange={(e) => {
                const nextState = e.target.value;
                const nextCity = citiesForState(nextState)[0] ?? "";
                setForm((f) => ({
                  ...f,
                  state: nextState,
                  city: nextCity || f.city,
                  location: { ...f.location, state: nextState, city: nextCity || f.city },
                }));
              }}
            >
              {INDIA_STATES.map((state) => (
                <option key={state} value={state} className="bg-zinc-900 text-zinc-100">
                  {state}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 inline-flex items-center gap-1">City <Building2 className="h-3.5 w-3.5 text-[#888]" /></span>
            <select
              required
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 [color-scheme:dark]"
              value={form.city}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  city: e.target.value,
                  location: { ...f.location, city: e.target.value },
                }))
              }
            >
              <option value="" className="bg-zinc-900 text-zinc-100">Select city</option>
              {citiesForState(form.state).map((city, idx) => (
                <option key={`${city}-${idx}`} value={city} className="bg-zinc-900 text-zinc-100">
                  {city}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block">Area (public)</span>
          <input
            required
            ref={areaInputRef}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.areaPublic}
            onChange={(e) => setForm((f) => ({ ...f, areaPublic: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-1 inline-flex items-center gap-1">Locality / Nearby landmark <Navigation className="h-3.5 w-3.5 text-[#888]" /></span>
          <input
            required
            ref={localityInputRef}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.localityPublic}
            onChange={(e) => setForm((f) => ({ ...f, localityPublic: e.target.value }))}
            placeholder="Eg. Near Metro Station, Sector 62, Opp City Mall"
          />
        </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block">Lat / Long</span>
          <div className="mt-1 flex gap-2">
            <input
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
            />
            <input
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
            />
          </div>
        </label>
        {user?.role !== "SELLER" ? (
          <label className="block">
            <span className="mb-1 block">Organization ID (optional — broker team)</span>
            <select
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={form.organizationId}
              onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
            >
              <option value="">Independent (no organization)</option>
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
        ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 hover:border-zinc-600">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={form.isHighOpportunity}
            onChange={(e) => setForm((f) => ({ ...f, isHighOpportunity: e.target.checked }))}
          />
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border border-zinc-600 bg-zinc-900 peer-checked:border-[#00C49A] peer-checked:bg-[#00C49A]">
            <Check className="h-3.5 w-3.5 text-black opacity-0 peer-checked:opacity-100" />
          </span>
          <span>High-Opportunity Investment Deal (distressed / special situation)</span>
        </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 hover:border-zinc-600">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={form.dealType === "SALE" && form.isHighOpportunity}
              onChange={(e) => setForm((f) => ({ ...f, isHighOpportunity: e.target.checked }))}
            />
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border border-zinc-600 bg-zinc-900 peer-checked:border-[#00C49A] peer-checked:bg-[#00C49A]">
              <Check className="h-3.5 w-3.5 text-black opacity-0 peer-checked:opacity-100" />
            </span>
            <span>Bank auction property</span>
          </label>
        </div>
          {user?.role === "SELLER" ? (
            <details className="mt-3 rounded-lg border border-[#1f1f1f] p-3">
              <summary className="cursor-pointer text-xs text-[#888]">Seller motivation fields</summary>
              <div className="mt-3 grid gap-3">
                <label>
                  Reason for selling
                  <select className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2" value={form.reasonForSelling} onChange={(e)=>setForm((f)=>({...f, reasonForSelling:e.target.value}))}>
                    <option value="">Select</option>
                    <option>Upgrading</option>
                    <option>Relocation</option>
                    <option>Investment exit</option>
                    <option>Financial need</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  Timeline
                  <select className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2" value={form.timeline} onChange={(e)=>setForm((f)=>({...f, timeline:e.target.value}))}>
                    <option value="">Select</option>
                    <option>Immediate (&lt; 1 month)</option>
                    <option>1–3 months</option>
                    <option>3–6 months</option>
                    <option>Flexible</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.negotiable} onChange={(e)=>setForm((f)=>({...f, negotiable:e.target.checked}))} />
                  Negotiable
                </label>
              </div>
            </details>
          ) : null}
          </div>
        </section>
        <section className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
          <p className="mb-3 inline-flex items-center gap-2 font-medium text-white">
            <ImageIcon className="h-4 w-4 text-[#00C49A]" /> <span>Images</span>
          </p>
          <div className="space-y-3">
        <label className="block">
          <span className="mb-1 inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5 text-[#888]" /> Upload images</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            disabled={uploading}
            className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-zinc-200 disabled:opacity-50"
            onChange={(e) => void mockUpload(e.target.files)}
          />
        </label>
        {uploading ? (
          <p className="text-xs text-[#00C49A]">Uploading…</p>
        ) : null}
        {uploadMsg && !uploading ? <p className="text-xs text-zinc-500">{uploadMsg}</p> : null}
        <label className="block">
          <span className="mb-1 block">Image URLs (https, one per line)</span>
          <textarea
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs"
            rows={4}
            value={form.imageUrlsText}
            onChange={(e) => setForm((f) => ({ ...f, imageUrlsText: e.target.value }))}
            placeholder="https://images.unsplash.com/..."
          />
        </label>
        {selectedFiles.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {selectedFiles.slice(0, 9).map((url) => (
              <div key={url} className="overflow-hidden rounded-lg border border-[#1f1f1f] bg-[#0d0d0d]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvePropertyImageUrlForDisplay(url)}
                  alt="Property preview"
                  className="h-24 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/placeholder-property.png";
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
          </div>
        </section>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00C49A] to-[#00A882] px-4 py-2 font-medium text-black"
        >
          {user?.role === "SELLER" ? "List my property" : "Publish listing"} <Send className="h-4 w-4" />
        </button>
          </form>
      </div>
    </div>
  );
}
