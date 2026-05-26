import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Brain, Building2, Users, TrendingUp, MapPin, IndianRupee, Sliders, ShieldCheck, Sparkles, Trophy, AlertTriangle, CheckCircle2, XCircle, Plus, ArrowUpRight, Activity, Flame } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { DrilldownCard } from "@/components/site/DrilldownCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useStoreValue } from "@/hooks/use-scope";
import { useRole } from "@/hooks/use-rbac";
import { type AdminProfile, type Institution, type PipelineStage, PIPELINE_STAGES } from "@/lib/crm-store";
import { configStore } from "@/lib/config-store";
import { backendAdminUsers, backendSuperAdmin } from "@/lib/api/endpoints";
import { toast } from "sonner";

export const Route = createFileRoute("/scope-super-admin")({
  head: () => ({ meta: [{ title: "Super Admin · Command Center" }, { name: "robots", content: "noindex" }] }),
  component: SuperAdminPortal,
});

type SuperAdminSnapshot = {
  institutions: Institution[];
  visits: Array<{
    id: string;
    institutionId: string;
    ownerId: string;
    date: string;
    time: string;
    status: "scheduled" | "checked_in" | "completed" | "cancelled";
    notes?: string;
  }>;
  launches: Record<string, {
    institutionId: string;
    facultyAssigned: boolean;
    leaderShortlisted: boolean;
    launchScheduled: boolean;
    registrationsStarted: boolean;
    pageLive: boolean;
    challengeActivated: boolean;
  }>;
  admins: AdminProfile[];
};

const EMPTY_DATA: SuperAdminSnapshot = { institutions: [], visits: [], launches: {}, admins: [] };

function toPipelineStage(stage?: string): PipelineStage {
  if (PIPELINE_STAGES.includes(stage as PipelineStage)) return stage as PipelineStage;
  return "Prospect";
}

function mapCommandCenterData(payload: Awaited<ReturnType<typeof backendSuperAdmin.commandCenter>>): SuperAdminSnapshot {
  return {
    institutions: payload.institutions.map((institution) => ({
      id: institution.id,
      name: institution.name,
      type: institution.type || "Other",
      board: institution.board,
      city: institution.city || "",
      state: institution.state || "",
      contactPerson: institution.contact_person || "",
      designation: institution.designation || "",
      phone: institution.phone || "",
      email: institution.email || "",
      ownerId: institution.owner_id || "",
      priority: (institution.priority as Institution["priority"]) || 3,
      potentialValue: institution.potential_value || 0,
      stage: toPipelineStage(institution.pipeline_stage),
      notes: institution.notes || "",
      documents: (institution.documents || []).filter((doc) => (doc.kind as string) !== "document") as Institution["documents"],
      updatedAt: institution.updated_at ? new Date(institution.updated_at).getTime() : Date.now(),
    })),
    visits: payload.visits.map((visit) => ({
      id: visit.id,
      institutionId: visit.institution_id,
      ownerId: visit.owner_id,
      date: visit.date,
      time: visit.time,
      status: visit.status,
      notes: visit.notes,
    })),
    launches: Object.fromEntries(payload.launches.map((launch) => [launch.institution_id, {
      institutionId: launch.institution_id,
      facultyAssigned: launch.faculty_assigned,
      leaderShortlisted: launch.leader_shortlisted,
      launchScheduled: launch.launch_scheduled,
      registrationsStarted: launch.registrations_started,
      pageLive: launch.page_live,
      challengeActivated: launch.challenge_activated,
    }])),
    admins: payload.admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      region: admin.region || "Assigned Territory",
      focus: admin.focus || "Partnerships",
      meetings: admin.meetings || 0,
      closures: admin.closures || 0,
      lastActive: admin.last_active ? new Date(admin.last_active).getTime() : Date.now(),
      status: admin.status || "active",
      target: admin.target ?? 6,
    })),
  };
}

function SuperAdminPortal() {
  const role = useRole();
  const isAllowed = role === "scope_super_admin" || role === "super_admin";
  const [data, setData] = useState<SuperAdminSnapshot>(EMPTY_DATA);
  const config = useStoreValue(() => configStore.get());

  const loadCommandCenter = async () => {
    const payload = await backendSuperAdmin.commandCenter();
    setData(mapCommandCenterData(payload));
  };

  useEffect(() => {
    if (!isAllowed) return;
    void loadCommandCenter().catch((error) => {
      console.warn("Command center sync failed", error);
      toast.error(error instanceof Error ? error.message : "Could not load command center data.");
    });
    void configStore.syncFromBackend().catch(() => null);
  }, [isAllowed]);

  const kpis = useMemo(() => {
    const live = data.institutions.filter(i => i.stage === "Live Chapter").length;
    const mous = data.institutions.filter(i => ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage)).length;
    const states = new Set(data.institutions.map(i => i.state)).size;
    const revenue = data.institutions.filter(i => ["MoU Signed","Launch Pending","Live Chapter"].includes(i.stage))
      .reduce((s,i) => s + i.potentialValue, 0);
    return {
      pipeline: data.institutions.length,
      mous,
      live,
      students: live * 320 + mous * 60,
      states,
      revenue,
      growth: 18,
    };
  }, [data.institutions]);

  if (!isAllowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="view_national_analytics"
          title="HQ access only"
          message="The Super Admin Command Center is restricted to Scope Super Admin and Super Admin roles."
          toastMessage="HQ-only area. You don't have permission to view the Command Center."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RbacSidebar title="Command Center">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header>
          <Badge variant="outline" className="mb-2"><Brain className="mr-1 h-3 w-3" /> Super Admin · National HQ</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">India expansion starts with today's pipeline.</p>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <DrilldownCard
            title="Pipeline"
            value={kpis.pipeline}
            delta={`+${kpis.growth}% MoM`}
            icon={Building2}
            deepDiveTo="/scope-admin"
            deepDiveLabel="Open CRM"
            inline={
              <div className="space-y-1">
                {PIPELINE_STAGES.map((s) => {
                  const n = data.institutions.filter((i) => i.stage === s).length;
                  const pct = data.institutions.length ? (n / data.institutions.length) * 100 : 0;
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between text-[10px]">
                        <span>{s}</span>
                        <span className="text-muted-foreground">{n}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            }
            levels={[
              {
                label: "Summary",
                content: (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Card className="p-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-lg font-bold">{kpis.pipeline}</div></Card>
                    <Card className="p-3"><div className="text-xs text-muted-foreground">MoUs</div><div className="text-lg font-bold">{kpis.mous}</div></Card>
                    <Card className="p-3"><div className="text-xs text-muted-foreground">Live</div><div className="text-lg font-bold">{kpis.live}</div></Card>
                    <Card className="p-3"><div className="text-xs text-muted-foreground">States</div><div className="text-lg font-bold">{kpis.states}</div></Card>
                  </div>
                ),
              },
              {
                label: "By stage",
                content: (
                  <div className="space-y-1.5">
                    {PIPELINE_STAGES.map((s) => {
                      const n = data.institutions.filter((i) => i.stage === s).length;
                      return (
                        <div key={s} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs">
                          <span>{s}</span>
                          <Badge variant="outline">{n}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ),
              },
              {
                label: "By owner",
                content: (
                  <div className="space-y-1.5">
                    {data.admins.map((a) => {
                      const n = data.institutions.filter((i) => i.ownerId === a.id).length;
                      return (
                        <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs">
                          <span>{a.name} <span className="text-muted-foreground">· {a.region}</span></span>
                          <Badge variant="outline">{n}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ),
              },
            ]}
          />

          <DrilldownCard
            title="MoUs Signed"
            value={kpis.mous}
            icon={CheckCircle2}
            accent
            deepDiveTo="/scope-admin"
            deepDiveLabel="Open CRM"
            levels={[
              {
                label: "Summary",
                content: <p className="text-sm text-muted-foreground">{kpis.mous} institutions in MoU+ stages, contributing the bulk of forecasted revenue.</p>,
              },
              {
                label: "Institution-wise",
                content: (
                  <div className="space-y-1.5">
                    {data.institutions.filter((i) => ["MoU Signed","Launch Pending","Live Chapter"].includes(i.stage)).map((i) => (
                      <div key={i.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs">
                        <span>{i.name} <span className="text-muted-foreground">· {i.city}</span></span>
                        <Badge variant="outline">{i.stage}</Badge>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />

          <DrilldownCard
            title="Live Chapters"
            value={kpis.live}
            icon={Sparkles}
            accent
            deepDiveTo="/institution-admin"
            deepDiveLabel="Institution Hub"
            levels={[
              {
                label: "Summary",
                content: <p className="text-sm text-muted-foreground">{kpis.live} active chapters serving ~{(kpis.live * 320).toLocaleString()} students.</p>,
              },
              {
                label: "Campus-level",
                content: (
                  <div className="space-y-1.5">
                    {data.institutions.filter((i) => i.stage === "Live Chapter").map((i) => (
                      <div key={i.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs">
                        <span>{i.name}</span>
                        <span className="text-muted-foreground">{i.city}, {i.state}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />

          <DrilldownCard
            title="Students"
            value={kpis.students.toLocaleString()}
            icon={Users}
            deepDiveTo="/institution-admin/analytics"
            deepDiveLabel="Analytics"
            levels={[
              {
                label: "Summary",
                content: <p className="text-sm text-muted-foreground">Estimated reach across live + onboarding institutions.</p>,
              },
              {
                label: "User roles",
                content: (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between rounded-md border border-border px-2 py-1.5"><span>Students</span><Badge variant="outline">{kpis.students.toLocaleString()}</Badge></div>
                    <div className="flex justify-between rounded-md border border-border px-2 py-1.5"><span>Faculty</span><Badge variant="outline">{(kpis.live * 18).toLocaleString()}</Badge></div>
                    <div className="flex justify-between rounded-md border border-border px-2 py-1.5"><span>Campus leaders</span><Badge variant="outline">{(kpis.live * 4).toLocaleString()}</Badge></div>
                  </div>
                ),
              },
            ]}
          />

          <DrilldownCard
            title="States"
            value={`${kpis.states}/28`}
            icon={MapPin}
            deepDiveTo="/scope-super-admin"
            deepDiveLabel="Heatmap"
            levels={[
              {
                label: "Coverage",
                content: <p className="text-sm text-muted-foreground">Active in {kpis.states} of 28 Indian states.</p>,
              },
            ]}
          />

          <DrilldownCard
            title="Revenue"
            value={`₹${(kpis.revenue / 100000).toFixed(1)}L`}
            icon={IndianRupee}
            accent
            deepDiveTo="/scope-super-admin"
            deepDiveLabel="Revenue tab"
            levels={[
              {
                label: "Summary",
                content: <p className="text-sm text-muted-foreground">Forecast across signed pipeline. Click into the Revenue tab for full split.</p>,
              },
              {
                label: "By institution",
                content: (
                  <div className="space-y-1.5">
                    {data.institutions.filter((i) => ["MoU Signed","Launch Pending","Live Chapter"].includes(i.stage)).map((i) => (
                      <div key={i.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs">
                        <span>{i.name}</span>
                        <span className="text-muted-foreground">₹{(i.potentialValue/1000).toFixed(0)}k</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />

          <DrilldownCard
            title="Growth MoM"
            value={`+${kpis.growth}%`}
            icon={TrendingUp}
            deepDiveTo="/institution-admin/analytics"
            deepDiveLabel="Analytics"
            levels={[
              {
                label: "System usage",
                content: <p className="text-sm text-muted-foreground">Composite of pipeline velocity, MoU rate and active campus signups.</p>,
              },
            ]}
          />
        </div>


        <Tabs defaultValue="admins" className="mt-8">
          <TabsList className="flex-wrap">
            <TabsTrigger value="admins">Admin Control</TabsTrigger>
            <TabsTrigger value="institutions">National CRM</TabsTrigger>
            <TabsTrigger value="heatmap">India Heatmap</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="features">Product Toggles</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="intel">Strategic Intel</TabsTrigger>
          </TabsList>

          <TabsContent value="admins" className="mt-6"><AdminControl admins={data.admins} onRefresh={loadCommandCenter} /></TabsContent>
          <TabsContent value="institutions" className="mt-6"><NationalCRM data={data} /></TabsContent>
          <TabsContent value="heatmap" className="mt-6"><IndiaHeatmap data={data} /></TabsContent>
          <TabsContent value="revenue" className="mt-6"><RevenueControl data={data} /></TabsContent>
          <TabsContent value="features" className="mt-6"><FeatureToggles config={config} /></TabsContent>
          <TabsContent value="moderation" className="mt-6"><Moderation /></TabsContent>
          <TabsContent value="intel" className="mt-6"><StrategicIntel data={data} /></TabsContent>
        </Tabs>
      </section>
      </RbacSidebar>
    </AppShell>
  );
}

function Kpi({ label, value, icon: Icon, accent = false }: { label: string; value: string | number; icon: React.ComponentType<{className?: string}>; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "border-brand/30 bg-gradient-to-br from-brand/5 to-transparent" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-brand" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </Card>
  );
}

function AdminControl({ admins, onRefresh }: { admins: AdminProfile[]; onRefresh: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", region: "", focus: "", target: 5, password: "Password123!" });

  const submit = async () => {
    if (!form.name || !form.email) { toast.error("Name and email required"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      await backendSuperAdmin.createScopeAdmin({
        name: form.name,
        email: form.email,
        password: form.password,
        region: form.region,
        focus: form.focus,
        target: form.target,
      });
      await onRefresh();
      toast.success("Admin added");
      setOpen(false);
      setForm({ name: "", email: "", region: "", focus: "", target: 5, password: "Password123!" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create scope admin.");
    } finally {
      setBusy(false);
    }
  };

  const ranked = [...admins].sort((a,b) => b.closures - a.closures);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Scope Admin Control Tower</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Admin</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Onboard scope admin</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
              <div><Label>Region</Label><Input value={form.region} onChange={(e) => setForm({...form, region: e.target.value})} /></div>
              <div><Label>Institution focus</Label><Input value={form.focus} onChange={(e) => setForm({...form, focus: e.target.value})} /></div>
              <div><Label>Monthly target (closures)</Label><Input type="number" value={form.target} onChange={(e) => setForm({...form, target: Number(e.target.value)})} /></div>
              <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} /></div>
              <Button onClick={() => { void submit(); }} disabled={busy} className="bg-gradient-brand text-brand-foreground">{busy ? "Saving..." : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 text-left">Rank</th>
              <th className="py-2 text-left">Admin</th>
              <th className="py-2 text-left">Region</th>
              <th className="py-2 text-right">Meetings</th>
              <th className="py-2 text-right">Closures</th>
              <th className="py-2 text-right">Conv</th>
              <th className="py-2 text-right">Target</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((a, idx) => {
              const conv = a.meetings ? Math.round((a.closures / a.meetings) * 100) : 0;
              return (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="py-3">#{idx + 1}</td>
                  <td className="py-3">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.focus}</div>
                  </td>
                  <td className="py-3">{a.region}</td>
                  <td className="py-3 text-right">{a.meetings}</td>
                  <td className="py-3 text-right font-bold">{a.closures}</td>
                  <td className="py-3 text-right">{conv}%</td>
                  <td className="py-3 text-right">{a.target}</td>
                  <td className="py-3"><Badge variant={a.status === "active" ? "default" : "destructive"}>{a.status}</Badge></td>
                  <td className="py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await backendSuperAdmin.patchScopeAdmin(a.id, { status: a.status === "active" ? "suspended" : "active" });
                          await onRefresh();
                          toast.success("Updated");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Could not update scope admin.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {a.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function NationalCRM({ data }: { data: SuperAdminSnapshot }) {
  const [filterState, setFilterState] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const states = Array.from(new Set(data.institutions.map(i => i.state)));
  const filtered = data.institutions.filter(i =>
    (filterState === "all" || i.state === filterState) &&
    (filterStage === "all" || i.stage === filterStage)
  );
  const ownerName = (id: string) => data.admins.find(a => a.id === id)?.name ?? "Unassigned";

  return (
    <div className="space-y-4">
      <InstitutionAccountForm institutions={data.institutions} />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold">All institutions ({filtered.length})</h3>
          <div className="ml-auto flex flex-wrap gap-2">
            <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
              <option value="all">All states</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
              <option value="all">All stages</option>
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 text-left">Institution</th>
                <th className="py-2 text-left">City</th>
                <th className="py-2 text-left">Stage</th>
                <th className="py-2 text-left">Owner</th>
                <th className="py-2 text-right">Value ₹</th>
                <th className="py-2 text-right">Login</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-b border-border/50">
                  <td className="py-3 font-semibold">{i.name}</td>
                  <td className="py-3">{i.city}</td>
                  <td className="py-3"><Badge variant="outline">{i.stage}</Badge></td>
                  <td className="py-3 text-xs text-muted-foreground">{ownerName(i.ownerId)}</td>
                  <td className="py-3 text-right">₹{(i.potentialValue/1000).toFixed(0)}k</td>
                  <td className="py-3 text-right"><InstitutionLoginDialog institution={i} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) {
      toast.error("Create an institution first.");
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
          <p className="text-xs text-muted-foreground">Creates an institution_admin user linked to the selected institution.</p>
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

function InstitutionLoginDialog({ institution }: { institution: Institution }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const eligible = institution.stage === "Launch Pending";
  const [form, setForm] = useState({
    name: `${institution.name} Admin`,
    email: institution.email || "",
    password: "Password123!",
  });

  const submit = async () => {
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
        institution_id: institution.id,
      });
      toast.success("Institution login created.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create institution login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" disabled={!eligible}>{eligible ? "Create" : "Locked"}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create institution login</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Institution</Label>
            <Input value={institution.name} disabled />
          </div>
          <div>
            <Label>Username / email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Admin name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {!eligible && <p className="text-xs text-muted-foreground">Institution login unlocks only at Launch Pending.</p>}
          <Button disabled={loading || !eligible} onClick={submit} className="bg-gradient-brand text-brand-foreground">
            {loading ? "Creating..." : "Create login"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IndiaHeatmap({ data }: { data: SuperAdminSnapshot }) {
  const stateData = useMemo(() => {
    const map = new Map<string, { total: number; live: number }>();
    data.institutions.forEach(i => {
      const cur = map.get(i.state) ?? { total: 0, live: 0 };
      cur.total++;
      if (i.stage === "Live Chapter") cur.live++;
      map.set(i.state, cur);
    });
    return Array.from(map.entries()).map(([state, v]) => ({ state, ...v }));
  }, [data.institutions]);

  const allStates = ["West Bengal","Odisha","Bihar","Jharkhand","Assam","Maharashtra","Karnataka","Tamil Nadu","Delhi","Uttar Pradesh","Punjab","Gujarat","Telangana","Kerala","Rajasthan","Madhya Pradesh"];
  const active = new Set(stateData.map(s => s.state));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="text-sm font-bold">Active states</h3>
        <div className="mt-3 space-y-2">
          {stateData.sort((a,b) => b.total - a.total).map(s => {
            const pct = Math.min(100, (s.total / 8) * 100);
            return (
              <div key={s.state}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{s.state}</span>
                  <span className="text-muted-foreground">{s.live} live · {s.total} pipeline</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold">Untapped territories</h3>
        <p className="mt-1 text-xs text-muted-foreground">Greenfield expansion opportunities.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {allStates.filter(s => !active.has(s)).map(s => (
            <Badge key={s} variant="outline" className="cursor-pointer hover:border-brand">{s}</Badge>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-dashed border-border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-brand" /> High conversion zone</div>
          <p className="mt-1 text-xs text-muted-foreground">West Bengal: {stateData.find(s => s.state === "West Bengal")?.live ?? 0} live chapters · 65% conv rate</p>
        </div>
      </Card>
    </div>
  );
}

function RevenueControl({ data }: { data: SuperAdminSnapshot }) {
  const signed = data.institutions.filter(i => ["MoU Signed","Launch Pending","Live Chapter"].includes(i.stage));
  const mouFees = signed.reduce((s,i) => s + i.potentialValue * 0.6, 0);
  const subs = signed.reduce((s,i) => s + i.potentialValue * 0.3, 0);
  const sponsor = 240000;
  const pending = data.institutions.filter(i => i.stage === "Negotiation").reduce((s,i) => s + i.potentialValue * 0.5, 0);
  const items = [
    { label: "MoU Fees", value: mouFees },
    { label: "Subscriptions", value: subs },
    { label: "Sponsorship", value: sponsor },
    { label: "Pending Collections", value: pending, warn: true },
    { label: "Monthly Cash Flow", value: mouFees + subs + sponsor - pending, accent: true },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map(it => (
        <Card key={it.label} className={`p-5 ${it.accent ? "border-brand/40 bg-gradient-to-br from-brand/5 to-transparent" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{it.label}</span>
            <IndianRupee className={`h-4 w-4 ${it.warn ? "text-destructive" : "text-brand"}`} />
          </div>
          <div className="mt-2 text-2xl font-bold">₹{(it.value/100000).toFixed(2)}L</div>
        </Card>
      ))}
    </div>
  );
}

function FeatureToggles({ config }: { config: ReturnType<typeof configStore.get> }) {
  const flags = [
    { key: "feed", label: "Feed" },
    { key: "events", label: "Events" },
    { key: "portfolio", label: "Portfolio" },
    { key: "leaderboards", label: "Leaderboards" },
    { key: "projects", label: "Projects" },
    { key: "ambassador", label: "Ambassador Module" },
    { key: "campus", label: "Campus" },
  ] as const;
  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold">Feature governance</h3>
      <p className="mt-1 text-xs text-muted-foreground">Live toggles instantly across the network.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {flags.map(f => {
          const enabled = (config.features as Record<string, boolean>)[f.key] === true;
          return (
            <div key={f.key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-semibold">{f.label}</div>
                <div className="text-xs text-muted-foreground">{enabled ? "Live" : "Hidden"}</div>
              </div>
              <Switch checked={enabled} onCheckedChange={(v) => {
                configStore.patch({ features: { ...config.features, [f.key]: v } as typeof config.features });
                toast.success(`${f.label} ${v ? "enabled" : "disabled"}`);
              }} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Moderation() {
  const actions = [
    { label: "Approve verified campus", icon: ShieldCheck, color: "text-emerald-500" },
    { label: "Suspend fake account", icon: XCircle, color: "text-destructive" },
    { label: "Review abuse report", icon: AlertTriangle, color: "text-amber-500" },
    { label: "Approve leadership role", icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Blacklist spam domain", icon: XCircle, color: "text-destructive" },
  ];
  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold">Trust & moderation</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {actions.map(a => (
          <button key={a.label} onClick={() => toast.success(`${a.label} — queued`)} className="flex items-center gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-secondary">
            <a.icon className={`h-4 w-4 ${a.color}`} />
            <span className="flex-1">{a.label}</span>
            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
          </button>
        ))}
      </div>
    </Card>
  );
}

function StrategicIntel({ data }: { data: SuperAdminSnapshot }) {
  const topAdmin = [...data.admins].sort((a,b) => b.closures - a.closures)[0];
  const cards = [
    { title: "Best state to enter next", value: "Odisha", note: "1 active institution · low competition", icon: MapPin },
    { title: "Top performing admin", value: topAdmin?.name ?? "—", note: `${topAdmin?.closures ?? 0} closures this period`, icon: Trophy },
    { title: "Weakest territory", value: "Asansol", note: "0% conversion · revisit strategy", icon: Activity },
    { title: "High value segment", value: "Engineering Colleges", note: "Avg ₹1.8L per MoU", icon: Sparkles },
    { title: "Dormancy alert", value: "1 institution", note: "No movement in 14 days", icon: AlertTriangle },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {cards.map(c => (
        <Card key={c.title} className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <c.icon className="h-3.5 w-3.5" /> {c.title}
          </div>
          <div className="mt-2 text-lg font-bold">{c.value}</div>
          <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
        </Card>
      ))}
    </div>
  );
}
