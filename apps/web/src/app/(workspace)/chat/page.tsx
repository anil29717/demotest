"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUp, Loader2, MessageSquare, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { useChat, type ChatMessageRow } from "@/hooks/use-chat";
import { apiFetch, apiUrl } from "@/lib/api";
import { getInitials, timeAgo } from "@/lib/format";

type ThreadRow = {
  id: string;
  dealId: string | null;
  threadType: string;
  title: string;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
  propertyId: string | null;
  dealIdForLink: string | null;
};

function labelForUser(currentUserId: string, userId: string) {
  return userId === currentUserId ? "You" : `User ${userId.slice(0, 6)}`;
}

export default function ChatPage() {
  const { token, user } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const {
    messages,
    setMessages,
    connected,
    typingUserId,
    sendSocketMessage,
    setTyping,
  } = useChat(selectedId, token);

  const loadThreads = useCallback(async () => {
    if (!token) return;
    setLoadingThreads(true);
    try {
      const rows = await apiFetch<ThreadRow[]>("/chat/threads", { token });
      setThreads(rows);
    } catch {
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, [token]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId],
  );

  useEffect(() => {
    if (!selectedId || !token) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    void apiFetch<{ messages: ChatMessageRow[] }>(`/chat/threads/${selectedId}/messages?limit=50`, {
      token,
    })
      .then((r) => {
        if (!cancelled) setMessages(r.messages ?? []);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, token, setMessages]);

  async function send() {
    const text = input.trim();
    if (!text || !selectedId || !user) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessageRow = {
      id: tempId,
      threadId: selectedId,
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
    void loadThreads();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedId || !token) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const headers = new Headers();
      headers.set("Authorization", `Bearer ${token}`);
      const res = await fetch(apiUrl(`/chat/threads/${selectedId}/files`), {
        method: "POST",
        headers,
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("File sent");
      void loadThreads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-zinc-500">
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>{" "}
        to use chat.
      </p>
    );
  }

  if (!user) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="mx-auto flex h-[min(720px,calc(100vh-6rem))] max-w-5xl gap-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
      <aside className="flex w-[320px] min-w-[280px] flex-col border-r border-zinc-800 bg-zinc-950/80">
        <div className="border-b border-zinc-800 px-3 py-3">
          <h1 className="text-sm font-semibold text-white">Chat</h1>
          <p className="text-[11px] text-zinc-500">Deal & direct threads</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingThreads ? (
            <p className="flex items-center gap-2 px-3 py-4 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : threads.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-500">No conversations yet. Open a deal and use the Chat tab.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`flex w-full gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedId === t.id ? "bg-teal-950/40 text-teal-100" : "text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-medium text-zinc-200">
                      {getInitials(t.title || "Chat")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className="truncate font-medium">{t.title || "Conversation"}</span>
                        {t.lastMessageAt ? (
                          <span className="shrink-0 text-[10px] text-zinc-500">{timeAgo(t.lastMessageAt)}</span>
                        ) : null}
                      </div>
                      <p className="truncate text-[11px] text-zinc-500">{t.lastMessagePreview || "—"}</p>
                    </div>
                    {t.unreadCount > 0 ? (
                      <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#00C49A] px-1 text-[10px] font-semibold text-black">
                        {t.unreadCount > 99 ? "99+" : t.unreadCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-zinc-500">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm">Select a conversation or start one from a deal.</p>
          </div>
        ) : (
          <>
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
              <div>
                <p className="font-medium text-zinc-100">{selected?.title ?? "Chat"}</p>
                <p className="text-[11px] text-zinc-500">{connected ? "Live" : "Connecting…"}</p>
              </div>
              {selected?.dealIdForLink ? (
                <Link href={`/deals/${selected.dealIdForLink}`} className="text-xs text-[#00C49A] hover:underline">
                  View deal →
                </Link>
              ) : null}
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {typingUserId ? (
                <p className="text-center text-xs italic text-zinc-500">Someone is typing…</p>
              ) : null}
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
                return (
                  <div key={m.id} className={`flex gap-2 ${isSelf ? "justify-end" : "justify-start"}`}>
                    {!isSelf ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                        {getInitials(labelForUser(user.id, m.senderId))}
                      </div>
                    ) : null}
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        isSelf ? "bg-[#00C49A]/20 text-zinc-100" : "bg-[#1a1a1a] text-zinc-200"
                      }`}
                    >
                      {!isSelf ? (
                        <p className="mb-0.5 text-[10px] font-medium text-zinc-500">
                          {labelForUser(user.id, m.senderId)}
                        </p>
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
                      <div className="mt-1 text-[10px] text-zinc-500">
                        {timeAgo(m.createdAt)}
                        {isSelf && m.readBy.filter((id) => id !== user.id).length ? (
                          <span className="ml-2">
                            Read by{" "}
                            {m.readBy
                              .filter((id) => id !== user.id)
                              .map((id) => labelForUser(user.id, id))
                              .join(", ")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-zinc-800 p-3">
              <div className="flex items-end gap-2">
                <label className="cursor-pointer rounded border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800">
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4"
                    onChange={(e) => void onFile(e)}
                    disabled={uploading}
                  />
                </label>
                <textarea
                  className="max-h-28 min-h-[40px] flex-1 resize-y rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
                  placeholder="Message… (Enter to send)"
                  rows={1}
                  value={input}
                  disabled={uploading}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setTyping(true);
                  }}
                  onBlur={() => setTyping(false)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" && !ev.shiftKey) {
                      ev.preventDefault();
                      void send();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={uploading || !input.trim()}
                  onClick={() => void send()}
                  className="rounded-lg bg-[#00C49A] p-2 text-black hover:opacity-90 disabled:opacity-40"
                  aria-label="Send"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
