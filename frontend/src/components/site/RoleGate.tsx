// Permission-based render gate. Use to protect admin routes & buttons.
// On unauthorized, either renders nothing (inline) or a full-page notice.
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/site/AppShell";
import { usePermission } from "@/hooks/use-rbac";
import type { PermissionKey } from "@/lib/rbac";

export function RoleGate({
  permission,
  children,
  fallback = "page",
}: {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: "page" | "none";
}) {
  const allowed = usePermission(permission);
  if (allowed) return <>{children}</>;
  if (fallback === "none") return null;
  return (
    <AppShell>
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">Access restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have access to this area. Contact your platform admin if needed.
        </p>
        <Card className="mt-6 w-full p-3 text-left text-xs text-muted-foreground">
          Required permission: <span className="font-mono text-foreground">{permission}</span>
        </Card>
        <Button asChild className="mt-6 bg-gradient-brand text-brand-foreground">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </section>
    </AppShell>
  );
}
