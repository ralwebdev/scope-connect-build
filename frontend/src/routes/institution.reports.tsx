import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Download, FileText, FolderKanban, TrendingUp, Users, ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/hooks/use-scope";
import { backendReports } from "@/lib/api/endpoints";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export const Route = createFileRoute("/institution/reports")({
  head: () => ({ meta: [{ title: "Scope Connect | Institution Reports" }, { name: "robots", content: "noindex" }] }),
  component: InstitutionReportsPage,
});

const COLORS = ["#00D1FF", "#34D399", "#A78BFA", "#FB923C", "#F472B6", "#E63946"];

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
    <Card className="p-4 border-border/40 bg-card/50">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </Card>
  );
}

function InstitutionReportsPage() {
  const user = useUser();
  const institution = user?.institution ?? null;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    metrics: { totalStudents: number; activeStudents: number; verifiedStudents: number; completionRate: number };
    growthTrend: Array<{ month: string; students: number }>;
    skillDistribution: Array<{ name: string; value: number }>;
    departmentDistribution?: Array<{ name: string; value: number }>;
    projectMetrics: { total: number; open: number; inProgress: number; completed: number };
    topPerformers: any[];
  } | null>(null);

  useEffect(() => {
    if (!institution?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    backendReports.institution(institution.id)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((error) => {
        console.warn("Institution reports hydration failed", error);
        toast.error(error instanceof Error ? error.message : "Could not hydrate reports data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [institution?.id]);

  const csv = useMemo(() => {
    if (!data) return "";
    return ["name,xp", ...data.topPerformers.map((p) => `${p.name},${p.stats?.xp || 0}`)].join("\n");
  }, [data]);

  const report = useMemo(() => {
    if (!data) return "";
    return [
      "Institution Reports",
      `Institution: ${institution?.name ?? "Demo Institution"}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Student Overview",
      `Total students: ${data.metrics.totalStudents}`,
      `Active students: ${data.metrics.activeStudents}`,
      `Verified students: ${data.metrics.verifiedStudents}`,
      "",
      "Project Summary",
      `Total projects: ${data.projectMetrics.total}`,
      `Completed: ${data.projectMetrics.completed}`,
      "",
      "Top Performers",
      ...data.topPerformers.map((p) => `${p.name} - ${p.stats?.xp || 0} XP`),
    ].join("\n");
  }, [data, institution]);

  return (
    <AppShell>
      <RbacSidebar title="Institution Reports">
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <Link to="/institution-admin" className="flex items-center text-xs text-muted-foreground hover:text-brand transition-colors">
                <ChevronLeft className="mr-1 h-3 w-3" /> Back to Dashboard
              </Link>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                {institution?.name ?? "Reports Hub"}
              </h1>
              <p className="text-sm text-muted-foreground">Advanced metrics, student performance, and export tools.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { downloadFile(`report_${new Date().toISOString().slice(0, 10)}.pdf`, "application/pdf", report); toast.success("PDF Exported"); }}>
                <Download className="mr-2 h-4 w-4" /> Export PDF
              </Button>
              <Button variant="outline" onClick={() => { downloadFile(`report_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv", csv); toast.success("CSV Exported"); }}>
                Export CSV
              </Button>
            </div>
          </header>

          {loading && (
            <div className="mt-12 flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Generating deep metrics...</p>
            </div>
          )}

          {!loading && data && (
            <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Total Students" value={data.metrics.totalStudents} icon={Users} />
                <Stat label="Verified Active" value={data.metrics.activeStudents} icon={TrendingUp} />
                <Stat label="Success Rate" value={`${data.metrics.completionRate}%`} icon={Award} />
                <Stat label="Total Projects" value={data.projectMetrics.total} icon={FolderKanban} />
              </div>

              <div className="space-y-6">
                {/* Growth Trend */}
                <Card className="p-6 bg-card/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Campus Growth</h3>
                    <Badge variant="outline" className="text-[10px]">Last 6 Months</Badge>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.growthTrend}>
                        <defs>
                          <linearGradient id="restoredStudents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00D1FF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.9)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", color: "#000" }}
                          itemStyle={{ color: "#00D1FF" }}
                        />
                        <Area type="monotone" dataKey="students" stroke="#00D1FF" strokeWidth={2} fillOpacity={1} fill="url(#restoredStudents)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Skill Distribution */}
                  <Card className="p-6 bg-card/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Skill Distribution</h3>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.skillDistribution}
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {data.skillDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.9)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", color: "#000" }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Department Distribution */}
                  <Card className="p-6 bg-card/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Department Distribution</h3>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.departmentDistribution || []}
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {(data.departmentDistribution || []).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.9)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", color: "#000" }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Top Performers */}
              <Card className="p-6 bg-card/30 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top Performers</h3>
                  <Button asChild variant="ghost" size="sm" className="text-xs text-brand hover:text-brand hover:bg-brand/10">
                    <Link to="/institution-admin/members">Manage Members</Link>
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase">
                      <tr className="border-b border-border/50">
                        <th className="pb-4 font-medium">Student</th>
                        <th className="pb-4 font-medium">Domain</th>
                        <th className="pb-4 font-medium text-right">XP Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {data.topPerformers.map((p) => (
                        <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                          <td className="py-4 font-semibold">{p.name}</td>
                          <td className="py-4 text-muted-foreground">{p.primary_domain || "General"}</td>
                          <td className="py-4 text-right font-mono text-brand font-bold">{p.stats?.xp || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </section>
      </RbacSidebar>
    </AppShell>
  );
}
