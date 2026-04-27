"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

type OrgMine = {
  id: string;
  name?: string;
  organizationId: string;
  isActive?: boolean;
  organization?: { id: string; name: string };
};

export function NewDealForm() {
  const { token } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const [orgs, setOrgs] = useState<OrgMine[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    organizationId: "",
    requirementId: "",
    propertyId: "",
    institutionId: "",
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      requirementId: sp.get("requirementId") ?? f.requirementId,
      propertyId: sp.get("propertyId") ?? f.propertyId,
    }));
  }, [sp]);

  useEffect(() => {
    if (!token) return;
    apiFetch<OrgMine[]>("/organizations/mine", { token })
      .then((o) => {
        setOrgs(o);
        const active = o.find((row) => row.isActive) ?? o[0];
        if (active) setForm((f) => ({ ...f, organizationId: active.organizationId || active.id }));
      })
      .catch(() => setOrgs([]));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    try {
      const body: Record<string, string> = {
        organizationId: form.organizationId,
        requirementId: form.requirementId,
      };
      if (form.propertyId) body.propertyId = form.propertyId;
      if (form.institutionId) body.institutionId = form.institutionId;
      await apiFetch("/deals", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      });
      router.push("/deals");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
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
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold">Create deal</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Requires an organization.{" "}
        <Link href="/organizations/setup" className="text-teal-400">
          Create one
        </Link>
        .
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3 text-sm">
        <label className="block">
          Organization
          <select
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={form.organizationId}
            onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
          >
            <option value="">Select…</option>
            {orgs.map((o) => (
              <option key={o.organizationId || o.id} value={o.organizationId || o.id}>
                {(o.name || o.organization?.name || "Organization")} ({o.organizationId || o.id})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Requirement ID
          <input
            required
            className="mt-1 w-full font-mono text-xs"
            value={form.requirementId}
            onChange={(e) => setForm((f) => ({ ...f, requirementId: e.target.value }))}
          />
        </label>
        <label className="block">
          Property ID (optional if institutional)
          <input
            className="mt-1 w-full font-mono text-xs"
            value={form.propertyId}
            onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value }))}
          />
        </label>
        <label className="block">
          Institution ID (optional)
          <input
            className="mt-1 w-full font-mono text-xs"
            value={form.institutionId}
            onChange={(e) => setForm((f) => ({ ...f, institutionId: e.target.value }))}
          />
        </label>
        {err && <p className="text-red-400">{err}</p>}
        <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-white">
          Create
        </button>
      </form>
    </div>
  );
}
