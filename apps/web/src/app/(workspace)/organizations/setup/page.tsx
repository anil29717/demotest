"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

type OrgMineRow = {
  id: string;
  name?: string;
  organizationId: string;
  role: string;
  isActive?: boolean;
  organization: {
    id: string;
    name: string;
    reraNumber: string | null;
    gstNumber?: string | null;
  };
};

export default function OrgSetupPage() {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [rera, setRera] = useState("");
  const [gst, setGst] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [mine, setMine] = useState<OrgMineRow[]>([]);
  const [inviteRole, setInviteRole] = useState<"AGENT" | "VIEWER" | "ADMIN">("AGENT");
  const [inviteDays, setInviteDays] = useState("7");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [invites, setInvites] = useState<
    { id: string; code: string; token: string; role: string; status: string; inviteLink?: string; expiresAt: string }[]
  >([]);

  const loadMine = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<OrgMineRow[]>("/organizations/mine", { token });
    setMine(data);
  }, [token]);

  const loadInvites = useCallback(async () => {
    if (!token) return;
    const rows = await apiFetch<
      { id: string; code: string; token: string; role: string; status: string; inviteLink?: string; expiresAt: string }[]
    >("/organizations/invites", { token }).catch(() => []);
    setInvites(rows);
  }, [token]);

  function notifySidebarOrgsUpdated() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ar-buildwel-orgs-changed"));
    }
  }

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
      setMsg(null);
      toast.success(`Created “${org.name}”. It appears below and in your sidebar profile.`);
      setName("");
      setRera("");
      setGst("");
      await loadMine();
      await loadInvites();
      notifySidebarOrgsUpdated();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Error";
      setMsg(m);
      toast.error(m);
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
    <div className="mx-auto max-w-lg space-y-8 text-zinc-100 [color-scheme:dark]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Organization</h1>
          <p className="mt-1 text-sm text-zinc-500">Create a firm workspace, then invite agents.</p>
        </div>
        <a
          href="#create-organization-form"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#00C49A] px-4 py-2.5 text-sm font-medium text-black hover:opacity-95"
        >
          <Building2 className="h-4 w-4" />
          Create organization
        </a>
      </div>

      {msg ? <p className="text-sm text-red-400">{msg}</p> : null}

      <section id="create-organization-form" className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-medium text-zinc-300">New organization</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block text-sm">
            Firm name
            <input
              required
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MSD Realty"
            />
          </label>
          <label className="block text-sm">
            RERA (optional)
            <input
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={rera}
              onChange={(e) => setRera(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            GST (optional)
            <input
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white hover:bg-teal-500 sm:w-auto"
          >
            Create organization
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-300">My organizations</h2>
        <ul className="mt-3 space-y-3">
          {mine.map((m) => (
            <li key={m.organization.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
              <p className="font-medium text-white">{m.organization.name}</p>
              <p className="mt-1 break-all font-mono text-xs text-zinc-500">{m.organization.id}</p>
              {m.organization.reraNumber ? (
                <p className="mt-2 text-xs text-zinc-400">RERA: {m.organization.reraNumber}</p>
              ) : null}
              {m.organization.gstNumber ? (
                <p className="mt-1 text-xs text-zinc-400">GST: {m.organization.gstNumber}</p>
              ) : null}
            </li>
          ))}
        </ul>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No organizations yet — use Create organization above.</p>
        ) : null}
      </section>

      <div className="rounded-xl border border-zinc-800 p-4">
        <p className="text-sm font-medium text-zinc-300">Invite teammates</p>
        <form onSubmit={createInvite} className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs">
            Role
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-200"
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
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              value={inviteDays}
              onChange={(e) => setInviteDays(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="self-end rounded border border-teal-600 px-3 py-2 text-sm text-teal-300 hover:bg-teal-950/40"
          >
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
