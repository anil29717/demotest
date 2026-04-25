"use client";

import { AppShell } from "@/components/app-shell";
import { canAccessPath } from "@/lib/role-access";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, token, user } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!canAccessPath(pathname, user?.role)) {
      router.replace("/dashboard");
    }
  }, [ready, token, user?.role, pathname, router]);

  if (!ready) return null;
  if (!token) return null;
  if (!canAccessPath(pathname, user?.role)) return null;
  return <>{children}</>;
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceGuard>
      <AppShell>{children}</AppShell>
    </WorkspaceGuard>
  );
}
