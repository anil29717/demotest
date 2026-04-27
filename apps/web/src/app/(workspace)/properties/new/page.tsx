"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, FileText, Image as ImageIcon, MapPin, Send, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

const PT = ["RESIDENTIAL", "COMMERCIAL", "PLOT", "INSTITUTIONAL"] as const;
const DT = ["SALE", "RENT"] as const;
type OrgRow = { id: string; name?: string; organizationId?: string; isActive?: boolean };

export default function NewPropertyPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
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
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function mockUpload(files: FileList | null) {
    if (!token || !files?.length) return;
    setUploadMsg(null);
    const urls: string[] = [];
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const res = await apiFetch<{
          uploadUrl: string;
          publicUrl: string;
          method?: string;
          headers?: Record<string, string>;
        }>("/properties/upload-url", {
          method: "POST",
          token,
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });
        const uploadRes = await fetch(res.uploadUrl, {
          method: res.method ?? "PUT",
          headers: {
            "content-type": file.type || "application/octet-stream",
            ...(res.headers ?? {}),
          },
          body: file,
        });
        if (!uploadRes.ok) {
          failed += 1;
          continue;
        }
        urls.push(res.publicUrl);
      } catch {
        failed += 1;
      }
    }
    if (urls.length) {
      setForm((f) => ({
        ...f,
        imageUrlsText: [f.imageUrlsText, ...urls].filter(Boolean).join("\n"),
      }));
      setUploadMsg(
        failed
          ? `Uploaded ${urls.length} file(s). ${failed} failed.`
          : `Uploaded ${urls.length} file(s).`,
      );
      return;
    }
    setUploadMsg("Upload failed. Listing will show placeholder image until a valid image URL is saved.");
  }

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
    <div className="mx-auto max-w-2xl">
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
        <label className="block">
          Title
          <input
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label className="block">
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
        <label className="block">
          <span className="mb-1 block">City</span>
          <input
            required
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block">Area (public)</span>
          <input
            required
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.areaPublic}
            onChange={(e) => setForm((f) => ({ ...f, areaPublic: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block">Locality (public)</span>
          <input
            required
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.localityPublic}
            onChange={(e) => setForm((f) => ({ ...f, localityPublic: e.target.value }))}
          />
        </label>
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
          <span className="mb-1 block">Upload images</span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-zinc-200"
            onChange={(e) => void mockUpload(e.target.files)}
          />
        </label>
        {uploadMsg && <p className="text-xs text-zinc-500">{uploadMsg}</p>}
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
  );
}
