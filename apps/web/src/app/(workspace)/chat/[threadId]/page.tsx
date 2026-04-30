"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ChatThreadView } from "@/components/chat-thread-view";

export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = String(params.threadId ?? "");
  const { token, user } = useAuth();

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

  return <ChatThreadView threadId={threadId} showBackButton onBack={() => router.push("/chat")} />;
}
