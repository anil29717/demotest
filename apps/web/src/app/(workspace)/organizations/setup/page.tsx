"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

export default function OrgSetupPage() {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [rera, setRera] = useState("");
  const [gst, setGst] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [mine, setMine] = useState<
    {
      id: string;
      name?: string;
      organizationId: string;
      role: string;
      isActive?: boolean;
      organization: { id: string; name: string; reraNumber: string | null };
    }[]
  >([]);
  const [inviteRole, setInviteRole] = useState<"AGENT" | "VIEWER" | "ADMIN">("AGENT");
  const [inviteDays, setInviteDays] = useState("7");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [invites, setInvites] = useState<
    { id: string; code: string; token: string; role: string; status: string; inviteLink?: string; expiresAt: string }[]
  >([]);

  const loadMine = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<
      {
        id: string;
        name?: string;
        organizationId: string;
        role: string;
        isActive?: boolean;
        organization: { id: string; name: string; reraNumber: string | null };
      }[]
    >("/organizations/mine", { token });
    setMine(data);
  }, [token]);

  const loadInvites = useCallback(async () => {
    if (!token) return;
    const rows = await apiFetch<
      { id: string; code: string; token: string; role: string; status: string; inviteLink?: string; expiresAt: string }[]
    >("/organizations/invites", { token }).catch(() => []);
    setInvites(rows);
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMsg(null);
    try {
      const org = await apiFetch<{ id: string; name: string }>("/organizations", {
        method: "POST",
        token,
        body: JSON.stringify({ name, reraNumber: rera || undefined, gstNumber: gst || undefined }),
      });
      setMsg(`Created: ${org.name} (${org.id})`);
      setName("");
      setRera("");
      setGst("");
      await loadMine();
      await loadInvites();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setInviteMsg(null);
    try {
      const inv = await apiFetch<{ code: string; inviteLink?: string; role: string }>("/organizations/invites", {
        method: "POST",
        token,
        body: JSON.stringify({
          role: inviteRole,
          expiresInDays: Number(inviteDays || 7),
        }),
      });
      setInviteMsg(
        `Invite created (${inv.role}) — code: ${inv.code}${inv.inviteLink ? ` · link: ${inv.inviteLink}` : ""}`,
      );
      await loadInvites();
    } catch (e) {
      setInviteMsg(e instanceof Error ? e.message : "Unable to create invite");
    }
  }

  useEffect(() => {
    void loadMine();
    void loadInvites();
  }, [loadMine, loadInvites]);

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
      <h1 className="text-xl font-semibold">Create broker organization</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Firm name
          <input
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          RERA (optional)
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={rera}
            onChange={(e) => setRera(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          GST (optional)
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-500"
        >
          Create
        </button>
      </form>
      {msg && <p className="mt-4 text-sm text-zinc-400">{msg}</p>}
      <div className="mt-8">
        <p className="text-sm font-medium text-zinc-300">My organizations</p>
        <ul className="mt-2 space-y-2 text-sm text-zinc-500">
          {mine.map((m) => (
            <li key={m.id} className="rounded border border-zinc-800 px-3 py-2">
              {m.organization.name} ({m.organization.id}) · role {m.role}
              {m.isActive ? " · active" : ""}
              {" · "}RERA {m.organization.reraNumber ?? "—"}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8 rounded border border-zinc-800 p-4">
        <p className="text-sm font-medium text-zinc-300">Invite teammates</p>
        <form onSubmit={createInvite} className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs">
            Role
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "AGENT" | "VIEWER" | "ADMIN")}
            >
              <option value="AGENT">AGENT</option>
              <option value="VIEWER">VIEWER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <label className="block text-xs">
            Expires in (days)
            <input
              type="number"
              min={1}
              max={30}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
              value={inviteDays}
              onChange={(e) => setInviteDays(e.target.value)}
            />
          </label>
          <button type="submit" className="self-end rounded border border-teal-600 px-3 py-2 text-sm text-teal-300">
            Create invite
          </button>
        </form>
        {inviteMsg ? <p className="mt-2 text-xs text-zinc-400">{inviteMsg}</p> : null}
        <ul className="mt-3 space-y-2 text-xs text-zinc-500">
          {invites.map((inv) => (
            <li key={inv.id} className="rounded border border-zinc-800 px-2 py-2">
              {inv.code} · {inv.role} · {inv.status} · expires {new Date(inv.expiresAt).toLocaleDateString()}
              {inv.inviteLink ? (
                <span className="block break-all text-zinc-400">Link: {inv.inviteLink}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
