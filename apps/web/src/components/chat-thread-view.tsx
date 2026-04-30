"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Loader2, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { useChat, type ChatMessageRow } from "@/hooks/use-chat";
import { apiFetch, apiUrl } from "@/lib/api";
import { getInitials, timeAgo } from "@/lib/format";

type Participant = { id: string; name: string; role: string };

type ThreadSummary = {
  thread: { id: string; title: string | null; dealId: string | null; threadType: string };
  participants: Participant[];
};

type ChatThreadViewProps = {
  threadId: string;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
};

function isValidChatMessage(value: unknown): value is ChatMessageRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ChatMessageRow>;
  return (
    typeof row.id === "string" &&
    typeof row.threadId === "string" &&
    typeof row.senderId === "string" &&
    typeof row.createdAt === "string" &&
    typeof row.messageType === "string" &&
    Array.isArray(row.readBy)
  );
}

function roleShort(role: string) {
  if (role === "BROKER") return "Broker";
  if (role === "BUYER") return "Buyer";
  if (role === "SELLER") return "Seller";
  if (role === "ADMIN") return "Admin";
  return role.replace(/_/g, " ").slice(0, 12);
}

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5 pl-1">
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
    </span>
  );
}

export function ChatThreadView({ threadId, onBack, showBackButton = false, className = "" }: ChatThreadViewProps) {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<ThreadSummary | null>(null);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickBottomRef = useRef(true);

  const {
    messages,
    setMessages,
    connected,
    typingUserId,
    sendSocketMessage,
    inputActivity,
    flushTyping,
    markReadSocket,
  } = useChat(threadId, token);

  useEffect(() => {
    if (!token || !threadId) return;
    let cancelled = false;
    setLoadingMeta(true);
    void Promise.all([
      apiFetch<ThreadSummary>(`/chat/threads/${threadId}/summary`, { token }).catch(() => null),
      apiFetch<{ messages: ChatMessageRow[] }>(`/chat/threads/${threadId}/messages?limit=50`, {
        token,
      }).catch(() => ({ messages: [] })),
    ])
      .then(([sum, msgRes]) => {
        if (cancelled) return;
        if (sum) setSummary(sum);
        setMessages(
          (msgRes?.messages ?? [])
            .filter(isValidChatMessage)
            .slice()
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, threadId, setMessages]);

  useEffect(() => {
    if (!connected || !threadId) return;
    markReadSocket();
  }, [connected, threadId, markReadSocket]);

  useEffect(() => {
    if (!token || !summary?.participants?.length || !user?.id) return;
    const others = summary.participants.filter((p) => p.id !== user.id);
    const fetchPresence = async () => {
      const next: Record<string, boolean> = {};
      await Promise.all(
        others.map(async (p) => {
          try {
            const r = await apiFetch<{ online?: boolean }>(`/chat/presence/${p.id}`, { token });
            next[p.id] = Boolean(r?.online);
          } catch {
            next[p.id] = false;
          }
        }),
      );
      setPresence(next);
    };
    void fetchPresence();
    const t = window.setInterval(() => void fetchPresence(), 45000);
    return () => window.clearInterval(t);
  }, [token, summary, user?.id]);

  useEffect(() => {
    if (!stickBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUserId]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickBottomRef.current = gap < 120;
  }

  async function send() {
    const text = input.trim();
    if (!text || !threadId || !user) return;
    flushTyping();
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessageRow = {
      id: tempId,
      threadId,
      senderId: user.id,
      content: text,
      messageType: "TEXT",
      readBy: [user.id],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    if (!sendSocketMessage(text, "TEXT")) {
      toast.error("Not connected — try again");
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setInput(text);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !threadId || !token) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const headers = new Headers();
      headers.set("Authorization", `Bearer ${token}`);
      const res = await fetch(apiUrl(`/chat/threads/${threadId}/files`), {
        method: "POST",
        headers,
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("File sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const title = useMemo(() => {
    if (!summary) return "Chat";
    if (summary.thread.title?.trim()) return summary.thread.title;
    const names = summary.participants.filter((p) => p.id !== user?.id).map((p) => p.name);
    if (names.length) return names.join(", ");
    return "Conversation";
  }, [summary, user?.id]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    summary?.participants.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [summary]);

  const typingName =
    typingUserId && typingUserId !== user?.id ? nameById.get(typingUserId) ?? "Someone" : null;

  if (!token || !user) {
    return <p className="p-4 text-zinc-500">Loading…</p>;
  }

  return (
    <div className={`flex h-full min-h-[560px] flex-col rounded-xl border border-zinc-800 bg-zinc-950/40 ${className}`}>
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-zinc-800 px-3 py-3">
        {showBackButton ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-100">{loadingMeta ? "Loading…" : title}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-zinc-500">
            <span>{connected ? "Live" : "Connecting…"}</span>
            {summary?.participants
              .filter((p) => p.id !== user.id)
              .map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${presence[p.id] ? "bg-emerald-500" : "bg-zinc-600"}`}
                  />
                  {p.name}
                </span>
              ))}
          </div>
        </div>
        {summary?.thread.dealId ? (
          <Link href={`/deals/${summary.thread.dealId}`} className="text-xs text-[#00C49A] hover:underline">
            Deal →
          </Link>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((m) => {
          const isSelf = m.senderId === user.id;
          const isSystem = m.messageType === "SYSTEM" || m.senderId === "system";
          if (isSystem) {
            return (
              <p key={m.id} className="text-center text-xs italic text-zinc-500">
                {m.placeholder ?? m.content}
              </p>
            );
          }
          const deleted = m.deleted || m.placeholder === "Message deleted";
          const isFile = m.messageType === "FILE" && m.fileUrl;
          const senderName = nameById.get(m.senderId) ?? `User ${m.senderId.slice(0, 6)}`;
          const senderRole = summary?.participants.find((p) => p.id === m.senderId)?.role ?? "";

          return (
            <div key={m.id} className={`flex gap-2 ${isSelf ? "justify-end" : "justify-start"}`}>
              {!isSelf ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                  {getInitials(senderName)}
                </div>
              ) : null}
              <div
                className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                  isSelf
                    ? "border-[#00C49A]/30 bg-[#00C49A]/10 text-zinc-100"
                    : "border-[#1a1a1a] bg-[#111111] text-zinc-200"
                }`}
              >
                {!isSelf ? (
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-zinc-300">{senderName}</span>
                    {senderRole ? (
                      <span className="rounded bg-zinc-800 px-1.5 py-0 text-[10px] text-zinc-400">
                        {roleShort(senderRole)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {deleted ? (
                  <span className="text-zinc-500 italic">Message deleted</span>
                ) : isFile ? (
                  <a href={m.fileUrl!} target="_blank" rel="noreferrer" className="text-[#00C49A] underline">
                    {m.fileName ?? "Download"}
                  </a>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
                <div className="mt-1 text-[10px] text-zinc-500">{timeAgo(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {typingName ? (
        <p className="border-t border-zinc-800/50 px-4 py-2 text-xs italic text-zinc-400">
          {typingName} is typing
          <TypingDots />
        </p>
      ) : null}

      <div className="shrink-0 border-t border-zinc-800 p-3">
        <div className="flex items-end gap-2">
          <label className="cursor-pointer rounded border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800">
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4"
              onChange={(e) => void onFile(e)}
              disabled={uploading || !connected}
            />
          </label>
          <textarea
            className="max-h-28 min-h-[44px] flex-1 resize-y rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            placeholder="Type a message..."
            rows={1}
            value={input}
            disabled={uploading || !connected}
            onChange={(e) => {
              setInput(e.target.value);
              inputActivity();
            }}
            onBlur={() => flushTyping()}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            disabled={uploading || !connected || !input.trim()}
            onClick={() => void send()}
            className="rounded-lg bg-[#00C49A] p-2.5 text-black hover:opacity-90 disabled:opacity-40"
            aria-label="Send"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
        {!connected ? (
          <p className="mt-2 text-center text-[11px] text-zinc-500">Reconnecting… messages are disabled.</p>
        ) : null}
      </div>
    </div>
  );
}
