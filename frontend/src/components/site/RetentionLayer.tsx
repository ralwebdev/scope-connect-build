// Retention + onboarding overlay for the dashboard.
// Habit loops: welcome modal · daily check-in burst · weekly mission ·
// rank movement alert · smart contextual nudge · weekly-fresh opportunities ·
// return-back greeting after absence.
// All state user-action-driven, single nudge visible at a time.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Flame, Target, X, ArrowRight, Trophy, TrendingUp, ArrowUp, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProfileStrength, useStreak, useUser, useStoreValue } from "@/hooks/use-scope";
import { retention } from "@/lib/scope-store";

const WEEKLY_MISSIONS = [
  { title: "Apply to 1 Scope Challenge", reward: "+100 XP", icon: "🚀" },
  { title: "Add 2 portfolio items", reward: "+60 XP", icon: "🧠" },
  { title: "RSVP to a campus event", reward: "+30 XP", icon: "🎟️" },
  { title: "Comment on 3 feed posts", reward: "+20 XP", icon: "💬" },
];

function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function RetentionLayer() {
  const user = useUser();
  const strength = useProfileStrength();
  const streak = useStreak();
  const movement = useStoreValue(() => retention.rankMovement());
  const fresh = useStoreValue(() => retention.weeklyFresh());

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [missionDismissed, setMissionDismissed] = useState(true);
  const [movementDismissed, setMovementDismissed] = useState(true);
  const [returnBack, setReturnBack] = useState<number>(0);
  const [nudge, setNudge] = useState<ReturnType<typeof retention.nextNudge>>(null);
  const [confetti, setConfetti] = useState(false);
  const week = isoWeek();
  const mission = WEEKLY_MISSIONS[week % WEEKLY_MISSIONS.length];
  const sessionInit = useRef(false);

  // Hydrate dismissals + capture rank snapshot + daily check-in once per session.
  useEffect(() => {
    if (typeof window === "undefined" || !user || sessionInit.current) return;
    sessionInit.current = true;
    try {
      const seenWelcome = localStorage.getItem(`scope_welcome_${user.id}`);
      if (!seenWelcome) setWelcomeOpen(true);

      const dismissedWeek = localStorage.getItem("scope_mission_dismissed_week");
      setMissionDismissed(dismissedWeek === String(week));

      // Daily check-in confetti — first dashboard visit of the day
      const today = new Date().toDateString();
      const lastCheckin = localStorage.getItem("scope_daily_checkin");
      if (lastCheckin !== today) {
        localStorage.setItem("scope_daily_checkin", today);
        // Skip confetti if first ever signup (welcome modal handles it)
        if (seenWelcome) {
          setConfetti(true);
          window.setTimeout(() => setConfetti(false), 1400);
        }
      }

      // Rank movement — capture snapshot, show banner if delta significant
      retention.snapshotRank();
      const moveDismissedDay = localStorage.getItem("scope_movement_dismissed_day");
      setMovementDismissed(moveDismissedDay === today);

      // Return-back greeting
      const absent = retention.markVisit();
      if (absent >= 7) setReturnBack(absent);

      // Smart nudge
      setNudge(retention.nextNudge());
    } catch { /* noop */ }
  }, [user, week]);

  const closeWelcome = () => {
    setWelcomeOpen(false);
    if (user) {
      try { localStorage.setItem(`scope_welcome_${user.id}`, "1"); } catch { /* noop */ }
    }
  };
  const dismissMission = () => {
    setMissionDismissed(true);
    try { localStorage.setItem("scope_mission_dismissed_week", String(week)); } catch { /* noop */ }
  };
  const dismissMovement = () => {
    setMovementDismissed(true);
    try { localStorage.setItem("scope_movement_dismissed_day", new Date().toDateString()); } catch { /* noop */ }
  };
  const dismissNudge = () => {
    if (nudge) retention.snoozeNudge(nudge.id, 18);
    setNudge(null);
  };

  if (!user) return null;

  // Anti-spam priority: rank-movement > mission > smart-nudge.
  const showMovement = !movementDismissed && movement && (movement.delta >= 2 || (movement.current <= 15 && movement.xpToTop10 > 0 && movement.xpToTop10 < 200));
  const showMission = !showMovement && !missionDismissed;
  const showNudge = !showMovement && !showMission && nudge && strength < 95;

  return (
    <>
      {welcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm" onClick={closeWelcome}>
          <Card className="w-full max-w-md overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-hero p-6 text-primary-foreground">
              <Sparkles className="h-6 w-6 text-cyan" />
              <h2 className="mt-3 text-2xl font-bold">Welcome to India's builder network, {user.name.split(" ")[0]}.</h2>
              <p className="mt-2 text-sm text-primary-foreground/75">Let's set your growth path. Three quick wins to start strong:</p>
            </div>
            <div className="space-y-3 p-6">
              <Step n={1} title="Complete your profile" sub="+25 XP · attracts collaborators" />
              <Step n={2} title="Apply to your first Scope Challenge" sub="+100 XP · curated opportunities only" />
              <Step n={3} title="Add a portfolio item" sub="+30 XP · proof-of-work that opens doors" />
              <Button onClick={closeWelcome} size="lg" className="mt-2 w-full bg-gradient-brand text-brand-foreground shadow-brand">
                Let's go <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">Your first opportunity is waiting.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Daily check-in confetti burst */}
      {confetti && <CheckinBurst streak={streak} />}

      {(returnBack > 0 || streak >= 3 || showMovement || showMission || showNudge || fresh.length > 0) && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-3">
          {returnBack > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              <div className="flex-1">
                <b className="text-foreground">Welcome back.</b>{" "}
                <span className="text-muted-foreground">
                  {returnBack} days away — your campus moved while you were gone. Fresh challenges added since your last visit.
                </span>
              </div>
              <button onClick={() => setReturnBack(0)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {streak >= 3 && (
            <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 px-4 py-2 text-sm text-foreground">
              <Flame className="h-4 w-4 text-brand animate-flame-pulse" />
              <span><b>{streak}-day streak.</b> Consistency compounds — keep momentum.</span>
            </div>
          )}

          {showMovement && movement && (
            <Card className="relative overflow-hidden border-success/30 bg-success/5 p-5 animate-fade-in">
              <button onClick={dismissMovement} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
                  {movement.delta > 0 ? <ArrowUp className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Badge className="bg-success/15 text-success hover:bg-success/20"><TrendingUp className="mr-1 h-3 w-3" /> Rank movement</Badge>
                  <h3 className="mt-1.5 text-base font-bold text-foreground">
                    {movement.delta >= 2
                      ? `You moved up ${movement.delta} spots. Currently #${movement.current}.`
                      : `You're #${movement.current}. ${movement.xpToTop10} XP to crack Top 10.`}
                  </h3>
                  <p className="text-xs text-muted-foreground">Builders are climbing right now. Hold the line — or jump it.</p>
                </div>
                <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground"><Link to="/leaderboards">View board <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </div>
            </Card>
          )}

          {showMission && (
            <Card className="relative overflow-hidden border-cyan/30 bg-gradient-to-r from-cyan/10 via-transparent to-brand/10 p-5">
              <button onClick={dismissMission} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-2xl shadow-brand">{mission.icon}</div>
                <div className="flex-1 min-w-0">
                  <Badge className="bg-cyan text-primary"><Trophy className="mr-1 h-3 w-3" /> Weekly Scope Mission · Week {week}</Badge>
                  <h3 className="mt-1.5 text-base font-bold text-foreground">{mission.title}</h3>
                  <p className="text-xs text-muted-foreground">Reward: {mission.reward} · Resets every Monday</p>
                </div>
                <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground"><Link to="/projects">Take action <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </div>
            </Card>
          )}

          {showNudge && nudge && (
            <Card className="relative border-brand/20 bg-secondary/40 p-4 animate-fade-in">
              <button onClick={dismissNudge} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Snooze">
                <X className="h-4 w-4" />
              </button>
              <div className="flex flex-wrap items-center gap-4">
                <Target className="h-5 w-5 shrink-0 text-brand" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{nudge.text}</div>
                  {nudge.id === "profile" && <Progress value={strength} className="mt-2 h-1.5" />}
                </div>
                <Button asChild size="sm" variant="outline"><Link to={nudge.to}>{nudge.cta}</Link></Button>
              </div>
            </Card>
          )}

          {fresh.length > 0 && <WeeklyFresh items={fresh} />}
        </div>
      )}
    </>
  );
}

function WeeklyFresh({ items }: { items: { id: string; title: string; cover: string; category: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex overflow-hidden rounded-md">
            <Badge className="bg-brand text-brand-foreground">🆕 New This Week</Badge>
            <span className="pointer-events-none absolute inset-0 animate-shimmer" />
          </span>
          <span className="text-xs text-muted-foreground">3 fresh opportunities just dropped.</span>
        </div>
        <Button asChild size="sm" variant="ghost"><Link to="/projects">All <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {items.map((p) => (
          <Link key={p.id} to="/projects" className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:border-brand/40 hover:shadow-soft">
            <span className="text-2xl">{p.cover}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground group-hover:text-brand">{p.title}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.category}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CheckinBurst({ streak }: { streak: number }) {
  // Memoize random positions so re-render doesn't reshuffle particles mid-flight.
  const pieces = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      cx: `${(Math.random() - 0.5) * 220}px`,
      cy: `${-60 - Math.random() * 90}px`,
      cr: `${Math.random() * 360}deg`,
      hue: i % 3 === 0 ? "var(--brand)" : i % 3 === 1 ? "var(--cyan)" : "var(--success)",
    })),
    [],
  );
  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2">
      <div className="relative">
        <div className="flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2 text-sm font-bold text-brand-foreground shadow-brand animate-scale-in">
          <Flame className="h-4 w-4" /> Day {streak} check-in · +5 XP
        </div>
        {pieces.map((p) => (
          <span
            key={p.id}
            className="confetti-piece absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
            style={{
              backgroundColor: p.hue,
              ["--cx" as string]: p.cx,
              ["--cy" as string]: p.cy,
              ["--cr" as string]: p.cr,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function Step({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">{n}</div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
