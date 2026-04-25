"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare, Network, Phone } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { getInitials } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

type NetworkData = { organizations: { name: string; role: string }[]; note?: string };

export default function BrokerNetworkPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void apiFetch<NetworkData>("/user/broker-network", { token })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  if (user?.role === "NRI") {
    if (loading) return <LoadingSkeleton rows={2} />;
    const orgs = data?.organizations ?? [];
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
            <Network className="h-7 w-7 text-[#00C49A]" />
            My brokers
          </h1>
          <p className="mt-1 text-sm text-[#888]">Brokers managing your Indian properties.</p>
        </header>
        {orgs.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No brokers connected yet"
            subtitle="Post a property or requirement to get assigned a broker."
            actionHref="/properties/new"
            actionLabel="Post a property"
          />
        ) : (
          <ul className="space-y-3">
            {orgs.map((o) => (
              <li
                key={o.name + o.role}
                className="flex flex-col gap-3 rounded-xl border border-[#1a1a1a] bg-[#111111] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-semibold text-[#00C49A]">
                    {getInitials(o.name)}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{o.name}</p>
                    <p className="text-xs text-[#888]">{o.role}</p>
                    <p className="mt-1 inline-block rounded border border-[#00C49A40] bg-[#00C49A12] px-2 py-0.5 text-[10px] font-medium text-[#00C49A]">
                      Trust on platform
                    </p>
                    <p className="mt-1 text-xs text-[#555]">Managing your workspace</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/services-hub"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#1a1a1a] text-[#00C49A] hover:bg-[#00C49A12]"
                    aria-label="Phone"
                  >
                    <Phone className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/services-hub"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#1a1a1a] text-[#00C49A] hover:bg-[#00C49A12]"
                    aria-label="Message"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg text-sm">
      <h1 className="text-xl font-semibold">Broker network</h1>
      <p className="mt-1 text-zinc-500">Your co-broking network and organisation memberships.</p>
      {data?.organizations?.length ? (
        <ul className="mt-4 space-y-2">
          {data.organizations.map((o) => (
            <li key={o.name + o.role} className="rounded border border-zinc-800 px-3 py-2">
              {o.name} — <span className="text-teal-500/90">{o.role}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-zinc-400">
          No network connections yet. Invite brokers to co-broke with you.
        </div>
      )}
    </div>
  );
}
