"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

type OrgRow = {
  id: string;
  name: string;
  reraNumber: string | null;
  gstNumber: string | null;
  createdAt: string;
  counts: {
    members: number;
    invites: number;
    properties: number;
    deals: number;
    serviceRequests: number;
  };
};

export default function AdminOrganizationsPage() {
  const { token } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-orgs", token],
    enabled: Boolean(token),
    queryFn: () =>
      apiFetch<OrgRow[]>("/organizations/admin/list", {
        token: token ?? undefined,
      }).catch(() => []),
  });
  return (
    <div className="space-y-4">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
        <Building2 className="h-5 w-5 text-[#00C49A]" />
        Organizations
      </h1>
      {isLoading ? <p className="text-sm text-zinc-500">Loading organizations…</p> : null}
      {!isLoading && data.length === 0 ? (
        <p className="text-sm text-zinc-500">No organizations found.</p>
      ) : null}
      <ul className="space-y-2">
        {data.map((o) => (
          <li key={o.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-sm font-medium text-zinc-100">{o.name}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {o.id} · RERA {o.reraNumber ?? "—"} · GST {o.gstNumber ?? "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Members {o.counts.members} · Invites {o.counts.invites} · Properties{" "}
              {o.counts.properties} · Deals {o.counts.deals} · Services{" "}
              {o.counts.serviceRequests}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
