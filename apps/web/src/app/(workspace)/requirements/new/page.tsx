"use client";

import { Building2, ChevronLeft, Landmark, MapPin, Navigation, Send } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, getUserFacingErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { toStructuredLocation } from "@/lib/google-places";
import { citiesForState, INDIA_STATES } from "@/lib/india-locations";

const PT = ["RESIDENTIAL", "COMMERCIAL", "PLOT", "INSTITUTIONAL"] as const;
const DT = ["SALE", "RENT"] as const;
const UR = ["IMMEDIATE", "WITHIN_30_DAYS", "FLEXIBLE"] as const;

export default function NewRequirementPage() {
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { token, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const areaInputRef = useRef<HTMLInputElement | null>(null);
  const localityInputRef = useRef<HTMLInputElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    budgetMin: "",
    budgetMax: "",
    city: "",
    area: "",
    locality: "",
    areas: "",
    state: "",
    placeName: "",
    lat: "",
    lng: "",
    propertyType: "RESIDENTIAL",
    dealType: "SALE",
    areaSqftMin: "",
    areaSqftMax: "",
    urgency: "FLEXIBLE",
    selectedState: INDIA_STATES[0] ?? "Delhi",
  });

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
            area: f.area || f.locality,
            state: f.state,
            place_name: f.placeName,
            lat: f.lat ? Number(f.lat) : null,
            lng: f.lng ? Number(f.lng) : null,
          });
          return {
            ...f,
            city: structured.city || f.city,
            area: source === "area" ? place?.name || structured.area || f.area : f.area,
            locality:
              source === "locality"
                ? place?.name || structured.area || f.locality
                : source === "area"
                  ? structured.area || f.locality
                  : f.locality,
            placeName: structured.place_name || f.placeName,
            state: structured.state || f.state,
            lat: structured.lat != null ? String(structured.lat) : f.lat,
            lng: structured.lng != null ? String(structured.lng) : f.lng,
          };
        });
      };
      areaAuto.addListener("place_changed", () => applyPlace(areaAuto.getPlace(), "area"));
      localityAuto.addListener("place_changed", () => applyPlace(localityAuto.getPlace(), "locality"));
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setLoading(true);
    const areas = [form.area, form.locality, ...form.areas.split(",")]
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await apiFetch("/requirements", {
        method: "POST",
        token,
        body: JSON.stringify({
          budgetMin: Number(form.budgetMin),
          budgetMax: Number(form.budgetMax),
          city: form.city,
          areas: areas.length ? areas : [form.city],
          location:
            form.lat && form.lng
              ? {
                  place_name: form.placeName || `${form.locality || form.area}, ${form.city}`,
                  city: form.city,
                  area: form.area || form.locality || form.city,
                  state: form.state,
                  lat: Number(form.lat),
                  lng: Number(form.lng),
                }
              : undefined,
          propertyType: form.propertyType,
          dealType: form.dealType,
          areaSqftMin: Number(form.areaSqftMin),
          areaSqftMax: Number(form.areaSqftMax),
          urgency: form.urgency,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["requirements"] });
      await queryClient.invalidateQueries({ queryKey: ["requirements-mine"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-all"] });
      await queryClient.invalidateQueries({ queryKey: ["matches"] });
      router.push("/requirements");
    } catch (e) {
      const message = getUserFacingErrorMessage(e, "Requirement could not be posted. Please check your details and try again.");
      setErr(message);
      toast.error(message);
    } finally {
      setLoading(false);
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

  return (
    <div className="mx-auto w-full max-w-5xl text-zinc-100 [color-scheme:dark]">
      {googleMapsKey ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places`}
          strategy="afterInteractive"
        />
      ) : null}
      <div>
      <Link href="/requirements" className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-white">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-white">Post requirement</h1>
      <form onSubmit={submit} className="mt-6 space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            Budget min
            <div className="mt-1 flex rounded-lg border border-zinc-700 bg-zinc-900">
              <span className="px-3 py-2 text-zinc-500">₹</span>
            <input
              required
              type="number"
              className="w-full bg-transparent px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-500"
              value={form.budgetMin}
              onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
            />
            </div>
          </label>
          <label className="block">
            Budget max
            <div className="mt-1 flex rounded-lg border border-zinc-700 bg-zinc-900">
              <span className="px-3 py-2 text-zinc-500">₹</span>
              <input
                required
                type="number"
                className="w-full bg-transparent px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-500"
                value={form.budgetMax}
              onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
            />
            </div>
          </label>
        </div>
        <p className="text-xs text-zinc-500">
          = {formatINR(Number(form.budgetMin || 0))} - {formatINR(Number(form.budgetMax || 0))}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            State
            <div className="mt-1 flex items-center rounded border border-zinc-700 bg-zinc-900">
              <Landmark className="ml-2 h-4 w-4 text-zinc-500" />
              <select
                className="w-full bg-transparent px-3 py-2 text-zinc-100 outline-none [color-scheme:dark]"
                value={form.selectedState}
                onChange={(e) => {
                  const nextState = e.target.value;
                  const nextCity = citiesForState(nextState)[0] ?? "";
                  setForm((f) => ({
                    ...f,
                    selectedState: nextState,
                    state: nextState,
                    city: nextCity || f.city,
                  }));
                }}
              >
                {INDIA_STATES.map((state) => (
                  <option key={state} value={state} className="bg-zinc-900 text-zinc-100">
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="block">
            City
            <div className="mt-1 flex items-center rounded border border-zinc-700 bg-zinc-900">
              <Building2 className="ml-2 h-4 w-4 text-zinc-500" />
              <select
                required
                className="w-full bg-transparent px-3 py-2 text-zinc-100 outline-none [color-scheme:dark]"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              >
                <option value="" className="bg-zinc-900 text-zinc-100">Select city</option>
                {citiesForState(form.selectedState).map((city, idx) => (
                  <option key={`${city}-${idx}`} value={city} className="bg-zinc-900 text-zinc-100">
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>
        <label className="block">
          Area
          <input
            required
            ref={areaInputRef}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
          />
        </label>
        <label className="block">
          Locality
          <input
            required
            ref={localityInputRef}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
            value={form.locality}
            onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))}
            placeholder="Area or nearby landmark (eg. Sector 18, Near Metro)"
          />
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500"><Navigation className="h-3 w-3" /> Add landmark/area for better matching</p>
        </label>
        <label className="block">
          Additional areas (comma-separated, optional)
          <div className="mt-1 flex items-center rounded border border-zinc-700 bg-zinc-900">
            <Navigation className="ml-2 h-4 w-4 text-zinc-500" />
            <input
            className="w-full bg-transparent px-3 py-2 text-zinc-100 placeholder:text-zinc-500 outline-none"
            value={form.areas}
            onChange={(e) => setForm((f) => ({ ...f, areas: e.target.value }))}
          />
          </div>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Property type
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200"
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
            Deal type
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200"
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
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Sqft min
            <input
              required
              type="number"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
              value={form.areaSqftMin}
              onChange={(e) => setForm((f) => ({ ...f, areaSqftMin: e.target.value }))}
            />
          </label>
          <label>
            Sqft max
            <input
              required
              type="number"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
              value={form.areaSqftMax}
              onChange={(e) => setForm((f) => ({ ...f, areaSqftMax: e.target.value }))}
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {UR.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setForm((f) => ({ ...f, urgency: u }))}
              className={`rounded-lg border px-3 py-2 text-xs ${form.urgency === u ? "border-[#00C49A] text-[#00C49A]" : "border-zinc-700 text-zinc-400"}`}
            >
              {u === "IMMEDIATE" ? "🔥 HOT" : u === "WITHIN_30_DAYS" ? "~ WARM" : "FLEXIBLE"}
            </button>
          ))}
        </div>
        {user?.role === "NRI" ? (
          <label className="flex cursor-default items-center gap-3 rounded-lg border border-[#E85D8A40] bg-[#E85D8A10] px-3 py-3">
            <input type="checkbox" checked readOnly className="h-4 w-4 accent-[#E85D8A]" aria-readonly />
            <span className="text-sm text-white">I am a remote buyer (NRI/OCI)</span>
          </label>
        ) : null}
        {err && <p className="text-red-400">{err}</p>}
        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white">
          {loading ? "Posting..." : "Post requirement"} <Send className="h-4 w-4" />
        </button>
      </form>
      </div>
    </div>
  );
}
