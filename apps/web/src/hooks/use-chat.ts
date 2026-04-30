"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { apiUrl } from "@/lib/api";

export type ChatMessageRow = {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  messageType: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  readBy: string[];
  createdAt: string;
  deleted?: boolean;
  placeholder?: string;
};

function isValidMessageRow(value: unknown): value is ChatMessageRow {
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

function byCreatedAtAsc(a: ChatMessageRow, b: ChatMessageRow) {
  const at = new Date(a.createdAt).getTime();
  const bt = new Date(b.createdAt).getTime();
  const safeA = Number.isFinite(at) ? at : 0;
  const safeB = Number.isFinite(bt) ? bt : 0;
  return safeA - safeB;
}

function socketUrl(): string {
  const base = apiUrl("").replace(/\/$/, "");
  return `${base}/chat`;
}

export function useChat(threadId: string | null, token: string | null) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingBurstRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!threadId || !token) {
      const existing = socketRef.current;
      if (existing) {
        existing.removeAllListeners();
        existing.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      setTypingUserId(null);
      return;
    }

    const socket = io(socketUrl(), {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinThread", { threadId });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("newMessage", (msg: unknown) => {
      if (!isValidMessageRow(msg)) return;
      setMessages((prev) => {
        const msgId = typeof msg?.id === "string" ? msg.id : null;
        const filtered = prev.filter((m) => {
          if (!isValidMessageRow(m)) return false;
          const id = typeof m?.id === "string" ? m.id : "";
          const isTemp = id.startsWith("temp-");
          return !isTemp || (msgId !== null && id === msgId);
        });
        if (msgId && filtered.some((m) => m.id === msgId)) {
          return filtered.map((m) => (m.id === msgId ? { ...m, ...msg } : m));
        }
        return [...filtered, msg].sort(byCreatedAtAsc);
      });
    });

    socket.on("userTyping", (p: { userId: string; isTyping: boolean }) => {
      if (p.isTyping) {
        setTypingUserId(p.userId);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTypingUserId(null), 2000);
      } else {
        setTypingUserId(null);
      }
    });

    socket.on("readReceipt", (p: { threadId?: string | null; userId?: string | null } | null) => {
      if (!p || typeof p.threadId !== "string" || typeof p.userId !== "string") return;
      if (p.threadId !== threadId) return;
      const readerId = p.userId;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId !== readerId && !m.readBy.includes(readerId)
            ? { ...m, readBy: [...m.readBy, readerId] }
            : m,
        ),
      );
    });

    socket.on("message_deleted", (p: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === p.messageId
            ? {
                ...m,
                deleted: true,
                placeholder: "Message deleted",
                content: "",
                fileUrl: null,
                fileName: null,
              }
            : m,
        ),
      );
    });

    socket.on("connect_error", () => {
      setConnected(false);
    });

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (stopTypingBurstRef.current) clearTimeout(stopTypingBurstRef.current);
      if (socket.connected) {
        socket.emit("leaveThread", { threadId });
      }
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [threadId, token]);

  const sendSocketMessage = useCallback(
    (content: string, type: "TEXT" | "FILE" | "IMAGE" | "SYSTEM" = "TEXT") => {
      const s = socketRef.current;
      if (!s?.connected || !threadId) return false;
      s.emit("sendMessage", { threadId, content, type });
      return true;
    },
    [threadId],
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      const s = socketRef.current;
      if (!s?.connected || !threadId) return;
      s.emit("typing", { threadId, isTyping });
    },
    [threadId],
  );

  const markReadSocket = useCallback(() => {
    const s = socketRef.current;
    if (!s?.connected || !threadId) return;
    s.emit("markRead", { threadId });
  }, [threadId]);

  /** Emit typing true + schedule typing false after 1.5s idle (spec). */
  const inputActivity = useCallback(() => {
    const s = socketRef.current;
    if (!s?.connected || !threadId) return;
    s.emit("typing", { threadId, isTyping: true });
    if (stopTypingBurstRef.current) clearTimeout(stopTypingBurstRef.current);
    stopTypingBurstRef.current = setTimeout(() => {
      s.emit("typing", { threadId, isTyping: false });
      stopTypingBurstRef.current = null;
    }, 1500);
  }, [threadId]);

  const flushTyping = useCallback(() => {
    if (stopTypingBurstRef.current) clearTimeout(stopTypingBurstRef.current);
    stopTypingBurstRef.current = null;
    const s = socketRef.current;
    if (!s?.connected || !threadId) return;
    s.emit("typing", { threadId, isTyping: false });
  }, [threadId]);

  return {
    messages,
    setMessages,
    connected,
    typingUserId,
    sendSocketMessage,
    setTyping,
    inputActivity,
    flushTyping,
    markReadSocket,
  };
}
