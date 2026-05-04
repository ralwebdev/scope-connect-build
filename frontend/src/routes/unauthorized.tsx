import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Access restricted — Scope Connect" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
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
        <Button asChild className="mt-6 bg-gradient-brand text-brand-foreground">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </section>
    </AppShell>
  );
}
