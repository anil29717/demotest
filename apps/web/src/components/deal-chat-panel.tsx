"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUp, Loader2, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { useChat, type ChatMessageRow } from "@/hooks/use-chat";
import { apiFetch, apiUrl } from "@/lib/api";
import { getInitials, timeAgo } from "@/lib/format";

type ThreadBootstrap = {
  thread: { id: string; title: string | null; dealId: string | null };
  messages: ChatMessageRow[];
};

export function DealChatPanel({
  dealId,
  token,
  currentUserId,
  dealTitle,
  propertyId,
}: {
  dealId: string;
  token: string;
  currentUserId: string;
  dealTitle?: string;
  propertyId?: string | null;
}) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const {
    messages,
    setMessages,
    connected,
    typingUserId,
    sendSocketMessage,
    setTyping,
  } = useChat(threadId, token);

  const loadThread = useCallback(async () => {
    setBootError(null);
    try {
      const data = await apiFetch<ThreadBootstrap>(`/chat/threads/deal/${dealId}`, {
        method: "POST",
        token,
      });
      setThreadId(data.thread.id);
      setMessages(data.messages);
    } catch (e) {
      setBootError(e instanceof Error ? e.message : "Could not open deal chat");
    }
  }, [dealId, token, setMessages]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  const typingLabel = useMemo(() => {
    if (!typingUserId) return null;
    return "Someone is typing…";
  }, [typingUserId]);

  const labelFor = (userId: string) =>
    userId === currentUserId ? "You" : `User ${userId.slice(0, 6)}`;

  async function send() {
    const text = input.trim();
    if (!text || !threadId) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessageRow = {
      id: tempId,
      threadId,
      senderId: currentUserId,
      content: text,
      messageType: "TEXT",
      readBy: [currentUserId],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    const ok = sendSocketMessage(text, "TEXT");
    if (!ok) {
      toast.error("Chat not connected — retry in a moment");
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setInput(text);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !threadId) return;
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
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void send();
    }
  }

  if (bootError) {
    return (
      <p className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">{bootError}</p>
    );
  }

  if (!threadId) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening deal chat…
      </div>
    );
  }

  return (
    <div className="flex max-h-[min(560px,70vh)] flex-col rounded-xl border border-zinc-800 bg-zinc-950/50">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-zinc-200">Deal chat</p>
          <p className="text-xs text-zinc-500">
            {connected ? "Live" : "Connecting…"} · {dealTitle ?? "This deal"}
          </p>
        </div>
        {propertyId ? (
          <Link href={`/properties/${propertyId}`} className="text-xs text-[#00C49A] hover:underline">
            View property →
          </Link>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {typingLabel ? <p className="text-center text-xs italic text-zinc-500">{typingLabel}</p> : null}
        {messages.map((m) => {
          const isSelf = m.senderId === currentUserId;
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-300">
                  {getInitials(labelFor(m.senderId))}
                </div>
              ) : null}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  isSelf ? "bg-[#00C49A]/20 text-zinc-100" : "bg-[#1a1a1a] text-zinc-200"
                }`}
              >
                {!isSelf ? (
                  <p className="mb-0.5 text-[10px] font-medium text-zinc-500">
                    {labelFor(m.senderId)}
                  </p>
                ) : null}
                {deleted ? (
                  <span className="text-zinc-500 italic">Message deleted</span>
                ) : isFile ? (
                  <a
                    href={m.fileUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#00C49A] underline"
                  >
                    {m.fileName ?? "Download file"}
                  </a>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                  <span>{timeAgo(m.createdAt)}</span>
                  {isSelf && m.readBy.filter((id) => id !== currentUserId).length ? (
                    <span>
                      Read by{" "}
                      {m.readBy
                        .filter((id) => id !== currentUserId)
                        .map((id) => labelFor(id))
                        .join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-zinc-800 p-2">
        <div className="flex items-end gap-2">
          <label className="cursor-pointer rounded border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800">
            <Paperclip className="h-4 w-4" />
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4" onChange={(e) => void onFile(e)} disabled={uploading} />
          </label>
          <textarea
            className="max-h-28 min-h-[40px] flex-1 resize-y rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
            placeholder="Message… (Enter to send, Shift+Enter newline)"
            rows={1}
            value={input}
            disabled={uploading}
            onChange={(e) => {
              setInput(e.target.value);
              setTyping(true);
            }}
            onBlur={() => setTyping(false)}
            onKeyDown={onKeyDown}
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
    </div>
  );
}
