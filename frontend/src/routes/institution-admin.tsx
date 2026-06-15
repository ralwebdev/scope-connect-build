// Institutional Admin portal — mapped to a single institution.
// Demo mapping: each user email is bound to one institution_id via a localStorage
// helper. Falls back to a seeded default for demo users.
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Building2, Users, BarChart3, Megaphone, CheckCircle2, XCircle, TrendingUp, Award, Calendar, FolderKanban, Send, ImageIcon, Sparkles, ChevronRight, ShieldCheck, Download, FileText, Plus, Trash2, Edit, Layers, MapPin, UserPlus, Flame } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser } from "@/hooks/use-scope";
import { useRole } from "@/hooks/use-rbac";
import { useStoreValue } from "@/hooks/use-scope";
import { crm, type Institution } from "@/lib/crm-store";
import { backendAnalytics, backendEvents, backendNotifications, backendProjects, backendUsers, backendInstitutions } from "@/lib/api/endpoints";
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

function normalizeInstitutionName(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function useResolvedBackendInstitutionId(institution: Institution | null) {
  const user = useUser();
  const [backendInstitutionId, setBackendInstitutionId] = useState<string | null>(() => {
    if (!institution) return null;
    return user?.institution?.id && normalizeInstitutionName(user.institution.name) === normalizeInstitutionName(institution.name)
      ? user.institution.id
      : null;
  });

  useEffect(() => {
    if (!institution) {
      setBackendInstitutionId(null);
      return;
    }

    if (user?.institution?.id && normalizeInstitutionName(user.institution.name) === normalizeInstitutionName(institution.name)) {
      setBackendInstitutionId(user.institution.id);
      return;
    }

    let cancelled = false;
    setBackendInstitutionId(null);
    backendInstitutions.list()
      .then(({ items }) => {
        if (cancelled) return;
        const matchedInstitution =
          items.find((item) => item.id === institution.id) ||
          items.find((item) => normalizeInstitutionName(item.name) === normalizeInstitutionName(institution.name));
        setBackendInstitutionId(matchedInstitution?.id ?? institution.id);
      })
      .catch(() => {
        if (!cancelled) setBackendInstitutionId(institution.id);
      });

    return () => {
      cancelled = true;
    };
  }, [institution?.id, institution?.name, user?.institution?.id, user?.institution?.name]);

  return backendInstitutionId;
}

function InstitutionAdminPortal() {
  const role = useRole();
  const allowed =
    role === "institutional_admin" ||
    role === "faculty_coordinator" ||
    role === "scope_super_admin" ||
    role === "super_admin" ||
    role === "scope_admin";
  const institutions = useAccessibleInstitutions();
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  useEffect(() => {
    if (!institutions.length) return;
    if (selectedInstitutionId && institutions.some((i) => i.id === selectedInstitutionId)) return;
    setSelectedInstitutionId(institutions[0].id);
  }, [institutions, selectedInstitutionId]);
  const inst = institutions.find((i) => i.id === selectedInstitutionId) ?? institutions[0] ?? null;
  const backendInstitutionId = useResolvedBackendInstitutionId(inst);

  if (!allowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="approve_students"
          title="Institution access restricted"
          message="Only Faculty Coordinators, Institutional Admins, and higher can access this area."
          toastMessage="Approval access required."
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
          crmInstitutionId={inst.id}
          backendInstitutionId={backendInstitutionId}
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
  crmInstitutionId,
  backendInstitutionId,
  institutionName,
  institutions,
  canSwitchInstitution,
  selectedInstitutionId,
  onSelectInstitution,
}: {
  crmInstitutionId: string;
  backendInstitutionId: string | null;
  institutionName: string;
  institutions: Institution[];
  canSwitchInstitution: boolean;
  selectedInstitutionId: string;
  onSelectInstitution: (institutionId: string) => void;
}) {
  const role = useRole();
  const facultyOnly = role === "faculty_coordinator";
  const loc = useLocation();
  const tab = loc.pathname.includes("/members") ? "members"
    : loc.pathname.includes("/analytics") ? "analytics"
      : loc.pathname.includes("/communications") ? "communications"
        : loc.pathname.includes("/reports") ? "reports"
          : loc.pathname.includes("/departments") ? "departments"
            : loc.pathname.includes("/projects") ? "projects"
              : loc.pathname.includes("/events") ? "events"
                : "hub";
  const effectiveTab = facultyOnly ? "members" : tab;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2">
            <Building2 className="mr-1 h-3 w-3" /> {facultyOnly ? "Faculty Coordinator" : "Institutional Admin"}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">{institutionName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {facultyOnly
              ? "Faculty scope: student verification and member approvals."
              : canSwitchInstitution
                ? "Super admin scope: switch between institutions."
                : "Mapped scope: this institution only."}
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
        {facultyOnly ? (
          <TabLink to="/institution-admin/members" label="Members" active={effectiveTab === "members"} />
        ) : (
          <>
            <TabLink to="/institution-admin" label="Hub" active={effectiveTab === "hub"} />
            {/* <TabLink to="/institution-admin/departments" label="Departments" active={effectiveTab === "departments"} /> */}
            <TabLink to="/institution-admin/projects" label="Projects" active={effectiveTab === "projects"} />
            <TabLink to="/institution-admin/events" label="Events" active={effectiveTab === "events"} />
            <TabLink to="/institution-admin/members" label="Members" active={effectiveTab === "members"} />
            {/* <TabLink to="/institution-admin/analytics" label="Analytics" active={effectiveTab === "analytics"} /> */}
            {/* <TabLink to="/institution-admin/reports" label="Reports" active={effectiveTab === "reports"} /> */}
            {/* <TabLink to="/institution-admin/communications" label="Communications" active={effectiveTab === "communications"} /> */}
          </>
        )}
      </nav>

      {!facultyOnly && <FirstLoginBanner institutionId={crmInstitutionId} />}

      <div className="mt-6">
        {!backendInstitutionId ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Resolving institution data...
          </Card>
        ) : (
          <>
            {effectiveTab === "hub" && <HubView crmInstitutionId={crmInstitutionId} institutionId={backendInstitutionId} institutionName={institutionName} />}
            {effectiveTab === "departments" && <DepartmentsView institutionId={backendInstitutionId} />}
            {effectiveTab === "projects" && <AdminProjectsView institutionId={backendInstitutionId} institutionName={institutionName} />}
            {effectiveTab === "events" && <AdminEventsView institutionId={backendInstitutionId} />}
            {effectiveTab === "members" && <MembersView institutionId={backendInstitutionId} />}
            {effectiveTab === "analytics" && <AnalyticsView institutionId={backendInstitutionId} />}
            {effectiveTab === "reports" && <ReportsView institutionId={backendInstitutionId} institutionName={institutionName} />}
          </>
        )}
        {effectiveTab === "communications" && <CommunicationsView institutionName={institutionName} />}
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

function HubView({
  crmInstitutionId,
  institutionId,
  institutionName,
}: {
  crmInstitutionId: string;
  institutionId: string;
  institutionName: string;
}) {
  const [k, setK] = useState({ activeStudents: 0, totalFaculty: 0, profile: 0, projects: 0, rank: "-", events: 0, totalXp: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      backendUsers.list({ institutionId }),
      backendProjects.list({ institutionId }),
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
        const institutionProjects = projects.items.length;
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
    // { label: "Profile completion", v: `${k.profile}%`, icon: Award },
    // { label: "Projects participation", v: k.projects, icon: FolderKanban },
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
      {/* <QuickActionsPanel /> */}
      <ReceivedDocuments institutionId={crmInstitutionId} />
      <InstitutionProfileEditor crmInstitutionId={crmInstitutionId} backendInstitutionId={institutionId} institutionName={institutionName} />
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

type InstProfile = { logoText: string; description: string; departments: string[]; topSkills: string[] };

function InstitutionProfileEditor({
  crmInstitutionId,
  backendInstitutionId,
  institutionName,
}: {
  crmInstitutionId: string;
  backendInstitutionId: string;
  institutionName: string;
}) {
  const user = useUser();
  const cred = useStoreValue(() => crm.credential(crmInstitutionId));

  const [p, setP] = useState<InstProfile>({
    logoText: "",
    description: "",
    departments: [],
    topSkills: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(true);
  const [dept, setDept] = useState("");
  const [skill, setSkill] = useState("");

  // Load profile data from backend only; if unavailable, hide the section instead of showing mock fallbacks.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setVisible(true);

    backendInstitutions.get(backendInstitutionId)
      .then(({ institution }) => {
        if (!active) return;

        setP({
          logoText: institution.logo_text || "",
          description: institution.description || "",
          departments: institution.departments || [],
          topSkills: institution.top_skills || [],
        });
      })
      .catch((err) => {
        console.error("Failed to fetch institution profile:", err);
        if (active) setVisible(false);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [backendInstitutionId]);

  const save = async () => {
    setSaving(true);
    try {
      await backendInstitutions.update(backendInstitutionId, {
        logo_text: p.logoText,
        description: p.description,
        departments: p.departments,
        top_skills: p.topSkills,
      });

      // Tick off checklist if active
      const userEmail = user?.email || cred?.email || "";
      if (userEmail) {
        crm.markFirstLoginStep(crmInstitutionId, "profileCompletedAt", userEmail);
      }

      toast.success("Institution profile successfully saved to MongoDB database!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to persist profile updates to MongoDB.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const addDepartment = () => {
    const trimmed = dept.trim();
    if (!trimmed) return;
    if (p.departments.includes(trimmed)) {
      toast.error("Department already listed!");
      return;
    }
    setP({ ...p, departments: [...p.departments, trimmed] });
    setDept("");
  };

  const addSkill = () => {
    let trimmed = skill.trim();
    if (!trimmed) return;
    trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (p.topSkills.includes(trimmed)) {
      toast.error("Skill already listed!");
      return;
    }
    setP({ ...p, topSkills: [...p.topSkills, trimmed] });
    setSkill("");
  };

  return (
    <Card className="relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg border-border bg-card/60 backdrop-blur-sm">
      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 gap-3 backdrop-blur-xs transition-opacity duration-300">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <span className="text-xs font-semibold text-muted-foreground animate-pulse">Retrieving campus profile from MongoDB...</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
        <div>
          <h3 className="text-base font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Campus Profile Details
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure the visual identity, description, departments, and skills for your campus chapter.
          </p>
        </div>
        <Button
          size="sm"
          onClick={save}
          disabled={saving || loading}
          className="bg-gradient-brand text-brand-foreground hover:opacity-90 font-medium px-4 shadow-sm transition-all duration-300"
        >
          {saving ? (
            <>
              <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-foreground border-t-transparent" />
              Saving...
            </>
          ) : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Monogram & Description */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Campus Monogram / Logo Text</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-lg font-extrabold text-brand-foreground shadow-sm transition-all duration-300 hover:scale-105 animate-in fade-in zoom-in-95">
                {(p.logoText || institutionName || "SC").slice(0, 3).toUpperCase()}
              </div>
              <div className="flex-1">
                <Input
                  value={p.logoText}
                  onChange={(e) => setP({ ...p, logoText: e.target.value })}
                  placeholder="e.g. ABC"
                  disabled={loading || saving}
                  className="bg-background/40 hover:border-brand/40 focus:border-brand transition-all duration-200"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">Max 3 characters recommended for ideal display.</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">About our Campus Chapter</Label>
            <Textarea
              rows={4}
              value={p.description}
              onChange={(e) => setP({ ...p, description: e.target.value })}
              placeholder="Tell students about your campus hub..."
              disabled={loading || saving}
              className="bg-background/40 resize-none hover:border-brand/40 focus:border-brand transition-all duration-200"
            />
          </div>
        </div>

        {/* Right Column: Departments & Top Skills */}
        <div className="space-y-4">
          {/* Departments Tag Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Academic Departments</Label>
            <div className="flex gap-2">
              <Input
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDepartment())}
                placeholder="e.g. CSE, ECE"
                disabled={loading || saving}
                className="bg-background/40 hover:border-brand/40 focus:border-brand transition-all duration-200"
              />
              <Button
                variant="outline"
                onClick={addDepartment}
                disabled={loading || saving || !dept.trim()}
                className="hover:bg-secondary/80 shrink-0"
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {p.departments.map((d, i) => (
                <Badge
                  key={`dept-${d}-${i}`}
                  variant="secondary"
                  className="group cursor-pointer select-none rounded-md px-2 py-0.5 text-[11px] font-medium transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  onClick={() => setP({ ...p, departments: p.departments.filter((_, j) => j !== i) })}
                >
                  {d}
                  <XCircle className="ml-1 h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-destructive shrink-0" />
                </Badge>
              ))}
              {p.departments.length === 0 && (
                <span className="text-[11px] text-muted-foreground italic">No departments listed yet.</span>
              )}
            </div>
          </div>

          {/* Top Skills Tag Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Top Hot Skills on Campus</Label>
            <div className="flex gap-2">
              <Input
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="e.g. AI/ML, Figma, React"
                disabled={loading || saving}
                className="bg-background/40 hover:border-brand/40 focus:border-brand transition-all duration-200"
              />
              <Button
                variant="outline"
                onClick={addSkill}
                disabled={loading || saving || !skill.trim()}
                className="hover:bg-secondary/80 shrink-0"
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {p.topSkills.map((s, i) => (
                <Badge
                  key={`skill-${s}-${i}`}
                  className="group cursor-pointer select-none rounded-md bg-gradient-brand text-brand-foreground px-2 py-0.5 text-[11px] font-medium transition-all duration-200 hover:from-destructive hover:to-destructive/80 hover:text-destructive-foreground animate-in fade-in-50 slide-in-from-bottom-1"
                  onClick={() => setP({ ...p, topSkills: p.topSkills.filter((_, j) => j !== i) })}
                >
                  {s}
                  <XCircle className="ml-1 h-3.5 w-3.5 text-brand-foreground/75 transition-colors group-hover:text-destructive-foreground shrink-0" />
                </Badge>
              ))}
              {p.topSkills.length === 0 && (
                <span className="text-[11px] text-muted-foreground italic">No skills listed yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

type Member = {
  id: string;
  name: string;
  email: string;
  role: "student" | "campus_leader" | "faculty_coordinator" | "institutional_admin";
  status: "pending" | "active" | "deactivated";
  department?: string;
  departmentId?: string | null;
  institutionMemberId?: string;
  verificationRequestedAt?: string | null;
  phone?: string | null;
};

function MemberRoster({
  list,
  loading,
  user,
  onUpdate,
  onEdit,
  onDelete,
  showDepartment = false,
  showVerificationColumns = false,
}: {
  list: Member[];
  loading: boolean;
  user: any;
  onUpdate: (id: string, patch: Partial<Member>) => void;
  onEdit?: (member: Member) => void;
  onDelete?: (id: string) => void;
  showDepartment?: boolean;
  showVerificationColumns?: boolean;
}) {
  const facultyScoped = user?.role_variant === "faculty_coordinator" || user?.role === "faculty";
  const columnCount = 5 + (showDepartment ? 1 : 0) + (showVerificationColumns ? 2 : 0);
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 text-left">Name</th>
            <th className="py-2 text-left">Email</th>
            {showDepartment && <th className="py-2 text-left">Department</th>}
            {showVerificationColumns && <th className="py-2 text-left">Roll No</th>}
            <th className="py-2 text-left">Role</th>
            <th className="py-2 text-left">Status</th>
            {showVerificationColumns && <th className="py-2 text-left">Requested</th>}
            <th className="py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={columnCount} className="py-8 text-center text-sm text-muted-foreground">Loading members...</td></tr>}
          {!loading && list.map(m => {
            const isSelf = m.id === user?.id;
            const isAdmin = m.role === "institutional_admin";
            const isLocked = isSelf || (isAdmin && user?.role === "institutional_admin");

            return (
              <tr key={m.id} className="border-b border-border/50">
                <td className="py-3 font-semibold">{m.name}</td>
                <td className="py-3 text-xs text-muted-foreground">{m.email}</td>
                {showDepartment && <td className="py-3 text-xs">{m.department || "N/A"}</td>}
                {showVerificationColumns && <td className="py-3 text-xs">{m.institutionMemberId || "N/A"}</td>}
                <td className="py-3">
                  {isLocked || facultyScoped ? (
                    <Badge variant="secondary" className="font-medium">
                      {isLocked ? "Institutional Admin" : m.role === "faculty_coordinator" ? "Faculty Coordinator" : m.role === "campus_leader" ? "Campus Leader" : "Student"}
                    </Badge>
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
                {showVerificationColumns && (
                  <td className="py-3 text-xs text-muted-foreground">
                    {m.verificationRequestedAt ? new Date(m.verificationRequestedAt).toLocaleDateString() : "N/A"}
                  </td>
                )}
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    {!isLocked && (
                      <>
                        {onEdit && (
                          <Button size="sm" variant="outline" onClick={() => onEdit(m)}>
                            <Edit className="mr-1 h-3 w-3" /> Edit
                          </Button>
                        )}
                        {m.status === "pending" && (
                          <>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white animate-in fade-in" onClick={() => onUpdate(m.id, { status: "active" })}><CheckCircle2 className="mr-1 h-3 w-3" /> Approve</Button>
                            <Button size="sm" variant="destructive" className="animate-in fade-in" onClick={() => onUpdate(m.id, { status: "deactivated" })}><XCircle className="mr-1 h-3 w-3" /> Reject</Button>
                          </>
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
          {!loading && list.length === 0 && <tr><td colSpan={columnCount} className="py-8 text-center text-sm text-muted-foreground">No members found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function MembersView({ institutionId }: { institutionId: string }) {
  const user = useUser();
  const facultyOnly = user?.role_variant === "faculty_coordinator" || user?.role === "faculty";
  const [remoteMembers, setRemoteMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    departmentId: "",
    institutionMemberId: "",
  });
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
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { backendDepartments } = await import("@/lib/api/endpoints");
        const items = await backendDepartments.list(institutionId);
        if (!cancelled) setDepartments(items.map((item) => ({ id: item.id, name: item.name, code: item.code })));
      } catch (error) {
        if (!cancelled) setDepartments([]);
      }
    })();
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

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      departmentId: member.departmentId || "",
      institutionMemberId: member.institutionMemberId || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingMember) return;
    const normalizedName = editForm.name.trim();
    const normalizedEmail = editForm.email.trim();

    if (!normalizedName || !normalizedEmail) {
      toast.error("Name and email are required.");
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        name: normalizedName,
        email: normalizedEmail,
        phone: editForm.phone.trim() || null,
        department_id: editForm.departmentId || null,
        institution_member_id: editForm.institutionMemberId.trim() || null,
      };
      const { user: updatedUser } = await backendUsers.adminUpdate(editingMember.id, payload);
      setRemoteMembers((current) => current.map((member) => member.id === updatedUser.id ? memberFromUser(updatedUser) : member));
      setEditOpen(false);
      setEditingMember(null);
      toast.success("Student details updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update student details.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <Card className="p-5">
      <Tabs defaultValue="students">
        <div className="flex flex-wrap items-center gap-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="students" className="px-6">Students</TabsTrigger>
            {!facultyOnly && <TabsTrigger value="leaders" className="px-6">Campus Leaders</TabsTrigger>}
            {!facultyOnly && <TabsTrigger value="faculty" className="px-6">Faculty</TabsTrigger>}
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
            onEdit={openEdit}
            showDepartment={true}
            showVerificationColumns={true}
          />
        </TabsContent>

        {!facultyOnly && <TabsContent value="leaders">
          <MemberRoster
            list={list.filter(m => m.role === "campus_leader")}
            loading={loadingMembers}
            user={user}
            onUpdate={update}
          />
        </TabsContent>}

        {!facultyOnly && <TabsContent value="faculty">
          <MemberRoster
            list={list.filter(m => m.role === "faculty_coordinator")}
            loading={loadingMembers}
            user={user}
            onUpdate={update}
            onDelete={deleteMember}
            showDepartment={true}
          />
        </TabsContent>}
      </Tabs>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingMember(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Student Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((current) => ({ ...current, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((current) => ({ ...current, phone: e.target.value }))} placeholder="+91 9876543210" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <select
                value={editForm.departmentId}
                onChange={(e) => setEditForm((current) => ({ ...current, departmentId: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code ? `${department.name} (${department.code})` : department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Roll Number</Label>
              <Input value={editForm.institutionMemberId} onChange={(e) => setEditForm((current) => ({ ...current, institutionMemberId: e.target.value }))} placeholder="Institution roll number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit} className="bg-gradient-brand text-brand-foreground">
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    departmentId: user.department_id || null,
    institutionMemberId: user.institution_member_id || undefined,
    verificationRequestedAt: user.verification_requested_at || null,
    phone: user.phone || null,
  };
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

type AnalyticsSeries = Array<{ date: string; value: number }>;

function AnalyticsStat({
  label, value, sub, accent = false, loading = false,
}: { label: string; value: string | number; sub?: string; accent?: boolean; loading?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "border-brand/30 bg-gradient-to-br from-brand/5 to-transparent" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-secondary" />
      ) : (
        <div className={`mt-2 text-2xl font-bold ${accent ? "text-brand" : ""}`}>{value}</div>
      )}
      {sub && <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function SparkChart({ series, color = "#00D1FF", label }: { series: AnalyticsSeries; color?: string; label: string }) {
  if (!series.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-xs text-muted-foreground">No {label} data yet</p>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={series} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
          fill={`url(#grad-${label})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EventBreakdownBar({ events }: { events: Array<{ event: string; count: number }> }) {
  if (!events.length) return null;
  const max = Math.max(...events.map((e) => e.count), 1);
  return (
    <div className="space-y-2">
      {events.slice(0, 6).map((ev) => (
        <div key={ev.event} className="flex items-center gap-3">
          <div className="w-32 shrink-0 truncate text-xs text-muted-foreground">{ev.event.replaceAll("_", " ")}</div>
          <div className="flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-brand transition-all"
              style={{ width: `${Math.round((ev.count / max) * 100)}%` }}
            />
          </div>
          <div className="w-8 shrink-0 text-right text-xs font-semibold">{ev.count}</div>
        </div>
      ))}
    </div>
  );
}

function PerformersList({
  title,
  subtitle,
  performers,
  loading,
  emptyText,
}: {
  title: string;
  subtitle?: string;
  performers: Array<{ id: string; name: string; role: string; xp: number }>;
  loading: boolean;
  emptyText: string;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Badge variant="outline" className="text-[10px]">{performers.length} ranked</Badge>
      </div>
      <div className="divide-y divide-border">
        {loading && [1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-3 py-2.5">
            <div className="h-7 w-7 animate-pulse rounded-full bg-secondary" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-28 animate-pulse rounded bg-secondary" />
              <div className="h-2 w-16 animate-pulse rounded bg-secondary/60" />
            </div>
          </div>
        ))}
        {!loading && performers.map((m, i) => (
          <div key={m.id} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                ${i === 0 ? "bg-yellow-400/20 text-yellow-600" : i === 1 ? "bg-slate-300/20 text-slate-500" : i === 2 ? "bg-orange-400/20 text-orange-600" : "bg-secondary text-muted-foreground"}`}>
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{m.role.replaceAll("_", " ")}</div>
              </div>
            </div>
            <Badge variant="outline" className={i === 0 ? "border-yellow-400/50 text-yellow-600" : ""}>
              {m.xp.toLocaleString()} XP
            </Badge>
          </div>
        ))}
        {!loading && performers.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </Card>
  );
}

// ─── Main Analytics View ──────────────────────────────────────────────────────

function AnalyticsView({ institutionId }: { institutionId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    dau: 0, wau: 0, memberCount: 0, engagementCount: 0, activityRatePct: 0, dauWauRatio: 0,
  });
  const [dauSeries, setDauSeries] = useState<AnalyticsSeries>([]);
  const [wauSeries, setWauSeries] = useState<AnalyticsSeries>([]);
  const [topEvents, setTopEvents] = useState<Array<{ event: string; count: number }>>([]);
  const [topPerformers, setTopPerformers] = useState<Array<{ id: string; name: string; role: string; xp: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      backendAnalytics.institutionDau(institutionId),
      backendAnalytics.institutionWau(institutionId),
      backendAnalytics.institutionEngagement(institutionId),
      backendUsers.list({ institutionId }),
    ]).then(([dauRes, wauRes, engRes, usersRes]) => {
      if (cancelled) return;

      // DAU series
      if (dauRes.status === "fulfilled") {
        setDauSeries(dauRes.value.series);
      }

      // WAU series
      if (wauRes.status === "fulfilled") {
        setWauSeries(wauRes.value.series);
      }

      // Engagement
      if (engRes.status === "fulfilled") {
        const eng = engRes.value;
        setStats({
          dau: eng.dau,
          wau: eng.wau,
          memberCount: eng.member_count,
          engagementCount: eng.engagement_count ?? eng.member_count,
          activityRatePct: eng.activity_rate_pct,
          dauWauRatio: eng.dau_wau_ratio,
        });
        setTopEvents(eng.top_events);
      } else if (dauRes.status === "fulfilled") {
        // Fallback — at least show current DAU from series
        setStats((prev) => ({ ...prev, dau: dauRes.value.series.at(-1)?.value ?? 0 }));
      }

      // Top performers — exclude ALL admin roles
      if (usersRes.status === "fulfilled") {
        const performers = usersRes.value.items
          .filter((m) => {
            const r = (m.role || "").toLowerCase();
            const rv = (m.role_variant || "").toLowerCase();
            return !r.includes("admin") && !rv.includes("admin");
          })
          .map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role_variant || m.role || "student",
            xp: m.stats?.xp ?? 0,
          }))
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 10);
        setTopPerformers(performers);
      }

      setLoading(false);
    }).catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [institutionId]);

  return (
    <div className="space-y-6">
      {/* ── KPI row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsStat label="Daily Active Users" value={stats.dau} sub="students & faculty · last 24 h" accent loading={loading} />
        <AnalyticsStat label="Weekly Active Users" value={stats.wau} sub="students & faculty · last 7 days" loading={loading} />
        <AnalyticsStat label="Total Members" value={stats.memberCount} sub={`incl. admin · ${stats.engagementCount} students/faculty`} loading={loading} />
        <AnalyticsStat
          label="Activity Rate"
          value={`${stats.activityRatePct}%`}
          sub="WAU / students & faculty"
          accent
          loading={loading}
        />
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">Some data may be unavailable. Check that the backend is running.</p>
        </Card>
      )}

      {/* ── Charts row ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Daily Active Users</h3>
              <p className="text-xs text-muted-foreground">Last 30 days — campus only</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{stats.dau} today</Badge>
          </div>
          {loading ? (
            <div className="h-32 animate-pulse rounded-lg bg-secondary" />
          ) : (
            <SparkChart series={dauSeries} color="#00D1FF" label="dau" />
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Weekly Active Users</h3>
              <p className="text-xs text-muted-foreground">Last 12 weeks — campus only</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{stats.wau} this week</Badge>
          </div>
          {loading ? (
            <div className="h-32 animate-pulse rounded-lg bg-secondary" />
          ) : (
            <SparkChart series={wauSeries} color="#34D399" label="wau" />
          )}
        </Card>
      </div>

      {/* ── Top Performers: Students | Faculty (admins excluded) ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PerformersList
          title="Top Students"
          subtitle="Students & campus leaders by XP"
          performers={topPerformers.filter((m) => {
            const r = m.role.toLowerCase();
            return r === "student" || r === "campus_leader";
          })}
          loading={loading}
          emptyText="No students with activity yet."
        />
        <PerformersList
          title="Top Faculty"
          subtitle="Faculty coordinators by XP"
          performers={topPerformers.filter((m) => {
            const r = m.role.toLowerCase();
            return r === "faculty" || r === "faculty_coordinator";
          })}
          loading={loading}
          emptyText="No faculty with activity yet."
        />
      </div>

      {/* ── Activity Breakdown ── */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Activity Breakdown</h3>
          <Badge variant="outline" className="text-[10px]">{topEvents.length} event types</Badge>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-3">
                <div className="h-2 w-28 animate-pulse rounded bg-secondary" />
                <div className="h-2 flex-1 animate-pulse rounded bg-secondary/60" />
              </div>
            ))}
          </div>
        ) : (
          <EventBreakdownBar events={topEvents} />
        )}
        {!loading && topEvents.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No tracked events yet.</p>
        )}
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
    departmentDistribution?: Array<{ name: string; value: number }>;
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

          <div className="space-y-6">
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

            <div className="grid gap-6 md:grid-cols-2">
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

              <Card className="p-5">
                <h4 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Department Distribution</h4>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.departmentDistribution || []}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(data.departmentDistribution || []).map((_, index) => (
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

type FacultyFormState = {
  salutation: "Dr" | "Mrs" | "Mr";
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
};

const EMPTY_FACULTY_FORM: FacultyFormState = {
  salutation: "Dr",
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
};

function facultyNameFromForm(form: FacultyFormState) {
  return [form.firstName, form.middleName, form.lastName].map((value) => value.trim()).filter(Boolean).join(" ");
}

function FacultyManagementDialog({
  institutionId,
  departmentId,
  departmentName,
  currentHodId,
  onSuccess
}: {
  institutionId: string;
  departmentId: string;
  departmentName: string;
  currentHodId?: string | null;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [faculty, setFaculty] = useState<ScopeUser[]>([]);
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);
  const [form, setForm] = useState<FacultyFormState>(EMPTY_FACULTY_FORM);

  const resetForm = () => {
    setEditingFacultyId(null);
    setForm(EMPTY_FACULTY_FORM);
  };

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      const { backendUsers } = await import("@/lib/api/endpoints");
      const { items } = await backendUsers.list({ institutionId, role: "faculty" });
      setFaculty(
        items
          .filter((member) => member.department_id === departmentId)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (error) {
      toast.error("Failed to load faculty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchFaculty();
  }, [open, departmentId, institutionId]);

  const beginEdit = (member: ScopeUser) => {
    setEditingFacultyId(member.id);
    setForm({
      salutation: (member.salutation as FacultyFormState["salutation"]) || "Dr",
      firstName: member.firstName || "",
      middleName: member.middleName || "",
      lastName: member.lastName || "",
      phone: member.phone || "",
      email: member.email || "",
      password: "",
    });
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error("Required fields missing");
      return;
    }

    const payload = {
      name: facultyNameFromForm(form),
      salutation: form.salutation,
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || null,
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim(),
      department_id: departmentId,
      institution_id: institutionId,
    };

    setSaving(true);
    try {
      const { backendAdminUsers } = await import("@/lib/api/endpoints");
      if (editingFacultyId) {
        await backendAdminUsers.update(editingFacultyId, payload);
        toast.success("Faculty member updated");
      } else {
        await backendAdminUsers.create({
          ...payload,
          password: form.password.trim() || undefined,
          role: "faculty",
          send_invite: true,
        });
        toast.success("Faculty member added and invite sent");
      }
      resetForm();
      await fetchFaculty();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : editingFacultyId ? "Failed to update faculty member" : "Failed to add faculty member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: ScopeUser) => {
    const hodNote = currentHodId === member.id ? " This will also clear the current HOD assignment." : "";
    if (!confirm(`Delete ${member.name}?${hodNote}`)) return;
    setSaving(true);
    try {
      const { backendAdminUsers } = await import("@/lib/api/endpoints");
      await backendAdminUsers.remove(member.id);
      toast.success("Faculty member deleted");
      if (editingFacultyId === member.id) resetForm();
      await fetchFaculty();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete faculty member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Manage Faculty" className="h-8 w-8 text-brand">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Faculty - {departmentName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{faculty.length} faculty member{faculty.length === 1 ? "" : "s"}</p>
                <p className="text-xs text-muted-foreground">Review assigned faculty, update details, or remove access.</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" /> Add Faculty
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Loading faculty...</div>
              ) : faculty.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No faculty members found for this department yet.</div>
              ) : (
                faculty.map((member) => (
                  <div key={member.id} className="flex items-start justify-between rounded-md border p-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{member.salutation ? `${member.salutation}. ` : ""}{member.name}</p>
                        {currentHodId === member.id ? <Badge variant="secondary">Current HOD</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.phone || "Phone not added"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => beginEdit(member)} className="h-8 w-8 text-muted-foreground">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(member)} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-md border p-4">
            <div>
              <h4 className="text-sm font-semibold">{editingFacultyId ? "Edit faculty member" : "Add faculty member"}</h4>
              <p className="text-xs text-muted-foreground">
                {editingFacultyId ? "Update the faculty member details for this department." : "Create a faculty account and connect it to this department."}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-2">
                <Label>Title</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.salutation}
                  onChange={(e) => setForm({ ...form, salutation: e.target.value as FacultyFormState["salutation"] })}
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
                  placeholder="Middle name"
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
            {!editingFacultyId ? (
              <div className="space-y-2">
                <Label>Initial Password (Optional)</Label>
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="text-[10px] italic text-muted-foreground">If left blank, the invite flow will handle password setup.</p>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm} disabled={saving}>Clear</Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-gradient-brand text-brand-foreground">
                {saving ? (editingFacultyId ? "Saving..." : "Adding...") : (editingFacultyId ? "Save Changes" : "Add Faculty")}
              </Button>
            </div>
          </div>
        </div>
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
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: "", code: "", description: "" });

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

  const resetDepartmentForm = () => {
    setDepartmentForm({ name: "", code: "", description: "" });
    setEditingDepartmentId(null);
  };

  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) resetDepartmentForm();
  };

  const openCreateModal = () => {
    resetDepartmentForm();
    setIsModalOpen(true);
  };

  const openEditModal = (dept: any) => {
    setEditingDepartmentId(dept.id);
    setDepartmentForm({
      name: dept.name ?? "",
      code: dept.code ?? "",
      description: dept.description ?? "",
    });
    setIsModalOpen(true);
  };

  const handleSaveDepartment = async () => {
    if (!departmentForm.name.trim()) return toast.error("Department name is required");
    try {
      const { backendDepartments } = await import("@/lib/api/endpoints");
      if (editingDepartmentId) {
        await backendDepartments.update(editingDepartmentId, departmentForm);
        toast.success("Department updated");
      } else {
        await backendDepartments.create(departmentForm);
        toast.success("Department created");
      }
      setIsModalOpen(false);
      resetDepartmentForm();
      await fetchDepartments();
    } catch (error) {
      toast.error(editingDepartmentId ? "Failed to update department" : "Failed to create department");
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
        <Button className="bg-gradient-brand text-brand-foreground" onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" /> Add Department
        </Button>
        <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDepartmentId ? "Edit Department" : "Add New Department"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input
                  placeholder="e.g. Computer Science & Engineering"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Short Code</Label>
                <Input
                  placeholder="e.g. CSE"
                  value={departmentForm.code}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  value={departmentForm.description}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleModalChange(false)}>Cancel</Button>
              <Button onClick={handleSaveDepartment}>{editingDepartmentId ? "Save Changes" : "Create Department"}</Button>
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
                      <FacultyManagementDialog
                        institutionId={institutionId}
                        departmentId={dept.id}
                        departmentName={dept.name}
                        currentHodId={dept.headOfDepartment?.id || null}
                        onSuccess={() => fetchDepartments()}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(dept)}
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col overflow-hidden p-0">
        {/* ── Fixed header ── */}
        <div className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-base font-bold">
            Review Submission: {application.user_name}
          </DialogTitle>
          {application.project_title && (
            <p className="mt-0.5 text-xs text-muted-foreground">{application.project_title}</p>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">

            {/* Links row — always visible first */}
            <div className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              {sub.live_url ? (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-semibold text-muted-foreground">Live URL:</span>
                  <a href={sub.live_url} target="_blank" rel="noreferrer"
                    className="min-w-0 break-all text-brand hover:underline">
                    {sub.live_url}
                  </a>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">No live URL provided.</div>
              )}
              {sub.github_url ? (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-semibold text-muted-foreground">GitHub:</span>
                  <a href={sub.github_url} target="_blank" rel="noreferrer"
                    className="min-w-0 break-all text-brand hover:underline">
                    {sub.github_url}
                  </a>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">No GitHub URL provided.</div>
              )}
            </div>

            {/* Screenshot — capped height thumbnail */}
            {sub.screenshot_url && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Screenshot</span>
                  <a href={sub.screenshot_url} target="_blank" rel="noreferrer"
                    className="text-xs text-brand hover:underline">
                    Open full size ↗
                  </a>
                </div>
                <img
                  src={sub.screenshot_url}
                  alt="Project screenshot"
                  className="max-h-48 w-full rounded-md border border-border object-contain"
                />
              </div>
            )}

            {/* Submission notes */}
            {sub.notes && (
              <div className="rounded-md bg-secondary/50 p-3 text-sm italic text-muted-foreground">
                {sub.notes}
              </div>
            )}

            {!sub.live_url && !sub.github_url && !sub.screenshot_url && !sub.notes && (
              <div className="text-sm italic text-muted-foreground">No specific deliverables provided.</div>
            )}

            {/* Admin comment */}
            <div className="space-y-1.5 border-t border-border/50 pt-4">
              <Label>Admin Comment (Optional)</Label>
              <Textarea
                placeholder="Feedback for the student..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* ── Fixed footer — always visible ── */}
        <div className="shrink-0 border-t border-border bg-card px-6 py-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              variant="outline"
              onClick={() => onUpdate(application.id, "needs_changes", comment)}
              className="border-warning/50 text-warning hover:bg-warning/10"
            >
              Needs Changes
            </Button>
            <Button
              onClick={() => onUpdate(application.id, "passed", comment)}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              Mark as Passed
            </Button>
          </div>
        </div>
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

function AdminProjectsView({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manageProject, setManageProject] = useState<any>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [customIsTeam, setCustomIsTeam] = useState(true);
  const defaultProjectForm = () => ({
    title: "",
    summary: "",
    description: "",
    domain: "Software",
    capacity: 5,
    teams_allowed: 5,
    team_members_limit: 4,
    status: "open" as "open" | "closed" | "draft",
    visibility: "institution" as const,
    minimum_xp_required: 0,
    xp_commitment_stake: 50,
    reward_pool_xp: 0,
  });
  const [newProject, setNewProject] = useState({
    ...defaultProjectForm(),
  });

  const resetProjectForm = () => {
    setEditingProjectId(null);
    setCustomIsTeam(true);
    setNewProject(defaultProjectForm());
  };

  const openCreateModal = () => {
    resetProjectForm();
    setIsModalOpen(true);
  };

  const openEditModal = (project: any) => {
    setEditingProjectId(project.id);
    const isTeamProject = (project.team_members_limit ?? 1) > 1;
    setCustomIsTeam(isTeamProject);
    setNewProject({
      title: project.title ?? "",
      summary: project.summary ?? "",
      description: project.description ?? "",
      domain: project.domain ?? "Software",
      capacity: Number(project.capacity ?? 5) || 5,
      teams_allowed: Number(project.teams_allowed ?? 1) || 1,
      team_members_limit: Number(project.team_members_limit ?? 1) || 1,
      status: (project.status as "open" | "closed" | "draft") ?? "open",
      visibility: project.visibility ?? "institution",
      minimum_xp_required: Number(project.minimum_xp_required ?? 0) || 0,
      xp_commitment_stake: Number(project.xp_commitment_stake ?? 50) || 50,
      reward_pool_xp: Number(project.reward_pool_xp ?? 0) || 0,
    });
    setIsModalOpen(true);
  };

  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) resetProjectForm();
  };

  const backendInstitutionId = institutionId;

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { backendProjects, backendApplications } = await import("@/lib/api/endpoints");
      // Filter server-side by institution_id to avoid cross-ID-format mismatch
      const [{ items: projectItems }, { items: applicationItems }] = await Promise.all([
        backendProjects.list({ institutionId: backendInstitutionId }),
        backendApplications.list().catch(() => ({ items: [] })),
      ]);
      const projectIds = new Set(projectItems.map((p: any) => p.id));
      setProjects(projectItems);
      setApplications(applicationItems.filter((app: any) => projectIds.has(app.project_id)));
    } catch (error) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [backendInstitutionId]);

  const handleSaveProject = async () => {
    if (!newProject.title.trim()) return toast.error("Project title is required");
    if (!newProject.summary.trim()) return toast.error("Project summary is required");
    try {
      const { backendProjects } = await import("@/lib/api/endpoints");
      const payload = {
        ...newProject,
        team_members_limit: customIsTeam ? newProject.team_members_limit : 1,
        teams_allowed: customIsTeam ? newProject.teams_allowed : 1,
        institution_id: backendInstitutionId,
      };
      if (editingProjectId) {
        await backendProjects.update(editingProjectId, payload);
        toast.success("Project updated successfully!");
      } else {
        await backendProjects.create(payload);
        toast.success("Project launched successfully!");
      }
      setIsModalOpen(false);
      resetProjectForm();
      fetchProjects();
    } catch (error: any) {
      toast.error(error?.message || (editingProjectId ? "Failed to update project" : "Failed to launch project"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    // Optimistically remove the project from UI immediately
    const previous = projects;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      const { backendProjects } = await import("@/lib/api/endpoints");
      await backendProjects.remove(id);
      toast.success("Project deleted successfully");
      // Re-fetch to sync server state; strip any lingering cancelled projects
      fetchProjects();
    } catch (error: any) {
      // Revert optimistic update on failure
      setProjects(previous);
      toast.error(error?.message || "Failed to delete project");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Campus Projects</h3>
          <p className="text-sm text-muted-foreground">Manage exclusive opportunities for your students.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-brand text-brand-foreground shadow-brand">
              <Plus className="mr-2 h-4 w-4" /> Launch Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>{editingProjectId ? "Edit Project" : "Launch New Project"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProject();
              }}
              className="grid gap-4 py-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    placeholder="Project title"
                  />
                </div>
                <div>
                  <Label>Domain</Label>
                  <select
                    value={newProject.domain}
                    onChange={(e) => setNewProject({ ...newProject, domain: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Software">Software</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Research">Research</option>
                    <option value="Design">Design</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Summary *</Label>
                <Textarea
                  value={newProject.summary}
                  onChange={(e) => setNewProject({ ...newProject, summary: e.target.value })}
                  placeholder="Brief project overview"
                  rows={2}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Detailed project description"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/85 bg-secondary/5 p-3.5 shadow-sm transition-all hover:bg-secondary/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-foreground">Project Collaboration Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Choose whether students build individually (Solo) or collaborate in teams.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold transition-colors duration-200 ${!customIsTeam ? "text-foreground" : "text-muted-foreground"}`}>Individual</span>
                  <Switch
                    checked={customIsTeam}
                    onCheckedChange={setCustomIsTeam}
                  />
                  <span className={`text-xs font-semibold transition-colors duration-200 ${customIsTeam ? "text-brand" : "text-muted-foreground"}`}>Team</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className={customIsTeam ? "" : "col-span-3"}>
                  <Label>Capacity (Total number of members who can participate)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newProject.capacity}
                    onChange={(e) => setNewProject({ ...newProject, capacity: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </div>
                {customIsTeam && (
                  <>
                    <div>
                      <Label>Team Allowed (for more than one team specify the number of teams you will allow)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newProject.teams_allowed}
                        onChange={(e) => setNewProject({ ...newProject, teams_allowed: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </div>
                    <div>
                      <Label>Members (Maximum members in each team)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newProject.team_members_limit}
                        onChange={(e) => setNewProject({ ...newProject, team_members_limit: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Institution</Label>
                  <Input value={institutionName} disabled />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as "open" | "closed" | "draft" })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Entry XP (required before staking)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newProject.minimum_xp_required}
                    onChange={(e) => setNewProject({ ...newProject, minimum_xp_required: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <Label>XP Commitment Stake (Standard: 50 XP) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newProject.xp_commitment_stake}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setNewProject({
                        ...newProject,
                        xp_commitment_stake: val,
                        reward_pool_xp: Math.round(val * 1.5),
                      });
                    }}
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <Label>Reward Pool XP (Recommended: 1.5x stake, custom allowed) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newProject.reward_pool_xp}
                    onChange={(e) => setNewProject({ ...newProject, reward_pool_xp: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="e.g. 75"
                  />
                </div>
              </div>
              <Button type="submit" className="justify-self-end bg-gradient-brand text-brand-foreground">
                {editingProjectId ? "Save Changes" : "Create Project"}
              </Button>
            </form>
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
            <Button variant="outline" className="mt-4" onClick={openCreateModal}>Launch First Project</Button>
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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{project.domain || "General"}</Badge>
                          <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.1)] animate-pulse">
                            <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                            <span>{project.votes || 0} upvotes</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEditModal(project)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(project.id)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <h4 className="mt-3 font-bold text-foreground line-clamp-1">{project.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{project.summary || project.description}</p>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-secondary/30 p-2.5 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Teams Allowed</span>
                          <span className="font-semibold text-foreground">{project.teams_allowed || "No Limit"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Members / Team</span>
                          <span className="font-semibold text-foreground">{project.team_members_limit || "1"}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Users className="mr-1.5 h-3.5 w-3.5" />
                          <span>Total Capacity: {project.capacity}</span>
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

  const minDatetime = useMemo(() => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
  }, []);

  const handleCreate = async () => {
    if (!newEvent.title || !newEvent.date) return toast.error("Title and Date are required");
    const eventDate = new Date(newEvent.date);
    if (eventDate < new Date()) {
      return toast.error("Event date must be in the future.");
    }
    try {
      const { backendEvents } = await import("@/lib/api/endpoints");
      await backendEvents.create({ ...newEvent, institution: institutionId } as any);
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
    } catch (error: any) {
      if (error?.details?.issues) {
        const msg = error.details.issues.map((i: any) => `${i.path?.join(".") || "field"}: ${i.message}`).join(", ");
        toast.error(`Validation failed: ${msg}`);
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to create event");
      }
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
                  type="datetime-local"
                  min={minDatetime}
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
                  <h4 className="mt-3 font-bold text-foreground line-clamp-2 break-words" title={event.title}>{event.title}</h4>
                  <div className="mt-4 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center min-w-0" title={event.venue}>
                      <MapPin className="mr-1 h-3 w-3 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center shrink-0">
                      <Calendar className="mr-1 h-3 w-3 shrink-0" />
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
