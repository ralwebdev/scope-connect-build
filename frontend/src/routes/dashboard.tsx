import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trophy, Flame, TrendingUp, Calendar, Users, Sparkles, ArrowRight, Target, Zap, Rocket, Briefcase, Lightbulb, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/site/AppShell";
import { AdSlot } from "@/components/site/AdSlot";
import { AuthGate } from "@/components/site/AuthGate";
import { CountUp } from "@/components/site/Effects";
import { useUser, useXP, useLevel, useLevelProgress, useStreak, useProfileStrength, useStoreValue } from "@/hooks/use-scope";
import { feed, events, memberLeaderboard, applications, curated, portfolio } from "@/lib/scope-store";
import { RetentionLayer } from "@/components/site/RetentionLayer";
import { PortfolioSpotlight } from "@/components/site/PortfolioSpotlight";
import { CredibilityPanel } from "@/components/site/CredibilityPanel";
import { DropoffNudge } from "@/components/site/DropoffNudge";
import { useRole } from "@/hooks/use-rbac";
import { landingRouteForRole } from "@/lib/rbac";
import { backendNotifications, backendProjects, backendUsers } from "@/lib/api/endpoints";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Scope Connect" },
      { name: "description", content: "Your Scope Connect builder dashboard." },
    ],
  }),
  component: () => <AuthGate><RoleGatedDashboard /></AuthGate>,
});

/** Role-safe wrapper: /dashboard is the STUDENT dashboard only. Any other
 *  role that lands here (stale link, refresh, fallback redirect) is bounced
 *  to their proper landing route. Eliminates the "everyone sees student
 *  dashboard" bug — no shared component leakage across roles. */
function RoleGatedDashboard() {
  const role = useRole();
  const navigate = useNavigate();
  const isStudentLike = role === "student" || role === "viewer";

  useEffect(() => {
    if (isStudentLike) return;
    const target = landingRouteForRole(role);
    if (target !== "/dashboard") {
      navigate({ to: target, replace: true });
    }
  }, [role, isStudentLike, navigate]);

  if (!isStudentLike) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Resolving user access…</p>
        </div>
      </div>
    );
  }
  return <DashboardPage />;
}

function DashboardPage() {
  const user = useUser();
  const xp = useXP();
  const level = useLevel();
  const levelProgress = useLevelProgress();
  const streak = useStreak();
  const strength = useProfileStrength();
  const recentFeed = useStoreValue(() => feed.all().slice(0, 4));
  const upcoming = useStoreValue(() => events.all().slice(0, 3));
  const board = useStoreValue(() => memberLeaderboard());
  const myApplications = useStoreValue(() => (user ? applications.forUser(user.id) : []));
  const recommended = useStoreValue(() => curated.scopeChallenges().slice(0, 3));
  const portfolioStrength = useStoreValue(() => (user ? portfolio.strength(user.id) : 0));
  const portfolioCount = useStoreValue(() => (user ? portfolio.forUser(user.id).length : 0));
  const [loadingHydration, setLoadingHydration] = useState(false);
  const [myRankHydrated, setMyRankHydrated] = useState<number | null>(null);
  const [myApplicationsHydrated, setMyApplicationsHydrated] = useState<number | null>(null);
  const [recommendedHydrated, setRecommendedHydrated] = useState<Array<{ id: string; title: string; description: string; cover: string }>>([]);
  const [recentFeedHydrated, setRecentFeedHydrated] = useState<Array<{ id: string; author: string; campus: string; time: string; type: string; content: string }>>([]);
  const [upcomingHydrated, setUpcomingHydrated] = useState<Array<{ id: string; title: string; date: string; venue: string }>>([]);

  if (!user) return null;
  useEffect(() => {
    let cancelled = false;
    setLoadingHydration(true);
    Promise.all([
      backendUsers.list(),
      backendProjects.list(),
      backendNotifications.list(),
    ])
      .then(([usersData, projectsData, notificationsData]) => {
        if (cancelled) return;
        const sortedUsers = [...usersData.items].sort((a, b) => (b.stats?.xp ?? 0) - (a.stats?.xp ?? 0));
        const rank = sortedUsers.findIndex((u) => u.id === user.id) + 1;
        setMyRankHydrated(rank > 0 ? rank : null);
        const myApps = notificationsData.items.filter((n) => n.kind === "application_status_changed" || n.kind === "application_received");
        setMyApplicationsHydrated(myApps.length);
        setRecommendedHydrated(
          projectsData.items.slice(0, 3).map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description || p.summary || "Live builder opportunity.",
            cover: "🚀",
          })),
        );
        setRecentFeedHydrated(
          notificationsData.items.slice(0, 4).map((n, i) => ({
            id: n.id,
            author: "Scope Connect",
            campus: user.campus || "Your Campus",
            time: new Date(n.created_at).toLocaleDateString(),
            type: n.kind.replaceAll("_", " "),
            content: n.body || n.title,
          })),
        );
        setUpcomingHydrated(
          projectsData.items
            .filter((p) => Boolean(p.starts_on))
            .slice(0, 3)
            .map((p) => ({ id: p.id, title: p.title, date: p.starts_on || "", venue: p.institution_id || "Scope Connect" })),
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingHydration(false);
      });
    return () => { cancelled = true; };
  }, [user.id, user.campus]);
  const myRank = myRankHydrated ?? (board.findIndex((r) => r.isMe) + 1);
  const xpToNext = level.max - xp;
  const myApplicationsCount = myApplicationsHydrated ?? myApplications.length;
  const feedRows = recentFeedHydrated.length ? recentFeedHydrated : recentFeed;
  const upcomingRows = upcomingHydrated.length ? upcomingHydrated : upcoming;
  const recommendedRows = recommendedHydrated.length ? recommendedHydrated : recommended;

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-10 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-brand-foreground shadow-brand" style={{ background: user.avatarColor }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {user.name.split(" ")[0]} 👋</h1>
              <p className="text-sm text-primary-foreground/70">{user.campus} · {level.name}</p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-primary-foreground/60">Scope Points</div>
                <div className="text-2xl font-bold"><CountUp to={xp} /></div>
              </div>
              <div>
                <div className="text-xs text-primary-foreground/60">National Rank</div>
                <div className="text-2xl font-bold">#{myRank || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-primary-foreground/60">Streak</div>
                <div className="flex items-center gap-1 text-2xl font-bold"><Flame className="h-5 w-5 text-brand" /> {streak}d</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RetentionLayer />

      <DropoffNudge />

      <ActivationChecklist
        hasProfile={strength >= 60}
        hasApplied={myApplications.length > 0}
        hasJoinedCampus={!!user.campus}
        hasPortfolio={portfolioCount > 0}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loadingHydration && <p className="mb-4 text-sm text-muted-foreground">Hydrating dashboard from backend...</p>}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 hover-lift">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Profile strength</h3>
              <Target className="h-4 w-4 text-brand" />
            </div>
            <div className="mt-4 text-3xl font-bold text-foreground"><CountUp to={strength} suffix="%" /></div>
            <Progress value={strength} className="mt-3" />
            <p className="mt-3 text-xs text-muted-foreground">
              {strength < 100 ? "Complete your bio, skills & links to attract collaborators." : "Your profile is fully optimized."}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4 w-full">
              <Link to="/profile">Complete profile <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </Card>

          <Card className="p-6 hover-lift">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Next level: {level.next}</h3>
              <Sparkles className="h-4 w-4 text-cyan" />
            </div>
            <div className="mt-4 text-3xl font-bold text-foreground"><CountUp to={levelProgress} suffix="%" /></div>
            <Progress value={levelProgress} className="mt-3" />
            <p className="mt-3 text-xs text-muted-foreground">{xpToNext.toLocaleString()} XP to unlock {level.next}-tier perks.</p>
          </Card>

          <Card className="bg-gradient-brand p-6 text-brand-foreground hover-lift">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Login streak</h3>
              <Flame className="h-4 w-4" />
            </div>
            <div className="mt-4 text-3xl font-bold">{streak} day{streak === 1 ? "" : "s"} 🔥</div>
            <p className="mt-3 text-xs text-brand-foreground/80">+50 XP every consecutive day. Don't break the streak!</p>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="font-semibold text-foreground">Recent feed</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/feed">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {feedRows.map((p) => (
                <div key={p.id} className="p-5 transition-colors hover:bg-secondary/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                      {p.author.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">{p.author}</div>
                      <div className="text-xs text-muted-foreground">{p.campus} · {p.time}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{p.type}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-foreground/90">{p.content}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <CredibilityPanel />
            <Card className="p-5 hover-lift">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Upcoming events</h3>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <ul className="mt-4 space-y-3">
                {upcomingRows.map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-xs font-bold text-brand-foreground">
                      {e.date.split(" ")[1] ?? e.date}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{e.title}</div>
                      <div className="text-xs text-muted-foreground">{e.venue}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                <Link to="/events">Browse events</Link>
              </Button>
            </Card>

            <Card className="p-5 hover-lift">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">My Applications</h3>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              {myApplicationsCount === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No applications yet. Your next move starts here.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {myApplications.slice(0, 3).map((a) => {
                    const project = curated.byId(a.projectId);
                    return (
                      <li key={a.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs">{a.status}</Badge>
                          <span className="text-xs text-muted-foreground">{a.topSkill}</span>
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{project?.title ?? "Project"}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                <Link to="/projects">Browse opportunities <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </Card>

            <Card className="bg-gradient-hero p-5 text-primary-foreground hover-lift">
              <Trophy className="h-5 w-5 text-cyan" />
              <h3 className="mt-3 font-semibold">Leaderboard position</h3>
              <p className="mt-1 text-sm text-primary-foreground/70">You're #{myRank || "—"} on the national board.</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-cyan">
                <TrendingUp className="h-3.5 w-3.5" /> You're {Math.max(0, myRank - 10)} moves from Top 10.
              </div>
              <Button asChild variant="outline" size="sm" className="mt-4 w-full border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/leaderboards">View leaderboards</Link>
              </Button>
            </Card>
          </div>
        </div>

        {/* Recommended Scope challenges */}
        <div className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🚀 Recommended for you</div>
              <h2 className="mt-1 text-xl font-bold text-foreground">Live Scope Challenges</h2>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/projects">See all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {recommendedRows.map((p) => (
              <Card key={p.id} className="flex flex-col p-5 hover-lift">
                <div className="flex items-center justify-between">
                  <Badge className="bg-brand text-brand-foreground"><ShieldCheck className="mr-1 h-3 w-3" /> Scope Verified</Badge>
                  <span className="text-2xl">{p.cover}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
                <Button asChild size="sm" className="mt-4 bg-gradient-brand text-brand-foreground">
                  <Link to="/projects">View opportunity</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <PortfolioSpotlight />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="p-6 hover-lift">
            <Briefcase className="h-5 w-5 text-brand" />
            <h3 className="mt-3 font-semibold text-foreground">Portfolio strength</h3>
            <p className="mt-1 text-sm text-muted-foreground">{portfolioCount} item{portfolioCount === 1 ? "" : "s"} · {portfolioStrength}% complete</p>
            <Progress value={portfolioStrength} className="mt-3" />
            <Button asChild size="sm" className="mt-4 bg-gradient-brand text-brand-foreground"><Link to="/portfolio">Open Portfolio</Link></Button>
          </Card>
          <Card className="p-6 hover-lift">
            <Lightbulb className="h-5 w-5 text-cyan" />
            <h3 className="mt-3 font-semibold text-foreground">Got a bigger idea?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Pitch directly to Scope. Stays private. +15 XP.</p>
            <Button asChild size="sm" variant="outline" className="mt-4"><Link to="/projects">Suggest an Idea</Link></Button>
          </Card>
          <Card className="p-6 hover-lift">
            <Zap className="h-5 w-5 text-brand" />
            <h3 className="mt-3 font-semibold text-foreground">Join a chapter</h3>
            <p className="mt-1 text-sm text-muted-foreground">Plug into your campus tribe. Lead, ship, win together.</p>
            <Button asChild size="sm" variant="outline" className="mt-4"><Link to="/campus">Open Campus Hub</Link></Button>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <AdSlot slotId="dashboard_recommended" variant="card" label="Recommended for Builders" />
          <AdSlot slotId="dashboard_featured" variant="card" label="Featured Partner" />
        </div>
      </section>
    </AppShell>
  );
}

/* --------------------------- Activation Checklist --------------------------- */

function ActivationChecklist({
  hasProfile,
  hasApplied,
  hasJoinedCampus,
  hasPortfolio,
}: {
  hasProfile: boolean;
  hasApplied: boolean;
  hasJoinedCampus: boolean;
  hasPortfolio: boolean;
}) {
  const steps = [
    { done: hasJoinedCampus, label: "Joined your campus", xp: "+30 XP", to: "/campus" as const, cta: "Open campus" },
    { done: hasProfile, label: "Complete your profile", xp: "+40 XP", to: "/profile" as const, cta: "Edit profile" },
    { done: hasApplied, label: "Apply to your first challenge", xp: "+50 XP", to: "/projects" as const, cta: "Browse challenges" },
    { done: hasPortfolio, label: "Add your first portfolio link", xp: "+30 XP", to: "/portfolio" as const, cta: "Add portfolio" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  if (allDone) return null;

  // Find the next undone step → priority CTA
  const next = steps.find((s) => !s.done);
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="border-b border-border/40 bg-secondary/30 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Sparkles className="h-4 w-4 text-cyan" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Get started · {doneCount}/{steps.length}</h2>
          <div className="ml-auto text-xs text-muted-foreground">{pct}% activated</div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-gradient-brand transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs transition-all ${
                s.done
                  ? "border-border bg-background text-muted-foreground"
                  : s === next
                    ? "border-brand/40 bg-brand/5 text-foreground hover:shadow-brand"
                    : "border-border bg-background text-foreground hover:border-brand/40"
              }`}
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-cyan/15 text-cyan" : "border border-border bg-background text-muted-foreground"}`}>
                {s.done ? "✓" : ""}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`truncate font-medium ${s.done ? "line-through" : ""}`}>{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.xp}</div>
              </div>
              {!s.done && <ArrowRight className="h-3 w-3 shrink-0" />}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
