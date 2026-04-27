"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

type Project = {
  id: string;
  title: string;
  city: string;
  locality?: string | null;
  status: string;
  priceMin?: number | null;
  priceMax?: number | null;
  units?: Array<{ id: string; status: string }>;
};

export default function BuilderProjectsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void apiFetch<Project[]>("/builder/projects", { token })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">My projects</h1>
          <p className="text-sm text-zinc-500">Builder inventory and unit availability.</p>
        </div>
        <Link href="/builder/projects/new" className="rounded-lg bg-[#00C49A] px-3 py-2 text-sm font-semibold text-black">
          Add project
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading projects...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-2 text-sm text-zinc-400">No projects yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const available = (p.units ?? []).filter((u) => u.status === "AVAILABLE").length;
            return (
              <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-zinc-100">{p.title}</p>
                    <p className="text-xs text-zinc-500">{p.city}{p.locality ? `, ${p.locality}` : ""} · {p.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-200">
                      {p.priceMin ? formatINR(p.priceMin) : "—"} {p.priceMax ? `- ${formatINR(p.priceMax)}` : ""}
                    </p>
                    <p className="text-xs text-zinc-500">{available} available units</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
