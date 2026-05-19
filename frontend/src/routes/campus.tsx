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
import { chapter, events } from "@/lib/scope-store";
import { toast } from "sonner";
import { backendFeed, backendInstitutions, backendUsers, backendProjects, backendEvents, type BackendFeedPost } from "@/lib/api/endpoints";

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

  const isManagementRole = user?.role === "faculty" || user?.role === "institution_admin";

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

  const join = () => {
    if (!user) { toast.error("Sign in to join your chapter."); return; }
    chapter.join(myCampus);
    toast.success(`Welcome to ${myCampus}. +40 XP awarded.`);
  };

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
              <Button onClick={join} disabled={joined === myCampus} className={joined === myCampus ? "bg-success text-primary-foreground" : "bg-gradient-brand text-brand-foreground shadow-brand"}>
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
                  <li key={e.id} className="rounded-lg border border-border p-3 hover-lift">
                    <Badge className={`text-xs ${e.color === 'brand' ? 'bg-brand/10 text-brand border-brand/20' : e.color === 'cyan' ? 'bg-cyan/10 text-cyan border-cyan/20' : ''}`}>{e.type}</Badge>
                    <div className="mt-2 text-sm font-semibold text-foreground">{e.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {e.date}
                    </div>
                    {rsvps.includes(e.id) && <div className="mt-2 text-xs text-success">✓ You're going</div>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-foreground">Other top campuses</h3>
              <ul className="mt-4 space-y-3">
                {campusPartners.slice(1, 6).map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground">#{i + 2}</span>
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{c.members}</span>
                  </li>
                ))}
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

