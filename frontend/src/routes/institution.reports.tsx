import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Download, FileText, FolderKanban, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStoreValue } from "@/hooks/use-scope";
import { crm } from "@/lib/crm-store";
import { toast } from "sonner";

export const Route = createFileRoute("/institution/reports")({
  head: () => ({ meta: [{ title: "Institution Reports · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: InstitutionReportsPage,
});

const topPerformers = [
  { name: "Alice Sharma", department: "CSE", score: 94, projects: 8 },
  { name: "Dev Patel", department: "ECE", score: 88, projects: 6 },
  { name: "Meera Iyer", department: "Design", score: 83, projects: 5 },
];

function downloadFile(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
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

function InstitutionReportsPage() {
  const data = useStoreValue(() => crm.all());
  const institution = data.institutions[0];
  const csv = ["name,department,score,projects", ...topPerformers.map((p) => `${p.name},${p.department},${p.score},${p.projects}`)].join("\n");
  const report = [
    "Institution Reports",
    `Institution: ${institution?.name ?? "Demo Institution"}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "Student Overview",
    "Total students: 284",
    "Active students: 196",
    "Verified students: 151",
    "",
    "Top Performers",
    ...topPerformers.map((p) => `${p.name} - ${p.score}`),
  ].join("\n");

  return (
    <AppShell>
      <RbacSidebar title="Institution Reports">
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="mb-2"><FileText className="mr-1 h-3 w-3" /> Institution Reports</Badge>
              <h1 className="text-3xl font-bold tracking-tight">{institution?.name ?? "Institution Reports"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Student performance, engagement, verification, and exports.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { downloadFile(`scope_report_${new Date().toISOString().slice(0, 10)}.pdf`, "application/pdf", report); toast.success("PDF report downloaded"); }}><Download className="mr-2 h-4 w-4" /> Download PDF Report</Button>
              <Button variant="outline" onClick={() => { downloadFile(`scope_report_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv", csv); toast.success("CSV exported"); }}>Export CSV</Button>
            </div>
          </header>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Total students" value="284" icon={Users} />
            <Stat label="Active students" value="196" icon={TrendingUp} />
            <Stat label="Verified students" value="151" icon={Award} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Projects participated" value="73" icon={FolderKanban} />
            <Stat label="Completion rate" value="68%" icon={TrendingUp} />
            <Stat label="Avg activity score" value="82" icon={Award} />
          </div>

          <Card className="mt-4 overflow-x-auto p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Top performers</h3>
              <Button asChild variant="outline" size="sm"><Link to="/institution-admin/members">Review students</Link></Button>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2 text-left">Student</th><th className="text-left">Department</th><th className="text-right">Score</th><th className="text-right">Projects</th></tr></thead>
              <tbody>{topPerformers.map((p) => <tr key={p.name} className="border-t border-border"><td className="py-3 font-semibold">{p.name}</td><td>{p.department}</td><td className="text-right">{p.score}</td><td className="text-right">{p.projects}</td></tr>)}</tbody>
            </table>
          </Card>
        </section>
      </RbacSidebar>
    </AppShell>
  );
}
