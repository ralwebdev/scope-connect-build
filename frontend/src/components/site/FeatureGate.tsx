// Renders children only when a feature flag is on. Wrap whole page bodies to
// block direct route access. Shows a friendly "feature not enabled" notice
// instead of redirecting, so URLs remain shareable.
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/site/AppShell";
import { useStoreValue } from "@/hooks/use-scope";
import { configStore } from "@/lib/config-store";
import type { FeatureFlags } from "@/lib/platform-config";

export function FeatureGate({
  flag,
  children,
  comingSoon = true,
}: {
  flag: keyof FeatureFlags;
  children: ReactNode;
  comingSoon?: boolean;
}) {
  const enabled = useStoreValue(() => configStore.get().features[flag] === true);
  if (enabled) return <>{children}</>;
  if (!comingSoon) return null;
  return (
    <AppShell>
      <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand">
          <Sparkles className="h-6 w-6 text-brand-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">Coming soon</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This feature is not enabled in this edition.
        </p>
        <Card className="mt-6 w-full p-4 text-left text-xs text-muted-foreground">
          Operators can enable <span className="font-mono text-foreground">{flag}</span> from
          the Admin Config Center.
        </Card>
        <Button asChild className="mt-6 bg-gradient-brand text-brand-foreground">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </section>
    </AppShell>
  );
}
