import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Calendar, FileText, Rocket, Trophy, MapPin, Phone, Mail, Plus, ChevronRight, CheckCircle2, Circle, Download, Send, Star, ArrowRight, Target, Activity } from "lucide-react";
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
import { toast } from "sonner";

export const Route = createFileRoute("/scope-admin")({
  head: () => ({ meta: [{ title: "Scope Admin · Territory CRM" }, { name: "robots", content: "noindex" }] }),
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

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Institutions" value={kpis.assigned} icon={Building2} />
          <KpiCard label="Meetings (mo)" value={kpis.meetings} icon={Calendar} />
          <KpiCard label="Proposals" value={kpis.proposals} icon={FileText} />
          <KpiCard label="MoUs Signed" value={kpis.mous} icon={CheckCircle2} accent />
          <KpiCard label="Potential ₹" value={`₹${(kpis.potential / 100000).toFixed(1)}L`} icon={Target} />
          <KpiCard label="Live Chapters" value={kpis.live} icon={Rocket} accent />
        </div>

        <Tabs defaultValue="crm" className="mt-8">
          <TabsList className="flex-wrap">
            <TabsTrigger value="crm">Territory CRM</TabsTrigger>
            <TabsTrigger value="visits">Visit Planner</TabsTrigger>
            <TabsTrigger value="proposals">Proposals & MoU</TabsTrigger>
            <TabsTrigger value="launch">Launch Tracker</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="crm" className="mt-6"><PipelineBoard institutions={institutions} /></TabsContent>
          <TabsContent value="visits" className="mt-6"><VisitPlanner visits={visits} institutions={institutions} ownerId={myAdminId ?? user?.id ?? ""} /></TabsContent>
          <TabsContent value="proposals" className="mt-6"><ProposalCenter institutions={institutions} /></TabsContent>
          <TabsContent value="launch" className="mt-6"><LaunchTracker institutions={institutions.filter(i => ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage))} /></TabsContent>
          <TabsContent value="performance" className="mt-6"><PerformanceScorecard institutions={institutions} visits={visits} /></TabsContent>
        </Tabs>
      </section>
      </RbacSidebar>
    </AppShell>
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
  const todayVisits = visits.filter(v => v.date === today);
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
  const tracked = institutions.filter(i => ["Proposal Sent", "Negotiation", "MoU Draft Shared", "MoU Signed"].includes(i.stage));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1">
        <h3 className="text-sm font-bold">Quick actions</h3>
        <div className="mt-3 space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Brochure downloaded")}><Download className="mr-2 h-4 w-4" /> Download brochure</Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Proposal PDF generated")}><FileText className="mr-2 h-4 w-4" /> Generate proposal PDF</Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Pricing deck shared")}><Send className="mr-2 h-4 w-4" /> Share pricing deck</Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("MoU draft sent")}><Send className="mr-2 h-4 w-4" /> Send MoU draft</Button>
        </div>
      </Card>
      <Card className="p-5 lg:col-span-2">
        <h3 className="text-sm font-bold">Tracking</h3>
        <div className="mt-3 divide-y divide-border">
          {tracked.map(i => (
            <div key={i.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-semibold">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.contactPerson} · {i.email}</div>
              </div>
              <Badge className={STAGE_COLORS[i.stage]}>{i.stage}</Badge>
            </div>
          ))}
          {tracked.length === 0 && <p className="py-4 text-sm text-muted-foreground">No proposals tracked yet.</p>}
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
