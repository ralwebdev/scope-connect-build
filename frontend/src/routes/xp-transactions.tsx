import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { ArrowDownLeft, ArrowUpRight, Clock3, Lock, RefreshCw, Wallet } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRole } from "@/hooks/use-rbac";
import { backendXp, type BackendXpTransaction, type BackendXpWallet } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/xp-transactions")({
  head: () => ({
    meta: [
      { title: "XP Transactions - Scope Connect" },
      { name: "description", content: "Track your XP rewards, stakes, and adjustments in one place." },
    ],
  }),
  component: () => <AuthGate><XpTransactionsRoute /></AuthGate>,
});

type Bucket = "all" | "stakes" | "rewards" | "adjustments";

const BUCKETS: Array<{ key: Bucket; label: string; sub: string }> = [
  { key: "all", label: "All", sub: "Everything" },
  { key: "rewards", label: "Rewards", sub: "XP earned" },
  { key: "stakes", label: "Stakes", sub: "XP committed" },
  { key: "adjustments", label: "Adjustments", sub: "Bonuses and fixes" },
];

const ACTION_LABELS: Record<string, string> = {
  PROJECT_STAKE_RESERVED: "Project XP committed",
  PROJECT_STAKE_REFUNDED: "Project XP refunded",
  PROJECT_STAKE_FORFEITED: "Project XP forfeited",
  PROJECT_REWARD_GRANTED: "Project reward granted",
  CHALLENGE_STAKE_RESERVED: "Challenge XP staked",
  CHALLENGE_STAKE_REFUNDED: "Challenge XP refunded",
  CHALLENGE_STAKE_FORFEITED: "Challenge XP forfeited",
  CHALLENGE_REWARD_GRANTED: "Challenge reward granted",
  ADMIN_ADJUSTMENT: "XP updated",
};

function XpTransactionsRoute() {
  const role = useRole();
  const allowed = role === "student" || role === "viewer";

  if (!allowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="view_dashboard"
          title="Student XP wallet"
          message="XP transaction history is currently available for student builder accounts only."
          toastMessage="Student access required."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <XpTransactionsPage />
    </AppShell>
  );
}

function XpTransactionsPage() {
  const [bucket, setBucket] = useState<Bucket>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [wallet, setWallet] = useState<BackendXpWallet | null>(null);
  const [items, setItems] = useState<BackendXpTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    backendXp.listTransactions({ bucket, limit: 100 })
      .then((data) => {
        if (cancelled) return;
        setWallet(data.wallet);
        setItems(data.items);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load your XP transactions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bucket, refreshKey]);

  return (
    <>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">
            <Wallet className="mr-1 h-3 w-3" /> XP Wallet
          </Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">XP Transactions</h1>
          <p className="mt-2 max-w-2xl text-sm text-primary-foreground/75 sm:text-base">
            Review every reward, commitment, refund, and XP adjustment tied to your builder account.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={Wallet}
            label="Available XP"
            value={wallet ? `${wallet.available.toLocaleString()} XP` : loading ? "Loading..." : "--"}
            sub="Ready to spend"
          />
          <MetricCard
            icon={Lock}
            label="Locked XP"
            value={wallet ? `${wallet.locked.toLocaleString()} XP` : loading ? "Loading..." : "--"}
            sub="Committed to active work"
          />
          <MetricCard
            icon={Clock3}
            label="Lifetime XP"
            value={wallet ? `${wallet.lifetime.toLocaleString()} XP` : loading ? "Loading..." : "--"}
            sub="Total progress earned"
          />
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Transaction Feed</h2>
              <p className="text-sm text-muted-foreground">Live backend ledger for your student profile.</p>
            </div>
            <Button variant="outline" onClick={() => setRefreshKey((current) => current + 1)} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {BUCKETS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setBucket(entry.key)}
                className={cn(
                  "rounded-full border px-3 py-2 text-left transition-colors",
                  bucket === entry.key
                    ? "border-brand bg-brand/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                <div className="text-sm font-semibold">{entry.label}</div>
                <div className="text-[11px]">{entry.sub}</div>
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-secondary/40" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/10 p-8 text-center text-sm text-muted-foreground">
              No XP transactions found for this filter yet.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {items.map((item) => {
                const positive = item.amount > 0;
                const negative = item.amount < 0;
                const sourceLabel = sourceLabelFor(item);
                return (
                  <article key={item.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full",
                              positive ? "bg-emerald-500/10 text-emerald-600" : negative ? "bg-amber-500/10 text-amber-600" : "bg-secondary text-foreground",
                            )}
                          >
                            {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-foreground">{labelForTransaction(item)}</h3>
                            <p className="truncate text-xs text-muted-foreground">{sourceLabel}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary">{prettyDate(item.created_at)}</Badge>
                          <Badge variant="outline">Before {item.balance_before.toLocaleString()} XP</Badge>
                          <Badge variant="outline">After {item.balance_after.toLocaleString()} XP</Badge>
                        </div>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <div
                          className={cn(
                            "text-lg font-bold tabular-nums",
                            positive ? "text-emerald-600" : negative ? "text-amber-600" : "text-foreground",
                          )}
                        >
                          {positive ? "+" : ""}{item.amount.toLocaleString()} XP
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {item.status}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      </div>
    </Card>
  );
}

function labelForTransaction(item: BackendXpTransaction) {
  return ACTION_LABELS[item.action] ?? item.action.toLowerCase().replace(/_/g, " ");
}

function sourceLabelFor(item: BackendXpTransaction) {
  const meta = item.meta ?? {};
  const preferred =
    readString(meta.project_title)
    || readString(meta.challenge_title)
    || readString(meta.mission_title)
    || readString(meta.reason)
    || readString(meta.rule);

  if (preferred) return preferred.replace(/_/g, " ");
  return `${item.source_type.replace(/_/g, " ")} · ${item.source_id}`;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function prettyDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
