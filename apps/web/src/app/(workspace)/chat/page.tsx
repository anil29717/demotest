"use client";

import Link from "next/link";
import { Loader2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ChatThreadView } from "@/components/chat-thread-view";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
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
  participantPreview?: { id: string; initials: string }[];
};

export default function ChatPage() {
  const { token } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

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

  return (
    <div className="mx-auto grid min-h-[min(760px,calc(100vh-6rem))] max-w-6xl gap-4 lg:grid-cols-[360px,1fr]">
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
        <div className="border-b border-zinc-800 px-4 py-4">
          <h1 className="text-lg font-semibold text-white">Chat</h1>
          <p className="mt-1 text-[12px] text-zinc-500">Select a thread to open conversation history.</p>
        </div>
        <div className="min-h-[240px]">
          {loadingThreads ? (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-zinc-500">
              <MessageSquare className="h-12 w-12 opacity-40" />
              <p className="text-sm">No conversations yet. Use the Chat tab on a deal to start one.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {threads.map((t) => {
                const active = selectedThreadId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(t.id)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900/80 ${
                        active ? "bg-zinc-900/80" : ""
                      }`}
                    >
                      <div className="flex shrink-0 -space-x-2">
                        {(t.participantPreview?.length
                          ? t.participantPreview
                          : [{ id: t.id, initials: getInitials(t.title || "?") }]
                        ).map((p, idx) => (
                          <div
                            key={`${t.id}-${p.id}-${idx}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-800 text-[11px] font-medium text-zinc-200"
                          >
                            {p.initials || "?"}
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate font-medium text-zinc-100">{t.title || "Conversation"}</span>
                          {t.lastMessageAt ? (
                            <span className="shrink-0 text-[10px] text-zinc-500">{timeAgo(t.lastMessageAt)}</span>
                          ) : null}
                        </div>
                        <p className="truncate text-[12px] text-zinc-500">{t.lastMessagePreview || "—"}</p>
                      </div>
                      {t.unreadCount > 0 ? (
                        <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-[#00C49A] px-1.5 text-[11px] font-semibold text-black">
                          {t.unreadCount > 99 ? "99+" : t.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="min-h-[560px]">
        {selectedThreadId ? (
          <ChatThreadView threadId={selectedThreadId} />
        ) : (
          <div className="flex h-full min-h-[560px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center">
            <div>
              <MessageSquare className="mx-auto h-10 w-10 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-300">Select a conversation from the left.</p>
              <p className="mt-1 text-xs text-zinc-500">Your chat history will open here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
