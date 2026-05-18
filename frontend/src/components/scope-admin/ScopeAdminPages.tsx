import { Link } from "@tanstack/react-router";
import { BarChart3, Building2, Calendar, Download, FileText, Handshake, Plus, Search, Target, Users } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { crm, PIPELINE_STAGES, type Institution } from "@/lib/crm-store";
import { useStoreValue } from "@/hooks/use-scope";
import { toast } from "sonner";

function downloadReport(filename: string, title: string, rows: string[]) {
  const body = [
    title,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    ...rows,
  ].join("\n");
  const blob = new Blob([body], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function EmptyState({ cta }: { cta: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm font-medium">No data available yet. Start by adding activity.</p>
      <Button asChild className="mt-4 bg-gradient-brand text-brand-foreground">
        <Link to="/scope-admin" search={{ tab: "crm" }}>{cta}</Link>
      </Button>
    </Card>
  );
}

function PageShell({ title, children, cta, ctaTo = "/scope-admin" }: { title: string; children: React.ReactNode; cta: string; ctaTo?: string }) {
  return (
    <AppShell>
      <RbacSidebar title={title}>
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="mb-2"><Building2 className="mr-1 h-3 w-3" /> Scope Admin</Badge>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            </div>
            <Button asChild className="bg-gradient-brand text-brand-foreground">
              <Link to={ctaTo as any} search={{ tab: "crm" } as any}><Plus className="mr-1 h-4 w-4" /> {cta}</Link>
            </Button>
          </header>
          <div className="mt-6">{children}</div>
        </section>
      </RbacSidebar>
    </AppShell>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </Card>
  );
}

export function ScopeAdminDashboardPage() {
  const data = useStoreValue(() => crm.all());
  const live = data.institutions.filter((i) => i.stage === "Live Chapter").length;
  const weeklyVisits = data.visits.slice(0, 7).length;
  return (
    <PageShell title="Operations Dashboard" cta="View Detailed Reports" ctaTo="/scope-admin/reports">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total institutions" value={data.institutions.length} icon={Building2} />
        <Kpi label="Active pipeline" value={data.institutions.filter((i) => i.stage !== "Dormant").length} icon={Target} />
        <Kpi label="Weekly visits" value={weeklyVisits} icon={Calendar} />
        <Kpi label="Live chapters" value={live} icon={Users} />
      </div>
      <Card className="mt-4 p-5">
        <h3 className="text-sm font-bold">Quick actions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["/scope-admin/institutions", "Add Institution"],
            ["/scope-admin/visits", "Log Visit"],
            ["/scope-admin/mou-pipeline", "Create Pipeline Entry"],
            ["/scope-admin/reports", "View Reports"],
          ].map(([to, label]) => (
            <Button key={to} asChild variant="outline"><Link to={to}>{label}</Link></Button>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}

export function ScopeAdminInstitutionsPage() {
  const data = useStoreValue(() => crm.all());
  return (
    <PageShell title="Institutions" cta="Add New Institution">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search institutions" /></div>
        <Button variant="outline">Status Filter</Button>
      </div>
      {data.institutions.length === 0 ? <EmptyState cta="Add Institution" /> : (
        <Card className="overflow-x-auto p-5">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2 text-left">Institution</th><th className="text-left">Stage</th><th className="text-left">City</th><th className="text-right">Potential</th></tr></thead>
            <tbody>{data.institutions.map((i) => <tr key={i.id} className="border-t border-border"><td className="py-3 font-semibold">{i.name}</td><td><Badge variant="outline">{i.stage}</Badge></td><td>{i.city}</td><td className="text-right">₹{(i.potentialValue / 1000).toFixed(0)}k</td></tr>)}</tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}

export function ScopeAdminMouPipelinePage() {
  const data = useStoreValue(() => crm.all());
  const stages = ["Contacted", "Proposal Sent", "Negotiation", "MoU Draft Shared", "MoU Signed", "Launch Pending"] as const;
  return (
    <PageShell title="MoU Pipeline" cta="Add New Lead">
      <div className="grid gap-3 lg:grid-cols-3">
        {stages.map((stage) => {
          const items = data.institutions.filter((i) => i.stage === stage);
          return (
            <Card key={stage} className="p-4">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold">{stage}</h3><Badge variant="outline">{items.length}</Badge></div>
              <div className="mt-3 space-y-2">
                {items.length === 0 && <p className="rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">No data available yet. Start by adding activity.</p>}
                {items.map((i) => <div key={i.id} className="rounded-lg border border-border p-3"><div className="text-sm font-semibold">{i.name}</div><div className="text-xs text-muted-foreground">{i.city} · ₹{(i.potentialValue / 1000).toFixed(0)}k</div></div>)}
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

export function ScopeAdminVisitsPage() {
  const data = useStoreValue(() => crm.all());
  return (
    <PageShell title="Institution Visits" cta="Log New Visit">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold">Visit log</h3>
          {data.visits.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No data available yet. Start by adding activity.</p> : (
            <div className="mt-3 divide-y divide-border">{data.visits.map((v) => {
              const inst = data.institutions.find((i) => i.id === v.institutionId);
              return <div key={v.id} className="flex items-center justify-between py-3 text-sm"><div><div className="font-semibold">{inst?.name ?? "Institution"}</div><div className="text-xs text-muted-foreground">{v.date} · {v.time}</div></div><Badge variant="outline">{v.status}</Badge></div>;
            })}</div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold">Calendar view</h3>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">{Array.from({ length: 28 }, (_, i) => <div key={i} className="rounded-md bg-secondary/60 p-2">{i + 1}</div>)}</div>
        </Card>
      </div>
    </PageShell>
  );
}

export function ScopeAdminReportsPage() {
  const data = useStoreValue(() => crm.all());
  const rows = data.institutions.map((i) => `${i.name} | ${i.stage} | ${i.city} | ${i.potentialValue}`);
  return (
    <PageShell title="Performance Reports" cta="Download Report (PDF)">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Weekly meetings" value={data.visits.length} icon={Calendar} />
        <Kpi label="Conversion" value={`${data.institutions.length ? Math.round((data.institutions.filter((i) => ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage)).length / data.institutions.length) * 100) : 0}%`} icon={BarChart3} />
        <Kpi label="Pipeline value" value={`₹${(data.institutions.reduce((s, i) => s + i.potentialValue, 0) / 100000).toFixed(1)}L`} icon={Handshake} />
      </div>
      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Territory performance</h3><Button onClick={() => { downloadReport(`scope_report_${new Date().toISOString().slice(0, 10)}.pdf`, "Scope Admin Performance Report", rows); toast.success("PDF report downloaded"); }}><Download className="mr-2 h-4 w-4" /> Download PDF Report</Button></div>
        <div className="mt-4 space-y-2">{(data.institutions.length ? data.institutions : [{ id: "empty", name: "No data available yet. Start by adding activity.", stage: "Prospect", city: "", potentialValue: 0 } as Institution]).map((i) => <div key={i.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"><span className="font-medium">{i.name}</span><Badge variant="outline">{i.stage}</Badge></div>)}</div>
      </Card>
    </PageShell>
  );
}
