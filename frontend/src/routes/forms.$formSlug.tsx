// Catch-all form route. The slug must exist in FORM_REGISTRY — anything else
// renders a clear "form not found" state instead of a generic 404. This is
// the registry's safety net: typo'd or stale URLs land somewhere intentional.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, ShieldAlert, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/use-rbac";
import { rbac } from "@/lib/rbac";
import { findFormBySlug } from "@/lib/forms-registry";

export const Route = createFileRoute("/forms/$formSlug")({
  head: ({ params }) => {
    const form = findFormBySlug(params.formSlug);
    return {
      meta: [
        { title: form ? `${form.label} · Scope Connect` : "Form not found" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: FormShell,
});

function FormShell() {
  const { formSlug } = Route.useParams();
  const role = useRole();
  const form = findFormBySlug(formSlug);

  if (!form) {
    return (
      <AppShell>
        <section className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-16">
          <Card className="w-full p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ShieldAlert className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Form not registered</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-mono">/forms/{formSlug}</span> isn't in the forms registry.
              All forms must be launched from the global Forms dropdown.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/dashboard">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Workspace
              </Link>
            </Button>
          </Card>
        </section>
      </AppShell>
    );
  }

  if (!rbac.hasPermission(role, form.permission)) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required={form.permission}
          title={`${form.label} — restricted`}
          message="This form requires a permission your role does not currently have."
          toastMessage="You can't open this form with your current role."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Badge variant="outline" className="mb-2">
          <ClipboardList className="mr-1 h-3 w-3" /> {form.group}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">{form.label}</h1>
        {form.description && (
          <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
        )}
        <div className="mt-2 text-[11px] font-mono text-muted-foreground">
          form_id: {form.formId}
        </div>

        <Card className="mt-6 p-6">
          <p className="text-sm text-muted-foreground">
            Form scaffold ready. Wire fields here when the team finalizes the schema for{" "}
            <span className="font-mono text-foreground">{form.formId}</span>.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/dashboard">Cancel</Link>
            </Button>
            <Button className="bg-gradient-brand text-brand-foreground" disabled>
              Submit (stub)
            </Button>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
