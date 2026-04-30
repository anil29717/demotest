"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  verified: boolean;
  onboardingStep: string | null;
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const queryKey = useMemo(() => ["admin-users", token, q, role], [token, q, role]);
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    enabled: Boolean(token),
    queryFn: () =>
      apiFetch<{ data: UserRow[] }>(
        `/user/admin/list?q=${encodeURIComponent(q)}${
          role !== "ALL" ? `&role=${encodeURIComponent(role)}` : ""
        }`,
        { token: token ?? undefined },
      ).catch(() => ({ data: [] })),
  });
  const rows = data?.data ?? [];

  async function setRoleForUser(id: string, nextRole: string) {
    if (!token) return;
    setBusyId(id);
    try {
      await apiFetch(`/user/admin/${id}/role`, {
        method: "PUT",
        token,
        body: JSON.stringify({ role: nextRole }),
      });
      toast.success("Role updated");
      await refetch();
    } catch {
      toast.error("Could not update role");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
        <Users className="h-5 w-5 text-[#00C49A]" />
        Users
      </h1>
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name/email/id"
          className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm"
        >
          <option value="ALL">All roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="BROKER">BROKER</option>
          <option value="BUYER">BUYER</option>
          <option value="SELLER">SELLER</option>
          <option value="INSTITUTIONAL_BUYER">INSTITUTIONAL_BUYER</option>
          <option value="INSTITUTIONAL_SELLER">INSTITUTIONAL_SELLER</option>
          <option value="NRI">NRI</option>
          <option value="HNI">HNI</option>
          <option value="BUILDER">BUILDER</option>
        </select>
      </div>
      {isLoading ? <p className="text-sm text-zinc-500">Loading users…</p> : null}
      {!isLoading && rows.length === 0 ? <p className="text-sm text-zinc-500">No users found.</p> : null}
      <ul className="space-y-2">
        {rows.map((u) => (
          <li key={u.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-100">{u.name ?? "Unnamed user"}</p>
                <p className="text-xs text-zinc-500">{u.email ?? u.id}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {u.verified ? "Verified" : "Unverified"} · onboarding {u.onboardingStep ?? "—"}
                </p>
              </div>
              <select
                value={u.role}
                disabled={busyId === u.id}
                onChange={(e) => void setRoleForUser(u.id, e.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="BROKER">BROKER</option>
                <option value="BUYER">BUYER</option>
                <option value="SELLER">SELLER</option>
                <option value="INSTITUTIONAL_BUYER">INSTITUTIONAL_BUYER</option>
                <option value="INSTITUTIONAL_SELLER">INSTITUTIONAL_SELLER</option>
                <option value="NRI">NRI</option>
                <option value="HNI">HNI</option>
                <option value="BUILDER">BUILDER</option>
              </select>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
