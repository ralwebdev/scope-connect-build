import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trophy, Flame, TrendingUp, Calendar, Users, Sparkles, ArrowRight, Target, Zap, Rocket, Briefcase, Lightbulb, ShieldCheck, MapPin, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/site/AppShell";
import { AdSlot } from "@/components/site/AdSlot";
import { AuthGate } from "@/components/site/AuthGate";
import { CountUp } from "@/components/site/Effects";
import { useImageSrc } from "@/hooks/use-image-src";
import { useUser, useXP, useLevel, useLevelProgress, useStreak, useProfileStrength, useStoreValue } from "@/hooks/use-scope";
import { auth, events, memberLeaderboard, applications, curated, portfolio } from "@/lib/scope-store";
import { RetentionLayer } from "@/components/site/RetentionLayer";
import { PortfolioSpotlight } from "@/components/site/PortfolioSpotlight";
import { CredibilityPanel } from "@/components/site/CredibilityPanel";
import { DropoffNudge } from "@/components/site/DropoffNudge";
import { useRole } from "@/hooks/use-rbac";
import { landingRouteForRole } from "@/lib/rbac";
import { backendApplications, backendEvents, backendFeed, backendNotifications, backendPortfolio, backendProjects, backendUsers } from "@/lib/api/endpoints";

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
  const avatar = useImageSrc(user?.avatarUrl);
  const xp = useXP();
  const level = useLevel();
  const levelProgress = useLevelProgress();
  const streak = useStreak();
  const strength = useProfileStrength();
  const upcoming = useStoreValue(() => events.all().slice(0, 3));
  const board = useStoreValue(() => memberLeaderboard());
  const myApplications = useStoreValue(() => (user ? applications.forUser(user.id) : []));
  const recommended = useStoreValue(() => curated.scopeChallenges().slice(0, 3));
  const portfolioStrength = useStoreValue(() => (user ? portfolio.strength(user.id) : 0));
  const portfolioCount = useStoreValue(() => (user ? portfolio.forUser(user.id).length : 0));
  const [loadingHydration, setLoadingHydration] = useState(false);
  const [myRankHydrated, setMyRankHydrated] = useState<{ global: number; campus: number | null } | null>(null);
  const [myApplicationsHydrated, setMyApplicationsHydrated] = useState<number | null>(null);
  const [recommendedHydrated, setRecommendedHydrated] = useState<Array<{ id: string; title: string; description: string; cover: string }>>([]);
  const [campusProjectsHydrated, setCampusProjectsHydrated] = useState<Array<{ id: string; title: string; description: string; cover: string }>>([]);
  const [recentFeedHydrated, setRecentFeedHydrated] = useState<Array<{ id: string; author: string; campus: string; time: string; type: string; content: string; media?: Array<{ type: "image" | "video"; url: string }> }>>([]);
  const [upcomingHydrated, setUpcomingHydrated] = useState<Array<{ id: string; title: string; month: string; day: string; venue: string }> | null>(null);
  const [portfolioStatsHydrated, setPortfolioStatsHydrated] = useState<{ count: number; strength: number } | null>(null);
  const [myApplicationsListHydrated, setMyApplicationsListHydrated] = useState<Array<{ id: string; projectId: string; status: string; topSkill: string }>>([]);

  const formatEventDate = (value: string) => {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
    
    // Manual fallback for common Indian/user formats like "May 15, 2:00 PM"
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lower = value.toLowerCase();
    const monthIndex = months.findIndex(m => lower.includes(m.toLowerCase()));
    const dayMatch = value.match(/\b(\d{1,2})\b/);
    
    if (monthIndex !== -1 && dayMatch) {
      return `${months[monthIndex]} ${dayMatch[1].padStart(2, "0")}`;
    }
    return value;
  };

  const getEventDateParts = (value: string) => {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return {
        month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
        day: d.getDate().toString(),
      };
    }

    // Manual fallback parsing
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const lower = value.toLowerCase();
    const monthIndex = months.findIndex(m => lower.includes(m.toLowerCase()));
    const dayMatch = value.match(/\b(\d{1,2})\b/);

    if (monthIndex !== -1 && dayMatch) {
      return {
        month: months[monthIndex],
        day: dayMatch[1],
      };
    }

    return { month: "DATE", day: "?" };
  };

  if (!user) return null;
  useEffect(() => {
    let cancelled = false;
    setLoadingHydration(true);
    Promise.allSettled([
      backendUsers.list(),
      backendProjects.list(),
      backendEvents.list(user.institution?.id),
      backendNotifications.list(),
      backendFeed.listCampus(20),
      backendPortfolio.listMe(),
      backendApplications.list(),
      backendUsers.getRank(),
    ])
      .then(([usersData, projectsData, eventsData, notificationsData, feedData, portfolioData, applicationsData, rankData]) => {
        if (cancelled) return;
        if (rankData && rankData.status === "fulfilled") {
          setMyRankHydrated({
            global: rankData.value.globalRank,
            campus: rankData.value.campusRank
          });
        }
        if (notificationsData.status === "fulfilled") {
          const myApps = notificationsData.value.items.filter((n) => n.kind === "application_status_changed" || n.kind === "application_received");
          setMyApplicationsHydrated(myApps.length);
        }
        if (projectsData.status === "fulfilled") {
          setRecommendedHydrated(
            projectsData.value.items
              .filter((p) => !p.institution_id)
              .slice(0, 3)
              .map((p) => ({
                id: p.id,
                title: p.title,
                description: p.description || p.summary || "Live builder opportunity.",
                cover: "🚀",
              })),
          );
          setCampusProjectsHydrated(
            projectsData.value.items
              .filter((p) => p.institution_id === user.institution?.id)
              .slice(0, 3)
              .map((p) => ({
                id: p.id,
                title: p.title,
                description: p.description || p.summary || "Campus specific project.",
                cover: "🏫",
              })),
          );
        }
        if (eventsData.status === "fulfilled") {
          const startsAtFromDate = (value: string) => {
            let parsed = Date.parse(value);
            if (!Number.isNaN(parsed)) return parsed;
            
            const currentYear = new Date().getFullYear();
            parsed = Date.parse(`${value}, ${currentYear}`);
            if (!Number.isNaN(parsed)) return parsed;
            
            const cleaned = value.replace(/\s*,\s*/g, ", ");
            parsed = Date.parse(`${cleaned}, ${currentYear}`);
            if (!Number.isNaN(parsed)) return parsed;

            return Date.now() + 7 * 86400000;
          };

          const now = Date.now();
          const activeEvents = eventsData.value.items.filter((eventItem) => {
            const startsAt = startsAtFromDate(eventItem.date);
            return startsAt >= now;
          });

          setUpcomingHydrated(
            activeEvents.slice(0, 3).map((eventItem) => {
              const parts = getEventDateParts(eventItem.date);
              return {
                id: eventItem.id,
                title: eventItem.title,
                month: parts.month,
                day: parts.day,
                venue: eventItem.venue,
              };
            }),
          );
        }
        if (feedData.status === "fulfilled") {
          setRecentFeedHydrated(
            feedData.value.items.map((item) => ({
              id: item.id,
              author: item.author,
              campus: item.campus,
              time: item.time,
              type: item.type,
              content: item.content,
              media: item.media,
            })),
          );
        }
        if (portfolioData.status === "fulfilled") {
          const items = portfolioData.value.items;
          const count = items.length;
          const strengthValue = count === 0 ? 0 : count >= 6 ? 100 : Math.min(100, 25 + count * 15);
          setPortfolioStatsHydrated({ count, strength: strengthValue });
        }
        if (applicationsData.status === "fulfilled") {
          setMyApplicationsListHydrated(
            applicationsData.value.items.slice(0, 3).map((a) => ({
              id: a.id,
              projectId: a.project_id,
              status: a.status.charAt(0).toUpperCase() + a.status.slice(1).replace("_", " "),
              topSkill: "Backend Synced",
            })),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHydration(false);
      });
    return () => { cancelled = true; };
  }, [user.id, user.campus]);
  const rankInfo = myRankHydrated || { global: board.findIndex((r) => r.isMe) + 1 || 0, campus: null };
  const xpToNext = level.max - xp;
  const myApplicationsCount = myApplicationsHydrated ?? myApplications.length;
  const myApplicationsList = myApplicationsListHydrated.length ? myApplicationsListHydrated : myApplications.slice(0, 3).map(a => ({ id: a.id, projectId: a.projectId, status: a.status, topSkill: a.topSkill }));
  const currentPortfolioCount = portfolioStatsHydrated?.count ?? portfolioCount;
  const currentPortfolioStrength = portfolioStatsHydrated?.strength ?? portfolioStrength;

  const upcomingRows = (upcomingHydrated && upcomingHydrated.length > 0)
    ? upcomingHydrated
    : upcoming.map((e) => {
      const parts = getEventDateParts(e.date);
      return {
        id: e.id,
        title: e.title,
        month: parts.month,
        day: parts.day,
        venue: e.venue,
      };
    });
  const recommendedRows = recommendedHydrated.length ? recommendedHydrated : recommended;

  useEffect(() => {
    const segments: Array<"joined_campus" | "complete_profile" | "first_application" | "first_portfolio"> = [];
    if (user.campus) segments.push("joined_campus");
    if (strength >= 60) segments.push("complete_profile");
    if (myApplicationsCount > 0) segments.push("first_application");
    if (portfolioCount > 0) segments.push("first_portfolio");
    if (segments.length === 0) return;

    backendUsers.awardDashboardPoints(segments)
      .then(({ user: refreshedUser }) => {
        auth.syncApiUser(refreshedUser);
      })
      .catch(() => null);
  }, [user.campus, strength, myApplicationsCount, portfolioCount]);

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-10 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl text-2xl font-bold text-brand-foreground shadow-brand ring-2 ring-white/10"
              style={{ background: avatar.hasImage ? "transparent" : user.avatarColor }}>
              {avatar.hasImage ? (
                <img src={avatar.src} alt={user.name} className="h-full w-full object-cover" onError={avatar.onError} />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
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
                <div className="text-2xl font-bold">#{rankInfo.global || "—"}</div>
              </div>
              {rankInfo.campus && (
                <div>
                  <div className="text-xs text-primary-foreground/60">Campus Rank</div>
                  <div className="text-2xl font-bold">#{rankInfo.campus}</div>
                </div>
              )}
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
        hasApplied={myApplicationsCount > 0}
        hasJoinedCampus={!!user.campus}
        hasPortfolio={currentPortfolioCount > 0}
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
          <Card className="flex flex-col lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="font-semibold text-foreground">Recent feed</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/feed">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto bg-card rounded-b-xl border-t-0 p-5">
              <div className="flex flex-col gap-6">
              {recentFeedHydrated.map((p) => (
                <div key={p.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.author}</span>
                      <Badge variant="secondary" className="text-[9px]">{p.type || "Update"}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{p.time}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{p.campus}</div>
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{p.content}</p>
                  
                  {p.media && p.media.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {p.media.map((m, idx) => (
                        <div key={idx} className="overflow-hidden rounded-xl border border-border bg-secondary/20">
                          {m.type === "image" ? (
                            <img src={m.url} alt="Post media" className="h-auto w-full object-cover" />
                          ) : (
                            <video src={m.url} controls className="h-auto w-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <CredibilityPanel />
            <Card className="p-5 hover-lift">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Upcoming events</h3>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <ul className="mt-4 space-y-1">
                {upcomingRows.map((e) => (
                  <li key={e.id} className="group flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-brand/5">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-brand/20 text-brand shadow-sm ring-1 ring-brand/20 transition-all group-hover:scale-105 group-hover:shadow-md">
                      <span className="text-[10px] font-bold uppercase tracking-wider leading-none">{e.month}</span>
                      <span className="text-lg font-black leading-none mt-0.5">{e.day}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground group-hover:text-brand transition-colors">{e.title}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{e.venue}</span>
                      </div>
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
                  {myApplicationsList.map((a) => {
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
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" className="flex-1 bg-gradient-brand text-brand-foreground shadow-brand">
                  <Link to="/applications"><ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Track All <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link to="/projects">Browse More</Link>
                </Button>
              </div>
            </Card>

            <Card className="bg-gradient-hero p-5 text-primary-foreground hover-lift">
              <Trophy className="h-5 w-5 text-cyan" />
              <h3 className="mt-3 font-semibold">Leaderboard position</h3>
              <p className="mt-1 text-sm text-primary-foreground/70">You're #{rankInfo.global || "—"} on the national board.</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-cyan">
                <TrendingUp className="h-3.5 w-3.5" /> You're {Math.max(0, rankInfo.global - 10)} moves from Top 10.
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
        
        {campusProjectsHydrated.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🏫 From your institute</div>
                <h2 className="mt-1 text-xl font-bold text-foreground">Campus Projects</h2>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/projects">See all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {campusProjectsHydrated.map((p) => (
                <Card key={p.id} className="flex flex-col p-5 hover-lift">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary"><Users className="mr-1 h-3 w-3" /> Campus Project</Badge>
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
        )}

        <PortfolioSpotlight />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="p-6 hover-lift">
            <Briefcase className="h-5 w-5 text-brand" />
            <h3 className="mt-3 font-semibold text-foreground">Portfolio strength</h3>
            <p className="mt-1 text-sm text-muted-foreground">{currentPortfolioCount} item{currentPortfolioCount === 1 ? "" : "s"} · {currentPortfolioStrength}% complete</p>
            <Progress value={currentPortfolioStrength} className="mt-3" />
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
