"use client";

import { AppShell } from "@/components/app-shell";
import { canAccessPath } from "@/lib/role-access";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, token, sessionRole } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    // Wait for resolved role before enforcing route access.
    if (!sessionRole) return;
    if (!canAccessPath(pathname, sessionRole)) {
      router.replace("/dashboard");
    }
  }, [ready, token, sessionRole, pathname, router]);

  if (!ready) return null;
  if (!token) return null;
  if (!sessionRole) return null;
  if (!canAccessPath(pathname, sessionRole)) return null;
  return <>{children}</>;
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const { body } = document;
    root.classList.add("workspace-shell");
    body.classList.add("workspace-shell");
    return () => {
      root.classList.remove("workspace-shell");
      body.classList.remove("workspace-shell");
    };
  }, []);

  return (
    <WorkspaceGuard>
      <AppShell>{children}</AppShell>
    </WorkspaceGuard>
  );
}
