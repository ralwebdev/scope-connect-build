// /updates — Platform Updates & Transparency log.
// Demonstrates governance and visible improvement. Static seeded entries —
// add new ones to UPDATES (newest first). Categorized and chronological.
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText, Shield, Sparkles, FileText, Award, Users, Lock } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureGate } from "@/components/site/FeatureGate";

export const Route = createFileRoute("/updates")({
  head: () => ({
    meta: [
      { title: "Platform Updates — Scope Connect" },
      { name: "description", content: "Transparency log of policy, moderation, security, and feature changes shipped on Scope Connect." },
      { property: "og:title", content: "Platform Updates — Scope Connect" },
      { property: "og:description", content: "We publish meaningful platform changes openly." },
    ],
  }),
  component: () => <FeatureGate flag="platformUpdates"><UpdatesPage /></FeatureGate>,
});

type UpdateType = "Policy" | "Moderation" | "Feature" | "Security" | "Rewards" | "Community";
type ImpactLevel = "high" | "medium" | "low";

type UpdateEntry = {
  date: string; // ISO
  type: UpdateType;
  title: string;
  summary: string;
  impact: ImpactLevel;
};

const UPDATES: UpdateEntry[] = [
  {
    date: "2026-04-22",
    type: "Policy",
    title: "Reward Model Clarified",
    summary: "Platform standardized toward non-financial growth rewards — certificates, XP, mentor access, workshop invites, priority for future opportunities. Stipend / honorarium projects remain a rare premium tier (1–2%).",
    impact: "high",
  },
  {
    date: "2026-04-20",
    type: "Moderation",
    title: "Spam Prevention Rules Updated",
    summary: "Duplicate applications and misleading claims now trigger automated restrictions. Repeated violations lead to account-level action.",
    impact: "medium",
  },
  {
    date: "2026-04-18",
    type: "Feature",
    title: "Unified Scope Verified Badge",
    summary: "A single Scope Verified badge now appears across curated opportunities, notifications, and featured updates — replacing multiple older variants.",
    impact: "medium",
  },
  {
    date: "2026-04-15",
    type: "Security",
    title: "Hardened State Hydration",
    summary: "Refresh recovery now isolates corrupt slices instead of resetting the full app. Affected users are notified with a soft toast.",
    impact: "medium",
  },
  {
    date: "2026-04-10",
    type: "Community",
    title: "Trust FAQ Live on /about and /projects",
    summary: "A searchable Trust FAQ now answers common questions about curation, moderation, data, rewards, and participation rules.",
    impact: "low",
  },
  {
    date: "2026-04-05",
    type: "Rewards",
    title: "Growth Rewards Expanded",
    summary: "New non-cash perks added: discounted upskilling access at Red Apple Learning, exclusive webinars, and mentor office hours.",
    impact: "high",
  },
  {
    date: "2026-03-28",
    type: "Feature",
    title: "Soft-Launch Validation Dashboard",
    summary: "Internal /ops panel ships funnel, retention, and rage-click signals to inform iteration before public launch.",
    impact: "low",
  },
];

const TYPE_META: Record<UpdateType, { icon: typeof Shield; className: string }> = {
  Policy: { icon: FileText, className: "bg-brand/15 text-brand" },
  Moderation: { icon: Shield, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  Feature: { icon: Sparkles, className: "bg-cyan/15 text-cyan" },
  Security: { icon: Lock, className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  Rewards: { icon: Award, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  Community: { icon: Users, className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
};

const IMPACT_LABEL: Record<ImpactLevel, string> = {
  high: "High impact",
  medium: "Medium impact",
  low: "Low impact",
};

function fmtDate(iso: string) {
  // Stable, locale-independent formatting to keep SSR + client identical.
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[(m ?? 1) - 1]} ${d}, ${y}`;
}

function UpdatesPage() {
  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">
            <ScrollText className="mr-1 h-3 w-3" /> Platform Updates
          </Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Transparency builds trust.</h1>
          <p className="mt-2 max-w-2xl text-primary-foreground/75">
            We publish meaningful platform changes openly — policy, moderation, security, features, rewards, and community.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <ol className="relative space-y-5 border-l border-border pl-6">
          {UPDATES.map((u) => {
            const meta = TYPE_META[u.type];
            const Icon = meta.icon;
            return (
              <li key={u.date + u.title} className="relative">
                <span className="absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background">
                  <Icon className="h-3.5 w-3.5 text-brand" />
                </span>
                <Card className="p-5 hover-lift">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={meta.className}>{u.type}</Badge>
                    <span className="text-xs text-muted-foreground">{fmtDate(u.date)}</span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        u.impact === "high"
                          ? "bg-brand/10 text-brand"
                          : u.impact === "medium"
                            ? "bg-secondary text-foreground"
                            : "bg-secondary/60 text-muted-foreground"
                      }`}
                    >
                      {IMPACT_LABEL[u.impact]}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-foreground">{u.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{u.summary}</p>
                </Card>
              </li>
            );
          })}
        </ol>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Have a suggestion? <a href="/feedback" className="font-semibold text-brand hover:underline">Send feedback</a> or <a href="/support" className="font-semibold text-brand hover:underline">contact support</a>.
        </p>
      </section>
    </AppShell>
  );
}
