// Hybrid RBAC failure UI: shows an inline access-denied card AND fires a
// warning toast on mount. Replaces silent redirects so users understand
// exactly why a section is hidden from them.
import { useEffect, useRef } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ROLE_LABELS, type RoleId, type PermissionKey } from "@/lib/rbac";

export function AccessDenied({
  role,
  required,
  title = "Access Denied",
  message,
  toastMessage = "You don't have access to this section.",
  showToast = true,
}: {
  role: RoleId;
  required?: PermissionKey | PermissionKey[];
  title?: string;
  message?: string;
  toastMessage?: string;
  showToast?: boolean;
}) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (showToast && !fired.current) {
      fired.current = true;
      toast.warning(toastMessage);
    }
  }, [showToast, toastMessage]);

  const requiredList = Array.isArray(required) ? required : required ? [required] : [];

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-16">
      <Card className="w-full border-destructive/30 bg-destructive/5 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {message ??
            "Your current role does not permit access to this feature. Please contact your administrator if you believe this is a mistake."}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Badge variant="outline">Role: {ROLE_LABELS[role]}</Badge>
          {requiredList.map((p) => (
            <Badge key={p} variant="secondary" className="font-mono">
              needs: {p}
            </Badge>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => router.history.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Go Back
          </Button>
          <Button asChild className="bg-gradient-brand text-brand-foreground">
            <Link to="/dashboard">
              <LayoutDashboard className="mr-1.5 h-4 w-4" /> My Workspace
            </Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}
