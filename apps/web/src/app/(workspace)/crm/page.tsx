"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Calendar,
  ChevronRight,
  MessageSquare,
  MoreHorizontal,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, getUserFacingErrorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { PageSkeleton } from "@/components/ui/skeleton";

type Lead = {
  id: string;
  leadName: string;
  source: string;
  status: string;
  pipelineStage: string | null;
  createdAt: string;
  notes?: { id: string; body: string; createdAt: string }[];
  followUps?: { id: string; dueAt: string; note: string | null; completed: boolean }[];
  propertyId?: string | null;
  requirementId?: string | null;
};

type OrgRow = { id: string; name?: string; organizationId?: string; isActive?: boolean };

const STAGES = ["LEAD", "MATCH", "SITE_VISIT", "NEGOTIATION", "LEGAL", "CLOSURE"] as const;

export default function CrmPage() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Lead | null>(null);
  const [newLead, setNewLead] = useState({ leadName: "", source: "manual", stage: "LEAD" });
  const [showAdd, setShowAdd] = useState(false);
  const [activeStage, setActiveStage] = useState<(typeof STAGES)[number]>("LEAD");
  const [openMenuLeadId, setOpenMenuLeadId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [followupAt, setFollowupAt] = useState("");
  const [followupNote, setFollowupNote] = useState("");

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations-mine", token],
    enabled: Boolean(token),
    queryFn: () =>
      apiFetch<OrgRow[]>("/organizations/mine", { token: token ?? undefined }).catch(() => []),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const activeOrg = (orgs ?? []).find((o) => o.isActive) ?? orgs?.[0] ?? null;
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const orgId = selectedOrgId || (activeOrg ? activeOrg.organizationId || activeOrg.id : null);

  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: ["organizations-mine"] });
    };
    window.addEventListener("ar-buildwel-orgs-changed", handler);
    return () => window.removeEventListener("ar-buildwel-orgs-changed", handler);
  }, [queryClient]);

  useEffect(() => {
    if (selectedOrgId || !activeOrg) return;
    setSelectedOrgId(activeOrg.organizationId || activeOrg.id);
  }, [activeOrg, selectedOrgId]);

  useEffect(() => {
    if (!selectedOrgId || !orgs?.length) return;
    const allowed = new Set((orgs ?? []).map((o) => o.organizationId || o.id));
    if (!allowed.has(selectedOrgId)) {
      const fallback = activeOrg ? activeOrg.organizationId || activeOrg.id : "";
      setSelectedOrgId(fallback);
    }
  }, [selectedOrgId, orgs, activeOrg]);

  const leadsQueryKey = useMemo(() => ["leads", orgId, token] as const, [orgId, token]);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: leadsQueryKey,
    enabled: Boolean(token) && orgs !== undefined,
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "50" });
      if (orgId) qs.set("organizationId", orgId);
      return apiFetch<Lead[]>(`/leads?${qs.toString()}`, {
        token: token ?? undefined,
      }).catch(() => []);
    },
    staleTime: 1000 * 60 * 1,
  });
  const leadsInActiveStage = useMemo(
    () => leads.filter((l) => (l.pipelineStage ?? "LEAD") === activeStage),
    [leads, activeStage],
  );

  async function refetchLeadsAndReselect(prevId: string | null) {
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    if (!prevId || !token) return;
    const qs = new URLSearchParams({ limit: "50" });
    if (orgId) qs.set("organizationId", orgId);
    const refreshed = await apiFetch<Lead[]>(`/leads?${qs.toString()}`, {
      token: token ?? undefined,
    }).catch(() => []);
    setSelected(refreshed.find((l) => l.id === prevId) ?? null);
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newLead.leadName.trim()) return;
    if (!orgId) {
      toast.error("Create or join an organization before adding leads.");
      return;
    }
    const body: Record<string, unknown> = {
      leadName: newLead.leadName,
      source: newLead.source,
      pipelineStage: newLead.stage,
      organizationId: orgId,
    };
    try {
      await apiFetch("/leads", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      });
      setNewLead({ leadName: "", source: "manual", stage: "LEAD" });
      toast.success("Lead added");
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      toast.error(getUserFacingErrorMessage(err, "Could not create lead. Please try again."));
    }
  }

  async function moveLead(id: string, stage: string) {
    if (!token) return;
    await apiFetch(`/leads/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ pipelineStage: stage }),
    });
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  }

  function nextPipelineStage(current: string | null): (typeof STAGES)[number] | null {
    const currentStage = (current ?? "LEAD") as (typeof STAGES)[number];
    const idx = STAGES.indexOf(currentStage);
    if (idx < 0 || idx >= STAGES.length - 1) return null;
    return STAGES[idx + 1];
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selected || !note.trim()) return;
    const sid = selected.id;
    await apiFetch(`/leads/${sid}/notes`, {
      method: "POST",
      token,
      body: JSON.stringify({ body: note }),
    });
    setNote("");
    await refetchLeadsAndReselect(sid);
  }

  async function addFollowup(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selected || !followupAt) return;
    const sid = selected.id;
    await apiFetch(`/leads/${sid}/followup`, {
      method: "POST",
      token,
      body: JSON.stringify({ dueAt: new Date(followupAt).toISOString(), note: followupNote }),
    });
    setFollowupAt("");
    setFollowupNote("");
    await refetchLeadsAndReselect(sid);
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (orgsLoading || leadsLoading) {
    return (
      <div className="grid grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <PageSkeleton key={i} count={2} type="card" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
            <Users className="h-6 w-6 text-[#00C49A]" />
            CRM leads
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Stage tabs + notes + follow-up scheduling
            {orgId ? (
              <span className="ml-2 text-zinc-600">· Organization scoped</span>
            ) : (
              <span className="ml-2 text-amber-600/90">
                · Join an organization to capture leads under an org workspace
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          disabled={Boolean(orgs && orgs.length === 0)}
          title={
            orgs && orgs.length === 0
              ? "Create or join an organization first"
              : undefined
          }
          className="inline-flex items-center gap-2 rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UserPlus className="h-4 w-4" />
          Add lead +
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={createLead}
          className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-[#00C49A30] bg-[#0f0f0f] p-4 text-sm"
        >
          <label>
            Name
            <input
              className="mt-1 w-44 rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={newLead.leadName}
              onChange={(e) => setNewLead((f) => ({ ...f, leadName: e.target.value }))}
            />
          </label>
          <label>
            Source
            <input
              className="mt-1 w-36 rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={newLead.source}
              onChange={(e) => setNewLead((f) => ({ ...f, source: e.target.value }))}
            />
          </label>
          <label>
            Stage
            <select
              className="mt-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={newLead.stage}
              onChange={(e) => setNewLead((f) => ({ ...f, stage: e.target.value }))}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!orgId}
            className="rounded bg-teal-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add lead
          </button>
        </form>
      )}

      {orgs && orgs.length === 0 ? (
        <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200">No organization yet</p>
          <p className="mt-1 text-amber-100/80">
            Leads are stored under a broker organization. Create one (or accept an invite), then add leads here.
          </p>
          <Link
            href="/organizations/setup"
            className="mt-2 inline-block text-[#00C49A] underline underline-offset-2 hover:text-[#33d4b3]"
          >
            Set up organization →
          </Link>
        </div>
      ) : null}

      {orgs && orgs.length > 0 ? (
        <div className="mt-4 max-w-md">
          <label className="block text-xs text-zinc-500">
            Organization context
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              value={orgId ?? ""}
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              {orgs.map((o) => {
                const oid = o.organizationId || o.id;
                return (
                  <option key={oid} value={oid}>
                    {(o.name || "Organization")} ({oid})
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
        <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
          {STAGES.map((stage) => {
            const count = leads.filter((l) => (l.pipelineStage ?? "LEAD") === stage).length;
            const isActive = stage === activeStage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setActiveStage(stage)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "border-[#00C49A] bg-[#00C49A]/15 text-[#00C49A]"
                    : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {stage.replace("_", " ")} ({count})
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          {leadsInActiveStage.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
              No leads in {activeStage.replace("_", " ")} stage.
            </div>
          ) : (
            leadsInActiveStage.map((l) => (
              <div key={l.id} className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/crm/${l.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-base font-medium text-zinc-100">{l.leadName}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {l.source} · {timeAgo(l.createdAt)}
                    </p>
                  </button>

                  <div className="relative flex items-center gap-1">
                    <button
                      type="button"
                      title="Open notes"
                      onClick={() => router.push(`/crm/${l.id}?panel=notes`)}
                      className="rounded border border-zinc-700 p-1.5 text-zinc-400 transition hover:border-teal-600 hover:text-teal-300"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Schedule follow-up"
                      onClick={() => router.push(`/crm/${l.id}?panel=followups`)}
                      className="rounded border border-zinc-700 p-1.5 text-zinc-400 transition hover:border-teal-600 hover:text-teal-300"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="More actions"
                      onClick={() => setOpenMenuLeadId((prev) => (prev === l.id ? null : l.id))}
                      className="rounded border border-zinc-700 p-1.5 text-zinc-400 transition hover:border-teal-600 hover:text-teal-300"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {openMenuLeadId === l.id ? (
                      <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-zinc-700 bg-zinc-950 p-1 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuLeadId(null);
                            router.push(`/crm/${l.id}`);
                          }}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                        >
                          Open lead
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                        </button>
                        {nextPipelineStage(l.pipelineStage) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuLeadId(null);
                              void moveLead(l.id, nextPipelineStage(l.pipelineStage) as string);
                            }}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                          >
                            Move to {String(nextPipelineStage(l.pipelineStage)).replace("_", " ")}
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                          </button>
                        ) : null}
                        {l.propertyId && l.requirementId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuLeadId(null);
                              router.push(`/deals/new?propertyId=${l.propertyId}&requirementId=${l.requirementId}`);
                            }}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-teal-300 hover:bg-zinc-800"
                          >
                            Convert to deal
                            <ChevronRight className="h-3.5 w-3.5 text-teal-400" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <Link
                      href={`/crm/${l.id}`}
                      className="ml-1 rounded border border-teal-700/60 px-2 py-1 text-xs text-teal-300 hover:bg-teal-900/20"
                    >
                      Open
                    </Link>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {STAGES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void moveLead(l.id, s)}
                      className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-zinc-500"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {orgId && leads.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
          <p className="text-zinc-200">No leads in this organization yet.</p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#00C49A] px-3 py-2 font-medium text-black"
          >
            <UserPlus className="h-4 w-4" />
            Create lead
          </button>
        </div>
      ) : null}

      {selected ? (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
          <p className="font-medium text-zinc-100">Lead detail: {selected.leadName}</p>
          <p className="mt-1 text-zinc-500">
            Status {selected.status} · Stage {selected.pipelineStage ?? "—"}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <form onSubmit={addNote}>
              <p className="text-zinc-300">Add note</p>
              <textarea
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button type="submit" className="mt-2 rounded border border-zinc-600 px-3 py-1.5 text-zinc-200">
                Save note
              </button>
            </form>
            <form onSubmit={addFollowup}>
              <p className="text-zinc-300">Schedule follow-up</p>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
                value={followupAt}
                onChange={(e) => setFollowupAt(e.target.value)}
              />
              <input
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
                placeholder="Note (optional)"
                value={followupNote}
                onChange={(e) => setFollowupNote(e.target.value)}
              />
              <button type="submit" className="mt-2 rounded border border-zinc-600 px-3 py-1.5 text-zinc-200">
                Save follow-up
              </button>
            </form>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-zinc-300">Notes</p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                {(selected.notes ?? []).map((n) => (
                  <li key={n.id}>
                    {new Date(n.createdAt).toLocaleString()} · {n.body}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-zinc-300">Follow-ups</p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                {(selected.followUps ?? []).map((f) => (
                  <li key={f.id}>
                    {new Date(f.dueAt).toLocaleString()} · {f.note ?? "No note"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
