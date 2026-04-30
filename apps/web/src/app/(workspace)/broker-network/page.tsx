"use client";

import Link from "next/link";
import { Network } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function BrokerNetworkPage() {
  const { token } = useAuth();

  if (!token)
    return (
      <p>
        <Link href="/login" className="text-teal-400">
          Log in
        </Link>
      </p>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-zinc-100">
          <Network className="h-5 w-5 text-[#00C49A]" />
          Co-Broker (Manual)
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          MVP mode: co-brokering is manual and managed inside each deal.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-300">
          <li>Set co-broker email in deal details.</li>
          <li>Set commission split percentage in deal details.</li>
        </ul>
        <p className="mt-4 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-500">
          Phase 2: full broker network, invitations, acceptance workflow, and broker directory.
        </p>
        <Link
          href="/deals"
          className="mt-4 inline-flex rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Open deals
        </Link>
      </div>
    </div>
  );
}
