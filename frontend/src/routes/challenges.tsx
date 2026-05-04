import { createFileRoute } from "@tanstack/react-router";
import { Swords, Trophy, Flame, Zap, Target, Crown, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { useStoreValue, useXP, useStreak } from "@/hooks/use-scope";
import { xp, notifications, projects, feed, events as eventStore } from "@/lib/scope-store";
import { topChapters } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges & Chapter Wars — Scope Connect" },
      { name: "description", content: "Weekly builder challenges, XP bounties and chapter wars across India's campus network." },
      { property: "og:title", content: "Challenges & Chapter Wars — Scope Connect" },
      { property: "og:description", content: "Weekly builder challenges, XP bounties and chapter wars across India's campus network." },
    ],
  }),
  component: () => <AuthGate><ChallengesPage /></AuthGate>,
});

type Challenge = {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: React.ComponentType<{ className?: string }>;
  progress: () => { current: number; goal: number };
};

function ChallengesPage() {
  const userXP = useXP();
  const streak = useStreak();
  const claimed = useStoreValue(() => {
    if (typeof window === "undefined") return [] as string[];
    try { return JSON.parse(localStorage.getItem("scope_challenges_claimed") || "[]"); } catch { return []; }
  });

  const projectCount = useStoreValue(() => projects.all().length);
  const userPostCount = useStoreValue(() => feed.all().filter(p => !p.id.startsWith("seed_") && !p.authorId.startsWith("seed_")).length);
  const rsvpCount = useStoreValue(() => eventStore.rsvps().length);

  const challenges: Challenge[] = [
    {
      id: "wc_post_3",
      title: "Post 3 updates this week",
      description: "Share what you're building. Momentum compounds.",
      reward: 75,
      icon: Zap,
      progress: () => ({ current: Math.min(userPostCount, 3), goal: 3 }),
    },
    {
      id: "wc_rsvp_2",
      title: "RSVP to 2 events",
      description: "Show up. The room shapes the builder.",
      reward: 60,
      icon: Target,
      progress: () => ({ current: Math.min(rsvpCount, 2), goal: 2 }),
    },
    {
      id: "wc_streak_3",
      title: "Hit a 3-day streak",
      description: "Daily logins compound your rank.",
      reward: 100,
      icon: Flame,
      progress: () => ({ current: Math.min(streak, 3), goal: 3 }),
    },
    {
      id: "wc_launch_1",
      title: "Launch a project",
      description: "Ship something. Even rough. Builders ship.",
      reward: 150,
      icon: Trophy,
      progress: () => ({ current: Math.min(projectCount > 6 ? 1 : 0, 1), goal: 1 }),
    },
  ];

  const claim = (c: Challenge) => {
    const next = [...claimed, c.id];
    localStorage.setItem("scope_challenges_claimed", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { key: "scope_challenges_claimed" } }));
    xp.add(c.reward, c.title);
    notifications.push({ icon: "trophy", text: `Claimed: ${c.title} · +${c.reward} XP` });
    toast.success(`+${c.reward} XP claimed. Momentum added.`);
  };

  const wars = [
    { title: "Fastest Growing Chapter", leader: topChapters[0], metric: "+47 builders this week" },
    { title: "Highest Event Attendance", leader: topChapters[1] ?? topChapters[0], metric: "412 RSVPs" },
    { title: "Top Project Chapter", leader: topChapters[2] ?? topChapters[0], metric: "23 projects shipped" },
    { title: "Most Active Campus", leader: topChapters[0], metric: "1,284 daily actions" },
  ];

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-14 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Swords className="mr-1 h-3 w-3" /> Weekly Battles</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Challenges & Chapter Wars</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">Stack XP, climb ranks, and put your chapter on the map. Resets every Monday.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Card className="border-white/10 bg-white/5 px-4 py-2 text-primary-foreground backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-primary-foreground/60">Your XP</div>
              <div className="text-xl font-bold">{userXP.toLocaleString()}</div>
            </Card>
            <Card className="border-white/10 bg-white/5 px-4 py-2 text-primary-foreground backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-primary-foreground/60">Streak</div>
              <div className="text-xl font-bold">{streak} 🔥</div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">This Week's Challenges</h2>
          <Badge variant="outline">Refreshes Mon 00:00 IST</Badge>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {challenges.map((c) => {
            const { current, goal } = c.progress();
            const pct = Math.round((current / goal) * 100);
            const complete = current >= goal;
            const isClaimed = claimed.includes(c.id);
            const Icon = c.icon;
            return (
              <Card key={c.id} className="p-5 hover-lift animate-fade-in">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{c.title}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">{c.description}</p>
                      </div>
                      <Badge className="bg-gradient-brand text-brand-foreground">+{c.reward} XP</Badge>
                    </div>
                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                        <span>{current} / {goal}</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                    <div className="mt-4">
                      {isClaimed ? (
                        <Button size="sm" disabled className="bg-success text-primary-foreground"><Check className="mr-1.5 h-4 w-4" /> Claimed</Button>
                      ) : complete ? (
                        <Button size="sm" onClick={() => claim(c)} className="bg-gradient-brand text-brand-foreground">Claim XP</Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>In progress</Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-brand" />
          <h2 className="text-2xl font-bold text-foreground">Chapter Wars</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Live battles between India's most active campus chapters.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {wars.map((w) => (
            <Card key={w.title} className="flex items-center gap-4 p-5 hover-lift">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-brand text-2xl">🏆</div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{w.title}</div>
                <div className="mt-0.5 font-semibold text-foreground">{w.leader.name}</div>
                <div className="text-xs text-cyan">{w.metric}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast("You backed " + w.leader.name)}>Back</Button>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
