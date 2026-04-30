"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { canAccessPath } from "@/lib/role-access";

type NotificationType = "MATCH" | "NDA" | "DEAL" | "ALERT";

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type NotificationsListResponse = {
  data: NotificationRow[];
  total: number;
  hasMore: boolean;
};

export function NotificationBell() {
  const { token, user, sessionRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const showBell = Boolean(token && canAccessPath("/notifications", sessionRole));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<NotificationsListResponse>("/notifications", { token });
      setItems(res.data ?? []);
    } catch {
      setErr("Could not load notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!showBell) {
      setItems([]);
      setOpen(false);
      return;
    }
    void load();
  }, [showBell, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function markRead(id: string) {
    if (!token) return;
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PUT", token });
      await load();
    } catch {
      /* ignore */
    }
  }

  if (!showBell) return null;

  const unread = items.filter((n) => !n.read).length;
  const preview = items.slice(0, 8);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={2} aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
        >
          <div className="border-b border-zinc-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Notifications
            {sessionRole && <span className="ml-2 normal-case text-zinc-400">({sessionRole})</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && preview.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">Loading…</p>
            )}
            {err && <p className="px-3 py-2 text-xs text-red-400">{err}</p>}
            {!loading && preview.length === 0 && !err && (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">No notifications yet.</p>
            )}
            <ul className="divide-y divide-zinc-800">
              {preview.map((n) => (
                <li key={n.id} className="px-3 py-2.5 text-left text-sm">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                    {n.type}
                  </p>
                  <p className={`font-medium ${n.read ? "text-zinc-400" : "text-zinc-100"}`}>{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{n.body}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-600">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => void markRead(n.id)}
                        className="text-[10px] text-teal-400 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-zinc-800 px-3 py-2">
            <Link
              href="/notifications"
              className="block text-center text-xs font-medium text-teal-400 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
