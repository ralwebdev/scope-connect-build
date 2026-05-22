import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Trophy, TrendingUp, Rocket, Calendar, MapPin, Check, Plus, Trash2, Edit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/site/AppShell";
import { useStoreValue, useUser } from "@/hooks/use-scope";
import { campusPartners } from "@/lib/mock-data";
import { chapter, events, auth } from "@/lib/scope-store";
import { toast } from "sonner";
import { backendFeed, backendInstitutions, backendUsers, backendProjects, backendEvents, type BackendFeedPost, type BackendInstitution } from "@/lib/api/endpoints";

export const Route = createFileRoute("/campus")({
  head: () => ({
    meta: [
      { title: "Campus Hub — Scope Connect" },
      { name: "description", content: "Your campus's home on Scope Connect — leaders, projects, events & rank." },
    ],
  }),
  component: CampusHub,
});

function CampusHub() {
  const user = useUser();
  const joined = useStoreValue(() => chapter.joined());
  const upcoming = useStoreValue(() => events.all().slice(0, 3));
  const rsvps = useStoreValue(() => events.rsvps());
  const myCampus = user?.campus ?? campusPartners[0].name;
  const campusInfo = campusPartners.find((c) => c.name === myCampus) ?? campusPartners[0];
  const [topBuilders, setTopBuilders] = useState<Array<{ name: string; level: string; points: number }>>([]);
  const [campusFeed, setCampusFeed] = useState<BackendFeedPost[]>([]);
  const [summary, setSummary] = useState<{ campus_name: string | null; city: string | null; active_members: number; leaders: number; projects_shipped: number; weekly_growth_pct: number } | null>(null);
  const [campusEvents, setCampusEvents] = useState<any[]>([]);
  const [topCampuses, setTopCampuses] = useState<Array<{ id: string; name: string; sub: string; value: number }>>([]);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    summary: "",
    description: "",
    domain: "",
    capacity: 10,
    status: "open",
    visibility: "institution"
  });

  const [publicCampuses, setPublicCampuses] = useState<BackendInstitution[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const isManagementRole = user?.role === "faculty" || user?.role === "institution_admin";
  const isPendingVerification = user?.student_status === "pending_verification";

  useEffect(() => {
    if (user?.institution?.id) return;
    setIsLoadingCampuses(true);
    backendInstitutions.publicList()
      .then(({ items }) => {
        setPublicCampuses(items);
      })
      .catch((err) => {
        console.error("Failed to load public campuses", err);
        toast.error("Failed to load campus list");
      })
      .finally(() => {
        setIsLoadingCampuses(false);
      });
  }, [user?.institution?.id]);

  useEffect(() => {
    if (!user?.institution?.id) return;
    let cancelled = false;
    backendUsers.list({ institutionId: user.institution.id })
      .then(({ items }) => {
        if (cancelled) return;
        const ranked = items
          .map((member) => ({
            name: member.name,
            level: `Level ${member.stats?.level ?? 1}`,
            points: member.stats?.xp ?? 0,
          }))
          .sort((a, b) => b.points - a.points)
          .slice(0, 10);
        setTopBuilders(ranked);
      })
      .catch(() => {
        if (!cancelled) setTopBuilders([]);
      });
    return () => { cancelled = true; };
  }, [user?.institution?.id]);

  useEffect(() => {
    if (!user?.institution?.id) return;
    let cancelled = false;
    backendInstitutions.campusSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => { cancelled = true; };
  }, [user?.institution?.id]);

  useEffect(() => {
    if (!user?.institution?.id) return;
    let cancelled = false;
    backendFeed.listCampus(20)
      .then(({ items }) => {
        if (!cancelled) setCampusFeed(items);
      })
      .catch(() => {
        if (!cancelled) setCampusFeed([]);
      });
    return () => { cancelled = true; };
  }, [user?.institution?.id]);

  useEffect(() => {
    if (!user?.institution?.id) return;
    let cancelled = false;
    backendUsers.listCampusesByMembers()
      .then(({ items }) => {
        if (!cancelled) setTopCampuses(items);
      })
      .catch(() => {
        if (!cancelled) setTopCampuses([]);
      });
    return () => { cancelled = true; };
  }, [user?.institution?.id]);

  useEffect(() => {
    if (!user?.institution?.id) return;
    let cancelled = false;
    backendEvents.list(user.institution.id)
      .then(({ items }) => {
        if (cancelled) return;
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
        const activeEvents = items.filter((item) => {
          const startsAt = startsAtFromDate(item.date);
          return startsAt >= now;
        });
        setCampusEvents(activeEvents);
      })
      .catch(() => {
        if (!cancelled) setCampusEvents([]);
      });
    return () => { cancelled = true; };
  }, [user?.institution?.id]);

  const join = async (instId: string, name: string) => {
    if (!user) { toast.error("Sign in to join your chapter."); return; }
    setIsJoining(true);
    try {
      await chapter.join(instId);
      toast.success(`Successfully joined the ${name} Chapter! +40 XP awarded.`);
      void auth.refreshCurrentUser().catch(() => null);
    } catch (error) {
      toast.error("Failed to join chapter. Please try again.");
      console.error(error);
    } finally {
      setIsJoining(false);
    }
  };

  const filteredCampuses = publicCampuses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!user?.institution?.id) {
    return (
      <AppShell>
        <section className="bg-gradient-hero py-16 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,209,255,0.15),transparent_45%)]" />
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20 px-3 py-1 text-xs tracking-wider uppercase mb-4">Connect with Your Campus</Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white via-foreground to-white/70">
              Find Your Campus Chapter
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/70 max-w-2xl mx-auto">
              Join your local student chapter on Scope Connect to collaborate on exclusive campus projects, attend local developer events, and climb the student leaderboards.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Users className="h-4 w-4" />
              </span>
              <Input
                type="text"
                placeholder="Search campuses by name or city..."
                className="pl-10 bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground focus:ring-cyan focus:border-cyan"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredCampuses.length} active {filteredCampuses.length === 1 ? 'chapter' : 'chapters'}
            </div>
          </div>

          {isLoadingCampuses ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="border-border bg-secondary/20 p-6 animate-pulse">
                  <div className="h-12 w-12 rounded-lg bg-secondary mb-4" />
                  <div className="h-5 bg-secondary rounded w-2/3 mb-2" />
                  <div className="h-4 bg-secondary rounded w-1/2 mb-4" />
                  <div className="h-10 bg-secondary rounded w-full" />
                </Card>
              ))}
            </div>
          ) : filteredCampuses.length === 0 ? (
            <Card className="border-dashed border-border p-12 text-center bg-secondary/10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No campuses found</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                We couldn't find any active campus chapters matching "{searchQuery}". Make sure the spelling is correct or reach out to Scope Support to launch a chapter at your institution.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCampuses.map((campus) => (
                <Card key={campus.id} className="border-border bg-secondary/15 hover-lift p-6 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-brand text-brand-foreground font-extrabold text-lg mb-4 shadow-sm group-hover:scale-105 transition-transform">
                      {campus.logo_text || campus.name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-cyan transition-colors">{campus.name}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-cyan" /> {campus.city || "Scope Chapter"}{campus.state ? `, ${campus.state}` : ""}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {campus.description || "Active student developer chapter working on real-world projects, workshops, and startup initiatives."}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <Button
                      onClick={() => join(campus.id, campus.name)}
                      disabled={isJoining}
                      className="w-full bg-gradient-brand text-brand-foreground shadow-brand hover:brightness-110"
                    >
                      {isJoining ? "Joining..." : "Join Chapter (+40 XP)"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </AppShell>
    );
  }

  const handleCreateProject = async () => {
    if (!newProject.title) return toast.error("Project title is required");
    try {
      await backendProjects.create(newProject);
      toast.success("Campus project launched!");
      setIsProjectModalOpen(false);
      setNewProject({
        title: "",
        summary: "",
        description: "",
        domain: "",
        capacity: 10,
        status: "open",
        visibility: "institution"
      });
      // Optionally refresh feed or metrics
    } catch (error) {
      toast.error("Failed to launch project");
    }
  };

  return (
    <AppShell>
      <section className="bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">Campus Hub</Badge>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{summary?.campus_name || campusInfo.name}</h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-primary-foreground/70">
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {summary?.city || campusInfo.city}</span>
                <span>·</span>
                <span>Campus Rank #1 in India</span>
              </div>
            </div>
            {isManagementRole ? (
              <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-brand text-brand-foreground shadow-brand">
                    <Plus className="mr-2 h-4 w-4" /> Add project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-background text-foreground border-border">
                  <DialogHeader>
                    <DialogTitle>Launch Campus Project</DialogTitle>
                    <DialogDescription>
                      Exclusive for {summary?.campus_name || campusInfo.name} builders.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Project Title *</Label>
                      <Input 
                        placeholder="e.g. AI-Powered Campus Assistant" 
                        value={newProject.title} 
                        onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Domain</Label>
                      <Input 
                        placeholder="e.g. Engineering, AI, Design" 
                        value={newProject.domain} 
                        onChange={(e) => setNewProject({...newProject, domain: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Team Capacity</Label>
                      <Input 
                        type="number"
                        value={newProject.capacity} 
                        onChange={(e) => setNewProject({...newProject, capacity: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Short Summary</Label>
                      <Input 
                        placeholder="Visible in cards..." 
                        value={newProject.summary} 
                        onChange={(e) => setNewProject({...newProject, summary: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Detailed Description</Label>
                      <Textarea 
                        placeholder="Explain the problem, goals, and outcomes..." 
                        className="min-h-[120px]"
                        value={newProject.description} 
                        onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsProjectModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateProject} className="bg-gradient-brand text-brand-foreground">Launch Now</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Button onClick={() => user?.institution?.id && join(user.institution.id, myCampus)} disabled={joined === myCampus} className={joined === myCampus ? "bg-success text-primary-foreground" : "bg-gradient-brand text-brand-foreground shadow-brand"}>
                {joined === myCampus ? (<><Check className="mr-2 h-4 w-4" /> Joined chapter</>) : (<><Plus className="mr-2 h-4 w-4" /> Join chapter (+40 XP)</>)}
              </Button>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              { l: "Active members", v: (summary?.active_members ?? campusInfo.members).toLocaleString(), i: Users },
              { l: "Leaders", v: String(summary?.leaders ?? 18), i: Trophy },
              { l: "Projects shipped", v: String(summary?.projects_shipped ?? 124), i: Rocket },
              { l: "Weekly growth", v: `${(summary?.weekly_growth_pct ?? 12) >= 0 ? "+" : ""}${summary?.weekly_growth_pct ?? 12}%`, i: TrendingUp },
            ].map(({ l, v, i: Icon }) => (
              <Card key={l} className="border-primary-foreground/10 bg-primary-foreground/5 p-5 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-foreground/60">{l}</span>
                  <Icon className="h-4 w-4 text-cyan" />
                </div>
                <div className="mt-2 text-2xl font-bold">{v}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {isPendingVerification && (
          <div className="mb-8 rounded-xl border border-warning/20 bg-warning/5 p-5 backdrop-blur-md relative overflow-hidden shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="absolute inset-0 bg-gradient-to-r from-warning/5 to-transparent pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning border border-warning/20">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-md font-bold text-foreground flex items-center gap-2">
                  Pending Coordinator Verification
                  <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">Awaiting Action</Badge>
                </h4>
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                  Welcome to the chapter! Your affiliation with this institution has been registered. A campus coordinator is reviewing your builder profile. Once verified, you will unlock full team collab privileges.
                </p>
              </div>
            </div>
            <div className="shrink-0 relative z-10">
              <Button variant="outline" size="sm" className="border-warning/30 hover:bg-warning/10 text-foreground" onClick={() => toast.info("Your application is queued. Coordinators are notified daily.")}>
                Check Status
              </Button>
            </div>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="border-b border-border p-5">
              <h3 className="font-semibold text-foreground">Top builders on campus</h3>
            </div>
            <div className="divide-y divide-border">
              {topBuilders.length === 0 && (
                <div className="p-5 text-sm text-muted-foreground">No ranked builders yet for this campus.</div>
              )}
              {topBuilders.map((b, i) => (
                <div key={b.name} className="flex items-center gap-4 p-5 transition-colors hover:bg-secondary/40">
                  <div className="w-6 text-sm font-bold text-muted-foreground">#{i + 1}</div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                    {b.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.level}</div>
                  </div>
                  <Badge variant="outline">{b.points.toLocaleString()} pts</Badge>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Campus events</h3>
                <Link to="/events" className="text-xs font-semibold text-brand hover:underline">All events</Link>
              </div>
              <ul className="mt-4 space-y-3">
                {campusEvents.length === 0 && (
                  <div className="text-sm text-muted-foreground py-4">No upcoming events scheduled.</div>
                )}
                {campusEvents.map((e) => (
                  <li key={e.id} className="rounded-lg border border-border p-3 hover-lift w-full overflow-hidden min-w-0">
                    <Badge
                      className={`text-xs max-w-full truncate inline-block text-center align-middle ${
                        e.color === 'brand'
                          ? 'bg-brand/10 text-brand border-brand/20'
                          : e.color === 'cyan'
                          ? 'bg-cyan/10 text-cyan border-cyan/20'
                          : ''
                      }`}
                      title={e.type}
                    >
                      {e.type}
                    </Badge>
                    <div className="mt-2 text-sm font-semibold text-foreground break-words line-clamp-2" title={e.title}>
                      {e.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" /> <span className="truncate">{e.date}</span>
                    </div>
                    {rsvps.includes(e.id) && <div className="mt-2 text-xs text-success">✓ You're going</div>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-foreground">Other top campuses</h3>
              <ul className="mt-4 space-y-3">
                {(() => {
                  const currentCampusName = summary?.campus_name || campusInfo.name;
                  
                  // Get the current user's campus rank to avoid rank conflicts
                  const currentUserCampusRank = topCampuses.findIndex(tc => tc.name === currentCampusName) + 1;
                  const occupiedRanks = new Set<number>();
                  if (currentUserCampusRank > 0) {
                    occupiedRanks.add(currentUserCampusRank);
                  }

                  // 1. Get all real campuses from database except the current user's campus
                  const realCampuses = topCampuses
                    .filter(c => c.name !== currentCampusName)
                    .map(c => {
                      const globalRank = topCampuses.findIndex(tc => tc.name === c.name) + 1;
                      if (globalRank > 0) {
                        occupiedRanks.add(globalRank);
                      }
                      return {
                        name: c.name,
                        rank: globalRank > 0 ? globalRank : 2,
                        members: c.value
                      };
                    });

                  // 2. Supplement with mock campuses from campusPartners if we have fewer than 5 items
                  const displayCampuses = [...realCampuses];
                  if (displayCampuses.length < 5) {
                    const existingNames = new Set([currentCampusName, ...realCampuses.map(rc => rc.name)]);
                    
                    let nextRank = 2;
                    for (const partner of campusPartners) {
                      if (displayCampuses.length >= 5) break;
                      if (!existingNames.has(partner.name)) {
                        while (occupiedRanks.has(nextRank)) {
                          nextRank++;
                        }
                        occupiedRanks.add(nextRank);
                        displayCampuses.push({
                          name: partner.name,
                          rank: nextRank,
                          members: partner.members
                        });
                      }
                    }
                  }
                  
                  return displayCampuses.map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-sm w-full overflow-hidden min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground shrink-0">#{c.rank}</span>
                        <span className="font-medium text-foreground truncate" title={c.name}>{c.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 pl-2">{c.members}</span>
                    </li>
                  ));
                })()}
              </ul>
            </Card>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">Campus feed</h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {campusFeed.slice(0, 4).map((p) => (
              <Card key={p.id} className="p-5 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                    {p.author.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{p.author}</div>
                    <div className="text-xs text-muted-foreground">{p.time}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{p.type}</Badge>
                </div>
                <p className="mt-3 text-sm text-foreground/90">{p.content}</p>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span>♥ {p.likes}</span>
                  <span>🎉 {p.celebrates}</span>
                  <span>💬 {p.comments}</span>
                </div>
              </Card>
            ))}
            {campusFeed.length === 0 && (
              <Card className="p-5 text-sm text-muted-foreground">No campus feed posts yet.</Card>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
