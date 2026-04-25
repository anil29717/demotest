"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Briefcase, Building2, Download, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl } from "@/lib/api";

export default function ExportPage() {
  const { token, user } = useAuth();
  const [organizationId, setOrganizationId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!token || user?.role === "SELLER") return;
    let cancelled = false;
    void apiFetch<{ id: string; name: string }[]>("/organizations/mine", { token })
      .then((rows) => {
        if (cancelled) return;
        setOrgs(rows);
        if (!organizationId && rows[0]?.id) setOrganizationId(rows[0].id);
      })
      .catch(() => {
        if (!cancelled) setOrgs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role, organizationId]);

  async function download(kind: "deals" | "properties" | "leads") {
    if (!token) return;
    const oid = organizationId.trim();
    if (user?.role !== "SELLER" && !oid) {
      setMessage("Enter an organization ID (same as used in deals / CRM).");
      return;
    }
    setMessage(null);
    const url =
      user?.role === "SELLER"
        ? apiUrl(`/export/${kind}`)
        : apiUrl(`/export/${kind}?organizationId=${encodeURIComponent(oid)}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 403) {
        setMessage("Forbidden: you can export only organizations you belong to. Select one from your list.");
      } else {
        setMessage(text || `Request failed (${res.status})`);
      }
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${kind}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
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
    <div className="mx-auto max-w-lg text-sm">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold"><Download className="h-5 w-5 text-[#00C49A]" />Export data</h1>
      <p className="mt-1 text-zinc-500">Download your CRM data in CSV format.</p>
      {user?.role !== "SELLER" ? (
        <label className="mt-6 block">
          <span className="text-xs text-zinc-500">Organization</span>
          <select
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          >
            {orgs.length === 0 ? (
              <option value="">No organizations found</option>
            ) : (
              orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.id})
                </option>
              ))
            )}
          </select>
        </label>
      ) : null}
      <div
        className={`mt-4 grid gap-3 ${user?.role === "SELLER" || user?.role === "NRI" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
      >
        {user?.role !== "SELLER" && user?.role !== "NRI" ? (
          <button
            type="button"
            className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4 text-left"
            onClick={() => void download("leads")}
          >
            <Users className="h-6 w-6 text-[#00C49A]" />
            <p className="mt-2 font-medium">Leads</p>
            <p className="text-xs text-zinc-500">All CRM leads with stage and source</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-[#00C49A]">Download CSV</span>
          </button>
        ) : null}
        <button type="button" className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4 text-left" onClick={() => void download("deals")}><Briefcase className="h-6 w-6 text-[#00C49A]" /><p className="mt-2 font-medium">Deals</p><p className="text-xs text-zinc-500">Active and closed deals</p><span className="mt-3 inline-flex items-center gap-1 text-xs text-[#00C49A]">Download CSV</span></button>
        <button type="button" className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-4 text-left" onClick={() => void download("properties")}><Building2 className="h-6 w-6 text-[#00C49A]" /><p className="mt-2 font-medium">Properties</p><p className="text-xs text-zinc-500">All listings with status</p><span className="mt-3 inline-flex items-center gap-1 text-xs text-[#00C49A]">Download CSV</span></button>
      </div>
      {message && <p className="mt-4 text-xs text-amber-400">{message}</p>}
    </div>
  );
}
