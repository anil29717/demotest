"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Briefcase, Eye, SlidersHorizontal, Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

type Prefs = {
  dailyDigest?: boolean;
  matchAlerts?: boolean;
  slaWarnings?: boolean;
  digestHourLocal?: number;
  digestMinuteLocal?: number;
  whatsappDigest?: boolean;
  whatsappDigestTo?: string;
  emailMatchAlerts?: boolean;
  emailDailyDigest?: boolean;
};

export default function NotificationSettingsPage() {
  const { token, user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>({
    dailyDigest: true,
    matchAlerts: true,
    slaWarnings: true,
    digestHourLocal: 9,
    digestMinuteLocal: 30,
  });
  const [digest, setDigest] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ notificationPrefs: unknown }>("/user/profile", { token }).then((p) => {
      const n = p.notificationPrefs as Prefs | null;
      if (n && typeof n === "object") {
        setPrefs((prev) => ({
          ...prev,
          ...n,
          digestHourLocal:
            typeof n.digestHourLocal === "number" ? n.digestHourLocal : prev.digestHourLocal,
          digestMinuteLocal:
            typeof n.digestMinuteLocal === "number"
              ? n.digestMinuteLocal
              : prev.digestMinuteLocal,
        }));
      }
    });
  }, [token]);

  async function save() {
    if (!token) return;
    await apiFetch("/user/notification-preferences", {
      method: "PUT",
      token,
      body: JSON.stringify(prefs),
    });
  }

  async function previewDigest() {
    if (!token) return;
    const d = await apiFetch<{
      windowLocal: string;
      channel?: string;
      items: { title: string }[];
      note?: string;
    }>("/notifications/digest-preview", { token });
    const parts = [
      `${d.windowLocal} digest — ${d.items.length} unread items in preview`,
      d.channel ? `[${d.channel}]` : "",
      d.note ? `(${d.note})` : "",
    ].filter(Boolean);
    setDigest(parts.join(" "));
  }

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  return (
    <div className="mx-auto max-w-lg text-sm">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold"><SlidersHorizontal className="h-5 w-5 text-[#00C49A]" />Alert preferences</h1>
      <p className="mt-1 text-zinc-500">Control digest, match alerts, and SLA warnings.</p>
      <div className="mt-6 space-y-3">
        {(["dailyDigest", "matchAlerts", "slaWarnings"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!prefs[k]}
              onChange={(e) => setPrefs((p) => ({ ...p, [k]: e.target.checked }))}
            />
            <span className="capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
          </label>
        ))}
        {user?.role === "SELLER" ? (
          <div className="grid gap-2 rounded border border-[#1f1f1f] bg-[#111111] p-3 text-xs text-[#888]">
            <p className="inline-flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-[#00C49A]" />Match alerts — New buyers matched to your listings</p>
            <p className="inline-flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-[#00C49A]" />Deal updates — Progress on your property deals</p>
            <p className="inline-flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-[#00C49A]" />Listing views — When buyers view your listings</p>
            <p className="inline-flex items-center gap-2"><Bell className="h-3.5 w-3.5 text-[#00C49A]" />Daily digest — Daily summary of activity</p>
          </div>
        ) : null}
      </div>
      <div className="mt-4 space-y-3 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Delivery channels</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!prefs.whatsappDigest}
            onChange={(e) => setPrefs((p) => ({ ...p, whatsappDigest: e.target.checked }))}
          />
          <span>WhatsApp digest mirror (optional)</span>
        </label>
        <div>
          <label className="text-xs text-zinc-500">WhatsApp number (E.164, must match Meta opt-in)</label>
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={prefs.whatsappDigestTo ?? ""}
            onChange={(e) => setPrefs((p) => ({ ...p, whatsappDigestTo: e.target.value }))}
            placeholder="+919876543210"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!prefs.emailMatchAlerts}
            onChange={(e) => setPrefs((p) => ({ ...p, emailMatchAlerts: e.target.checked }))}
          />
          <span>Email mirror for match alerts</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!prefs.emailDailyDigest}
            onChange={(e) => setPrefs((p) => ({ ...p, emailDailyDigest: e.target.checked }))}
          />
          <span>Email mirror for daily digest</span>
        </label>
      </div>
      <div className="mt-6 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Notification types</p>
        <p className="text-xs font-medium text-zinc-400">Digest send window (local time preview)</p>
        <p className="mt-1 text-xs text-zinc-600">
          Matches the daily digest cron at 09:00 in DIGEST_TZ (server). Hour/minute fields drive preview copy and future tuning.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-zinc-500">Hour (0–23)</label>
            <input
              type="number"
              min={0}
              max={23}
              className="mt-1 w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
              value={prefs.digestHourLocal ?? 9}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setPrefs((p) => ({
                  ...p,
                  digestHourLocal: Number.isFinite(v) ? Math.min(23, Math.max(0, v)) : 9,
                }));
              }}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Minute (0–59)</label>
            <input
              type="number"
              min={0}
              max={59}
              className="mt-1 w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
              value={prefs.digestMinuteLocal ?? 30}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setPrefs((p) => ({
                  ...p,
                  digestMinuteLocal: Number.isFinite(v) ? Math.min(59, Math.max(0, v)) : 30,
                }));
              }}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void save()}
        className="mt-6 rounded bg-teal-600 px-4 py-2 text-white"
      >
        Save preferences
      </button>
      <button
        type="button"
        onClick={() => void previewDigest()}
        className="ml-3 rounded border border-zinc-600 px-4 py-2 text-zinc-300"
      >
        Preview digest
      </button>
      {digest && <p className="mt-4 text-xs text-zinc-500">{digest}</p>}
    </div>
  );
}
