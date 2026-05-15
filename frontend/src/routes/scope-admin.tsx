import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, Calendar, FileText, Rocket, Trophy, MapPin, Phone, Mail, Plus, ChevronRight, CheckCircle2, Circle, Download, Send, Star, ArrowRight, Target, Activity, Trash2, BookOpen, Layers, Zap, Clock, Users, Gift, ShieldAlert, Upload, FileUp, MoreVertical, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useStoreValue, useUser } from "@/hooks/use-scope";
import { useRole } from "@/hooks/use-rbac";
import { crm, PIPELINE_STAGES, type Institution, type PipelineStage } from "@/lib/crm-store";
import { backendAdminUsers, backendEvents, type BackendEvent, backendProjects, type BackendProject, backendApplications, type BackendApplication, backendInstitutions, backendDocuments } from "@/lib/api/endpoints";
import { toast } from "sonner";
import { PROJECT_TEMPLATES } from "@/lib/data/project-templates";
import { FeedComposer } from "@/components/site/FeedComposer";

export const Route = createFileRoute("/scope-admin")({
  head: () => ({ meta: [{ title: "Scope Admin · Territory CRM" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "crm",
  }),
  component: ScopeAdminPortal,
});

const STAGE_COLORS: Record<PipelineStage, string> = {
  Prospect: "bg-muted text-muted-foreground",
  Contacted: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  "Meeting Scheduled": "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  "Meeting Completed": "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  "Proposal Sent": "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  Negotiation: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
  "MoU Draft Shared": "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  "MoU Signed": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "Launch Pending": "bg-pink-500/15 text-pink-600 dark:text-pink-300",
  "Live Chapter": "bg-gradient-brand text-brand-foreground",
  Dormant: "bg-destructive/15 text-destructive",
};

function ScopeAdminPortal() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const role = useRole();
  const user = useUser();
  const isAllowed = role === "scope_admin" || role === "scope_super_admin" || role === "super_admin";

  const all = useStoreValue(() => crm.all());
  useEffect(() => {
    if (!isAllowed) return;
    void crm.syncFromBackend().catch((error) => {
      console.warn("CRM sync failed", error);
      toast.error(error instanceof Error ? error.message : "Could not load CRM data.");
    });
  }, [isAllowed]);

  const myAdminId = role === "scope_admin" ? user?.id ?? null : null;
  const institutions = useMemo(
    () => myAdminId ? all.institutions.filter(i => !i.ownerId || i.ownerId === myAdminId) : all.institutions,
    [all.institutions, myAdminId],
  );
  const visits = useMemo(
    () => myAdminId ? all.visits.filter(v => !v.ownerId || v.ownerId === myAdminId) : all.visits,
    [all.visits, myAdminId],
  );

  const kpis = useMemo(() => {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const monthMs = month.getTime();
    const meetingsThisMonth = visits.filter(v => new Date(v.date).getTime() >= monthMs).length;
    const proposals = institutions.filter(i => ["Proposal Sent", "Negotiation", "MoU Draft Shared"].includes(i.stage)).length;
    const mous = institutions.filter(i => ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage)).length;
    const live = institutions.filter(i => i.stage === "Live Chapter").length;
    const potential = institutions.filter(i => !["Live Chapter", "Dormant"].includes(i.stage)).reduce((s, i) => s + i.potentialValue, 0);
    return { assigned: institutions.length, meetings: meetingsThisMonth, proposals, mous, potential, live };
  }, [institutions, visits]);

  if (!isAllowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="manage_partnerships"
          title="Scope Admin only"
          message="The Territory CRM is restricted to Scope Admins, Scope Super Admins, and Super Admins."
          toastMessage="Restricted area. Scope Admin access required."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RbacSidebar title="Territory Command">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-2"><Building2 className="mr-1 h-3 w-3" /> Scope Admin Portal</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Territory Command</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every visit can create a chapter. Turn meetings into movements.</p>
          </div>
          <NewLeadDialog ownerId={myAdminId ?? user?.id ?? ""} />
        </header>

        <div className="mt-6 mb-6">
          <FeedComposer />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Institutions" value={kpis.assigned} icon={Building2} />
          <KpiCard label="Meetings (mo)" value={kpis.meetings} icon={Calendar} />
          <KpiCard label="Proposals" value={kpis.proposals} icon={FileText} />
          <KpiCard label="MoUs Signed" value={kpis.mous} icon={CheckCircle2} accent />
          <KpiCard label="Potential ₹" value={`₹${(kpis.potential / 100000).toFixed(1)}L`} icon={Target} />
          <KpiCard label="Live Chapters" value={kpis.live} icon={Rocket} accent />
        </div>

        <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v } })} className="mt-8">
          <TabsList className="flex-wrap">
            <TabsTrigger value="crm">Territory CRM</TabsTrigger>
            <TabsTrigger value="visits">Visit Planner</TabsTrigger>
            <TabsTrigger value="proposals">Proposals & MoU</TabsTrigger>
            <TabsTrigger value="launch">Launch Tracker</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="events">Scope Events</TabsTrigger>
            <TabsTrigger value="projects">Scope Projects</TabsTrigger>
          </TabsList>
          
          <TabsContent value="crm" className="mt-6">
            <div className="space-y-4">
              <InstitutionAccountForm institutions={institutions} />
              <PipelineBoard institutions={institutions} />
            </div>
          </TabsContent>
          <TabsContent value="visits" className="mt-6"><VisitPlanner visits={visits} institutions={institutions} ownerId={myAdminId ?? user?.id ?? ""} /></TabsContent>
          <TabsContent value="proposals" className="mt-6"><ProposalCenter institutions={institutions} /></TabsContent>
          <TabsContent value="launch" className="mt-6"><LaunchTracker institutions={institutions.filter(i => ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage))} /></TabsContent>
          <TabsContent value="performance" className="mt-6"><PerformanceScorecard institutions={institutions} visits={visits} /></TabsContent>
          <TabsContent value="events" className="mt-6"><ScopeEventsManager /></TabsContent>
          <TabsContent value="projects" className="mt-6"><ScopeProjectsManager /></TabsContent>
        </Tabs>
      </section>
      </RbacSidebar>
    </AppShell>
  );
}

function ScopeEventsManager() {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<BackendEvent, "id">>({
    title: "",
    type: "",
    date: "",
    venue: "",
    seats: 100,
    color: "brand",
  });

  useEffect(() => {
    let cancelled = false;
    backendEvents.list()
      .then(({ items }) => { if (!cancelled) setEvents(items); })
      .catch((error) => { toast.error(error instanceof Error ? error.message : "Could not load events."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.type || !form.date || !form.venue || form.seats < 1) {
      toast.error("Fill all fields with valid values.");
      return;
    }
    setSaving(true);
    try {
      const { event: created } = await backendEvents.create(form);
      setEvents((current) => [created, ...current]);
      setForm({ title: "", type: "", date: "", venue: "", seats: 100, color: "brand" });
      toast.success("Upcoming event added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="text-sm font-bold">Add Upcoming Event</h3>
        <p className="mt-1 text-xs text-muted-foreground">Schema: title, type, date, venue, seats, color.</p>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Type</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
          <div><Label>Date & Time</Label><Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          <div><Label>Seats</Label><Input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) || 1 })} /></div>
          <div>
            <Label>Color</Label>
            <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value as "brand" | "cyan" | "primary" })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="brand">brand</option>
              <option value="cyan">cyan</option>
              <option value="primary">primary</option>
            </select>
          </div>
          <Button type="submit" disabled={saving} className="bg-gradient-brand text-brand-foreground">{saving ? "Saving..." : "Add event"}</Button>
        </form>
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold">Upcoming Events ({events.length})</h3>
        <div className="mt-3 space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading events...</p>}
          {!loading && events.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{item.title}</div>
                <Badge variant="outline">{item.color}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{item.type} · {item.date}</div>
              <div className="text-xs text-muted-foreground">{item.venue} · {item.seats} seats</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ScopeProjectsManager() {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [applications, setApplications] = useState<BackendApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const { institutions } = useStoreValue(() => crm.all());
  const [activeSubTab, setActiveSubTab] = useState("active");

  const [form, setForm] = useState({
    title: "",
    summary: "",
    description: "",
    domain: "Software",
    capacity: 5,
    visibility: "public" as const,
    status: "open" as const,
    institution_id: "" as string,
  });

  const fetchData = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        backendProjects.list(),
        backendApplications.list(),
      ]);
      setProjects(pRes.items);
      setApplications(aRes.items);
    } catch (error) {
      toast.error("Could not load project data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.summary) {
      toast.error("Title and summary are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, institution_id: form.institution_id || null };
      const { project: created } = await backendProjects.create(payload);
      setProjects((current) => [created, ...current]);
      setForm({ title: "", summary: "", description: "", domain: "Software", capacity: 5, visibility: "public", status: "open", institution_id: "" });
      setActiveSubTab("active");
      toast.success("Project added successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  };

  const activateTemplate = async (template: typeof PROJECT_TEMPLATES[0]) => {
    setSaving(true);
    try {
      const payload = {
        title: template.title,
        domain: template.domain,
        summary: `Level: ${template.level} | Duration: ${template.duration}`,
        description: `Team: ${template.team_structure}\nDeliverables: ${template.deliverables}\nReporting: ${template.reporting}\nRewards: ${template.rewards}`,
        capacity: 10,
        visibility: "public" as const,
        status: "open" as const,
        meta: {
          level: template.level,
          duration: template.duration,
          team_structure: template.team_structure,
          deliverables: template.deliverables,
          reporting: template.reporting,
          rewards: template.rewards
        }
      };
      const { project: created } = await backendProjects.create(payload);
      setProjects((current) => [created, ...current]);
      setActiveSubTab("active");
      toast.success(`"${template.title}" activated from templates!`);
    } catch (error) {
      toast.error("Could not activate template.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Cancel this project?")) return;
    try {
      await backendProjects.remove(id);
      setProjects(current => current.map(p => p.id === id ? { ...p, status: "cancelled" } : p));
      toast.success("Project cancelled.");
    } catch (error) {
      toast.error("Failed to cancel project.");
    }
  };

  const updateApplicationStatus = async (
    applicationId: string,
    status: BackendApplication["status"],
  ) => {
    setUpdatingApplicationId(applicationId);
    try {
      const { application: updated } = await backendApplications.updateStatus(applicationId, status);
      setApplications((current) => current.map((app) => (app.id === applicationId ? updated : app)));
      toast.success(`Application ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update application.");
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const updateSubmissionReviewStatus = async (
    applicationId: string,
    submissionReviewStatus: "submitted" | "passed" | "needs_changes",
  ) => {
    setUpdatingApplicationId(applicationId);
    try {
      const { application: updated } = await backendApplications.reviewSubmission(applicationId, {
        submission_review_status: submissionReviewStatus,
      });
      setApplications((current) => current.map((app) => (app.id === applicationId ? updated : app)));
      toast.success(`Submission marked as ${submissionReviewStatus.replace("_", " ")}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update submission review.");
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const projectsWithStats = useMemo(() => {
    return projects.map(p => {
      const projectApps = applications.filter(a => a.project_id === p.id);
      const participatingInstitutes = new Set(projectApps.map(a => a.user_institution).filter(Boolean));
      return {
        ...p,
        participantCount: projectApps.filter(a => a.status === "accepted").length,
        applicantCount: projectApps.length,
        institutes: Array.from(participatingInstitutes),
      };
    });
  }, [projects, applications]);

  // Sync System: Poll for new applications every 15s to keep stats live
  useEffect(() => {
    const interval = setInterval(() => {
      backendApplications.list().then(res => {
        setApplications(prev => {
          if (res.items.length > prev.length) {
            const newCount = res.items.length - prev.length;
            toast.info(`${newCount} new project application(s) received!`, {
              icon: <Zap className="h-4 w-4 text-brand" />,
              description: "The dashboard has been updated with the latest participation data."
            });
          }
          return res.items;
        });
      }).catch(console.warn);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Scope Projects</h2>
            <p className="text-muted-foreground">Manage global project templates and monitor student participation.</p>
          </div>
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="active" className="gap-2"><Rocket className="h-4 w-4" /> Active</TabsTrigger>
              <TabsTrigger value="library" className="gap-2"><BookOpen className="h-4 w-4" /> Library</TabsTrigger>
              <TabsTrigger value="new" className="gap-2"><Plus className="h-4 w-4" /> Custom</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="active" className="m-0">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {loading && (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="h-8 w-8 animate-spin text-brand" />
                    <p className="text-sm text-muted-foreground">Syncing live projects...</p>
                  </div>
                </div>
              )}
              
              {!loading && projectsWithStats.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
                  <Layers className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No active projects in the system.</p>
                  <Button variant="link" size="sm" onClick={() => setActiveSubTab("library")}>Browse the Project Library</Button>
                </div>
              )}

              {!loading && projectsWithStats.map((item) => (
                <Card key={item.id} className="group relative overflow-hidden border-brand/10 p-0 transition-all hover:border-brand/40 hover:shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-foreground">{item.title}</h4>
                          {item.institution_id ? (
                            <Badge variant="secondary" className="bg-secondary/50 text-[10px]">Campus Specific</Badge>
                          ) : (
                            <Badge className="bg-brand/10 text-brand text-[10px]">Global</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-brand" /> {item.domain}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {item.capacity} slots</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.status === "cancelled" ? "destructive" : "outline"} className="capitalize">{item.status}</Badge>
                        {item.status !== "cancelled" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100" onClick={() => remove(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{item.summary}</p>

                    <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Participation Rate</div>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-foreground">{item.participantCount}</span>
                          <span className="mb-1 text-xs text-muted-foreground">/ {item.capacity} students</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div 
                            className="h-full bg-brand transition-all duration-1000" 
                            style={{ width: `${Math.min((item.participantCount / item.capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Interest</div>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-foreground">{item.applicantCount}</span>
                          <span className="mb-1 text-xs text-muted-foreground">applications</span>
                        </div>
                        <div className="text-[10px] text-brand font-medium">Trending project</div>
                      </div>
                    </div>

                    {item.institutes.length > 0 && (
                      <div className="mt-6">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Partnering Institutes</div>
                        <div className="flex flex-wrap gap-2">
                          {item.institutes.map((inst, idx) => (
                            <Badge key={idx} variant="outline" className="bg-background/50 border-brand/20 py-1 text-[10px]">{inst}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 rounded-xl bg-secondary/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Applicants</h5>
                        <Button variant="link" size="sm" className="h-auto p-0 text-[10px]">View Full Roster</Button>
                      </div>
                      <div className="space-y-2">
                        {applications.filter(a => a.project_id === item.id).slice(0, 3).map((app) => (
                          <div key={app.id} className="rounded-lg border border-border/50 bg-background/60 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-brand uppercase">
                                  {app.user_name?.[0] || "S"}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold">{app.user_name}</span>
                                  <span className="text-[10px] text-muted-foreground">{app.user_institution}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="h-5 border-brand/30 px-1.5 text-[9px] capitalize">{app.status}</Badge>
                                {app.submission_review_status && app.submission_review_status !== "not_submitted" && (
                                  <Badge variant="outline" className="h-5 px-1.5 text-[9px] capitalize">
                                    {app.submission_review_status.replace("_", " ")}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {app.submission && (
                              <div className="mt-3 space-y-2 rounded-md bg-secondary/40 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submission Review</div>
                                <div className="flex flex-wrap gap-2">
                                  <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[10px]">
                                    <a href={app.submission.live_url || "#"} target="_blank" rel="noreferrer">Live URL</a>
                                  </Button>
                                  <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[10px]">
                                    <a href={app.submission.github_url || "#"} target="_blank" rel="noreferrer">GitHub</a>
                                  </Button>
                                  <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[10px]">
                                    <a href={app.submission.screenshot_url || "#"} target="_blank" rel="noreferrer">Screenshot</a>
                                  </Button>
                                </div>
                                {app.submission.notes && (
                                  <p className="text-[10px] text-muted-foreground">{app.submission.notes}</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-[10px] bg-success text-primary-foreground hover:bg-success/90"
                                    disabled={updatingApplicationId === app.id}
                                    onClick={() => updateSubmissionReviewStatus(app.id, "passed")}
                                  >
                                    Mark Passed
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[10px]"
                                    disabled={updatingApplicationId === app.id}
                                    onClick={() => updateSubmissionReviewStatus(app.id, "needs_changes")}
                                  >
                                    Needs Changes
                                  </Button>
                                </div>
                              </div>
                            )}

                            {app.status === "pending" && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px]"
                                  disabled={updatingApplicationId === app.id}
                                  onClick={() => updateApplicationStatus(app.id, "shortlisted")}
                                >
                                  Shortlist
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-[10px] bg-success text-primary-foreground hover:bg-success/90"
                                  disabled={updatingApplicationId === app.id}
                                  onClick={() => updateApplicationStatus(app.id, "accepted")}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-6 px-2 text-[10px]"
                                  disabled={updatingApplicationId === app.id}
                                  onClick={() => updateApplicationStatus(app.id, "rejected")}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                        {applications.filter(a => a.project_id === item.id).length === 0 && (
                          <div className="py-2 text-center text-[10px] italic text-muted-foreground">No student applications recorded yet.</div>
                        )}
                        {applications.filter(a => a.project_id === item.id).length > 3 && (
                          <p className="mt-2 text-center text-[10px] font-medium text-brand">
                            + {applications.filter(a => a.project_id === item.id).length - 3} more student applications
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-6">
              <Card className="p-6 bg-gradient-brand text-brand-foreground overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-20"><Trophy className="h-16 w-16" /></div>
                <h3 className="text-lg font-bold">Network Reach</h3>
                <p className="text-xs opacity-90 mt-1">Project participation across the territory.</p>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-80 text-brand-foreground/90">Engaged Students</span>
                    <span className="text-xl font-bold">{applications.filter(a => a.status === "accepted").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-80 text-brand-foreground/90">Participating Institutes</span>
                    <span className="text-xl font-bold">{new Set(applications.map(a => a.user_institution)).size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-80 text-brand-foreground/90">Success Rate</span>
                    <span className="text-xl font-bold">94%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-brand" /> Live Activity</h3>
                <div className="mt-4 space-y-4">
                  {applications.slice(0, 5).map((app) => (
                    <div key={app.id} className="relative pl-4 border-l-2 border-brand/20">
                      <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-brand" />
                      <p className="text-[10px] font-medium text-muted-foreground">Just now</p>
                      <p className="text-xs mt-0.5">
                        <span className="font-bold text-foreground">{app.user_name}</span> applied for <span className="text-brand font-medium">"{projects.find(p => p.id === app.project_id)?.title || 'Project'}"</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">{app.user_institution}</p>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No recent activity detected.</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-bold flex items-center gap-2"><Target className="h-4 w-4 text-brand" /> Quick Actions</h3>
                <div className="mt-4 grid gap-2">
                  <Button variant="outline" className="justify-start text-xs h-9" onClick={() => setActiveSubTab("library")}>
                    <BookOpen className="mr-2 h-4 w-4" /> Browse Library
                  </Button>
                  <Button variant="outline" className="justify-start text-xs h-9" onClick={() => setActiveSubTab("new")}>
                    <Plus className="mr-2 h-4 w-4" /> Add Custom Project
                  </Button>
                  <Button variant="outline" className="justify-start text-xs h-9" onClick={fetchData}>
                    <Activity className="mr-2 h-4 w-4" /> Refresh Sync
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library" className="m-0">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_TEMPLATES.map((template, idx) => (
              <Card key={idx} className="group relative flex flex-col overflow-hidden border-brand/10 transition-all hover:border-brand/40 hover:shadow-xl">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between">
                    <Badge className="bg-brand/10 text-brand border-none px-2 py-0.5 text-[10px]">{template.domain}</Badge>
                    <Badge variant="outline" className="text-[10px]">{template.level}</Badge>
                  </div>
                  <h4 className="mt-4 text-lg font-bold group-hover:text-brand transition-colors">{template.title}</h4>
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="font-semibold block">Duration</span>
                        <span className="text-muted-foreground">{template.duration}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="font-semibold block">Team Structure</span>
                        <span className="text-muted-foreground">{template.team_structure}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <Gift className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="font-semibold block">Rewards</span>
                        <span className="text-muted-foreground">{template.rewards}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-secondary/30 p-4 border-t border-border">
                  <Button 
                    className="w-full bg-background hover:bg-brand hover:text-brand-foreground border-brand/20 h-9 transition-all" 
                    variant="outline"
                    onClick={() => activateTemplate(template)}
                    disabled={saving}
                  >
                    <Zap className="mr-2 h-4 w-4" /> {saving ? "Activating..." : "Activate Project"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="new" className="m-0">
          <Card className="max-w-2xl mx-auto p-8 border-brand/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Plus className="h-24 w-24" /></div>
            <div className="relative">
              <h3 className="text-xl font-bold">Custom Project Architect</h3>
              <p className="text-sm text-muted-foreground mt-1">Design a unique project tailored for specific territories or global launch.</p>
              
              <form onSubmit={submit} className="mt-8 space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Project Identity</Label>
                    <Input 
                      value={form.title} 
                      onChange={(e) => setForm({ ...form, title: e.target.value })} 
                      placeholder="e.g. National Hackathon Series" 
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Quick Pitch (One-liner)</Label>
                    <Input 
                      value={form.summary} 
                      onChange={(e) => setForm({ ...form, summary: e.target.value })} 
                      placeholder="Solving a specific problem for the ecosystem..." 
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Deep Roadmap & Deliverables</Label>
                    <Textarea 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })} 
                      className="h-32 resize-none" 
                      placeholder="Define the milestones, expectations and final outcomes..." 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold">Industry Domain</Label>
                      <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="Software, AI, Design..." className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold">Student Capacity</Label>
                      <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 1 })} className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Deployment Scope</Label>
                    <select
                      value={form.institution_id}
                      onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-11 focus:ring-2 focus:ring-brand outline-none"
                    >
                      <option value="">Global (Available to all campuses)</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name} (Exclusive)</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="pt-4 flex items-center gap-4">
                  <Button type="submit" disabled={saving} className="flex-1 h-12 bg-gradient-brand text-brand-foreground font-bold shadow-lg shadow-brand/20">
                    {saving ? "Launching..." : "Launch Project"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setActiveSubTab("active")} className="h-12 px-8">Discard</Button>
                </div>
              </form>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent = false }: { label: string; value: string | number; icon: React.ComponentType<{className?: string}>; accent?: boolean }) {
  return (
    <Card className={`relative overflow-hidden p-4 ${accent ? "border-brand/30" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-brand" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </Card>
  );
}

function InstitutionAccountForm({ institutions }: { institutions: Institution[] }) {
  const firstInstitution = institutions[0];
  const [loading, setLoading] = useState(false);
  const [institutionId, setInstitutionId] = useState(firstInstitution?.id ?? "");
  const selected = institutions.find((institution) => institution.id === institutionId) ?? firstInstitution;
  const eligible = selected?.stage === "Launch Pending";
  const [form, setForm] = useState({
    name: firstInstitution ? `${firstInstitution.name} Admin` : "",
    email: firstInstitution?.email ?? "",
    password: "Password123!",
  });

  useEffect(() => {
    if (institutionId || !firstInstitution) return;
    setInstitutionId(firstInstitution.id);
    setForm((current) => ({
      ...current,
      name: current.name || `${firstInstitution.name} Admin`,
      email: current.email || firstInstitution.email,
    }));
  }, [firstInstitution, institutionId]);

  const selectInstitution = (id: string) => {
    const institution = institutions.find((item) => item.id === id);
    setInstitutionId(id);
    if (!institution) return;
    setForm((current) => ({
      ...current,
      name: `${institution.name} Admin`,
      email: institution.email || current.email,
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) {
      toast.error("Create an institution lead first.");
      return;
    }
    if (!eligible) {
      toast.error("Credential generation is only available at Launch Pending stage.");
      return;
    }
    if (!form.name || !form.email || form.password.length < 8) {
      toast.error("Name, email, and an 8+ character password are required.");
      return;
    }
    setLoading(true);
    try {
      await backendAdminUsers.create({
        name: form.name,
        email: form.email,
        password: form.password,
        role: "institution_admin",
        role_variant: "institutional_admin",
        institution_id: selected.id,
      });
      toast.success(`${selected.name} login created.`);
      setForm({ name: `${selected.name} Admin`, email: "", password: "Password123!" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create institution login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold">Create Institution Login</h3>
          <p className="text-xs text-muted-foreground">Creates an institution_admin account linked to an assigned institution.</p>
        </div>
        {selected && <Badge variant={eligible ? "default" : "outline"}>{eligible ? "Launch Pending" : `${selected.stage}: locked`}</Badge>}
      </div>
      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label>Institution</Label>
          <select
            value={institutionId}
            onChange={(event) => selectInstitution(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {institutions.length === 0 && <option value="">No institutions</option>}
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>{institution.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Admin name</Label>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label>Username / email</Label>
          <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label>Password</Label>
          <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1.5" />
        </div>
        <div className="lg:col-span-5">
          <Button type="submit" disabled={loading || !selected || !eligible} className="bg-gradient-brand text-brand-foreground">
            {loading ? "Creating..." : "Create linked account"}
          </Button>
          {!eligible && selected && <p className="mt-2 text-xs text-muted-foreground">Institution login unlocks only when the institution reaches Launch Pending.</p>}
        </div>
      </form>
    </Card>
  );
}

function PipelineBoard({ institutions }: { institutions: Institution[] }) {
  const [filter, setFilter] = useState<PipelineStage | "all">("all");
  const filtered = filter === "all" ? institutions : institutions.filter(i => i.stage === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All ({institutions.length})</Button>
        {PIPELINE_STAGES.map(s => {
          const count = institutions.filter(i => i.stage === s).length;
          if (count === 0) return null;
          return <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s} ({count})</Button>;
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(i => <InstitutionCard key={i.id} inst={i} />)}
        {filtered.length === 0 && (
          <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">No institutions in this stage yet.</Card>
        )}
      </div>
    </div>
  );
}

function InstitutionCard({ inst }: { inst: Institution }) {
  const [stage, setStage] = useState<PipelineStage>(inst.stage);
  const [note, setNote] = useState("");
  return (
    <Card className="p-4 transition-shadow hover:shadow-elegant">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{inst.name}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {inst.city}, {inst.state}
          </div>
        </div>
        <Badge className={STAGE_COLORS[stage]}>{stage}</Badge>
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {inst.phone}</div>
        <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {inst.email}</div>
        <div className="flex items-center gap-1.5"><Star className="h-3 w-3 text-brand" /> Priority {inst.priority} · ₹{(inst.potentialValue / 1000).toFixed(0)}k potential</div>
      </div>
      {inst.notes && <p className="mt-2 line-clamp-2 rounded-md bg-secondary/40 p-2 text-xs">{inst.notes}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={stage} onValueChange={(v) => { setStage(v as PipelineStage); crm.moveStage(inst.id, v as PipelineStage); toast.success(`Moved to ${v}`); }}>
          <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
        <Dialog>
          <DialogTrigger asChild><Button size="sm" variant="outline" className="h-8">Notes</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{inst.name}</DialogTitle></DialogHeader>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{inst.notes || "No notes yet."}</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note..." />
            <Button onClick={() => { crm.addNote(inst.id, note); setNote(""); toast.success("Note added"); }}>Add note</Button>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

function NewLeadDialog({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", state: "West Bengal", contactPerson: "", phone: "", email: "" });
  const submit = () => {
    if (!form.name || !form.city) { toast.error("Name and city required"); return; }
    crm.upsertInstitution({
      id: `i${Date.now()}`,
      name: form.name, type: "Other", city: form.city, state: form.state,
      contactPerson: form.contactPerson, designation: "", phone: form.phone, email: form.email,
      ownerId, priority: 3, potentialValue: 100000, stage: "Prospect", notes: "", updatedAt: Date.now(),
    });
    toast.success("Lead added");
    setOpen(false);
    setForm({ name: "", city: "", state: "West Bengal", contactPerson: "", phone: "", email: "" });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-gradient-brand text-brand-foreground"><Plus className="mr-1 h-4 w-4" /> Add Lead</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New institution lead</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Institution name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} /></div>
          </div>
          <div><Label>Contact person</Label><Input value={form.contactPerson} onChange={(e) => setForm({...form, contactPerson: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
          </div>
          <Button onClick={submit} className="bg-gradient-brand text-brand-foreground">Save lead</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VisitPlanner({ visits, institutions, ownerId }: { visits: ReturnType<typeof crm.visits>; institutions: Institution[]; ownerId: string }) {
  const today = new Date().toISOString().slice(0,10);
  const todayVisits = visits.filter(v => v.date === today && (v.status === "scheduled" || v.status === "checked_in"));
  const upcoming = visits.filter(v => v.date > today).sort((a,b) => a.date.localeCompare(b.date));
  const [pickInst, setPickInst] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");

  const find = (id: string) => institutions.find(i => i.id === id);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-2">
        <h3 className="text-sm font-bold">Today's visits</h3>
        <div className="mt-3 space-y-2">
          {todayVisits.length === 0 && <p className="text-sm text-muted-foreground">No visits scheduled today.</p>}
          {todayVisits.map(v => {
            const i = find(v.institutionId);
            if (!i) return null;
            return (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-semibold">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{v.time} · {i.city}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${encodeURIComponent(i.name + " " + i.city)}`}><MapPin className="mr-1 h-3 w-3" /> Map</a></Button>
                  <Button size="sm" onClick={() => { crm.setVisitStatus(v.id, "checked_in"); toast.success("Checked in"); }}>Check-in</Button>
                  <Button size="sm" variant="secondary" onClick={() => { crm.setVisitStatus(v.id, "completed"); toast.success("Marked complete"); }}>Complete</Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Delete this visit?")) { crm.deleteVisit(v.id); toast.success("Visit deleted"); } }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </div>
        <h3 className="mt-6 text-sm font-bold">Upcoming</h3>
        <div className="mt-3 space-y-2">
          {upcoming.slice(0, 6).map(v => {
            const i = find(v.institutionId);
            if (!i) return null;
            return (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div>
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{v.date} · {v.time}</div>
                </div>
                <Badge variant="outline">{v.status}</Badge>
              </div>
            );
          })}
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming visits.</p>}
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-bold">Schedule a visit</h3>
        <div className="mt-3 grid gap-3">
          <div>
            <Label>Institution</Label>
            <Select value={pickInst} onValueChange={setPickInst}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{institutions.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <Button className="bg-gradient-brand text-brand-foreground" onClick={() => {
            if (!pickInst) { toast.error("Pick institution"); return; }
            crm.scheduleVisit({ institutionId: pickInst, date, time, ownerId });
            toast.success("Visit scheduled");
            setPickInst("");
          }}>Schedule</Button>
        </div>
      </Card>
    </div>
  );
}

function ProposalCenter({ institutions }: { institutions: Institution[] }) {
  const tracked = institutions;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5">
        <h3 className="text-sm font-bold">Quick actions</h3>
        <p className="mt-1 text-xs text-muted-foreground italic mb-4">Upload documents once to send them to any institution.</p>
        <div className="space-y-3">
          <FileUploadAction kind="brochure" label="Upload Brochure" icon={Upload} />
          <FileUploadAction kind="proposal" label="Upload Proposal" icon={FileUp} />
          <FileUploadAction kind="pricing" label="Upload Pricing Deck" icon={Layers} />
          <FileUploadAction kind="mou" label="Upload MoU Draft" icon={FileText} />
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Library (Recent Uploads)</h4>
          <div className="mt-2 space-y-1">
            <RecentUploadsList />
          </div>
        </div>
      </Card>
      <Card className="p-5 lg:col-span-2">
        <h3 className="text-sm font-bold">Tracking</h3>
        <div className="mt-3 divide-y divide-border max-h-[500px] overflow-y-auto pr-2">
          {tracked.map(i => (
            <div key={i.id} className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{i.name}</div>
                <div className="text-xs text-muted-foreground truncate">{i.contactPerson} · {i.email}</div>
                {i.documents && i.documents.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {i.documents.map((d, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[9px] px-1 h-4">
                        {d.kind} sent
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STAGE_COLORS[i.stage]}>{i.stage}</Badge>
                <SendDocumentDialog institution={i} />
              </div>
            </div>
          ))}
          {tracked.length === 0 && <p className="py-4 text-sm text-muted-foreground text-center">No proposals tracked yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function LaunchTracker({ institutions }: { institutions: Institution[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {institutions.map(i => {
        const ck = crm.launch(i.id);
        const steps: { key: keyof Omit<typeof ck, "institutionId">; label: string }[] = [
          { key: "facultyAssigned", label: "Faculty Coordinator Assigned" },
          { key: "leaderShortlisted", label: "Campus Leader Shortlisted" },
          { key: "launchScheduled", label: "Launch Event Scheduled" },
          { key: "registrationsStarted", label: "Student Registrations Started" },
          { key: "pageLive", label: "Chapter Page Live" },
          { key: "challengeActivated", label: "First Challenge Activated" },
        ];
        const done = steps.filter(s => ck[s.key]).length;
        return (
          <Card key={i.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.city}</div>
              </div>
              <Badge variant="outline">{done}/{steps.length}</Badge>
            </div>
            <div className="mt-3 space-y-1.5">
              {steps.map(s => (
                <button key={s.key} onClick={() => crm.toggleLaunchStep(i.id, s.key)} className="flex w-full items-center gap-2 rounded-md p-1.5 text-left text-sm transition-colors hover:bg-secondary">
                  {ck[s.key] ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={ck[s.key] ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                </button>
              ))}
            </div>
          </Card>
        );
      })}
      {institutions.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">No active launches yet. Sign your first MoU!</Card>}
    </div>
  );
}

function PerformanceScorecard({ institutions, visits }: { institutions: Institution[]; visits: ReturnType<typeof crm.visits> }) {
  const meetings = visits.filter(v => v.status === "completed").length;
  const closures = institutions.filter(i => ["MoU Signed","Launch Pending","Live Chapter"].includes(i.stage)).length;
  const rate = institutions.length ? Math.round((closures / institutions.length) * 100) : 0;
  const reactivated = institutions.filter(i => i.stage === "Live Chapter").length;
  const stats = [
    { label: "Meetings done", value: meetings, icon: Calendar },
    { label: "Closures", value: closures, icon: CheckCircle2 },
    { label: "Conversion", value: `${rate}%`, icon: ArrowRight },
    { label: "Avg deal time", value: "21 days", icon: Activity },
    { label: "Monthly rank", value: "#2", icon: Trophy },
    { label: "Reactivations", value: reactivated, icon: Rocket },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map(s => (
        <Card key={s.label} className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <s.icon className="h-4 w-4 text-brand" />
          </div>
          <div className="mt-2 text-2xl font-bold">{s.value}</div>
        </Card>
      ))}
      <Card className="p-5 sm:col-span-2 lg:col-span-3">
        <h3 className="text-sm font-bold">Territory identity</h3>
        <p className="mt-1 text-xs text-muted-foreground">High-performing territories compound faster.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>Kolkata Region</Badge>
          <Badge variant="outline">Engineering Colleges East Zone</Badge>
          <Badge variant="outline">CBSE Partnerships</Badge>
        </div>
      </Card>
    </div>
  );
}
function FileUploadAction({ kind, label, icon: Icon }: { kind: string; label: string; icon: any }) {
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    try {
      const res = await fetch("/api/v1/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("scope_access_token")}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const doc = { id: data.data.file.id, name: file.name, url: data.data.file.url, kind };
        const cache = JSON.parse(localStorage.getItem("scope_uploaded_docs") || "[]");
        const next = [doc, ...cache.filter((d: any) => d.kind !== kind)].slice(0, 10);
        localStorage.setItem("scope_uploaded_docs", JSON.stringify(next));
        window.dispatchEvent(new Event("scope:docs-updated"));
        toast.success(`${label} uploaded and cached.`);
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <Button variant="outline" className="w-full justify-start relative overflow-hidden" disabled={uploading}>
        <Icon className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : label}
        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} accept=".pdf,.doc,.docx" />
      </Button>
    </div>
  );
}

function SendDocumentDialog({ institution }: { institution: Institution }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await backendDocuments.list();
      setDocs(res.files);
    } catch {
      const local = JSON.parse(localStorage.getItem("scope_uploaded_docs") || "[]");
      setDocs(local.map((d: any) => ({ ...d, file_name: d.name })));
    }
  };
  useEffect(() => {
    load();
    window.addEventListener("scope:docs-updated", load);
    return () => window.removeEventListener("scope:docs-updated", load);
  }, []);

  const send = async (doc: any) => {
    setLoading(true);
    try {
      await backendInstitutions.sendDocument(institution.id, {
        kind: doc.kind as any,
        file_id: doc.id,
        file_name: doc.file_name,
        file_url: doc.url,
      });
      toast.success(`${doc.kind} sent to ${institution.name}`);
      void crm.syncFromBackend();
    } catch (err) {
      toast.error("Failed to send document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 border-brand/30 text-brand hover:bg-brand/5">
          <Send className="h-3.5 w-3.5" />
          Send Doc
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send document to {institution.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {docs.length === 0 && <p className="text-sm text-muted-foreground text-center italic">No documents uploaded yet. Upload them first using "Quick Actions".</p>}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-semibold capitalize">{d.kind}</div>
                <div className="text-xs text-muted-foreground">{d.file_name}</div>
              </div>
              <Button size="sm" onClick={() => send(d)} disabled={loading}>Send</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecentUploadsList() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await backendDocuments.list();
      setDocs(res.files);
    } catch {
      // Fallback to local if backend fails
      const local = JSON.parse(localStorage.getItem("scope_uploaded_docs") || "[]");
      setDocs(local.map((d: any) => ({ ...d, file_name: d.name })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener("scope:docs-updated", load);
    return () => window.removeEventListener("scope:docs-updated", load);
  }, []);

  if (loading) return <p className="text-[10px] text-muted-foreground animate-pulse">Syncing library...</p>;
  if (docs.length === 0) return <p className="text-[10px] text-muted-foreground italic">No files in your library.</p>;

  return (
    <div className="space-y-1">
      {docs.map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-2 py-1.5 transition-colors hover:bg-secondary/50">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium">{d.file_name}</div>
            <div className="text-[9px] uppercase tracking-tighter text-muted-foreground">{d.kind}</div>
          </div>
          <CheckCircle2 className="h-3 w-3 text-brand opacity-60" />
        </div>
      ))}
    </div>
  );
}

