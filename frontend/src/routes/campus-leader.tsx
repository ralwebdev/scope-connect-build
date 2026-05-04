// Campus Leader dashboard — purpose-built per Section C of the
// Role-Based OS spec. Top cards: Total Members · Weekly Active ·
// Pending Joins · Campus Rank. Sections: New Applications, Upcoming
// Events, Chapter Performance, Scope Tasks, Leaderboard.
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, Activity, ClipboardList, Trophy, Calendar, ArrowRight, Megaphone,
  TrendingUp, BadgeCheck, Target,
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
import { useStoreValue, useUser } from "@/hooks/use-scope";
import { events, memberLeaderboard } from "@/lib/scope-store";

export const Route = createFileRoute("/campus-leader")({
  head: () => ({
    meta: [
      { title: "Campus Dashboard · Scope Connect" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate>
      <CampusLeaderPortal />
    </AuthGate>
  ),
});

function CampusLeaderPortal() {
  const role = useRole();
  const allowed =
    role === "campus_leader" ||
    role === "institutional_admin" ||
    role === "scope_super_admin" ||
    role === "super_admin";

  if (!allowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="manage_campus"
          title="Campus Leader area"
          message="The Campus Dashboard is restricted to Campus Leaders, Institutional Admins, and higher."
          toastMessage="Campus Leader access required."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RbacSidebar title="Campus Dashboard">
        <CampusLeaderDashboard />
      </RbacSidebar>
    </AppShell>
  );
}

function CampusLeaderDashboard() {
  const user = useUser();
  const upcoming = useStoreValue(() => events.all().slice(0, 4));
  const board = useStoreValue(() => memberLeaderboard().slice(0, 6));

  // Mock-aware KPIs — deterministic per campus name.
  const seed = (user?.campus ?? "campus").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const totalMembers = 90 + (seed % 220);
  const weeklyActive = Math.round(totalMembers * (0.45 + (seed % 30) / 100));
  const pendingJoins = 4 + (seed % 12);
  const campusRank = (seed % 12) + 1;
  const monthlyGrowth = 6 + (seed % 18);
  const tasksOpen = 3 + (seed % 5);

  const newApplications = Array.from({ length: pendingJoins }).slice(0, 5).map((_, i) => ({
    id: `app${i + 1}`,
    name: ["Aarav Sharma", "Riya Sen", "Karan Bose", "Dev Iyer", "Anya Roy"][i % 5],
    branch: ["CSE", "ECE", "IT", "ME", "Design"][i % 5],
    when: ["2h", "5h", "1d", "1d", "2d"][i % 5],
  }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2">
            <Trophy className="mr-1 h-3 w-3" /> Campus Leader · {user?.campus ?? "Your Chapter"}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Campus Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the chapter. Approve people. Climb the rankings.
          </p>
        </div>
        <Button asChild className="bg-gradient-brand text-brand-foreground">
          <Link to="/campus">
            Open Campus Hub <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      {/* TOP CARDS — exact spec */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total Members" value={totalMembers.toLocaleString()} icon={Users} />
        <KpiCard label="Weekly Active" value={weeklyActive.toLocaleString()} icon={Activity} accent />
        <KpiCard label="Pending Joins" value={pendingJoins} icon={ClipboardList} />
        <KpiCard label="Campus Rank" value={`#${campusRank}`} icon={Trophy} accent />
      </div>

      {/* SECTIONS */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* New Applications */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h3 className="text-sm font-bold">New Applications</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pendingJoins} students awaiting your approval
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/institution-admin/members">
                Review all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {newApplications.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                  {a.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.branch} · applied {a.when} ago</div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline">Decline</Button>
                  <Button size="sm" className="bg-gradient-brand text-brand-foreground">
                    <BadgeCheck className="mr-1 h-3 w-3" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Events */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Upcoming Events</h3>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-3">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-xs font-bold text-brand-foreground">
                  {e.date.split(" ")[1] ?? e.date}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.venue}</div>
                </div>
              </li>
            ))}
          </ul>
          <Button asChild size="sm" variant="outline" className="mt-4 w-full">
            <Link to="/events">All events</Link>
          </Button>
        </Card>
      </div>

      {/* Chapter Performance + Scope Tasks */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Chapter Performance</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-4 text-sm">
            <Stat label="Engagement rate" value={`${Math.round((weeklyActive / totalMembers) * 100)}%`} progress={Math.round((weeklyActive / totalMembers) * 100)} />
            <Stat label="Monthly growth" value={`+${monthlyGrowth}%`} progress={Math.min(100, monthlyGrowth * 4)} />
            <Stat label="Approval rate" value={`${Math.max(60, 100 - pendingJoins * 2)}%`} progress={Math.max(60, 100 - pendingJoins * 2)} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Scope Tasks</h3>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-2">
            {[
              { l: "Approve pending joins", to: "/institution-admin/members" as const, d: `${pendingJoins} pending` },
              { l: "Post weekly announcement", to: "/announcements" as const, d: "due Friday" },
              { l: "Confirm event attendance", to: "/events" as const, d: "2 events" },
              { l: "Send chapter newsletter", to: "/institution-admin/communications" as const, d: "draft ready" },
            ].slice(0, tasksOpen).map((t) => (
              <li key={t.l} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{t.l}</div>
                  <div className="text-xs text-muted-foreground">{t.d}</div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={t.to}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="mt-8">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="text-sm font-bold">Leaderboard</h3>
          <Button asChild size="sm" variant="outline">
            <Link to="/leaderboards">
              Full ranking <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {board.map((m, i) => (
            <li key={m.id} className="flex items-center gap-4 p-4">
              <div className="w-6 text-sm font-bold text-muted-foreground">#{i + 1}</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                {m.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.sub}</div>
              </div>
              <Badge variant="outline">{m.value.toLocaleString()} pts</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-8">
        <Card className="bg-gradient-hero p-6 text-primary-foreground hover-lift">
          <Megaphone className="h-5 w-5" />
          <h3 className="mt-3 text-lg font-bold">Drive your chapter forward</h3>
          <p className="mt-1 text-sm text-primary-foreground/80">
            Post an announcement to keep momentum high this week.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-4 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
            <Link to="/announcements">New announcement</Link>
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

function Stat({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <Progress value={progress} className="mt-1.5" />
    </div>
  );
}
