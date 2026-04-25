"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MessageSquare, MoreHorizontal, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
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
};

const STAGES = ["LEAD", "MATCH", "SITE_VISIT", "NEGOTIATION", "LEGAL", "CLOSURE"] as const;

export default function CrmPage() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [newLead, setNewLead] = useState({ leadName: "", source: "manual", stage: "LEAD" });
  const [showAdd, setShowAdd] = useState(false);
  const [note, setNote] = useState("");
  const [followupAt, setFollowupAt] = useState("");
  const [followupNote, setFollowupNote] = useState("");

  const { isLoading } = useQuery({
    queryKey: ["leads", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const data = await apiFetch<Lead[]>("/leads?limit=20&offset=0", { token: token ?? undefined }).catch(
        () => [],
      );
      setLeads(data);
      return true;
    },
  });

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newLead.leadName.trim()) return;
    await apiFetch("/leads", {
      method: "POST",
      token,
      body: JSON.stringify({
        leadName: newLead.leadName,
        source: newLead.source,
        pipelineStage: newLead.stage,
      }),
    });
    setNewLead({ leadName: "", source: "manual", stage: "LEAD" });
    const refreshed = await apiFetch<Lead[]>("/leads?limit=20&offset=0", { token });
    setLeads(refreshed);
  }

  async function moveLead(id: string, stage: string) {
    if (!token) return;
    await apiFetch(`/leads/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ pipelineStage: stage }),
    });
    const refreshed = await apiFetch<Lead[]>("/leads?limit=20&offset=0", { token });
    setLeads(refreshed);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selected || !note.trim()) return;
    await apiFetch(`/leads/${selected.id}/notes`, {
      method: "POST",
      token,
      body: JSON.stringify({ body: note }),
    });
    setNote("");
    const refreshed = await apiFetch<Lead[]>("/leads?limit=20&offset=0", { token });
    setLeads(refreshed);
    setSelected(refreshed.find((l) => l.id === selected.id) ?? null);
  }

  async function addFollowup(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selected || !followupAt) return;
    await apiFetch(`/leads/${selected.id}/followup`, {
      method: "POST",
      token,
      body: JSON.stringify({ dueAt: new Date(followupAt).toISOString(), note: followupNote }),
    });
    setFollowupAt("");
    setFollowupNote("");
    const refreshed = await apiFetch<Lead[]>("/leads?limit=20&offset=0", { token });
    setLeads(refreshed);
    setSelected(refreshed.find((l) => l.id === selected.id) ?? null);
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (isLoading) {
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
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold"><Users className="h-6 w-6 text-[#00C49A]" />CRM leads</h1>
          <p className="mt-1 text-sm text-zinc-500">Kanban + notes + follow-up scheduling</p>
        </div>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-medium text-black"><UserPlus className="h-4 w-4" />Add lead +</button>
      </div>

      {showAdd && <form onSubmit={createLead} className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-[#00C49A30] bg-[#0f0f0f] p-4 text-sm">
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
        <button type="submit" className="rounded bg-teal-600 px-4 py-2 text-white">
          Add lead
        </button>
      </form>}

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {STAGES.map((stage) => (
          <div key={stage} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
            <p className="text-sm font-medium text-zinc-300">{stage}</p>
            <ul className="mt-3 space-y-2">
              {leads
                .filter((l) => (l.pipelineStage ?? "LEAD") === stage)
                .map((l) => (
                  <li
                    key={l.id}
                    className="rounded border border-zinc-700 bg-zinc-900/60 p-2 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(l)}
                      className="w-full text-left"
                    >
                      <p className="text-zinc-100">{l.leadName}</p>
                      <p className="text-xs text-zinc-500">{l.source} · {timeAgo(l.createdAt)}</p>
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-2 text-zinc-500">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <Calendar className="h-3.5 w-3.5" />
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex flex-wrap gap-1">
                      {STAGES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void moveLead(l.id, s)}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400"
                        >
                          {s}
                        </button>
                      ))}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
          <p className="font-medium text-zinc-100">Lead detail: {selected.leadName}</p>
          <p className="mt-1 text-zinc-500">Status {selected.status} · Stage {selected.pipelineStage ?? "—"}</p>
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
