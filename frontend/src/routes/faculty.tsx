// Faculty Coordinator dashboard — purpose-built per Section D of the
// Role-Based OS spec. Top cards: Verified Members · Pending Approvals ·
// Project Reviews Due · Monthly Activity. Sections: Students Needing
// Review, Campus Reports, Project Quality Checks, Event Compliance.
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserCheck, ClipboardList, FileBarChart, Activity, ArrowRight, GraduationCap,
  ShieldCheck, FolderKanban, Calendar, AlertTriangle, CheckCircle2, XCircle
} from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { AuthGate } from "@/components/site/AuthGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/hooks/use-rbac";
import { useUser } from "@/hooks/use-scope";
import { useEffect, useState } from "react";
import { backendReports, backendUsers } from "@/lib/api/endpoints";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty Overview · Scope Connect" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate>
      <FacultyPortal />
    </AuthGate>
  ),
});

function FacultyPortal() {
  const role = useRole();
  const allowed =
    role === "faculty_coordinator" ||
    role === "institutional_admin" ||
    role === "scope_super_admin" ||
    role === "super_admin";

  if (!allowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="approve_students"
          title="Faculty area"
          message="The Faculty Coordinator overview is restricted to Faculty, Institutional Admins, and higher."
          toastMessage="Faculty access required."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RbacSidebar title="Faculty Overview">
        <FacultyDashboard />
      </RbacSidebar>
    </AppShell>
  );
}

function FacultyDashboard() {
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    metrics: {
      verifiedMembers: number;
      pendingApprovals: number;
      reviewsDue: number;
      monthlyActivity: number;
    };
    studentsToReview: Array<{
      id: string;
      name: string;
      reason: string;
      when: string;
    }>;
    projectChecks: Array<{
      id: string;
      title: string;
      quality: number;
      status: "review" | "ok";
    }>;
    events: Array<{
      id: string;
      title: string;
      status: string;
      ok: boolean;
    }>;
  } | null>(null);

  const fetchDashboardData = async () => {
    if (!user?.institution) return;
    setLoading(true);
    try {
      const res = await backendReports.facultyOverview(user.institution.id);
      setData(res);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("[FacultyDashboard] Fetching data for institution:", user?.institution?.id);
    fetchDashboardData();
  }, [user?.institution?.id]);

  const handleVerify = async (id: string) => {
    try {
      await backendUsers.updateMemberStatus(id, "active");
      toast.success("Student verified successfully");
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to verify student");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await backendUsers.updateMemberStatus(id, "rejected");
      toast.success("Student verification rejected successfully");
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to reject student");
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">Hydrating dashboard...</p>
        </div>
      </div>
    );
  }

  const { metrics, studentsToReview, projectChecks, events } = data;
  const { verifiedMembers, pendingApprovals, reviewsDue, monthlyActivity } = metrics;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2">
            <GraduationCap className="mr-1 h-3 w-3" /> Faculty Coordinator
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify, review, and keep the academic engine clean.
          </p>
        </div>
        <Button asChild className="bg-gradient-brand text-brand-foreground">
          <Link to="/institution-admin/members">
            Review queue <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      {/* TOP CARDS — exact spec */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Verified Members" value={verifiedMembers.toLocaleString()} icon={UserCheck} accent />
        <KpiCard label="Pending Approvals" value={pendingApprovals} icon={ClipboardList} />
        <KpiCard label="Project Reviews Due" value={reviewsDue} icon={FileBarChart} />
        <KpiCard label="Monthly Activity" value={`${monthlyActivity}%`} icon={Activity} accent />
      </div>

      {/* SECTIONS */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Students Needing Review */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h3 className="text-sm font-bold">Students Needing Review</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pendingApprovals} pending verification
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/institution-admin/members">
                Open roster <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {studentsToReview.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.reason} · {formatDistanceToNow(new Date(s.when))} ago
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white animate-in fade-in"
                  onClick={() => handleVerify(s.id)}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Verify
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="animate-in fade-in"
                  onClick={() => handleReject(s.id)}
                >
                  <XCircle className="mr-1 h-3 w-3" /> Reject
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Campus Reports */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Campus Reports</h3>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-3">
            {[
              { l: "Monthly activity", v: `${monthlyActivity}%`, p: monthlyActivity },
              { l: "Verification turnaround", v: "1.4d", p: 78 },
              { l: "Project completion", v: "82%", p: 82 },
              { l: "Event compliance", v: "94%", p: 94 },
            ].map((row) => (
              <li key={row.l}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.l}</span>
                  <span className="font-semibold">{row.v}</span>
                </div>
                <Progress value={row.p} className="mt-1.5" />
              </li>
            ))}
          </ul>
          <Button asChild size="sm" variant="outline" className="mt-4 w-full">
            <Link to="/institution-admin/analytics">Open analytics</Link>
          </Button>
        </Card>
      </div>

      {/* Project Quality + Event Compliance */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Project Quality Checks</h3>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-2">
            {projectChecks.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={p.quality} className="h-1 w-24" />
                    <span className="text-xs text-muted-foreground">{p.quality}/100</span>
                  </div>
                </div>
                {p.status === "review" ? (
                  <Badge variant="outline" className="ml-3 border-amber-500/30 text-amber-500">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Review
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-3 border-emerald-500/30 text-emerald-500">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> OK
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Event Compliance</h3>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm w-full overflow-hidden min-w-0 gap-3">
                <span className="font-medium truncate flex-1 min-w-0" title={e.title}>
                  {e.title}
                </span>
                <Badge 
                  variant="outline" 
                  className={`shrink-0 ${e.ok ? "border-emerald-500/30 text-emerald-500" : "border-amber-500/30 text-amber-500"}`}
                >
                  {e.ok ? <CheckCircle2 className="mr-1 h-3 w-3 shrink-0" /> : <AlertTriangle className="mr-1 h-3 w-3 shrink-0" />}
                  <span className="truncate max-w-[100px]">{e.status}</span>
                </Badge>
              </li>
            ))}
          </ul>
          <Button asChild size="sm" variant="outline" className="mt-4 w-full">
            <Link to="/events">All events</Link>
          </Button>
        </Card>
      </div>
    </section>
  );
}

function KpiCard({
  label, value, icon: Icon, accent = false,
}: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "border-brand/30 bg-gradient-to-br from-brand/5 to-transparent" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-brand" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </Card>
  );
}
