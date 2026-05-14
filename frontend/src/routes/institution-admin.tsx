// Institutional Admin portal — mapped to a single institution.
// Demo mapping: each user email is bound to one institution_id via a localStorage
// helper. Falls back to a seeded default for demo users.
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Building2, Users, BarChart3, Megaphone, CheckCircle2, XCircle, TrendingUp, Award, Calendar, FolderKanban, Send, ImageIcon, Sparkles, ChevronRight, ShieldCheck, Download, FileText, Plus, Trash2, Edit, Layers, MapPin, UserPlus } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser } from "@/hooks/use-scope";
import { useRole } from "@/hooks/use-rbac";
import { useStoreValue } from "@/hooks/use-scope";
import { crm, type Institution } from "@/lib/crm-store";
import { backendAnalytics, backendEvents, backendNotifications, backendProjects, backendUsers } from "@/lib/api/endpoints";
import { FeedComposer } from "@/components/site/FeedComposer";
import type { ScopeUser } from "@/lib/scope-store";
import { rbac, type PermissionKey } from "@/lib/rbac";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
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

const CHART_COLORS = ["#00D1FF", "#34D399", "#A78BFA", "#FB923C", "#F472B6", "#E63946"];

function downloadFile(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export const Route = createFileRoute("/institution-admin")({
  head: () => ({ meta: [{ title: "Institution Hub · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: InstitutionAdminPortal,
});

/** Resolve the institution mapped to the current user. Demo: pick first
 * institution whose name matches the email handle, else fall back to first one. */
function useMyInstitution() {
  const user = useUser();
  const data = useStoreValue(() => crm.all());
  return useMemo(() => {
    if (!user) return data.institutions[0] ?? null;
    if (user.institution?.id) {
      const fallback: Institution = {
        id: user.institution.id,
        name: user.institution.name,
        type: "Other",
        city: "",
        state: "",
        contactPerson: "",
        designation: "",
        phone: "",
        email: "",
        ownerId: "",
        priority: 3,
        potentialValue: 0,
        stage: "Live Chapter",
        notes: "",
        updatedAt: Date.now(),
      };
      return data.institutions.find((i) => i.id === user.institution?.id) ?? fallback;
    }
    const handle = user.email?.split("@")[0]?.toLowerCase() ?? "";
    const match = data.institutions.find((i) => handle && i.name.toLowerCase().includes(handle.split(".")[0]));
    return match ?? data.institutions[0] ?? null;
  }, [user, data.institutions]);
}

function useAccessibleInstitutions() {
  const role = useRole();
  const data = useStoreValue(() => crm.all());
  const mapped = useMyInstitution();
  return useMemo(() => {
    if (role === "scope_super_admin" || role === "super_admin") return data.institutions;
    return mapped ? [mapped] : [];
  }, [role, data.institutions, mapped]);
}

function InstitutionAdminPortal() {
  const role = useRole();
  const allowed = role === "institutional_admin" || role === "scope_super_admin" || role === "super_admin" || role === "scope_admin";
  const institutions = useAccessibleInstitutions();
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  useEffect(() => {
    if (!institutions.length) return;
    if (selectedInstitutionId && institutions.some((i) => i.id === selectedInstitutionId)) return;
    setSelectedInstitutionId(institutions[0].id);
  }, [institutions, selectedInstitutionId]);
  const inst = institutions.find((i) => i.id === selectedInstitutionId) ?? institutions[0] ?? null;

  if (!allowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="manage_institution"
          title="Institution Hub restricted"
          message="Only Institutional Admins (and higher) can access this institution's hub."
          toastMessage="Institutional Admin access required."
        />
      </AppShell>
    );
  }

  if (!inst) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">No institution mapped</h1>
          <p className="mt-2 text-sm text-muted-foreground">Contact Scope Super Admin to be linked.</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RbacSidebar title="Institution Hub">
        <InstitutionRouteSwitcher
          institutionId={inst.id}
          institutionName={inst.name}
          institutions={institutions}
          canSwitchInstitution={role === "scope_super_admin" || role === "super_admin"}
          selectedInstitutionId={inst.id}
          onSelectInstitution={setSelectedInstitutionId}
        />
      </RbacSidebar>
    </AppShell>
  );
}

/* The institution-admin layout uses a single component that switches body by
 * pathname so we don't have to maintain a child route tree just for tabs. */
function InstitutionRouteSwitcher({
  institutionId,
  institutionName,
  institutions,
  canSwitchInstitution,
  selectedInstitutionId,
  onSelectInstitution,
}: {
  institutionId: string;
  institutionName: string;
  institutions: Institution[];
  canSwitchInstitution: boolean;
  selectedInstitutionId: string;
  onSelectInstitution: (institutionId: string) => void;
}) {
  const loc = useLocation();
  const tab = loc.pathname.includes("/members") ? "members"
    : loc.pathname.includes("/analytics") ? "analytics"
      : loc.pathname.includes("/communications") ? "communications"
        : loc.pathname.includes("/reports") ? "reports"
          : loc.pathname.includes("/departments") ? "departments"
            : loc.pathname.includes("/projects") ? "projects"
              : loc.pathname.includes("/events") ? "events"
                : "hub";
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2"><Building2 className="mr-1 h-3 w-3" /> Institutional Admin</Badge>
          <h1 className="text-3xl font-bold tracking-tight">{institutionName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canSwitchInstitution ? "Super admin scope: switch between institutions." : "Mapped scope: this institution only."}
          </p>
        </div>
        {canSwitchInstitution && (
          <div className="w-full sm:w-80">
            <Label htmlFor="institution-switcher">Institution</Label>
            <select
              id="institution-switcher"
              value={selectedInstitutionId}
              onChange={(e) => onSelectInstitution(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>{institution.name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <TabLink to="/institution-admin" label="Hub" active={tab === "hub"} />
        <TabLink to="/institution-admin/departments" label="Departments" active={tab === "departments"} />
        <TabLink to="/institution-admin/projects" label="Projects" active={tab === "projects"} />
        <TabLink to="/institution-admin/events" label="Events" active={tab === "events"} />
        <TabLink to="/institution-admin/members" label="Members" active={tab === "members"} />
        <TabLink to="/institution-admin/analytics" label="Analytics" active={tab === "analytics"} />
        <TabLink to="/institution-admin/reports" label="Reports" active={tab === "reports"} />
        <TabLink to="/institution-admin/communications" label="Communications" active={tab === "communications"} />
      </nav>

      <FirstLoginBanner institutionId={institutionId} />

      <div className="mt-6">
        {tab === "hub" && <HubView institutionId={institutionId} institutionName={institutionName} />}
        {tab === "departments" && <DepartmentsView institutionId={institutionId} />}
        {tab === "projects" && <AdminProjectsView institutionId={institutionId} />}
        {tab === "events" && <AdminEventsView institutionId={institutionId} />}
        {tab === "members" && <MembersView institutionId={institutionId} />}
        {tab === "analytics" && <AnalyticsView institutionId={institutionId} />}
        {tab === "reports" && <ReportsView institutionId={institutionId} institutionName={institutionName} />}
        {tab === "communications" && <CommunicationsView institutionName={institutionName} />}
      </div>
    </section>
  );
}

function TabLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link to={to} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}>
      {label}
    </Link>
  );
}

function FirstLoginBanner({ institutionId }: { institutionId: string }) {
  const cred = useStoreValue(() => crm.credential(institutionId));
  const user = useUser();
  if (!cred) return null;
  const steps = [
    { key: "passwordResetAt" as const, label: "Reset temporary password", done: !!cred.passwordResetAt },
    { key: "termsAcceptedAt" as const, label: "Accept terms of service", done: !!cred.termsAcceptedAt },
    { key: "profileCompletedAt" as const, label: "Complete institution profile", done: !!cred.profileCompletedAt },
  ];
  const remaining = steps.filter(s => !s.done);
  if (remaining.length === 0) return null;
  return (
    <Card className="mt-4 border-brand/40 bg-brand/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div className="flex-1">
          <h3 className="text-sm font-bold">Complete onboarding ({steps.length - remaining.length}/{steps.length})</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Required before full platform access is unlocked.</p>
          <div className="mt-3 space-y-1.5">
            {steps.map(s => (
              <div key={s.key} className="flex items-center justify-between gap-2 rounded-md bg-background/60 p-2">
                <div className="flex items-center gap-2 text-xs">
                  {s.done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
                </div>
                {!s.done && (
                  <Button size="sm" variant="outline" className="h-6 text-[11px]"
                    onClick={() => {
                      crm.markFirstLoginStep(institutionId, s.key, user?.email ?? cred.email);
                      toast.success(`${s.label} — done`);
                    }}>
                    Mark done
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HubView({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const [k, setK] = useState({ activeStudents: 0, totalFaculty: 0, profile: 0, projects: 0, rank: "-", events: 0, totalXp: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      backendUsers.list({ institutionId }),
      backendProjects.list(),
      backendEvents.list(institutionId),
      import("@/lib/api/endpoints").then(({ backendReports }) => backendReports.institution(institutionId)).catch(() => null),
    ])
      .then(([users, projects, events, report]) => {
        if (cancelled) return;
        const members = users.items;
        const activeStudents = members.filter((m) => m.role === "student" && m.student_status === "active").length;
        const totalFaculty = members.filter((m) => m.role === "faculty").length;
        const withProfile = members.filter((m) => Boolean(m.bio) || (m.skills?.length ?? 0) > 0 || (m.portfolio_links?.length ?? 0) > 0).length;
        const profile = members.length > 0 ? Math.round((withProfile / members.length) * 100) : 0;
        const institutionProjects = projects.items.filter((p) => p.institution_id === institutionId).length;
        const rank = report?.metrics?.campusRank ? `#${report.metrics.campusRank}` : "-";
        setK({
          activeStudents,
          totalFaculty,
          profile,
          projects: institutionProjects,
          rank,
          events: events.items.length,
          totalXp: report?.metrics?.totalCampusXp || 0,
        });
      })
      .catch((error) => {
        console.warn("Institution hub hydration failed", error);
        toast.error(error instanceof Error ? error.message : "Could not hydrate institution data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [institutionId]);

  const items = [
    { label: "Active students", v: k.activeStudents, icon: Users },
    { label: "Total Faculty", v: k.totalFaculty, icon: TrendingUp, accent: true },
    { label: "Profile completion", v: `${k.profile}%`, icon: Award },
    { label: "Projects participation", v: k.projects, icon: FolderKanban },
    { label: "Campus rank", v: k.rank, icon: Award, accent: true },
    { label: "Campus Engagement", v: k.totalXp?.toLocaleString() || "0", icon: Award, accent: true },
    { label: "Events conducted", v: k.events, icon: Calendar },
  ];
  return (
    <div className="space-y-6">
      {loading && <p className="text-sm text-muted-foreground">Hydrating institution data...</p>}
      <div className="mb-6">
        <FeedComposer />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => (
          <Card key={it.label} className={`p-4 ${it.accent ? "border-brand/30 bg-gradient-to-br from-brand/5 to-transparent" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{it.label}</span>
              <it.icon className={`h-4 w-4 ${it.accent ? "text-brand" : "text-muted-foreground"}`} />
            </div>
            <div className="mt-2 text-2xl font-bold">{it.v}</div>
          </Card>
        ))}
      </div>
      <QuickActionsPanel />
      <ReceivedDocuments institutionId={institutionId} />
      <InstitutionProfileEditor institutionId={institutionId} institutionName={institutionName} />
    </div>
  );
}

/* Permission-aware quick actions for the Institutional Admin hub.
 * Items are filtered by `rbac.hasPermission(role, ...)` so users only see
 * shortcuts they can actually use. Frequently-used routes float to the top. */
function QuickActionsPanel() {
  const role = useRole();
  const actions: Array<{ label: string; to: string; permission: PermissionKey; icon: typeof Users; weight: number; description: string }> = [
    { label: "Manage Members", to: "/institution-admin/members", permission: "manage_members", icon: Users, weight: 10, description: "Approve, deactivate, assign roles" },
    { label: "Analytics Overview", to: "/institution-admin/analytics", permission: "view_institution_analytics", icon: BarChart3, weight: 9, description: "DAU, WAU, top performers" },
    { label: "Communications", to: "/institution-admin/communications", permission: "manage_content", icon: Megaphone, weight: 8, description: "Broadcasts, notices, emails" },
    { label: "Projects", to: "/projects", permission: "manage_projects", icon: FolderKanban, weight: 7, description: "Campus project pipeline" },
    { label: "Events", to: "/events", permission: "manage_events", icon: Calendar, weight: 6, description: "Run on-campus events" },
    { label: "Approve Leaders", to: "/institution-admin/members", permission: "approve_leaders", icon: ShieldCheck, weight: 5, description: "Confirm campus leadership" },
  ];
  const visible = actions
    .filter((a) => rbac.hasPermission(role, a.permission))
    .sort((a, b) => b.weight - a.weight);

  if (visible.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Quick actions</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Permission-aware shortcuts for your role.</p>
        </div>
        <Badge variant="outline" className="text-[10px]">{visible.length} available</Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((a) => (
          <Link
            key={`${a.label}-${a.to}`}
            to={a.to}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3 transition-colors hover:border-brand/40 hover:bg-secondary/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-brand-foreground">
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-semibold">{a.label}</div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="truncate text-xs text-muted-foreground">{a.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

const PROFILE_KEY = "sc_inst_profile";
type InstProfile = { logoText: string; description: string; departments: string[]; topSkills: string[] };
function readProfile(id: string): InstProfile {
  if (typeof window === "undefined") return { logoText: "", description: "", departments: [], topSkills: [] };
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY}:${id}`);
    return raw ? JSON.parse(raw) : { logoText: "", description: "Building India's most ambitious student community.", departments: ["CSE", "ECE", "ME"], topSkills: ["AI/ML", "Web", "Design"] };
  } catch { return { logoText: "", description: "", departments: [], topSkills: [] }; }
}
function writeProfile(id: string, p: InstProfile) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(`${PROFILE_KEY}:${id}`, JSON.stringify(p)); } catch { /* noop */ }
}

function InstitutionProfileEditor({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const [p, setP] = useState<InstProfile>(() => readProfile(institutionId));
  const [dept, setDept] = useState("");
  const [skill, setSkill] = useState("");
  const save = () => { writeProfile(institutionId, p); toast.success("Institution profile saved"); };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Institution profile</h3>
        <Button size="sm" onClick={save} className="bg-gradient-brand text-brand-foreground">Save</Button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label>Logo text / monogram</Label>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-lg font-bold text-brand-foreground">
              {(p.logoText || institutionName).slice(0, 2).toUpperCase()}
            </div>
            <Input value={p.logoText} onChange={(e) => setP({ ...p, logoText: e.target.value })} placeholder="e.g. ABC" />
          </div>
        </div>
        <div className="md:row-span-2">
          <Label>Description</Label>
          <Textarea rows={5} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
        </div>
        <div>
          <Label>Departments</Label>
          <div className="mt-1 flex gap-2">
            <Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Add department" />
            <Button variant="outline" onClick={() => { if (dept) { setP({ ...p, departments: [...p.departments, dept] }); setDept(""); } }}>Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.departments.map((d, i) => (
              <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setP({ ...p, departments: p.departments.filter((_, j) => j !== i) })}>
                {d} <XCircle className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label>Top skills</Label>
          <div className="mt-1 flex gap-2">
            <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Add skill" />
            <Button variant="outline" onClick={() => { if (skill) { setP({ ...p, topSkills: [...p.topSkills, skill] }); setSkill(""); } }}>Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.topSkills.map((d, i) => (
              <Badge key={i} className="cursor-pointer bg-gradient-brand text-brand-foreground" onClick={() => setP({ ...p, topSkills: p.topSkills.filter((_, j) => j !== i) })}>
                {d} <XCircle className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

const MEMBERS_KEY = "sc_inst_members";
type Member = {
  id: string;
  name: string;
  email: string;
  role: "student" | "campus_leader" | "faculty_coordinator" | "institutional_admin";
  status: "pending" | "active" | "deactivated";
  department?: string;
};
function readMembers(id: string): Member[] {
  if (typeof window === "undefined") return seedMembers();
  try {
    const raw = localStorage.getItem(`${MEMBERS_KEY}:${id}`);
    if (!raw) { const s = seedMembers(); localStorage.setItem(`${MEMBERS_KEY}:${id}`, JSON.stringify(s)); return s; }
    return JSON.parse(raw);
  } catch { return seedMembers(); }
}
function writeMembers(id: string, m: Member[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(`${MEMBERS_KEY}:${id}`, JSON.stringify(m)); window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: [MEMBERS_KEY] } })); } catch { /* noop */ }
}
function seedMembers(): Member[] {
  return [
    { id: "m1", name: "Aarav Sharma", email: "aarav@stud.in", role: "student", status: "pending" },
    { id: "m2", name: "Riya Sen", email: "riya@stud.in", role: "student", status: "active" },
    { id: "m3", name: "Karan Bose", email: "karan.leader@stud.in", role: "campus_leader", status: "active" },
    { id: "m4", name: "Prof. Mitra", email: "mitra.faculty@inst.in", role: "faculty_coordinator", status: "pending" },
    { id: "m5", name: "Dev Iyer", email: "dev@stud.in", role: "student", status: "active" },
    { id: "m6", name: "Anya Roy", email: "anya@stud.in", role: "student", status: "deactivated" },
  ];
}

function MemberRoster({
  list,
  loading,
  user,
  onUpdate,
  onDelete,
  showDepartment = false
}: {
  list: Member[];
  loading: boolean;
  user: any;
  onUpdate: (id: string, patch: Partial<Member>) => void;
  onDelete?: (id: string) => void;
  showDepartment?: boolean;
}) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 text-left">Name</th>
            <th className="py-2 text-left">Email</th>
            {showDepartment && <th className="py-2 text-left">Department</th>}
            <th className="py-2 text-left">Role</th>
            <th className="py-2 text-left">Status</th>
            <th className="py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={showDepartment ? 6 : 5} className="py-8 text-center text-sm text-muted-foreground">Loading members...</td></tr>}
          {!loading && list.map(m => {
            const isSelf = m.id === user?.id;
            const isAdmin = m.role === "institutional_admin";
            const isLocked = isSelf || (isAdmin && user?.role === "institutional_admin");

            return (
              <tr key={m.id} className="border-b border-border/50">
                <td className="py-3 font-semibold">{m.name}</td>
                <td className="py-3 text-xs text-muted-foreground">{m.email}</td>
                {showDepartment && <td className="py-3 text-xs">{m.department || "N/A"}</td>}
                <td className="py-3">
                  {isLocked ? (
                    <Badge variant="secondary" className="font-medium">Institutional Admin</Badge>
                  ) : (
                    <select value={m.role} onChange={(e) => onUpdate(m.id, { role: e.target.value as Member["role"] })} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                      <option value="student">Student</option>
                      <option value="campus_leader">Campus Leader</option>
                      <option value="faculty_coordinator">Faculty Coordinator</option>
                    </select>
                  )}
                </td>
                <td className="py-3">
                  <Badge variant={m.status === "active" ? "default" : m.status === "pending" ? "outline" : "destructive"}>{m.status}</Badge>
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    {!isLocked && (
                      <>
                        {m.status === "pending" && (
                          <Button size="sm" onClick={() => onUpdate(m.id, { status: "active" })}><CheckCircle2 className="mr-1 h-3 w-3" /> Approve</Button>
                        )}
                        {m.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => onUpdate(m.id, { status: "deactivated" })}>Deactivate</Button>
                        )}
                        {m.status === "deactivated" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onUpdate(m.id, { status: "active" })}>Reactivate</Button>
                            {onDelete && (
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(m.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
          {!loading && list.length === 0 && <tr><td colSpan={showDepartment ? 6 : 5} className="py-8 text-center text-sm text-muted-foreground">No members found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function MembersView({ institutionId }: { institutionId: string }) {
  const user = useUser();
  const [remoteMembers, setRemoteMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoadingMembers(true);
    backendUsers.list({ institutionId })
      .then(({ items }) => {
        if (cancelled) return;
        setRemoteMembers(items.map(memberFromUser));
      })
      .catch((error) => {
        console.warn("Member sync failed", error);
        toast.error(error instanceof Error ? error.message : "Could not load institution members.");
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });
    return () => { cancelled = true; };
  }, [institutionId]);
  const members = remoteMembers;
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "deactivated">("all");

  const list = useMemo(() => {
    return filter === "all" ? members : members.filter(m => m.status === filter);
  }, [members, filter]);

  const update = async (id: string, patch: Partial<Member>) => {
    if (patch.status) {
      const studentStatus = patch.status === "active" ? "active" : patch.status === "pending" ? "pending_verification" : "rejected";
      try {
        const { user } = await backendUsers.updateMemberStatus(id, studentStatus);
        setRemoteMembers((current) => current.map((member) => member.id === id ? memberFromUser(user) : member));
        toast.success("Status Updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update member status.");
      }
      return;
    }

    if (patch.role) {
      try {
        const payload: any = {};
        if (patch.role === "campus_leader") {
          payload.role = "student";
          payload.role_variant = "campus_leader";
        } else if (patch.role === "faculty_coordinator") {
          payload.role = "faculty";
          payload.role_variant = "faculty_coordinator";
        } else if (patch.role === "institutional_admin") {
          payload.role = "institutional_admin";
          payload.role_variant = null;
        } else {
          payload.role = "student";
          payload.role_variant = null;
        }

        const { user } = await backendUsers.adminUpdate(id, payload);
        setRemoteMembers((current) => current.map((member) => member.id === id ? memberFromUser(user) : member));
        toast.success("Role Updated Successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update member role.");
      }
      return;
    }

    setRemoteMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to delete this member? This cannot be undone.")) return;
    try {
      await (await import("@/lib/api/endpoints")).backendAdminUsers.remove(id);
      toast.success("Member Removed");
      setRemoteMembers((current) => current.filter((m) => m.id !== id));
    } catch (error) {
      toast.error("Could not remove member");
    }
  };

  return (
    <Card className="p-5">
      <Tabs defaultValue="students">
        <div className="flex flex-wrap items-center gap-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="students" className="px-6">Students</TabsTrigger>
            <TabsTrigger value="leaders" className="px-6">Campus Leaders</TabsTrigger>
            <TabsTrigger value="faculty" className="px-6">Faculty</TabsTrigger>
          </TabsList>

          <div className="ml-auto flex gap-1.5">
            {(["all", "pending", "active", "deactivated"] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="h-8 capitalize text-[10px]">{f}</Button>
            ))}
          </div>
        </div>

        <TabsContent value="students">
          <MemberRoster
            list={list.filter(m => m.role === "student")}
            loading={loadingMembers}
            user={user}
            onUpdate={update}
          />
        </TabsContent>

        <TabsContent value="leaders">
          <MemberRoster
            list={list.filter(m => m.role === "campus_leader")}
            loading={loadingMembers}
            user={user}
            onUpdate={update}
          />
        </TabsContent>

        <TabsContent value="faculty">
          <MemberRoster
            list={list.filter(m => m.role === "faculty_coordinator")}
            loading={loadingMembers}
            user={user}
            onUpdate={update}
            onDelete={deleteMember}
            showDepartment={true}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function memberFromUser(user: ScopeUser): Member {
  const variant = user.role_variant;
  const rawRole = (user.role || "").toLowerCase();

  const role: Member["role"] =
    (rawRole.includes("admin") && rawRole.includes("institution")) || rawRole === "institutional_admin" || rawRole === "institution_admin" ? "institutional_admin" :
      variant === "campus_leader" ? "campus_leader" :
        variant === "faculty_coordinator" || rawRole === "faculty" ? "faculty_coordinator" :
          "student";

  const status: Member["status"] = user.student_status === "pending_verification" ? "pending" : user.student_status === "rejected" ? "deactivated" : "active";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    status,
    department: user.department_name || user.primary_domain || undefined,
  };
}

function AnalyticsView({ institutionId }: { institutionId: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ dau: 0, wau: 0, submitted: 0, movement: 0, topEventsCount: 0 });
  const [top, setTop] = useState<Array<{ id: string; name: string; role: string; xp: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      backendAnalytics.dau(),
      backendAnalytics.wau(),
      backendAnalytics.engagement(),
      backendUsers.list({ institutionId }),
      backendProjects.list(),
    ])
      .then(([dauData, wauData, engagementData, usersData, projectsData]) => {
        if (cancelled) return;
        const members = usersData.items;
        const institutionProjects = projectsData.items.filter((project) => project.institution_id === institutionId);
        const topPerformers = members
          .map((member) => ({
            id: member.id,
            name: member.name,
            role: member.role_variant || member.role || "student",
            xp: member.stats?.xp ?? 0,
          }))
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 5);
        setStats({
          dau: dauData.series.at(-1)?.value ?? 0,
          wau: wauData.series.at(-1)?.value ?? 0,
          submitted: institutionProjects.length,
          movement: Math.max(0, Math.round((engagementData.dau_wau_ratio || 0) * 100)),
          topEventsCount: engagementData.top_events.length,
        });
        setTop(topPerformers);
      })
      .catch((error) => {
        console.warn("Analytics hydration failed", error);
        toast.error(error instanceof Error ? error.message : "Could not hydrate analytics data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [institutionId]);

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-muted-foreground">Hydrating analytics...</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="DAU" value={stats.dau} />
        <Stat label="WAU" value={stats.wau} />
        <Stat label="Applications submitted" value={stats.submitted} />
        <Stat label="Leaderboard movement" value={`+${stats.movement}%`} accent />
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Top performers</h3>
          <Badge variant="outline" className="text-[10px]">{stats.topEventsCount} tracked events</Badge>
        </div>
        <div className="mt-3 divide-y divide-border">
          {top.map((member, i) => (
            <div key={member.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold">{i + 1}</div>
                <div>
                  <div className="text-sm font-semibold">{member.name}</div>
                  <div className="text-xs text-muted-foreground">{member.role.replaceAll("_", " ")}</div>
                </div>
              </div>
              <Badge variant="outline">{member.xp} XP</Badge>
            </div>
          ))}
          {top.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No active members yet.</p>}
        </div>
      </Card>
    </div>
  );
}
function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "border-brand/30" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-brand" : ""}`}>{value}</div>
    </Card>
  );
}

type Announcement = { id: string; title: string; body: string; channel: "broadcast" | "email" | "notice"; at: number };

function CommunicationsView({ institutionName }: { institutionName: string }) {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<Announcement["channel"]>("broadcast");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    backendNotifications.listInstitution()
      .then(({ items }) => {
        if (cancelled) return;
        setList(items.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body || "",
          channel: item.title.toLowerCase().includes("[email]") ? "email" : item.title.toLowerCase().includes("[notice]") ? "notice" : "broadcast",
          at: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        })));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not load communications.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);
  const send = async () => {
    if (!title || !body) { toast.error("Title and body required"); return; }
    try {
      const taggedTitle = `[${channel.toUpperCase()}] ${title}`;
      const { created } = await backendNotifications.sendInstitution({ channel, title: taggedTitle, body });
      setList((current) => [{ id: `temp-${Date.now()}`, title: taggedTitle, body, channel, at: Date.now() }, ...current]);
      toast.success(`Sent via ${channel} to ${created} members`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send communication.");
      return;
    }
    setTitle(""); setBody("");
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="text-sm font-bold">Compose</h3>
        <p className="mt-1 text-xs text-muted-foreground">Reaches members of {institutionName}.</p>
        <div className="mt-4 grid gap-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <div>
            <Label>Channel</Label>
            <div className="mt-1 flex gap-2">
              {(["broadcast", "email", "notice"] as const).map(c => (
                <Button key={c} size="sm" variant={channel === c ? "default" : "outline"} onClick={() => setChannel(c)} className="capitalize">{c}</Button>
              ))}
            </div>
          </div>
          <Button onClick={send} className="bg-gradient-brand text-brand-foreground"><Send className="mr-1 h-4 w-4" /> Send</Button>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold">Recent ({list.length})</h3>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {loading && <p className="py-4 text-center text-sm text-muted-foreground">Loading communications...</p>}
          {list.map(a => (
            <div key={a.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{a.title}</div>
                <Badge variant="outline" className="text-[10px] capitalize">{a.channel}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
              <div className="mt-1 text-[10px] text-muted-foreground">{new Date(a.at).toLocaleString()}</div>
            </div>
          ))}
          {list.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No announcements yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function ReportsView({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    metrics: { totalStudents: number; activeStudents: number; verifiedStudents: number; completionRate: number };
    growthTrend: Array<{ month: string; students: number }>;
    skillDistribution: Array<{ name: string; value: number }>;
    projectMetrics: { total: number; open: number; inProgress: number; completed: number };
    topPerformers: any[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import("@/lib/api/endpoints").then(({ backendReports }) => {
      backendReports.institution(institutionId)
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
    });
    return () => { cancelled = true; };
  }, [institutionId]);

  const csv = useMemo(() => {
    if (!data) return "";
    return ["name,xp", ...data.topPerformers.map((p) => `${p.name},${p.stats?.xp || 0}`)].join("\n");
  }, [data]);

  const report = useMemo(() => {
    if (!data) return "";
    return [
      "Institution Reports",
      `Institution: ${institutionName}`,
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
  }, [data, institutionName]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Advanced Reports</h3>
          <p className="text-xs text-muted-foreground">Detailed analytics and growth trends.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { downloadFile(`report_${institutionId}.pdf`, "application/pdf", report); toast.success("PDF Downloaded"); }}><Download className="mr-1 h-3 w-3" /> PDF</Button>
          <Button size="sm" variant="outline" onClick={() => { downloadFile(`report_${institutionId}.csv`, "text/csv", csv); toast.success("CSV Exported"); }}>Export CSV</Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground animate-pulse">Hydrating reports data...</p>}

      {!loading && data && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Growth</div>
              <div className="mt-1 text-xl font-bold">{data.metrics.totalStudents} students</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Active</div>
              <div className="mt-1 text-xl font-bold">{data.metrics.activeStudents}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Success Rate</div>
              <div className="mt-1 text-xl font-bold">{data.metrics.completionRate}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Projects</div>
              <div className="mt-1 text-xl font-bold">{data.projectMetrics.total}</div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h4 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Campus Growth</h4>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.growthTrend}>
                    <defs>
                      <linearGradient id="repStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D1FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.9)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", color: "#000" }}
                      itemStyle={{ color: "#00D1FF", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="students" stroke="#00D1FF" fillOpacity={1} fill="url(#repStudents)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Skill Distribution</h4>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.skillDistribution}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.skillDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.9)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", color: "#000" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="overflow-x-auto p-5">
            <h4 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Top Performers</h4>
            <table className="w-full text-xs text-left">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Domain</th>
                  <th className="pb-2 text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {data.topPerformers.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-2.5 font-semibold">{p.name}</td>
                    <td className="py-2.5 text-muted-foreground">{p.primary_domain || "General"}</td>
                    <td className="py-2.5 text-right font-mono text-brand">{p.stats?.xp || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

function FacultyAddDialog({
  institutionId,
  departmentId,
  departmentName,
  onSuccess
}: {
  institutionId: string;
  departmentId: string;
  departmentName: string;
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    salutation: "Dr" as "Dr" | "Mrs" | "Mr",
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error("Required fields missing");
      return;
    }
    setLoading(true);
    try {
      const { backendAdminUsers } = await import("@/lib/api/endpoints");
      await backendAdminUsers.create({
        ...form,
        role: "faculty",
        institution_id: institutionId,
        department_id: departmentId,
        send_invite: true,
      });
      toast.success("Faculty member added and invite sent!");
      setOpen(false);
      setForm({
        salutation: "Dr",
        firstName: "",
        middleName: "",
        lastName: "",
        phone: "",
        email: "",
      });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add faculty member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Add Faculty Member" className="h-8 w-8 text-brand">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Faculty Member - {departmentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1 space-y-2">
              <Label>Title</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.salutation}
                onChange={(e) => setForm({ ...form, salutation: e.target.value as any })}
              >
                <option value="Dr">Dr</option>
                <option value="Mrs">Mrs</option>
                <option value="Mr">Mr</option>
              </select>
            </div>
            <div className="col-span-3 space-y-2">
              <Label>First Name *</Label>
              <Input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input
                placeholder="Middle name (optional)"
                value={form.middleName}
                onChange={(e) => setForm({ ...form, middleName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              placeholder="faculty@institution.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              placeholder="+91 9876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-brand text-brand-foreground">
            {loading ? "Adding..." : "Add Faculty"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HodAssignmentDialog({
  institutionId,
  departmentId,
  departmentName,
  currentHod,
  onSuccess
}: {
  institutionId: string;
  departmentId: string;
  departmentName: string;
  currentHod?: { id: string; name: string; salutation?: string } | null;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      const { backendUsers } = await import("@/lib/api/endpoints");
      const { items } = await backendUsers.list({ institutionId, role: "faculty" });
      setFaculty(items.filter((f: any) => f.department_id === departmentId));
    } catch (error) {
      toast.error("Failed to load faculty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchFaculty();
  }, [open, departmentId]);

  const handleAssign = async (facultyId: string) => {
    try {
      const { backendDepartments } = await import("@/lib/api/endpoints");
      await backendDepartments.update(departmentId, { headOfDepartment: facultyId });
      toast.success("HOD Assigned");
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to assign HOD");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-[10px]">
          {currentHod ? "Change HOD" : "Assign HOD"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign HOD - {departmentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">Loading faculty...</p>
          ) : faculty.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">No faculty members found in this department.</p>
              <p className="text-xs text-brand italic">Tip: Add faculty members to this department first using the "Add Faculty" icon in the table.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {faculty.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-secondary/20">
                  <div>
                    <p className="font-medium text-sm">{f.salutation ? `${f.salutation}. ` : ""}{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.email}</p>
                  </div>
                  <Button size="sm" variant={currentHod?.id === f.id ? "secondary" : "default"} onClick={() => handleAssign(f.id)} disabled={currentHod?.id === f.id}>
                    {currentHod?.id === f.id ? "Current" : "Assign"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentsView({ institutionId }: { institutionId: string }) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", code: "", description: "" });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { backendDepartments } = await import("@/lib/api/endpoints");
      const data = await backendDepartments.list(institutionId);
      setDepartments(data);
    } catch (error) {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [institutionId]);

  const handleCreate = async () => {
    if (!newDept.name) return toast.error("Department name is required");
    try {
      const { backendDepartments } = await import("@/lib/api/endpoints");
      await backendDepartments.create(newDept);
      toast.success("Department created");
      setIsModalOpen(false);
      setNewDept({ name: "", code: "", description: "" });
      fetchDepartments();
    } catch (error) {
      toast.error("Failed to create department");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const { backendDepartments } = await import("@/lib/api/endpoints");
      await backendDepartments.remove(id);
      toast.success("Department deleted");
      fetchDepartments();
    } catch (error) {
      toast.error("Failed to delete department");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Departments</h3>
          <p className="text-sm text-muted-foreground">Manage academic departments and tracking student distribution.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-brand text-brand-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input
                  placeholder="e.g. Computer Science & Engineering"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Short Code</Label>
                <Input
                  placeholder="e.g. CSE"
                  value={newDept.code}
                  onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Department</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>HOD</TableHead>
              <TableHead className="text-right">Faculty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground animate-pulse">Loading departments...</TableCell></TableRow>
            ) : departments.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No departments found. Add your first one above.</TableCell></TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell><Badge variant="outline">{dept.code || "N/A"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs">
                        {dept.headOfDepartment ? (
                          `${dept.headOfDepartment.salutation ? dept.headOfDepartment.salutation + ". " : ""}${dept.headOfDepartment.name}`
                        ) : (
                          "Not Assigned"
                        )}
                      </span>
                      <HodAssignmentDialog
                        institutionId={institutionId}
                        departmentId={dept.id}
                        departmentName={dept.name}
                        currentHod={dept.headOfDepartment}
                        onSuccess={() => fetchDepartments()}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{dept.facultyCount || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <FacultyAddDialog
                        institutionId={institutionId}
                        departmentId={dept.id}
                        departmentName={dept.name}
                        onSuccess={() => fetchDepartments()}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SubmissionReviewDialog({ 
  application, 
  onClose, 
  onUpdate 
}: { 
  application: any; 
  onClose: () => void; 
  onUpdate: (appId: string, reviewStatus: string, comment: string) => void; 
}) {
  const [comment, setComment] = useState("");
  const sub = application.submission || {};

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Review Submission: {application.user_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2 text-sm">
            {sub.live_url && (
              <div><span className="font-semibold text-muted-foreground">Live URL:</span> <a href={sub.live_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{sub.live_url}</a></div>
            )}
            {sub.github_url && (
              <div><span className="font-semibold text-muted-foreground">GitHub:</span> <a href={sub.github_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{sub.github_url}</a></div>
            )}
            {sub.screenshot_url && (
              <div>
                <span className="font-semibold text-muted-foreground">Screenshot:</span>
                <a href={sub.screenshot_url} target="_blank" rel="noreferrer" className="ml-2 text-xs text-brand hover:underline">(Open full size)</a>
                <img src={sub.screenshot_url} alt="Screenshot" className="mt-2 rounded-md border border-border" />
              </div>
            )}
            {sub.notes && (
              <div className="mt-2 rounded-md bg-secondary/50 p-3 italic text-muted-foreground">"{sub.notes}"</div>
            )}
            {!sub.live_url && !sub.github_url && !sub.screenshot_url && !sub.notes && (
              <div className="text-muted-foreground italic">No specific deliverables provided.</div>
            )}
          </div>
          <div className="space-y-2 pt-4 border-t border-border/50">
            <Label>Admin Comment (Optional)</Label>
            <Textarea placeholder="Feedback for the student..." value={comment} onChange={e => setComment(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onUpdate(application.id, "needs_changes", comment)} className="text-warning border-warning/50 hover:bg-warning/10">Needs Changes</Button>
          <Button onClick={() => onUpdate(application.id, "passed", comment)} className="bg-success text-success-foreground hover:bg-success/90">Mark as Passed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectApplicationsDialog({ 
  project, 
  applications, 
  isOpen, 
  onClose,
  onRefresh
}: { 
  project: any; 
  applications: any[]; 
  isOpen: boolean; 
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [reviewApp, setReviewApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setLoading(true);
    try {
      const { backendApplications } = await import("@/lib/api/endpoints");
      await backendApplications.updateStatus(appId, newStatus as any);
      toast.success("Application status updated");
      onRefresh();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionReview = async (appId: string, reviewStatus: string, comment: string) => {
    setLoading(true);
    try {
      const { backendApplications } = await import("@/lib/api/endpoints");
      await backendApplications.reviewSubmission(appId, { submission_review_status: reviewStatus as any, admin_comment: comment });
      toast.success("Submission reviewed successfully");
      setReviewApp(null);
      onRefresh();
    } catch (error) {
      toast.error("Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Applications: {project?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {applications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No applications received yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Application Status</TableHead>
                    <TableHead>Deliverables</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map(app => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{app.user_name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{app.user_institution || "No Institution"}</div>
                        {app.message && <div className="mt-1 text-xs italic text-muted-foreground line-clamp-1">"{app.message}"</div>}
                      </TableCell>
                      <TableCell>
                        <select 
                          className="flex h-8 w-32 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          value={app.status}
                          disabled={loading}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        {app.submission_review_status === "not_submitted" ? (
                          <Badge variant="outline" className="text-muted-foreground">Awaiting Work</Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge className={
                              app.submission_review_status === "passed" ? "bg-success/10 text-success" : 
                              app.submission_review_status === "needs_changes" ? "bg-warning/10 text-warning" : 
                              "bg-brand/10 text-brand"
                            }>
                              {app.submission_review_status.replace("_", " ")}
                            </Badge>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReviewApp(app)}>Review Work</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {reviewApp && (
        <SubmissionReviewDialog 
          application={reviewApp} 
          onClose={() => setReviewApp(null)} 
          onUpdate={handleSubmissionReview} 
        />
      )}
    </>
  );
}

function AdminProjectsView({ institutionId }: { institutionId: string }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manageProject, setManageProject] = useState<any>(null);
  const [newProject, setNewProject] = useState({
    title: "",
    summary: "",
    description: "",
    domain: "",
    capacity: 10,
    status: "open",
    visibility: "institution"
  });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { backendProjects, backendApplications } = await import("@/lib/api/endpoints");
      const [{ items: projectItems }, { items: applicationItems }] = await Promise.all([
        backendProjects.list(),
        backendApplications.list().catch(() => ({ items: [] })),
      ]);
      const institutionProjects = projectItems.filter((p: any) => p.institution_id === institutionId || p.institution === institutionId);
      const projectIds = new Set(institutionProjects.map((p: any) => p.id));
      setProjects(institutionProjects);
      setApplications(applicationItems.filter((app: any) => projectIds.has(app.project_id)));
    } catch (error) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [institutionId]);

  const handleCreate = async () => {
    if (!newProject.title) return toast.error("Project title is required");
    try {
      const { backendProjects } = await import("@/lib/api/endpoints");
      await backendProjects.create(newProject);
      toast.success("Project launched successfully!");
      setIsModalOpen(false);
      setNewProject({
        title: "",
        summary: "",
        description: "",
        domain: "",
        capacity: 10,
        status: "open",
        visibility: "institution"
      });
      fetchProjects();
    } catch (error) {
      toast.error("Failed to launch project");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const { backendProjects } = await import("@/lib/api/endpoints");
      await backendProjects.remove(id);
      toast.success("Project removed");
      fetchProjects();
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Campus Projects</h3>
          <p className="text-sm text-muted-foreground">Manage exclusive opportunities for your students.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-brand text-brand-foreground shadow-brand">
              <Plus className="mr-2 h-4 w-4" /> Launch Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Launch New Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Project Title *</Label>
                <Input
                  placeholder="e.g. AI-Powered Campus Assistant"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input
                  placeholder="e.g. Engineering, AI, Design"
                  value={newProject.domain}
                  onChange={(e) => setNewProject({ ...newProject, domain: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Team Capacity</Label>
                <Input
                  type="number"
                  value={newProject.capacity}
                  onChange={(e) => setNewProject({ ...newProject, capacity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Short Summary</Label>
                <Input
                  placeholder="Visible in cards..."
                  value={newProject.summary}
                  onChange={(e) => setNewProject({ ...newProject, summary: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Detailed Description</Label>
                <Textarea
                  placeholder="Explain the problem, goals, and outcomes..."
                  className="min-h-[120px]"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-gradient-brand text-brand-foreground">Launch Now</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted/50" />
          ))
        ) : projects.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-2xl">🚀</div>
            <h4 className="mt-4 font-semibold text-foreground">No campus projects yet</h4>
            <p className="mt-1 text-sm text-muted-foreground">Launch your first exclusive opportunity to engage your students.</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>Launch First Project</Button>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="flex flex-col overflow-hidden hover-lift border-border/40 transition-all">
              <div className="h-2 bg-gradient-brand" />
              <div className="p-5">
                {(() => {
                  const projectApplications = applications.filter((app) => app.project_id === project.id);
                  return (
                    <>
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{project.domain || "General"}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(project.id)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <h4 className="mt-3 font-bold text-foreground line-clamp-1">{project.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{project.summary || project.description}</p>

                      <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Users className="mr-1.5 h-3.5 w-3.5" />
                          <span>Capacity: {project.capacity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {projectApplications.length} application{projectApplications.length === 1 ? "" : "s"}
                          </Badge>
                          <Badge className={project.status === "open" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                            {project.status === "open" ? "Live" : project.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          className="w-full bg-secondary/50 hover:bg-secondary border-border"
                          onClick={() => setManageProject(project)}
                        >
                          <Users className="mr-2 h-4 w-4" /> Manage Applications
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>
          ))
        )}
      </div>

      {manageProject && (
        <ProjectApplicationsDialog
          project={manageProject}
          applications={applications.filter(app => app.project_id === manageProject.id)}
          isOpen={!!manageProject}
          onClose={() => setManageProject(null)}
          onRefresh={fetchProjects}
        />
      )}
    </div>
  );
}

function AdminEventsView({ institutionId }: { institutionId: string }) {
  const role = useRole();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "Workshop",
    date: "",
    venue: "Main Auditorium",
    seats: 50,
    color: "brand"
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { backendEvents } = await import("@/lib/api/endpoints");
      const { items } = await backendEvents.list(institutionId);
      setEvents(items);
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [institutionId]);

  const handleCreate = async () => {
    if (!newEvent.title || !newEvent.date) return toast.error("Title and Date are required");
    try {
      const { backendEvents } = await import("@/lib/api/endpoints");
      await backendEvents.create(newEvent as any);
      toast.success("Event created successfully!");
      setIsModalOpen(false);
      setNewEvent({
        title: "",
        type: "Workshop",
        date: "",
        venue: "Main Auditorium",
        seats: 50,
        color: "brand"
      });
      fetchEvents();
    } catch (error) {
      toast.error("Failed to create event");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const { backendEvents } = await import("@/lib/api/endpoints");
      await backendEvents.remove(id);
      toast.success("Event removed");
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Campus Events</h3>
          <p className="text-sm text-muted-foreground">Schedule hackathons, workshops, and meetups.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-brand text-brand-foreground shadow-brand">
              <Plus className="mr-2 h-4 w-4" /> Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-background text-foreground border-border">
            <DialogHeader>
              <DialogTitle>Schedule New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input
                  placeholder="e.g. GenAI Workshop"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  >
                    <option>Workshop</option>
                    <option>Hackathon</option>
                    <option>Seminar</option>
                    <option>Meetup</option>
                    <option>Sprint</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Theme Color</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newEvent.color}
                    onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
                  >
                    <option value="brand">Emerald (Brand)</option>
                    <option value="cyan">Cyber Cyan</option>
                    <option value="primary">Classic Blue</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input
                  placeholder="e.g. May 15, 2:00 PM"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Input
                    value={newEvent.venue}
                    onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seats</Label>
                  <Input
                    type="number"
                    value={newEvent.seats}
                    onChange={(e) => setNewEvent({ ...newEvent, seats: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-gradient-brand text-brand-foreground">Schedule Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-40 animate-pulse bg-muted/50" />
          ))
        ) : events.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-2xl">📅</div>
            <h4 className="mt-4 font-semibold text-foreground">No campus events scheduled</h4>
            <p className="mt-1 text-sm text-muted-foreground">Start building your campus momentum by scheduling your first event.</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>Schedule First Event</Button>
          </Card>
        ) : (
          events.map((event) => {
            const isGlobal = !event.institution;
            const isScopeAdmin = role === "scope_admin" || role === "scope_super_admin" || role === "super_admin";
            const canDelete = !isGlobal || isScopeAdmin;

            return (
              <Card key={event.id} className="relative overflow-hidden hover-lift border-border/40 transition-all">
                <div className={`h-1.5 ${event.color === 'brand' ? 'bg-brand' : event.color === 'cyan' ? 'bg-cyan' : 'bg-primary'}`} />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{event.type}</Badge>
                    <div className="flex gap-1">
                      {isGlobal && <Badge variant="secondary" className="text-[9px] bg-brand/10 text-brand border-brand/20">Global Event</Badge>}
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)} className="h-6 w-6 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <h4 className="mt-3 font-bold text-foreground">{event.title}</h4>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {event.venue}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {event.date}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function ReceivedDocuments({ institutionId }: { institutionId: string }) {
  const data = useStoreValue(() => crm.all());
  const inst = data.institutions.find((i) => i.id === institutionId);
  const docs = inst?.documents || [];

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold flex items-center gap-2">
        <FileText className="h-4 w-4 text-brand" /> Documents from Scope Admin
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Brochures, proposals, and MoU drafts shared with your institution.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {docs.map((doc, i) => (
          <div key={i} className="group relative flex flex-col items-start rounded-xl border border-border bg-card/40 p-4 transition-all hover:border-brand/40 hover:bg-secondary/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-brand-foreground shadow-sm">
              {doc.kind === "brochure" ? <BookOpen className="h-5 w-5" /> : doc.kind === "mou" ? <ShieldCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="mt-3 w-full">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand">{doc.kind}</div>
              <div className="mt-1 truncate text-sm font-semibold">{doc.file_name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Received {new Date(doc.sent_at).toLocaleDateString()}</div>
            </div>
            <Button asChild size="sm" variant="ghost" className="mt-3 h-8 w-full gap-1.5 border border-border bg-background/50 hover:bg-background">
              <a href={doc.file_url} target="_blank" rel="noreferrer">
                <Download className="h-3 w-3" /> View & Download
              </a>
            </Button>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground opacity-20" />
            <p className="mt-2 text-sm text-muted-foreground italic">No documents received yet.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
