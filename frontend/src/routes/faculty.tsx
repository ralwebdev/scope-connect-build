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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [resets, setResets] = useState<any[]>([]);
  const [resolvingReset, setResolvingReset] = useState<any | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resolvedPassword, setResolvedPassword] = useState("");

  const fetchResets = async () => {
    if (!user?.institution?.id) return;
    try {
      const { backendAdminUsers } = await import("@/lib/api/endpoints");
      const items = await backendAdminUsers.listPasswordResets(user.institution.id);
      setResets(items.filter((r: any) => r.status === "pending"));
    } catch (err) {
      console.warn("Failed to load password resets", err);
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "Scope@2026!";
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleResolveReset = async () => {
    if (!resolvingReset || !newPassword) return;
    try {
      const { backendAdminUsers } = await import("@/lib/api/endpoints");
      await backendAdminUsers.resolvePasswordReset(resolvingReset.id, { password: newPassword });
      setResolvedPassword(newPassword);
      toast.success("Password updated successfully!");
      fetchResets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resolve password request.");
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.institution) return;
    setLoading(true);
    try {
      const res = await backendReports.facultyOverview(user.institution.id);
      setData(res);
      await fetchResets();
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
        <div className="lg:col-span-2 space-y-6">
          {/* Students Needing Review */}
          <Card>
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

          {/* Password Reset Requests */}
          <Card>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-sm font-bold">Student Password Resets</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {resets.length} pending request{resets.length !== 1 && "s"}
                </p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {resets.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-sm font-bold text-amber-600">
                    🔑
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold">{r.user?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.user?.email} · {formatDistanceToNow(new Date(r.createdAt))} ago
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-brand text-brand-foreground"
                    onClick={() => {
                      setResolvingReset(r);
                      setNewPassword("");
                      setResolvedPassword("");
                      setResetOpen(true);
                    }}
                  >
                    Reset Password
                  </Button>
                </div>
              ))}
              {resets.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No pending password reset requests.
                </div>
              )}
            </div>
          </Card>
        </div>

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
      <Dialog open={resetOpen} onOpenChange={(open) => { setResetOpen(open); if (!open) { setResolvingReset(null); setResolvedPassword(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Student Password</DialogTitle>
          </DialogHeader>
          {resolvedPassword ? (
            <div className="space-y-4 py-4 text-center">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-900 animate-in fade-in">
                <p className="font-bold text-emerald-800">✅ Password Reset Successful</p>
                <p className="mt-2 text-xs text-emerald-700">
                  The new password for **{resolvingReset?.user?.name}** is:
                </p>
                <div className="mt-3 select-all rounded-md border border-emerald-300 bg-white p-2.5 font-mono text-base font-bold tracking-wider text-emerald-900 shadow-inner">
                  {resolvedPassword}
                </div>
                <p className="mt-2.5 text-[10px] text-emerald-600/90 leading-relaxed">
                  Please copy this password and share it securely with the student. They will be forced to log in with this new credential.
                </p>
              </div>
              <Button onClick={() => setResetOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Set a new password for **{resolvingReset?.user?.name}** ({resolvingReset?.user?.email}).
              </p>
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 chars)"
                  />
                  <Button variant="outline" onClick={generatePassword} className="shrink-0">
                    Generate
                  </Button>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button onClick={handleResolveReset} disabled={!newPassword || newPassword.length < 8} className="bg-gradient-brand text-brand-foreground">
                  Update & Resolve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
