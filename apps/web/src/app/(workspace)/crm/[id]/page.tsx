"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarCheck2,
  Clock3,
  FileText,
  NotebookText,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, getUserFacingErrorMessage } from "@/lib/api";

type OrgRow = { id: string; name?: string; organizationId?: string; isActive?: boolean };
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

export default function CrmLeadDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [note, setNote] = useState("");
  const [followupAt, setFollowupAt] = useState("");
  const [followupNote, setFollowupNote] = useState("");
  const [saving, setSaving] = useState(false);
  const notesFormRef = useRef<HTMLFormElement | null>(null);
  const followupFormRef = useRef<HTMLFormElement | null>(null);

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations-mine", token],
    enabled: Boolean(token),
    queryFn: () => apiFetch<OrgRow[]>("/organizations/mine", { token: token ?? undefined }).catch(() => []),
  });
  const activeOrg = orgs.find((o) => o.isActive) ?? orgs[0] ?? null;
  const orgId = activeOrg ? activeOrg.organizationId || activeOrg.id : "";

  const { data: lead } = useQuery({
    queryKey: ["lead-detail", id, token, orgId],
    enabled: Boolean(token && orgId && id),
    queryFn: async () => {
      const rows = await apiFetch<Lead[]>(`/leads?organizationId=${orgId}`, { token: token ?? undefined });
      return rows.find((r) => r.id === id) ?? null;
    },
  });

  const canConvertToDeal = useMemo(
    () => Boolean(lead?.requirementId && (lead?.propertyId || null)),
    [lead],
  );

  useEffect(() => {
    const panel = searchParams.get("panel");
    if (!panel) return;
    if (panel === "notes") {
      notesFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (panel === "followups") {
      followupFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !lead || !note.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/leads/${lead.id}/notes`, {
        method: "POST",
        token,
        body: JSON.stringify({ body: note.trim() }),
      });
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["lead-detail"] });
      toast.success("Note saved");
    } catch (e) {
      toast.error(getUserFacingErrorMessage(e, "Could not save note."));
    } finally {
      setSaving(false);
    }
  }

  async function addFollowup(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !lead || !followupAt) return;
    setSaving(true);
    try {
      await apiFetch(`/leads/${lead.id}/followup`, {
        method: "POST",
        token,
        body: JSON.stringify({ dueAt: new Date(followupAt).toISOString(), note: followupNote }),
      });
      setFollowupAt("");
      setFollowupNote("");
      await queryClient.invalidateQueries({ queryKey: ["lead-detail"] });
      toast.success("Follow-up saved");
    } catch (e) {
      toast.error(getUserFacingErrorMessage(e, "Could not save follow-up."));
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return <p className="text-zinc-400">Please login.</p>;
  }
  if (!lead) {
    return <p className="text-zinc-500">Lead not found in selected organization.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <button
        type="button"
        onClick={() => router.push("/crm")}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-teal-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </button>

      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-5 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{lead.leadName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-300">
            Source: {lead.source}
          </span>
          <span className="rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-300">
            Status: {lead.status}
          </span>
          <span className="rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-300">
            Stage: {lead.pipelineStage ?? "LEAD"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {lead.source.startsWith("match:") ? (
            <span className="inline-flex items-center gap-1 rounded border border-amber-700/50 bg-amber-950/30 px-2.5 py-1 text-xs font-medium text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Auto-created from match
            </span>
          ) : null}
          {canConvertToDeal ? (
            <Link
              href={`/deals/new?propertyId=${lead.propertyId}&requirementId=${lead.requirementId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#00C49A] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              <CalendarCheck2 className="h-4 w-4" />
              Convert to deal
            </Link>
          ) : (
            <span className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
              Add both property and requirement mapping to convert this lead into a deal
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          ref={notesFormRef}
          onSubmit={addNote}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
        >
          <p className="inline-flex items-center gap-2 text-lg font-medium text-white">
            <NotebookText className="h-5 w-5 text-teal-300" />
            Add note
          </p>
          <textarea
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none transition focus:border-teal-500"
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write key discussion points, objections, and next steps..."
          />
          <button
            disabled={saving}
            type="submit"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-teal-700 px-3 py-1.5 text-sm text-teal-300 transition hover:bg-teal-950/30 disabled:opacity-60"
          >
            <FileText className="h-4 w-4" />
            Save note
          </button>
        </form>

        <form
          ref={followupFormRef}
          onSubmit={addFollowup}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
        >
          <p className="inline-flex items-center gap-2 text-lg font-medium text-white">
            <CalendarCheck2 className="h-5 w-5 text-teal-300" />
            Schedule follow-up
          </p>
          <input
            type="datetime-local"
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none transition focus:border-teal-500"
            value={followupAt}
            onChange={(e) => setFollowupAt(e.target.value)}
          />
          <input
            className="mt-2.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none transition focus:border-teal-500"
            placeholder="Note (optional)"
            value={followupNote}
            onChange={(e) => setFollowupNote(e.target.value)}
          />
          <button
            disabled={saving}
            type="submit"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-teal-700 px-3 py-1.5 text-sm text-teal-300 transition hover:bg-teal-950/30 disabled:opacity-60"
          >
            <Clock3 className="h-4 w-4" />
            Save follow-up
          </button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/75 p-5">
          <p className="inline-flex items-center gap-2 text-lg font-medium text-white">
            <NotebookText className="h-5 w-5 text-teal-300" />
            Notes
          </p>
          {(lead.notes ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No notes yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5 text-sm">
              {(lead.notes ?? []).map((n) => (
                <li key={n.id} className="rounded-lg border border-zinc-800 bg-zinc-900/65 p-2.5 text-zinc-300">
                  <p className="text-[11px] text-zinc-500">{new Date(n.createdAt).toLocaleString()}</p>
                  <p className="mt-1">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/75 p-5">
          <p className="inline-flex items-center gap-2 text-lg font-medium text-white">
            <CalendarCheck2 className="h-5 w-5 text-teal-300" />
            Follow-ups
          </p>
          {(lead.followUps ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No follow-ups yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5 text-sm">
              {(lead.followUps ?? []).map((f) => (
                <li key={f.id} className="rounded-lg border border-zinc-800 bg-zinc-900/65 p-2.5 text-zinc-300">
                  <p className="text-[11px] text-zinc-500">{new Date(f.dueAt).toLocaleString()}</p>
                  <p className="mt-1">{f.note ?? "No note"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
