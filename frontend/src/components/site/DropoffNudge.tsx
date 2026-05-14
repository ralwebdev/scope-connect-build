// Smart drop-off recovery prompt for soft-launch funnel.
// Picks ONE highest-priority unmet milestone and surfaces it as a dashboard banner.
// Dismissals are snoozed per-key for 24h to avoid spam.

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Target, X, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser, useProfileStrength, useStoreValue } from "@/hooks/use-scope";
import { applications } from "@/lib/scope-store";
import { analytics } from "@/lib/analytics";

const SNOOZE_KEY = "scope_nudge_snoozed_v1";
const VISIT_KEY = "scope_last_visit_at";

type Nudge = { id: string; prompt: string; cta: string; to: "/auth" | "/campus" | "/profile" | "/projects" | "/dashboard" };

function readSnoozes(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}"); } catch { return {}; }
}

function isSnoozed(id: string): boolean {
  return (readSnoozes()[id] || 0) > Date.now();
}

function snooze(id: string, hours = 24) {
  try {
    const next = { ...readSnoozes(), [id]: Date.now() + hours * 3600_000 };
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}

export function DropoffNudge() {
  const user = useUser();
  const strength = useProfileStrength();
  const myApps = useStoreValue(() => (user ? applications.forUser(user.id) : []));
  const [nudge, setNudge] = useState<Nudge | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    // Update last visit + compute days-since-prev-visit
    let daysAway = 0;
    try {
      const prev = Number(localStorage.getItem(VISIT_KEY) || 0);
      if (prev) daysAway = Math.floor((Date.now() - prev) / 86400_000);
      localStorage.setItem(VISIT_KEY, String(Date.now()));
    } catch { /* noop */ }

    // Highest-priority unmet milestone wins.
    const candidates: Nudge[] = [];
    if (!user.campus) {
      candidates.push({
        id: "campus_selected",
        prompt: "Select your campus to unlock chapter rankings and local opportunities.",
        cta: "Choose campus",
        to: "/campus",
      });
    } else if (strength < 70) {
      candidates.push({
        id: "profile_70",
        prompt: "Complete your profile to stand out to future opportunities.",
        cta: "Update profile",
        to: "/profile",
      });
    } else if (myApps.length === 0) {
      candidates.push({
        id: "first_application",
        prompt: "Apply to one project today and start building proof of work.",
        cta: "Explore projects",
        to: "/projects",
      });
    }
    if (daysAway >= 3) {
      candidates.unshift({
        id: "return_3d",
        prompt: "New opportunities have been added since your last visit.",
        cta: "Open dashboard",
        to: "/dashboard",
      });
    }

    const next = candidates.find((c) => !isSnoozed(c.id)) || null;
    if (next) {
      setNudge(next);
      analytics.track("nudge_shown");
    }
  }, [user, strength, myApps.length]);

  if (!nudge) return null;

  const onClick = () => analytics.track("nudge_clicked");
  const onDismiss = () => {
    snooze(nudge.id, 24);
    analytics.track("nudge_dismissed");
    setNudge(null);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <Card className="relative border-cyan/30 bg-cyan/5 p-4 animate-fade-in">
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-wrap items-center gap-3 pr-8">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan/15 text-cyan">
            <Target className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">Next best action</Badge>
            <p className="mt-1 text-sm font-semibold text-foreground">{nudge.prompt}</p>
          </div>
          <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground" onClick={onClick}>
            <Link to={nudge.to}>{nudge.cta} <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}
