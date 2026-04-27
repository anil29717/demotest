"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/format";

type Booking = {
  id: string;
  status: string;
  bookedAt: string;
  project?: { title?: string };
  unit?: { unitNumber?: string; unitType?: string };
};

export default function BuilderBookingsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Booking[]>([]);

  useEffect(() => {
    if (!token) return;
    void apiFetch<Booking[]>("/builder/bookings", { token })
      .then(setRows)
      .catch(() => setRows([]));
  }, [token]);

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <h1 className="text-xl font-semibold text-zinc-100">Bookings</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No bookings yet.</p>
      ) : (
        rows.map((b) => (
          <div key={b.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-sm text-zinc-100">{b.project?.title ?? "Project"} · {b.unit?.unitType ?? "Unit"} {b.unit?.unitNumber ?? ""}</p>
            <p className="text-xs text-zinc-500">{b.status} · {timeAgo(b.bookedAt)}</p>
          </div>
        ))
      )}
    </div>
  );
}
