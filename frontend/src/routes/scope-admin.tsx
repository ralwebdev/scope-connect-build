import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Calendar,
  FileText,
  Rocket,
  Trophy,
  MapPin,
  Phone,
  Mail,
  Plus,
  ChevronRight,
  CheckCircle2,
  Circle,
  Download,
  Send,
  Star,
  ArrowRight,
  Target,
  Activity,
  Trash2,
  BookOpen,
  Layers,
  Zap,
  Clock,
  Users,
  Gift,
  ShieldAlert,
  Upload,
  FileUp,
  MoreVertical,
  ExternalLink,
  BarChart2,
  TrendingUp,
  Globe2,
  ArrowUpRight,
  MessageSquare,
  Flame,
  Crown,
} from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useStoreValue, useUser } from "@/hooks/use-scope";
import { useRole } from "@/hooks/use-rbac";
import { crm, PIPELINE_STAGES, type Institution, type PipelineStage } from "@/lib/crm-store";
import {
  backendAdminUsers,
  backendEvents,
  type BackendEvent,
  backendProjects,
  type BackendProject,
  type BackendProjectRoom,
  backendApplications,
  type BackendApplication,
  backendInstitutions,
  backendDocuments,
  backendAnalytics,
  backendUsers,
  backendOpportunityApplications,
  type BackendOpportunityApplication,
  backendProposals,
  type BackendProposal,
} from "@/lib/api/endpoints";
import { toast } from "sonner";
import { PROJECT_TEMPLATES } from "@/lib/data/project-templates";
import { FeedComposer } from "@/components/site/FeedComposer";
import { opportunities, type ScopeUser } from "@/lib/scope-store";
import { normalizeSkills } from "@/lib/skill-matching";
import {
  BadgeCheck,
  Github,
  Linkedin,
  Globe,
  Search,
  SlidersHorizontal,
  Archive,
  Ban,
  Award,
  Check,
  X,
  FileSpreadsheet,
  Edit2,
} from "lucide-react";

export const Route = createFileRoute("/scope-admin")({
  head: () => ({
    meta: [{ title: "Scope Admin · Territory CRM" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "crm",
  }),
  component: ScopeAdminPortal,
});

const STAGE_COLORS: Record<PipelineStage, string> = {
  Prospect: "bg-muted text-muted-foreground",
  Contacted: "bg-blue-500/15 text-blue-600",
  "Meeting Scheduled": "bg-indigo-500/15 text-indigo-600",
  "Meeting Completed": "bg-purple-500/15 text-purple-600",
  "Proposal Sent": "bg-amber-500/15 text-amber-600",
  Negotiation: "bg-orange-500/15 text-orange-600",
  "MoU Draft Shared": "bg-cyan-500/15 text-cyan-600",
  "MoU Signed": "bg-emerald-500/15 text-emerald-700",
  "Launch Pending": "bg-pink-500/15 text-pink-600",
  "Live Chapter": "bg-gradient-brand text-brand-foreground",
  Dormant: "bg-destructive/15 text-destructive",
};

function ScopeAdminPortal() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const role = useRole();
  const user = useUser();
  const isAllowed =
    role === "scope_admin" || role === "scope_super_admin" || role === "super_admin";

  const all = useStoreValue(() => crm.all());
  useEffect(() => {
    if (!isAllowed) return;
    void crm.syncFromBackend().catch((error) => {
      console.warn("CRM sync failed", error);
      toast.error(error instanceof Error ? error.message : "Could not load CRM data.");
    });
  }, [isAllowed]);

  const myAdminId = role === "scope_admin" ? (user?.id ?? null) : null;
  const institutions = useMemo(
    () =>
      myAdminId
        ? all.institutions.filter((i) => !i.ownerId || i.ownerId === myAdminId)
        : all.institutions,
    [all.institutions, myAdminId],
  );
  const visits = useMemo(
    () =>
      myAdminId ? all.visits.filter((v) => !v.ownerId || v.ownerId === myAdminId) : all.visits,
    [all.visits, myAdminId],
  );

  const kpis = useMemo(() => {
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    const monthMs = month.getTime();
    const meetingsThisMonth = visits.filter((v) => new Date(v.date).getTime() >= monthMs).length;
    const proposals = institutions.filter((i) =>
      ["Proposal Sent", "Negotiation", "MoU Draft Shared"].includes(i.stage),
    ).length;
    const mous = institutions.filter((i) =>
      ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage),
    ).length;
    const live = institutions.filter((i) => i.stage === "Live Chapter").length;
    const potential = institutions
      .filter((i) => !["Live Chapter", "Dormant"].includes(i.stage))
      .reduce((s, i) => s + i.potentialValue, 0);
    return {
      assigned: institutions.length,
      meetings: meetingsThisMonth,
      proposals,
      mous,
      potential,
      live,
    };
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
              <Badge variant="outline" className="mb-2">
                <Building2 className="mr-1 h-3 w-3" /> Scope Admin Portal
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight">Territory Command</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Every visit can create a chapter. Turn meetings into movements.
              </p>
            </div>
            <NewLeadDialog ownerId={myAdminId ?? user?.id ?? ""} />
          </header>

          <div className="mt-6 mb-6">
            <FeedComposer />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Institutions" value={kpis.assigned} icon={Building2} />
            <KpiCard label="Meetings (mo)" value={kpis.meetings} icon={Calendar} />
            <KpiCard label="Proposals" value={kpis.proposals} icon={FileText} />
            <KpiCard label="MoUs Signed" value={kpis.mous} icon={CheckCircle2} accent />
            <KpiCard
              label="Potential ₹"
              value={`₹${(kpis.potential / 100000).toFixed(1)}L`}
              icon={Target}
            />
            <KpiCard label="Live Chapters" value={kpis.live} icon={Rocket} accent />
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => navigate({ search: { tab: v } })}
            className="mt-8"
          >
            <TabsList className="flex-wrap">
              <TabsTrigger value="crm">Territory CRM</TabsTrigger>
              <TabsTrigger value="visits">Visit Planner</TabsTrigger>
              <TabsTrigger value="proposals">Proposals & MoU</TabsTrigger>
              <TabsTrigger value="launch">Launch Tracker</TabsTrigger>
              {/* <TabsTrigger value="performance">Performance</TabsTrigger> */}
              <TabsTrigger value="events">Scope Events</TabsTrigger>
              <TabsTrigger value="projects">Scope Projects</TabsTrigger>
              <TabsTrigger value="opportunities">Scope Opportunities</TabsTrigger>
              <TabsTrigger value="ideas">Student Ideas</TabsTrigger>
              {/* <TabsTrigger value="verification"><BadgeCheck className="mr-1.5 h-3.5 w-3.5 inline" />Student Verification</TabsTrigger> */}
              {/* <TabsTrigger value="feedback">User Feedback</TabsTrigger> */}
              <TabsTrigger value="analytics">
                <BarChart2 className="mr-1.5 h-3.5 w-3.5 inline" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="crm" className="mt-6">
              <div className="space-y-4">
                <InstitutionAccountForm institutions={institutions} />
                <PipelineBoard institutions={institutions} />
              </div>
            </TabsContent>
            <TabsContent value="visits" className="mt-6">
              <VisitPlanner
                visits={visits}
                institutions={institutions}
                ownerId={myAdminId ?? user?.id ?? ""}
              />
            </TabsContent>
            <TabsContent value="proposals" className="mt-6">
              <ProposalCenter institutions={institutions} />
            </TabsContent>
            <TabsContent value="launch" className="mt-6">
              <LaunchTracker
                institutions={institutions.filter((i) =>
                  ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage),
                )}
              />
            </TabsContent>
            <TabsContent value="performance" className="mt-6">
              <PerformanceScorecard
                institutions={institutions}
                visits={visits}
                admins={all.admins}
              />
            </TabsContent>
            <TabsContent value="events" className="mt-6">
              <ScopeEventsManager />
            </TabsContent>
            <TabsContent value="projects" className="mt-6">
              <ScopeProjectsManager />
            </TabsContent>
            <TabsContent value="opportunities" className="mt-6">
              <ScopeOpportunitiesManager />
            </TabsContent>
            <TabsContent value="ideas" className="mt-6">
              <StudentIdeasManager />
            </TabsContent>
            <TabsContent value="feedback" className="mt-6">
              <FeedbackManager />
            </TabsContent>
            <TabsContent value="verification" className="mt-6">
              <StudentVerificationCenter />
            </TabsContent>
            <TabsContent value="analytics" className="mt-6">
              <ScopeAnalyticsDashboard institutions={institutions} />
            </TabsContent>
          </Tabs>
        </section>
      </RbacSidebar>
    </AppShell>
  );
}

// ─── Scope Analytics Dashboard ────────────────────────────────────────────────

type AnalyticsSeries = Array<{ date: string; value: number }>;

function MiniBar({ value, max, accent }: { value: number; max: number; accent?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full rounded-full transition-all duration-700 ${accent ? "bg-brand" : "bg-emerald-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SparkLine({ series, color = "#00D1FF" }: { series: AnalyticsSeries; color?: string }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  const W = 200,
    H = 48;
  const pts = series
    .map((s, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * W;
      const y = H - (s.value / max) * (H - 4);
      return `${x},${y}`;
    })
    .join(" ");
  if (series.length < 2)
    return (
      <div className="h-12 flex items-center justify-center text-xs text-muted-foreground">
        No data yet
      </div>
    );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={`p-4 ${accent ? "border-brand/30 bg-brand/5" : ""}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-brand" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function ScopeAnalyticsDashboard({
  institutions,
}: {
  institutions: Array<{ id: string; name: string; stage: string }>;
}) {
  const [mode, setMode] = useState<"global" | "institution">("global");
  const [selectedInstId, setSelectedInstId] = useState("");

  // ── Global data ──
  const [globalDau, setGlobalDau] = useState<AnalyticsSeries>([]);
  const [globalWau, setGlobalWau] = useState<AnalyticsSeries>([]);
  const [globalTopEvents, setGlobalTopEvents] = useState<Array<{ event: string; count: number }>>(
    [],
  );
  const [globalStats, setGlobalStats] = useState({
    dau: 0,
    wau: 0,
    memberCount: 0,
    studentFacultyCount: 0,
    activityRatePct: 0,
  });
  const [globalSummary, setGlobalSummary] = useState<{
    projects: { total: number; open: number; in_progress: number; completed: number };
    applications: number;
    growth_trend: AnalyticsSeries;
    top_institutions: Array<{ id: string; name: string; xp: number; logo: string; slug: string }>;
  } | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // ── Institution data ──
  const [instDau, setInstDau] = useState<AnalyticsSeries>([]);
  const [instWau, setInstWau] = useState<AnalyticsSeries>([]);
  const [instStats, setInstStats] = useState({
    dau: 0,
    wau: 0,
    memberCount: 0,
    engagementCount: 0,
    activityRatePct: 0,
    topEvents: [] as Array<{ event: string; count: number }>,
  });
  const [instLoading, setInstLoading] = useState(false);

  // ── Members roster data ──
  const [instMembers, setInstMembers] = useState<ScopeUser[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersFilter, setMembersFilter] = useState<"all" | "pending" | "active" | "deactivated">(
    "all",
  );
  const [membersSearch, setMembersSearch] = useState("");
  const [editingMember, setEditingMember] = useState<ScopeUser | null>(null);
  const [memberEditOpen, setMemberEditOpen] = useState(false);
  const [memberEditLoading, setMemberEditLoading] = useState(false);
  const [memberEditForm, setMemberEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    primaryDomain: "",
    specialization: "",
    institutionMemberId: "",
    xp: "0",
  });

  const liveInstitutions = useMemo(
    () =>
      institutions.filter((i) =>
        ["Live Chapter", "Launch Pending", "MoU Signed"].includes(i.stage),
      ),
    [institutions],
  );
  const selectedInstitution =
    liveInstitutions.find((institution) => institution.id === selectedInstId) ?? null;

  // Load global analytics once on mount
  useEffect(() => {
    setGlobalLoading(true);
    Promise.allSettled([
      backendAnalytics.dau(),
      backendAnalytics.wau(),
      backendAnalytics.engagement(),
      backendAnalytics.globalSummary(),
    ]).then(([dauRes, wauRes, engRes, sumRes]) => {
      if (dauRes.status === "fulfilled") setGlobalDau(dauRes.value.series);
      if (wauRes.status === "fulfilled") setGlobalWau(wauRes.value.series);
      if (engRes.status === "fulfilled") {
        const e = engRes.value;
        setGlobalTopEvents(e.top_events);
        setGlobalStats({
          dau: e.dau ?? 0,
          wau: e.wau ?? 0,
          memberCount: e.member_count ?? 0,
          studentFacultyCount: e.student_faculty_count ?? 0,
          activityRatePct: e.activity_rate_pct ?? 0,
        });
      }
      if (sumRes.status === "fulfilled") setGlobalSummary(sumRes.value);
      setGlobalLoading(false);
    });
  }, []);

  // Load institution analytics when selected
  useEffect(() => {
    if (!selectedInstId) return;
    setInstLoading(true);
    Promise.allSettled([
      backendAnalytics.institutionDau(selectedInstId),
      backendAnalytics.institutionWau(selectedInstId),
      backendAnalytics.institutionEngagement(selectedInstId),
    ]).then(([dauRes, wauRes, engRes]) => {
      if (dauRes.status === "fulfilled") setInstDau(dauRes.value.series);
      if (wauRes.status === "fulfilled") setInstWau(wauRes.value.series);
      if (engRes.status === "fulfilled") {
        const e = engRes.value;
        setInstStats({
          dau: e.dau,
          wau: e.wau,
          memberCount: e.member_count,
          engagementCount: e.engagement_count ?? e.member_count,
          activityRatePct: e.activity_rate_pct,
          topEvents: e.top_events,
        });
      }
      setInstLoading(false);
    });
  }, [selectedInstId]);

  // Fetch members roster
  const fetchMembers = async () => {
    if (!selectedInstId) return;
    setMembersLoading(true);
    try {
      const res = await backendUsers.list({ institutionId: selectedInstId });
      setInstMembers(res.items);
    } catch (error) {
      console.error("Failed to load members:", error);
      toast.error("Failed to load institution members roster.");
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInstId) {
      void fetchMembers();
    } else {
      setInstMembers([]);
    }
  }, [selectedInstId]);

  useEffect(() => {
    setEditingMember(null);
    setMemberEditOpen(false);
  }, [selectedInstId]);

  const handleUpdateStatus = async (
    userId: string,
    nextStatus: "active" | "rejected" | "pending_verification",
  ) => {
    try {
      const { user: updatedUser } = await backendUsers.adminUpdate(userId, {
        student_status: nextStatus,
      });
      setInstMembers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      toast.success(`User status updated successfully.`);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update member status.");
    }
  };

  const handleUpdateRole = async (userId: string, selectValue: string) => {
    const [role, role_variant] = selectValue.split(":");
    try {
      const { user: updatedUser } = await backendUsers.adminUpdate(userId, { role, role_variant });
      setInstMembers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      toast.success(`User role updated successfully.`);
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update member role.");
    }
  };

  const openMemberEditor = (member: ScopeUser) => {
    setEditingMember(member);
    setMemberEditForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      location: member.location || "",
      primaryDomain: member.primary_domain || member.primaryDomain || "",
      specialization: member.specialization || "",
      institutionMemberId: member.institution_member_id || "",
      xp: String(member.stats?.xp ?? 0),
    });
    setMemberEditOpen(true);
  };

  const saveMemberEdit = async () => {
    if (!editingMember) return;

    const normalizedName = memberEditForm.name.trim();
    const normalizedEmail = memberEditForm.email.trim();
    const normalizedXp = Number(memberEditForm.xp);

    if (!normalizedName || !normalizedEmail) {
      toast.error("Name and email are required.");
      return;
    }
    if (!Number.isInteger(normalizedXp) || normalizedXp < 0) {
      toast.error("XP must be a whole number greater than or equal to 0.");
      return;
    }

    setMemberEditLoading(true);
    try {
      const { user: updatedUser } = await backendUsers.adminUpdate(editingMember.id, {
        name: normalizedName,
        email: normalizedEmail,
        phone: memberEditForm.phone.trim() || null,
        location: memberEditForm.location.trim() || null,
        primary_domain: memberEditForm.primaryDomain.trim() || null,
        specialization: memberEditForm.specialization.trim() || null,
        institution_member_id: memberEditForm.institutionMemberId.trim() || null,
        xp: normalizedXp,
      });
      setInstMembers((prev) =>
        prev.map((member) => (member.id === updatedUser.id ? updatedUser : member)),
      );
      setEditingMember(updatedUser);
      setMemberEditOpen(false);
      toast.success("Member details updated.");
    } catch (error) {
      console.error("Failed to edit member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update member details.");
    } finally {
      setMemberEditLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return instMembers.filter((m) => {
      // 1. Status Filter
      let matchesFilter = true;
      if (membersFilter === "pending")
        matchesFilter = m.student_status === "pending_verification" && !m.disabled_at;
      else if (membersFilter === "active")
        matchesFilter = m.student_status === "active" && !m.disabled_at;
      else if (membersFilter === "deactivated") matchesFilter = !!m.disabled_at;

      if (!matchesFilter) return false;

      // 2. Search Filter
      if (membersSearch.trim()) {
        const query = membersSearch.toLowerCase();
        const nameMatches = m.name?.toLowerCase().includes(query) ?? false;
        const emailMatches = m.email?.toLowerCase().includes(query) ?? false;
        return nameMatches || emailMatches;
      }

      return true;
    });
  }, [instMembers, membersFilter, membersSearch]);

  const globalTopCount = globalTopEvents[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header + mode toggle ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Global overview or drill into any institution.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button
            onClick={() => setMode("global")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              mode === "global"
                ? "bg-brand text-brand-foreground"
                : "bg-background text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" /> Global Overview
          </button>
          <button
            onClick={() => setMode("institution")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              mode === "institution"
                ? "bg-brand text-brand-foreground"
                : "bg-background text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> Institution Drill-Down
          </button>
        </div>
      </div>

      {/* ══════════════════ GLOBAL MODE ══════════════════ */}
      {mode === "global" && (
        <div className="space-y-6">
          {globalLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <Activity className="mr-2 h-4 w-4 animate-spin text-brand" /> Loading platform data…
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Daily Active Users"
                  value={globalStats.dau}
                  sub="unique users · last 24 h"
                  accent
                />
                <StatCard
                  label="Weekly Active Users"
                  value={globalStats.wau}
                  sub="unique users · last 7 days"
                />
                <StatCard
                  label="Total Registered Members"
                  value={globalStats.memberCount}
                  sub={`incl. admins · ${globalStats.studentFacultyCount} students/faculty`}
                />
                <StatCard
                  label="Global Activity Rate"
                  value={`${globalStats.activityRatePct}%`}
                  sub="WAU / students &amp; faculty"
                  accent
                />
              </div>

              {/* Charts side by side */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Daily Active Users
                      </div>
                      <div className="mt-0.5 text-2xl font-bold text-foreground">
                        {globalStats.dau}
                      </div>
                    </div>
                    <TrendingUp className="h-5 w-5 text-brand" />
                  </div>
                  <div className="mt-4">
                    <SparkLine series={globalDau} color="#00D1FF" />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Last 30 days · all users platform-wide
                  </p>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Weekly Active Users
                      </div>
                      <div className="mt-0.5 text-2xl font-bold text-foreground">
                        {globalStats.wau}
                      </div>
                    </div>
                    <BarChart2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="mt-4">
                    <SparkLine series={globalWau} color="#10b981" />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Last 12 weeks · all users platform-wide
                  </p>
                </Card>
              </div>

              {/* Global Success Metrics */}
              {globalSummary && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="Total Projects"
                    value={globalSummary.projects.total}
                    sub={`${globalSummary.projects.open} open · ${globalSummary.projects.completed} completed`}
                  />
                  <StatCard
                    label="Total Applications"
                    value={globalSummary.applications}
                    sub="across all projects"
                    accent
                  />
                  <StatCard
                    label="Live Campuses"
                    value={liveInstitutions.length}
                    sub={`${institutions.length} total in pipeline`}
                  />
                  <StatCard
                    label="Active Chapters"
                    value={institutions.filter((i) => i.stage === "Live Chapter").length}
                    sub="verified chapters"
                    accent
                  />
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-3">
                {/* Growth Curve */}
                <Card className="p-5 lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">Global Builder Growth</div>
                      <p className="text-xs text-muted-foreground">
                        Cumulative registered students · last 6 months
                      </p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-brand" />
                  </div>
                  <div className="h-40 w-full">
                    {globalSummary?.growth_trend ? (
                      <div className="relative h-full w-full pt-2">
                        <div className="flex h-full items-end justify-between gap-1">
                          {globalSummary.growth_trend.map((point, i) => {
                            const max = Math.max(
                              ...globalSummary.growth_trend.map((p) => p.value),
                              1,
                            );
                            const height = (point.value / max) * 100;
                            return (
                              <div
                                key={i}
                                className="group relative flex flex-1 flex-col items-center"
                              >
                                <div
                                  className="w-full rounded-t bg-brand/20 transition-all hover:bg-brand/40"
                                  style={{ height: `${height}%` }}
                                >
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-popover px-1.5 py-0.5 text-[10px] font-bold text-popover-foreground opacity-0 shadow-sm group-hover:opacity-100 transition-opacity">
                                    {point.value}
                                  </div>
                                </div>
                                <span className="mt-2 text-[10px] font-medium text-muted-foreground">
                                  {point.date}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
                        Calculating growth curve...
                      </div>
                    )}
                  </div>
                </Card>

                {/* Top Campuses Leaderboard */}
                <Card className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-bold">National Leaderboard</div>
                    <Badge variant="outline" className="text-[10px]">
                      Top 5
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    {globalSummary?.top_institutions.map((inst, i) => (
                      <div key={inst.id} className="flex items-center gap-3">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            i === 0
                              ? "bg-yellow-500/20 text-yellow-600"
                              : i === 1
                                ? "bg-slate-300/30 text-slate-600"
                                : i === 2
                                  ? "bg-orange-400/20 text-orange-600"
                                  : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-xs font-bold text-foreground">
                            {inst.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {inst.xp.toLocaleString()} XP
                          </div>
                        </div>
                        <div className="text-lg">{inst.logo}</div>
                      </div>
                    ))}
                    {(!globalSummary || globalSummary.top_institutions.length === 0) && (
                      <div className="py-10 text-center text-xs text-muted-foreground italic">
                        No leaderboard data yet.
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Platform-wide top events */}
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">Platform Activity Breakdown</div>
                    <p className="text-xs text-muted-foreground">
                      All event types across every institution · all time
                    </p>
                  </div>
                  <Badge variant="outline">{globalTopEvents.length} event types</Badge>
                </div>
                <div className="space-y-3">
                  {globalTopEvents.length === 0 && (
                    <p className="text-sm italic text-muted-foreground">No events tracked yet.</p>
                  )}
                  {globalTopEvents.map((ev) => (
                    <div key={ev.event}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{ev.event}</span>
                        <span className="font-bold text-brand">{ev.count.toLocaleString()}</span>
                      </div>
                      <MiniBar value={ev.count} max={globalTopCount} accent />
                    </div>
                  ))}
                </div>
              </Card>

            </>
          )}
        </div>
      )}

      {/* ══════════════════ INSTITUTION DRILL-DOWN ══════════════════ */}
      {mode === "institution" && (
        <div className="space-y-6">
          {/* Institution selector */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Building2 className="h-4 w-4 shrink-0 text-brand" />
              <label className="text-sm font-semibold">Select Institution</label>
              <select
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                className="h-9 min-w-[280px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Choose a live institution —</option>
                {liveInstitutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
              {selectedInstId && (
                <Badge className="bg-brand/10 text-brand border-none">
                  {selectedInstitution?.stage}
                </Badge>
              )}
            </div>
          </Card>

          {!selectedInstId && (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 text-center">
              <Building2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Select an institution above to view its analytics.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Showing Live Chapter, Launch Pending and MoU Signed institutions.
              </p>
            </div>
          )}

          {selectedInstId && instLoading && (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <Activity className="mr-2 h-4 w-4 animate-spin text-brand" /> Loading institution
              data…
            </div>
          )}

          {selectedInstId && !instLoading && (
            <>
              {/* KPI row */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Daily Active Users"
                  value={instStats.dau}
                  sub="students &amp; faculty · last 24 h"
                  accent
                />
                <StatCard
                  label="Weekly Active Users"
                  value={instStats.wau}
                  sub="students &amp; faculty · last 7 days"
                />
                <StatCard
                  label="Total Members"
                  value={instStats.memberCount}
                  sub={`incl. admin · ${instStats.engagementCount} students/faculty`}
                />
                <StatCard
                  label="Activity Rate"
                  value={`${instStats.activityRatePct}%`}
                  sub="WAU / students &amp; faculty"
                  accent
                />
              </div>

              {/* Charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Daily Sessions
                      </div>
                      <div className="mt-0.5 text-2xl font-bold">{instDau.at(-1)?.value ?? 0}</div>
                    </div>
                    <TrendingUp className="h-5 w-5 text-brand" />
                  </div>
                  <div className="mt-4">
                    <SparkLine series={instDau} />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Last 30 days · students &amp; faculty only
                  </p>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Weekly Sessions
                      </div>
                      <div className="mt-0.5 text-2xl font-bold">{instWau.at(-1)?.value ?? 0}</div>
                    </div>
                    <BarChart2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="mt-4">
                    <SparkLine series={instWau} color="#10b981" />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Last 12 weeks · students &amp; faculty only
                  </p>
                </Card>
              </div>

              {/* Activity breakdown */}
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">Institution Activity Breakdown</div>
                    <p className="text-xs text-muted-foreground">
                      Student &amp; faculty events only · admin actions excluded
                    </p>
                  </div>
                  <Badge variant="outline">{instStats.topEvents.length} event types</Badge>
                </div>
                <div className="space-y-3">
                  {instStats.topEvents.length === 0 && (
                    <p className="text-sm italic text-muted-foreground">
                      No student/faculty events tracked yet for this institution.
                    </p>
                  )}
                  {instStats.topEvents.map((ev) => (
                    <div key={ev.event}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{ev.event}</span>
                        <span className="font-bold text-brand">{ev.count}</span>
                      </div>
                      <MiniBar value={ev.count} max={instStats.topEvents[0]?.count ?? 1} accent />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Institution Members Roster */}
              <Card className="p-5 border-brand/10 bg-card/40 mt-6 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-transparent to-emerald-500/5 pointer-events-none opacity-50" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4 mb-4 relative z-10">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Users className="h-5 w-5 text-brand" /> Campus Members Roster
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage roles, approve credentials, and verify student location or contact
                      details.
                    </p>
                  </div>

                  {/* Tabs/Filters switcher */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-secondary/30 rounded-lg border border-border/40 shrink-0">
                    {(["all", "pending", "active", "deactivated"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setMembersFilter(tab)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                          membersFilter === tab
                            ? "bg-brand text-brand-foreground shadow-md scale-[1.02]"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/20"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar & Stats */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 relative z-10">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search members by name or email..."
                      value={membersSearch}
                      onChange={(e) => setMembersSearch(e.target.value)}
                      className="w-full h-9 pl-3 pr-8 rounded-md border border-input bg-background/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand/50 transition-all"
                    />
                    {membersSearch && (
                      <button
                        onClick={() => setMembersSearch("")}
                        className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium bg-secondary/15 px-3 py-1.5 rounded-full border border-border/20">
                    Showing{" "}
                    <span className="text-foreground font-bold">{filteredMembers.length}</span> of{" "}
                    <span className="text-foreground font-bold">{instMembers.length}</span> members
                  </div>
                </div>

                {/* Table Layout */}
                <div className="w-full overflow-x-auto rounded-lg border border-border/40 bg-background/10 relative z-10">
                  {membersLoading ? (
                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                      <Activity className="mr-2 h-4 w-4 animate-spin text-brand" /> Loading campus
                      roster…
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground italic">
                      No members found matching the active criteria.
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-border/40 text-left text-xs">
                      <thead className="bg-secondary/20 uppercase tracking-wider text-muted-foreground font-semibold text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Member Info</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Phone</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3">XP</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 font-medium">
                        {filteredMembers.map((m) => {
                          const isInstAdmin =
                            m.role === "institution_admin" ||
                            m.role_variant === "institutional_admin";
                          const isDeactivated = !!m.disabled_at;
                          const currentRoleKey = `${m.role}:${m.role_variant ?? m.role}`;

                          return (
                            <tr
                              key={m.id}
                              className={`transition-colors hover:bg-secondary/10 ${
                                isDeactivated ? "opacity-60 bg-red-950/5" : ""
                              }`}
                            >
                              {/* Member Info */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-white shadow-inner uppercase shrink-0"
                                    style={{ backgroundColor: m.avatarColor || "#00D1FF" }}
                                  >
                                    {m.name ? m.name.charAt(0) : "?"}
                                  </div>
                                  <div>
                                    <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                      {m.name || "Unnamed Student"}
                                      {m.verification?.institution_verified && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20" />
                                      )}
                                    </div>
                                    <div className="text-muted-foreground text-[11px] font-normal flex items-center gap-1 mt-0.5">
                                      <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                      {m.email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Role Selector */}
                              <td className="px-4 py-3">
                                {isInstAdmin ? (
                                  <Badge className="bg-amber-500/10 text-amber-500 border-none font-bold">
                                    Institutional Admin
                                  </Badge>
                                ) : isDeactivated ? (
                                  <span className="text-muted-foreground italic font-normal capitalize">
                                    {(m.role_variant ?? m.role ?? "Student").replace(/_/g, " ")}
                                  </span>
                                ) : (
                                  <select
                                    value={currentRoleKey}
                                    onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                                    className="h-8 rounded border border-input bg-background/50 px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand/40 font-semibold cursor-pointer"
                                  >
                                    <option value="student:student">Student</option>
                                    <option value="student:campus_leader">Campus Leader</option>
                                    <option value="faculty:faculty_coordinator">
                                      Faculty Coordinator
                                    </option>
                                  </select>
                                )}
                              </td>

                              {/* Phone */}
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {m.phone ? (
                                  <span className="flex items-center gap-1 font-normal">
                                    <Phone className="h-3 w-3 text-brand" /> {m.phone}
                                  </span>
                                ) : (
                                  <span className="italic text-muted-foreground/50 font-normal">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* Location */}
                              <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">
                                {m.location ? (
                                  <span
                                    className="flex items-center gap-1 font-normal"
                                    title={m.location}
                                  >
                                    <MapPin className="h-3 w-3 text-emerald-500" /> {m.location}
                                  </span>
                                ) : (
                                  <span className="italic text-muted-foreground/50 font-normal">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* XP */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-mono text-foreground">
                                  {(m.stats?.xp ?? 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] font-normal text-muted-foreground">
                                  Level {m.stats?.level ?? 1}
                                </div>
                              </td>

                              {/* Status Badges */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                {isDeactivated ? (
                                  <Badge variant="destructive" className="font-bold">
                                    Deactivated
                                  </Badge>
                                ) : m.student_status === "pending_verification" ? (
                                  <Badge className="bg-yellow-500/10 text-yellow-600 border-none font-bold">
                                    Pending Approval
                                  </Badge>
                                ) : m.student_status === "active" ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold">
                                    Active / Verified
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/10 text-red-600 border-none font-bold">
                                    Rejected
                                  </Badge>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                {isInstAdmin ? (
                                  <span className="text-muted-foreground text-[10px] italic">
                                    Locked
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px] font-bold"
                                      onClick={() => openMemberEditor(m)}
                                    >
                                      <Edit2 className="mr-1 h-3 w-3" />
                                      Edit
                                    </Button>
                                    {/* Verification controls */}
                                    {!isDeactivated &&
                                      m.student_status === "pending_verification" && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 text-[10px] font-bold"
                                            onClick={() => handleUpdateStatus(m.id, "active")}
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 text-[10px] font-bold"
                                            onClick={() => handleUpdateStatus(m.id, "rejected")}
                                          >
                                            Reject
                                          </Button>
                                        </>
                                      )}

                                    {/* Deactivation controls */}
                                    {isDeactivated ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[10px] font-bold border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                                        onClick={() => handleUpdateStatus(m.id, "active")}
                                      >
                                        Reactivate
                                      </Button>
                                    ) : (
                                      m.student_status !== "pending_verification" && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 text-[10px] font-bold"
                                          onClick={() => handleUpdateStatus(m.id, "rejected")}
                                        >
                                          Deactivate
                                        </Button>
                                      )
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

              <Dialog open={memberEditOpen} onOpenChange={setMemberEditOpen}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Member Details</DialogTitle>
                    <DialogDescription>
                      Update student details and XP for {editingMember?.name || "this member"}
                      {selectedInstitution ? ` at ${selectedInstitution.name}.` : "."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={memberEditForm.name}
                        onChange={(event) =>
                          setMemberEditForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={memberEditForm.email}
                        onChange={(event) =>
                          setMemberEditForm((current) => ({ ...current, email: event.target.value }))
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={memberEditForm.phone}
                        onChange={(event) =>
                          setMemberEditForm((current) => ({ ...current, phone: event.target.value }))
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Institution Member ID</Label>
                      <Input
                        value={memberEditForm.institutionMemberId}
                        onChange={(event) =>
                          setMemberEditForm((current) => ({
                            ...current,
                            institutionMemberId: event.target.value,
                          }))
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={memberEditForm.location}
                        onChange={(event) =>
                          setMemberEditForm((current) => ({ ...current, location: event.target.value }))
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>XP</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={memberEditForm.xp}
                        onChange={(event) =>
                          setMemberEditForm((current) => ({ ...current, xp: event.target.value }))
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Primary Domain</Label>
                      <Input
                        value={memberEditForm.primaryDomain}
                        onChange={(event) =>
                          setMemberEditForm((current) => ({
                            ...current,
                            primaryDomain: event.target.value,
                          }))
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Specialization</Label>
                      <Input
                        value={memberEditForm.specialization}
                        onChange={(event) =>
                          setMemberEditForm((current) => ({
                            ...current,
                            specialization: event.target.value,
                          }))
                        }
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMemberEditOpen(false)}
                      disabled={memberEditLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="button" onClick={saveMemberEdit} disabled={memberEditLoading}>
                      {memberEditLoading ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scope Opportunities Manager ────────────────────────────────────────────────
function ScopeOpportunitiesManager() {
  const [items, setItems] = useState<any[]>([]);
  const [applications, setApplications] = useState<BackendOpportunityApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    by: "",
    company: "",
    category: "Design",
    requiredSkills: "",
    description: "",
    minXpRequired: "0",
  });

  const fetchOpps = async () => {
    try {
      const [allOpps, appRes] = await Promise.all([
        opportunities.syncFromBackend(),
        backendOpportunityApplications
          .list()
          .catch(() => ({ items: [] as BackendOpportunityApplication[] })),
      ]);
      setItems(allOpps.map((item: any) => ({ ...item, campus: item.company })));
      setApplications(appRes.items);
    } catch (error) {
      toast.error("Could not load opportunities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpps();
  }, []);

  const applicationsForOpportunity = (opportunityId: string) =>
    applications.filter((application) => application.opportunity_id === opportunityId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.by || !form.company || !form.description) {
      toast.error("All fields are required.");
      return;
    }
    setSaving(true);
    try {
      await opportunities.create({
        title: form.title,
        by: form.by,
        company: form.company,
        category: form.category as any,
        requiredSkills: normalizeSkills(form.requiredSkills.split(",")),
        description: form.description,
        min_xp_required: Math.max(0, Number(form.minXpRequired) || 0),
      });
      toast.success("Opportunity posted successfully!");
      setForm({
        title: "",
        by: "",
        company: "",
        category: "Design",
        requiredSkills: "",
        description: "",
        minXpRequired: "0",
      });
      await fetchOpps();
    } catch (error) {
      toast.error("Could not post opportunity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5 border-brand/10">
        <h3 className="text-sm font-bold text-foreground">Post New Opportunity</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Publish co-founder matching, internships, or builder sprints directly to student
          dashboards.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3.5">
          <div>
            <Label className="text-xs font-semibold">Opportunity Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. React Developer — Campus Marketplace"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Posted By</Label>
              <Input
                value={form.by}
                onChange={(e) => setForm({ ...form, by: e.target.value })}
                placeholder="e.g. CampusDAO"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Company Name</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. MediMatch AI"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Design">Design</option>
                <option value="Engineering">Engineering</option>
                <option value="Founder">Founder</option>
                <option value="Marketing">Marketing</option>
                <option value="Pitch">Pitch</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Required Skills</Label>
              <Input
                value={form.requiredSkills}
                onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
                placeholder="e.g. React, APIs, Tailwind CSS"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">XP Needed To Unlock</Label>
            <Input
              value={form.minXpRequired}
              onChange={(e) => setForm({ ...form, minXpRequired: e.target.value })}
              placeholder="0"
              className="mt-1"
              inputMode="numeric"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Detailed Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the role requirements, duration, equity/stipend terms..."
              rows={4}
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-brand text-brand-foreground font-semibold"
          >
            {saving ? "Publishing..." : "Publish Opportunity"}
          </Button>
        </form>
      </Card>

      <Card className="p-5 border-brand/10">
        <h3 className="text-sm font-bold text-foreground">
          Live Dashboard Opportunities ({items.length})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Real-time student interest tracking powered by MongoDB collections.
        </p>
        <div className="mt-4 space-y-3 overflow-y-auto max-h-[500px] pr-1">
          {loading && (
            <div className="flex h-32 items-center justify-center">
              <Activity className="h-6 w-6 animate-spin text-brand" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              No opportunities posted yet.
            </p>
          )}
          {!loading &&
            items.map((item) => (
              <div
                key={item.id}
                className="relative rounded-lg border border-border p-4 bg-muted/5 transition-colors hover:bg-muted/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {item.category}
                    </Badge>
                    <Badge className="bg-gradient-brand text-brand-foreground text-[10px]">
                      {item.requiredSkills?.length ?? 0} skill
                      {(item.requiredSkills?.length ?? 0) === 1 ? "" : "s"} required
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {applicationsForOpportunity(item.id).length} applicant
                      {applicationsForOpportunity(item.id).length === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Unlock: {item.minXpRequired ?? 0} XP
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {applicationsForOpportunity(item.id).length} total applicant
                    {applicationsForOpportunity(item.id).length === 1 ? "" : "s"}
                  </span>
                </div>
                <h4 className="mt-2.5 text-sm font-bold text-foreground">{item.title}</h4>
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                {!!item.requiredSkills?.length && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.requiredSkills.slice(0, 5).map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOpportunityId(item.id)}
                  >
                    View Applicants
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                  <span>
                    by <b className="text-foreground">{item.by}</b> · {item.campus}
                  </span>
                  <span>{item.id.startsWith("o_") ? "Seed Data" : "Live DB"}</span>
                </div>
              </div>
            ))}
        </div>
      </Card>

      <OpportunityApplicantsDialog
        opportunity={items.find((item) => item.id === selectedOpportunityId) ?? null}
        applications={
          selectedOpportunityId ? applicationsForOpportunity(selectedOpportunityId) : []
        }
        onClose={() => setSelectedOpportunityId(null)}
        onStatusChange={(updated) => {
          setApplications((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
        }}
      />
    </div>
  );
}

function OpportunityApplicantsDialog({
  opportunity,
  applications,
  onClose,
  onStatusChange,
}: {
  opportunity: { id: string; title: string; company?: string; campus?: string } | null;
  applications: BackendOpportunityApplication[];
  onClose: () => void;
  onStatusChange: (application: BackendOpportunityApplication) => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = async (
    applicationId: string,
    status: BackendOpportunityApplication["status"],
  ) => {
    setUpdatingId(applicationId);
    try {
      const { application } = await backendOpportunityApplications.updateStatus(applicationId, {
        status,
      });
      onStatusChange(application);
      toast.success(`Application ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update application.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Dialog
      open={Boolean(opportunity)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{opportunity?.title ?? "Applicants"}</DialogTitle>
          <DialogDescription>
            Review all applicants for{" "}
            {opportunity?.company ?? opportunity?.campus ?? "this opportunity"}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {applications.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No applications received yet.
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((application) => (
                <div key={application.id} className="rounded-lg border border-border/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground">{application.user_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {application.user_institution || "Institute not set"} ·{" "}
                        {application.user_email || "No email"}
                      </p>
                    </div>
                    <Badge variant="outline">{application.status}</Badge>
                  </div>
                  {application.fit_note && (
                    <p className="mt-3 text-sm text-muted-foreground">{application.fit_note}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {application.github_url && (
                      <a
                        href={application.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border px-2.5 py-1 hover:bg-muted"
                      >
                        GitHub
                      </a>
                    )}
                    {application.portfolio_url && (
                      <a
                        href={application.portfolio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border px-2.5 py-1 hover:bg-muted"
                      >
                        Portfolio
                      </a>
                    )}
                    {application.dribbble_url && (
                      <a
                        href={application.dribbble_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border px-2.5 py-1 hover:bg-muted"
                      >
                        Dribbble / Design Link
                      </a>
                    )}
                    {application.other_url && (
                      <a
                        href={application.other_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border px-2.5 py-1 hover:bg-muted"
                      >
                        Other Link
                      </a>
                    )}
                    {application.resume_url && (
                      <a
                        href={application.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border px-2.5 py-1 hover:bg-muted"
                      >
                        CV / Resume
                      </a>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === application.id}
                      onClick={() => updateStatus(application.id, "shortlisted")}
                    >
                      Shortlist
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === application.id}
                      onClick={() => updateStatus(application.id, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === application.id}
                      onClick={() => updateStatus(application.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Scope Events Manager ──────────────────────────────────────────────────────

function ScopeEventsManager() {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const minDatetime = useMemo(() => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
  }, []);

  const [form, setForm] = useState<Omit<BackendEvent, "id">>({
    title: "",
    type: "",
    date: "",
    venue: "",
    seats: 100,
    color: "brand",
  });

  useEffect(() => {
    let cancelled = false;
    backendEvents
      .list()
      .then(({ items }) => {
        if (!cancelled) setEvents(items);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not load events.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.type || !form.date || !form.venue || form.seats < 1) {
      toast.error("Fill all fields with valid values.");
      return;
    }
    const eventDate = new Date(form.date);
    if (eventDate < new Date()) {
      toast.error("Event date must be in the future.");
      return;
    }
    setSaving(true);
    try {
      const { event: created } = await backendEvents.create(form);
      setEvents((current) => [created, ...current]);
      setForm({ title: "", type: "", date: "", venue: "", seats: 100, color: "brand" });
      toast.success("Upcoming event added.");
    } catch (error: any) {
      if (error.details?.issues) {
        const msg = error.details.issues
          .map((i: any) => `${i.path?.join(".") || "field"}: ${i.message}`)
          .join(", ");
        toast.error(`Validation failed: ${msg}`);
      } else {
        toast.error(error instanceof Error ? error.message : "Could not create event.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    setDeletingId(id);
    try {
      await backendEvents.remove(id);
      setEvents((current) => current.filter((item) => item.id !== id));
      toast.success("Event deleted successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete event.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="text-sm font-bold">Add Upcoming Event</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Schema: title, type, date, venue, seats, color.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <div>
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              min={minDatetime}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <Label>Venue</Label>
            <Input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </div>
          <div>
            <Label>Seats</Label>
            <Input
              type="number"
              min={1}
              value={form.seats}
              onChange={(e) => setForm({ ...form, seats: Number(e.target.value) || 1 })}
            />
          </div>
          <div>
            <Label>Color</Label>
            <select
              value={form.color}
              onChange={(e) =>
                setForm({ ...form, color: e.target.value as "brand" | "cyan" | "primary" })
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="brand">brand</option>
              <option value="cyan">cyan</option>
              <option value="primary">primary</option>
            </select>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-brand text-brand-foreground"
          >
            {saving ? "Saving..." : "Add event"}
          </Button>
        </form>
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold">Upcoming Events ({events.length})</h3>
        <div className="mt-3 space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading events...</p>}
          {!loading &&
            events.map((item) => (
              <div
                key={item.id}
                className="relative rounded-lg border border-border p-3 group overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" title={item.title}>
                      {item.title}
                    </div>
                    <div
                      className="mt-1 text-xs text-muted-foreground truncate"
                      title={`${item.type} · ${item.date}`}
                    >
                      {item.type} · {item.date}
                    </div>
                    <div
                      className="text-xs text-muted-foreground truncate"
                      title={`${item.venue} · ${item.seats} seats`}
                    >
                      {item.venue} · {item.seats} seats
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant="outline">{item.color}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function ScopeProjectsManager() {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [applications, setApplications] = useState<BackendApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [rosterProject, setRosterProject] = useState<BackendProject | null>(null);
  const { institutions } = useStoreValue(() => crm.all());
  const [activeSubTab, setActiveSubTab] = useState("active");
  const [projectScopeFilter, setProjectScopeFilter] = useState<"global" | "campus" | "all">(
    "global",
  );

  const [form, setForm] = useState({
    title: "",
    summary: "",
    description: "",
    domain: "Software",
    capacity: 5,
    teams_allowed: 5,
    team_members_limit: 4,
    visibility: "public" as const,
    status: "open" as "open" | "closed" | "draft",
    institution_id: "" as string,
    minimum_xp_required: 0,
    xp_commitment_stake: 50,
    reward_pool_xp: 0,
  });

  const [templateEntryXps, setTemplateEntryXps] = useState<Record<string, number>>({});
  // Per-template XP stake override for library templates (default: 50)
  const [templateXpStakes, setTemplateXpStakes] = useState<Record<string, number>>({});
  // Per-template Reward XP override for library templates
  const [templateRewardXps, setTemplateRewardXps] = useState<Record<string, number>>({});
  // Track whether a Custom project is individual or a team project
  const [customIsTeam, setCustomIsTeam] = useState<boolean>(true);
  // Track project collaboration mode (Individual vs Team) per library template card
  const [templateIsTeam, setTemplateIsTeam] = useState<Record<string, boolean>>({});
  // Inline XP edit for active projects
  const [editingXpProjectId, setEditingXpProjectId] = useState<string | null>(null);
  const [editingEntryXpValue, setEditingEntryXpValue] = useState<string>("0");
  const [editingXpValue, setEditingXpValue] = useState<string>("50");
  const [editingRewardValue, setEditingRewardValue] = useState<string>("75");
  const [savingXp, setSavingXp] = useState(false);

  const fetchData = async () => {
    try {
      const [pRes, aRes] = await Promise.all([backendProjects.list(), backendApplications.list()]);
      setProjects(pRes.items);
      setApplications(aRes.items);
    } catch (error) {
      toast.error("Could not load project data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.summary) {
      toast.error("Title and summary are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        institution_id: form.institution_id || null,
        team_members_limit: customIsTeam ? form.team_members_limit : 1,
        teams_allowed: customIsTeam ? form.teams_allowed : form.capacity,
      };
      const { project: created } = await backendProjects.create(payload);
      setProjects((current) => [created, ...current]);
      setForm({
        title: "",
        summary: "",
        description: "",
        domain: "Software",
        capacity: 5,
        teams_allowed: 5,
        team_members_limit: 4,
        visibility: "public",
        status: "open",
        institution_id: "",
        minimum_xp_required: 0,
        xp_commitment_stake: 50,
        reward_pool_xp: 0,
      });
      setCustomIsTeam(true);
      setActiveSubTab("active");
      toast.success("Project added successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  };

  // Save XP settings inline edit for an active project
  const saveXpStake = async (projectId: string) => {
    const entry = Math.max(0, Number(editingEntryXpValue) || 0);
    const stake = Math.max(0, Number(editingXpValue) || 0);
    const reward = Math.max(0, Number(editingRewardValue) || 0);
    setSavingXp(true);
    try {
      const { project: updated } = await backendProjects.update(projectId, {
        minimum_xp_required: entry,
        xp_commitment_stake: stake,
        reward_pool_xp: reward,
      } as any);
      setProjects((current) =>
        current.map((p) =>
          p.id === projectId
            ? {
                ...p,
                minimum_xp_required: updated.minimum_xp_required ?? entry,
                xp_commitment_stake: updated.xp_commitment_stake ?? stake,
                reward_pool_xp: updated.reward_pool_xp ?? reward,
              }
            : p,
        ),
      );
      toast.success(`XP settings updated: ${entry} Entry / ${stake} Stake / ${reward} Reward.`);
      setEditingXpProjectId(null);
    } catch (error) {
      toast.error("Could not update XP settings.");
    } finally {
      setSavingXp(false);
    }
  };

  const activateTemplate = async (template: (typeof PROJECT_TEMPLATES)[0]) => {
    const entry = Math.max(0, templateEntryXps[template.title] ?? 0);
    const stake = Math.max(0, templateXpStakes[template.title] ?? 50);
    const reward = Math.max(0, templateRewardXps[template.title] ?? Math.round(stake * 1.5));
    const isTeam = templateIsTeam[template.title] ?? true;
    setSaving(true);
    try {
      const payload = {
        title: template.title,
        domain: template.domain,
        summary: `Level: ${template.level} | Duration: ${template.duration}`,
        description: `Team: ${isTeam ? template.team_structure : "Individual"}\nDeliverables: ${template.deliverables}\nReporting: ${template.reporting}\nRewards: ${template.rewards}`,
        capacity: 10,
        team_members_limit: isTeam ? 4 : 1,
        teams_allowed: isTeam ? 5 : 10,
        visibility: "public" as const,
        status: "open" as const,
        minimum_xp_required: entry,
        xp_commitment_stake: stake,
        reward_pool_xp: reward,
        meta: {
          level: template.level,
          duration: template.duration,
          team_structure: isTeam ? template.team_structure : "Individual",
          deliverables: template.deliverables,
          reporting: template.reporting,
          rewards: template.rewards,
        },
      };
      const { project: created } = await backendProjects.create(payload);
      setProjects((current) => [created, ...current]);
      setActiveSubTab("active");
      toast.success(`"${template.title}" activated with ${entry} Entry XP and ${stake} Stake XP!`);
    } catch (error) {
      toast.error("Could not activate template.");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateToggle = async (template: (typeof PROJECT_TEMPLATES)[0], checked: boolean) => {
    if (checked) {
      await activateTemplate(template);
    } else {
      const activeProj = projects.find((p) => p.title === template.title && p.status !== "cancelled");
      if (activeProj) {
        if (confirm(`Deactivate "${template.title}"? This will cancel the project.`)) {
          try {
            setSaving(true);
            await backendProjects.remove(activeProj.id);
            setProjects((current) =>
              current.map((p) => (p.id === activeProj.id ? { ...p, status: "cancelled" } : p)),
            );
            toast.success(`"${template.title}" deactivated.`);
          } catch (error) {
            toast.error("Could not deactivate project.");
          } finally {
            setSaving(false);
          }
        }
      }
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Cancel this project?")) return;
    try {
      await backendProjects.remove(id);
      setProjects((current) =>
        current.map((p) => (p.id === id ? { ...p, status: "cancelled" } : p)),
      );
      toast.success("Project cancelled.");
    } catch (error) {
      toast.error("Failed to cancel project.");
    }
  };

  const updateApplicationStatus = async (
    applicationId: string,
    status: BackendApplication["status"],
  ) => {
    setUpdatingApplicationId(applicationId);
    try {
      const { application: updated } = await backendApplications.updateStatus(
        applicationId,
        status,
      );
      setApplications((current) =>
        current.map((app) => (app.id === applicationId ? updated : app)),
      );
      toast.success(`Application ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update application.");
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const updateSubmissionReviewStatus = async (
    applicationId: string,
    submissionReviewStatus: "submitted" | "passed" | "needs_changes",
  ) => {
    setUpdatingApplicationId(applicationId);
    try {
      const { application: updated } = await backendApplications.reviewSubmission(applicationId, {
        submission_review_status: submissionReviewStatus,
      });
      setApplications((current) =>
        current.map((app) => (app.id === applicationId ? updated : app)),
      );
      toast.success(`Submission marked as ${submissionReviewStatus.replace("_", " ")}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update submission review.");
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const projectsWithStats = useMemo(() => {
    return projects.map((p) => {
      const projectApps = applications.filter((a) => a.project_id === p.id);
      const participatingInstitutes = new Set(
        projectApps.map((a) => a.user_institution).filter(Boolean),
      );
      return {
        ...p,
        participantCount: projectApps.filter((a) => a.status === "accepted").length,
        applicantCount: projectApps.length,
        institutes: Array.from(participatingInstitutes),
      };
    });
  }, [projects, applications]);

  const filteredActiveProjects = useMemo(() => {
    return projectsWithStats.filter((p) => {
      if (projectScopeFilter === "global") return !p.institution_id;
      if (projectScopeFilter === "campus") return !!p.institution_id;
      return true;
    });
  }, [projectsWithStats, projectScopeFilter]);

  // Sync System: Poll for new applications every 15s to keep stats live
  useEffect(() => {
    const interval = setInterval(() => {
      backendApplications
        .list()
        .then((res) => {
          setApplications((prev) => {
            if (res.items.length > prev.length) {
              const newCount = res.items.length - prev.length;
              toast.info(`${newCount} new project application(s) received!`, {
                icon: <Zap className="h-4 w-4 text-brand" />,
                description: "The dashboard has been updated with the latest participation data.",
              });
            }
            return res.items;
          });
        })
        .catch(console.warn);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Scope Projects</h2>
            <p className="text-muted-foreground">
              Manage global project templates and monitor student participation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                <Rocket className="h-4 w-4" /> Active
              </TabsTrigger>
              <TabsTrigger value="library" className="gap-2">
                <BookOpen className="h-4 w-4" /> Library
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2">
                <Plus className="h-4 w-4" /> Custom
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="active" className="m-0">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {loading && (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="h-8 w-8 animate-spin text-brand" />
                    <p className="text-sm text-muted-foreground">Syncing live projects...</p>
                  </div>
                </div>
              )}

              {!loading && projectsWithStats.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
                  <Layers className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No active projects in the system.</p>
                  <Button variant="link" size="sm" onClick={() => setActiveSubTab("library")}>
                    Browse the Project Library
                  </Button>
                </div>
              )}

              {!loading && projectsWithStats.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-brand/10 bg-secondary/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Filter by Ownership
                  </span>
                  <div className="flex flex-wrap gap-1 rounded-lg bg-background p-1 border border-border">
                    <button
                      onClick={() => setProjectScopeFilter("global")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                        projectScopeFilter === "global"
                          ? "bg-brand text-brand-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      Global / Scope ({projectsWithStats.filter((p) => !p.institution_id).length})
                    </button>
                    <button
                      onClick={() => setProjectScopeFilter("campus")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                        projectScopeFilter === "campus"
                          ? "bg-brand text-brand-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      Campus Specific ({projectsWithStats.filter((p) => !!p.institution_id).length})
                    </button>
                    <button
                      onClick={() => setProjectScopeFilter("all")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                        projectScopeFilter === "all"
                          ? "bg-brand text-brand-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      All ({projectsWithStats.length})
                    </button>
                  </div>
                </div>
              )}

              {!loading && projectsWithStats.length > 0 && filteredActiveProjects.length === 0 && (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center">
                  <Layers className="mb-2 h-6 w-6 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No projects found in this category.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setProjectScopeFilter("all")}
                    className="mt-1"
                  >
                    Show all active projects
                  </Button>
                </div>
              )}

              {!loading &&
                filteredActiveProjects.map((item) => (
                  <Card
                    key={item.id}
                    className="group relative overflow-hidden border-brand/10 p-0 transition-all hover:border-brand/40 hover:shadow-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-foreground">{item.title}</h4>
                            {item.institution_id ? (
                              <Badge variant="secondary" className="bg-secondary/50 text-[10px]">
                                Campus Specific
                              </Badge>
                            ) : (
                              <Badge className="bg-brand/10 text-brand text-[10px]">Global</Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-brand" /> {item.domain}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {item.capacity} slots
                            </span>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                              {editingXpProjectId === item.id ? (
                                <div className="flex flex-wrap items-center gap-2 bg-background border border-brand/20 rounded px-2 py-1">
                                  <div className="flex items-center gap-1 border-r border-border pr-2">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                      Entry:
                                    </span>
                                    <input
                                      type="number"
                                      value={editingEntryXpValue}
                                      onChange={(e) => setEditingEntryXpValue(e.target.value)}
                                      className="w-10 h-5 bg-transparent border-none text-[11px] font-bold text-foreground focus:outline-none p-0"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 border-r border-border pr-2">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                      Stake:
                                    </span>
                                    <input
                                      type="number"
                                      value={editingXpValue}
                                      onChange={(e) => setEditingXpValue(e.target.value)}
                                      className="w-10 h-5 bg-transparent border-none text-[11px] font-bold text-foreground focus:outline-none p-0"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 pr-1">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                      Reward:
                                    </span>
                                    <input
                                      type="number"
                                      value={editingRewardValue}
                                      onChange={(e) => setEditingRewardValue(e.target.value)}
                                      className="w-10 h-5 bg-transparent border-none text-[11px] font-bold text-foreground focus:outline-none p-0"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 border-l border-border pl-2">
                                    <button
                                      onClick={() => saveXpStake(item.id)}
                                      disabled={savingXp}
                                      className="text-emerald-500 hover:text-emerald-600 font-bold text-[10px] uppercase tracking-wider px-0.5"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingXpProjectId(null)}
                                      className="text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider px-0.5"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Badge
                                    variant="outline"
                                    className="bg-secondary/50 border-border text-muted-foreground text-[10px] font-bold py-0"
                                  >
                                    {item.minimum_xp_required ?? 0} XP Entry
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="bg-brand/10 border-brand/20 text-brand text-[10px] font-bold py-0"
                                  >
                                    {item.xp_commitment_stake ?? 50} XP Stake
                                  </Badge>
                                  {item.reward_pool_xp ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-500/10 border-amber-500/20 text-amber-600 text-[10px] font-bold py-0"
                                    >
                                      +{item.reward_pool_xp} XP Reward
                                    </Badge>
                                  ) : null}
                                  <button
                                    onClick={() => {
                                      setEditingXpProjectId(item.id);
                                      setEditingEntryXpValue(String(item.minimum_xp_required ?? 0));
                                      setEditingXpValue(String(item.xp_commitment_stake ?? 50));
                                      setEditingRewardValue(String(item.reward_pool_xp ?? 75));
                                    }}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                                    title="Edit XP Settings"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={item.status === "cancelled" ? "destructive" : "outline"}
                            className="capitalize"
                          >
                            {item.status}
                          </Badge>
                          {item.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-destructive/20 hover:border-destructive hover:bg-destructive/5 text-destructive gap-1.5 transition-all text-[11px] font-semibold"
                              onClick={() => remove(item.id)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                        {item.summary}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-secondary/20 p-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                            Teams Allowed
                          </span>
                          <span className="font-semibold text-foreground">
                            {item.teams_allowed || "No Limit"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                            Members / Team
                          </span>
                          <span className="font-semibold text-foreground">
                            {item.team_members_limit || "1"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-6 border-t border-border pt-6">
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Participation Rate
                          </div>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-foreground">
                              {item.participantCount}
                            </span>
                            <span className="mb-1 text-xs text-muted-foreground">
                              / {item.capacity} students
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-brand transition-all duration-1000"
                              style={{
                                width: `${Math.min((item.participantCount / item.capacity) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Total Interest
                          </div>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-foreground">
                              {item.applicantCount}
                            </span>
                            <span className="mb-1 text-xs text-muted-foreground">
                              / {item.capacity} students
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Project Demand
                          </div>
                          <div className="flex items-end gap-1.5">
                            <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded-full border border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.15)] animate-pulse">
                              <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                              <span className="text-base font-bold leading-none">
                                {item.votes || 0}
                              </span>
                            </div>
                            <span className="mb-0.5 text-xs text-muted-foreground">upvotes</span>
                          </div>
                        </div>
                      </div>

                      {item.institutes.length > 0 && (
                        <div className="mt-6">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            Partnering Institutes
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.institutes.map((inst, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-background/50 border-brand/20 py-1 text-[10px]"
                              >
                                {inst}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-6 rounded-xl bg-secondary/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Recent Applicants
                          </h5>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-[10px] text-brand hover:text-brand/80"
                            onClick={() => setRosterProject(item)}
                          >
                            View Full Roster (
                            {applications.filter((a) => a.project_id === item.id).length})
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {applications
                            .filter((a) => a.project_id === item.id)
                            .slice(0, 3)
                            .map((app) => (
                              <div
                                key={app.id}
                                className="rounded-lg border border-border/50 bg-background/60 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-brand uppercase">
                                      {app.user_name?.[0] || "S"}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold">{app.user_name}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {app.user_institution}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="h-5 border-brand/30 px-1.5 text-[9px] capitalize"
                                    >
                                      {app.status}
                                    </Badge>
                                    {app.submission_review_status &&
                                      app.submission_review_status !== "not_submitted" && (
                                        <Badge
                                          variant="outline"
                                          className="h-5 px-1.5 text-[9px] capitalize"
                                        >
                                          {app.submission_review_status.replace("_", " ")}
                                        </Badge>
                                      )}
                                  </div>
                                </div>

                                {app.submission && (
                                  <div className="mt-3 space-y-2 rounded-md bg-secondary/40 p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                      Submission Review
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        asChild={Boolean(app.submission.live_url)}
                                        size="sm"
                                        variant="outline"
                                        className={`h-7 px-2 text-[10px] ${app.submission.live_url ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10" : "opacity-50 cursor-not-allowed bg-muted"}`}
                                        disabled={!app.submission.live_url}
                                      >
                                        {app.submission.live_url ? (
                                          <a
                                            href={app.submission.live_url}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            Live URL{" "}
                                            <span className="ml-1 text-[9px] text-emerald-500 font-bold">
                                              ✓
                                            </span>
                                          </a>
                                        ) : (
                                          <span>
                                            Live URL{" "}
                                            <span className="ml-1 text-[9px] text-muted-foreground font-bold">
                                              ✗
                                            </span>
                                          </span>
                                        )}
                                      </Button>
                                      <Button
                                        asChild={Boolean(app.submission.github_url)}
                                        size="sm"
                                        variant="outline"
                                        className={`h-7 px-2 text-[10px] ${app.submission.github_url ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10" : "opacity-50 cursor-not-allowed bg-muted"}`}
                                        disabled={!app.submission.github_url}
                                      >
                                        {app.submission.github_url ? (
                                          <a
                                            href={app.submission.github_url}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            GitHub{" "}
                                            <span className="ml-1 text-[9px] text-emerald-500 font-bold">
                                              ✓
                                            </span>
                                          </a>
                                        ) : (
                                          <span>
                                            GitHub{" "}
                                            <span className="ml-1 text-[9px] text-muted-foreground font-bold">
                                              ✗
                                            </span>
                                          </span>
                                        )}
                                      </Button>
                                      <Button
                                        asChild={Boolean(app.submission.screenshot_url)}
                                        size="sm"
                                        variant="outline"
                                        className={`h-7 px-2 text-[10px] ${app.submission.screenshot_url ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10" : "opacity-50 cursor-not-allowed bg-muted"}`}
                                        disabled={!app.submission.screenshot_url}
                                      >
                                        {app.submission.screenshot_url ? (
                                          <a
                                            href={app.submission.screenshot_url}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            Screenshot{" "}
                                            <span className="ml-1 text-[9px] text-emerald-500 font-bold">
                                              ✓
                                            </span>
                                          </a>
                                        ) : (
                                          <span>
                                            Screenshot{" "}
                                            <span className="ml-1 text-[9px] text-muted-foreground font-bold">
                                              ✗
                                            </span>
                                          </span>
                                        )}
                                      </Button>
                                    </div>
                                    {app.submission.notes && (
                                      <p className="text-[10px] text-muted-foreground">
                                        {app.submission.notes}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        size="sm"
                                        className="h-7 px-2 text-[10px] bg-success text-primary-foreground hover:bg-success/90"
                                        disabled={updatingApplicationId === app.id}
                                        onClick={() =>
                                          updateSubmissionReviewStatus(app.id, "passed")
                                        }
                                      >
                                        Mark Passed
                                      </Button>
                                      {app.submission_review_status !== "passed" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-[10px]"
                                          disabled={updatingApplicationId === app.id}
                                          onClick={() =>
                                            updateSubmissionReviewStatus(app.id, "needs_changes")
                                          }
                                        >
                                          Needs Changes
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {app.status === "pending" && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-[10px]"
                                      disabled={updatingApplicationId === app.id}
                                      onClick={() => updateApplicationStatus(app.id, "shortlisted")}
                                    >
                                      Shortlist
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-6 px-2 text-[10px] bg-success text-primary-foreground hover:bg-success/90"
                                      disabled={updatingApplicationId === app.id}
                                      onClick={() => updateApplicationStatus(app.id, "accepted")}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-6 px-2 text-[10px]"
                                      disabled={updatingApplicationId === app.id}
                                      onClick={() => updateApplicationStatus(app.id, "rejected")}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}

                                {app.status === "shortlisted" && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      className="h-6 px-2 text-[10px] bg-success text-primary-foreground hover:bg-success/90"
                                      disabled={updatingApplicationId === app.id}
                                      onClick={() => updateApplicationStatus(app.id, "accepted")}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-6 px-2 text-[10px]"
                                      disabled={updatingApplicationId === app.id}
                                      onClick={() => updateApplicationStatus(app.id, "rejected")}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          {applications.filter((a) => a.project_id === item.id).length === 0 && (
                            <div className="py-2 text-center text-[10px] italic text-muted-foreground">
                              No student applications recorded yet.
                            </div>
                          )}
                          {applications.filter((a) => a.project_id === item.id).length > 3 && (
                            <p
                              className="mt-2 text-center text-[10px] font-medium text-brand cursor-pointer hover:underline"
                              onClick={() => setRosterProject(item)}
                            >
                              + {applications.filter((a) => a.project_id === item.id).length - 3}{" "}
                              more student applications (Click to view)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library" className="m-0 p-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {PROJECT_TEMPLATES.map((template) => {
              const isActive = projects.some((p) => p.title === template.title && p.status !== "cancelled");
              return (
                <Card
                key={template.title}
                className="group relative overflow-hidden border-border p-0 transition-all hover:border-brand/40 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-foreground">{template.title}</h4>
                        <Badge className="bg-brand/10 text-brand text-[10px]">Template</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-brand" /> {template.domain}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {template.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                    Deliverables include {template.deliverables.toLowerCase()}. Progress will be
                    monitored via {template.reporting.toLowerCase()}.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-secondary/20 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                        Duration
                      </span>
                      <span className="font-semibold text-foreground">{template.duration}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                        Team Size
                      </span>
                      <span className="font-semibold text-foreground">
                        {template.team_structure}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Deliverables
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {template.deliverables}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Rewards
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {template.rewards}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          Set Entry
                        </span>
                        <div className={`flex items-center bg-background border border-border/80 rounded px-1.5 py-0.5 h-7 mt-0.5 w-20 transition-all ${isActive ? "opacity-60 cursor-not-allowed bg-secondary/20" : "hover:border-brand/40 focus-within:border-brand/50"}`}>
                          <input
                            type="number"
                            min={0}
                            disabled={isActive}
                            value={templateEntryXps[template.title] ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setTemplateEntryXps((prev) => ({ ...prev, [template.title]: val }));
                            }}
                            className={`w-full bg-transparent border-none text-[11px] font-bold text-foreground focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isActive ? "cursor-not-allowed text-muted-foreground" : ""}`}
                          />
                          <span className="text-[9px] font-bold text-muted-foreground shrink-0">
                            XP
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          Set Stake
                        </span>
                        <div className={`flex items-center bg-background border border-border/80 rounded px-1.5 py-0.5 h-7 mt-0.5 w-20 transition-all ${isActive ? "opacity-60 cursor-not-allowed bg-secondary/20" : "hover:border-brand/40 focus-within:border-brand/50"}`}>
                          <input
                            type="number"
                            min={0}
                            disabled={isActive}
                            value={templateXpStakes[template.title] ?? 50}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setTemplateXpStakes((prev) => ({ ...prev, [template.title]: val }));
                              setTemplateRewardXps((prev) => ({
                                ...prev,
                                [template.title]: Math.round(val * 1.5),
                              }));
                            }}
                            className={`w-full bg-transparent border-none text-[11px] font-bold text-foreground focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isActive ? "cursor-not-allowed text-muted-foreground" : ""}`}
                          />
                          <span className="text-[9px] font-bold text-muted-foreground shrink-0">
                            XP
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          Set Reward
                        </span>
                        <div className={`flex items-center bg-background border border-border/80 rounded px-1.5 py-0.5 h-7 mt-0.5 w-20 transition-all ${isActive ? "opacity-60 cursor-not-allowed bg-secondary/20" : "hover:border-brand/40 focus-within:border-brand/50"}`}>
                          <input
                            type="number"
                            min={0}
                            disabled={isActive}
                            value={
                              templateRewardXps[template.title] ??
                              Math.round((templateXpStakes[template.title] ?? 50) * 1.5)
                            }
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setTemplateRewardXps((prev) => ({ ...prev, [template.title]: val }));
                            }}
                            className={`w-full bg-transparent border-none text-[11px] font-bold text-foreground focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isActive ? "cursor-not-allowed text-muted-foreground" : ""}`}
                          />
                          <span className="text-[9px] font-bold text-muted-foreground shrink-0">
                            XP
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          Project Mode
                        </span>
                        <div className="flex items-center gap-1.5 h-7 mt-0.5">
                          <span className={`text-[9px] font-bold transition-colors duration-200 ${!(templateIsTeam[template.title] ?? true) ? "text-foreground" : "text-muted-foreground"}`}>Solo</span>
                          <Switch
                            checked={templateIsTeam[template.title] ?? true}
                            disabled={isActive}
                            onCheckedChange={(checked) =>
                              setTemplateIsTeam((prev) => ({ ...prev, [template.title]: checked }))
                            }
                          />
                          <span className={`text-[9px] font-bold transition-colors duration-200 ${(templateIsTeam[template.title] ?? true) ? "text-brand" : "text-muted-foreground"}`}>Team</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`text-xs font-semibold ${isActive ? "text-brand" : "text-muted-foreground"}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => handleTemplateToggle(template, checked)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
            })}
          </div>
        </TabsContent>

        <TabsContent value="new" className="m-0 p-0">
          <Card className="p-6">
            <h3 className="text-sm font-bold">Create Custom Project</h3>
            <p className="mt-1 text-xs text-muted-foreground">Build a new project from scratch.</p>
            <form onSubmit={submit} className="mt-4 grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Project title"
                  />
                </div>
                <div>
                  <Label>Domain</Label>
                  <select
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
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
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="Brief project overview"
                  rows={2}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed project description"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/85 p-3.5 bg-secondary/5 shadow-sm transition-all hover:bg-secondary/10">
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
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 1 })}
                  />
                </div>
                {customIsTeam && (
                  <>
                    <div>
                      <Label>Team Allowed (for more than one team specify the number of teams you will allow)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.teams_allowed}
                        onChange={(e) =>
                          setForm({ ...form, teams_allowed: Number(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div>
                      <Label>Members (Maximum members in each team)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.team_members_limit}
                        onChange={(e) =>
                          setForm({ ...form, team_members_limit: Number(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Institution (Optional)</Label>
                  <select
                    value={form.institution_id}
                    onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Institutions</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as "open" | "closed" | "draft" })
                    }
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
                    value={form.minimum_xp_required}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minimum_xp_required: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <Label>XP Commitment Stake (Standard: 50 XP) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.xp_commitment_stake}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setForm({
                        ...form,
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
                    value={form.reward_pool_xp}
                    onChange={(e) =>
                      setForm({ ...form, reward_pool_xp: Math.max(0, Number(e.target.value) || 0) })
                    }
                    placeholder="e.g. 75"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-brand text-brand-foreground justify-self-end"
              >
                {saving ? "Saving..." : "Create Project"}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
      <ProjectRosterDialog
        project={rosterProject}
        applications={applications}
        onClose={() => setRosterProject(null)}
        updatingApplicationId={updatingApplicationId}
        updateApplicationStatus={updateApplicationStatus}
        updateSubmissionReviewStatus={updateSubmissionReviewStatus}
        refreshData={fetchData}
      />
    </div>
  );
}

function ProjectRosterDialog({
  project,
  applications,
  onClose,
  updatingApplicationId,
  updateApplicationStatus,
  updateSubmissionReviewStatus,
  refreshData,
}: {
  project: BackendProject | null;
  applications: BackendApplication[];
  onClose: () => void;
  updatingApplicationId: string | null;
  updateApplicationStatus: (id: string, status: any) => Promise<void>;
  updateSubmissionReviewStatus: (id: string, reviewStatus: any) => Promise<void>;
  refreshData: () => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [room, setRoom] = useState<BackendProjectRoom | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [resolvingGrievanceId, setResolvingGrievanceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("candidates");

  const fetchRoom = async () => {
    if (!project) return;
    try {
      setLoadingRoom(true);
      const res = await backendProjects.room(project.id);
      setRoom(res.room);
    } catch (err) {
      console.error("Room not found or not created yet", err);
      setRoom(null);
    } finally {
      setLoadingRoom(false);
    }
  };

  useEffect(() => {
    if (project) {
      fetchRoom();
      setResponses({});
      setActiveTab("candidates");
    } else {
      setRoom(null);
    }
  }, [project?.id]);

  if (!project) return null;

  const projectApps = applications.filter((a) => a.project_id === project.id);

  const filteredApps = projectApps.filter((app) => {
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesSearch =
      app.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user_institution?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await backendProjects.updateParticipantRole(project.id, userId, newRole);
      setRoom(res.room);
      toast.success("Participant role updated successfully.");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update role.");
    }
  };

  const handlePromoteLeader = async (userId: string) => {
    try {
      const res = await backendProjects.promoteLeader(project.id, userId);
      setRoom(res.room);
      toast.success("New project coordinator promoted successfully.");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to promote leader.");
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this student? This will withdraw their application and remove them from the project room.")) {
      return;
    }
    try {
      const res = await backendProjects.removeParticipant(project.id, userId);
      setRoom(res.room);
      toast.success("Participant removed from the project room.");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove participant.");
    }
  };

  const handleResolveGrievance = async (grievanceId: string) => {
    const responseText = responses[grievanceId]?.trim();
    if (!responseText) {
      toast.error("Please enter a response before resolving.");
      return;
    }
    try {
      setResolvingGrievanceId(grievanceId);
      const res = await backendProjects.respondToGrievance(project.id, grievanceId, {
        adminResponse: responseText,
        status: "resolved",
      });
      setRoom(res.room);
      setResponses((prev) => ({ ...prev, [grievanceId]: "" }));
      toast.success("Grievance resolved and response logged.");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve grievance.");
    } finally {
      setResolvingGrievanceId(null);
    }
  };

  const isTeamProject = (project.team_members_limit ?? 1) > 1;

  return (
    <Dialog
      open={Boolean(project)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-1 pt-1">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span>Roster: {project.title}</span>
            <Badge variant="secondary" className="text-xs bg-brand/10 text-brand">
              {projectApps.length} Candidates
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Manage student candidates, monitor the active participant team, and respond to lodged student leader grievances.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className={`grid w-full mb-4 ${isTeamProject ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="candidates" className="text-xs">Candidates ({projectApps.length})</TabsTrigger>
            <TabsTrigger value="roster" className="text-xs">Active Team Roster ({room?.participants?.length ?? 0})</TabsTrigger>
            {isTeamProject && (
              <TabsTrigger value="grievances" className="text-xs">
                Grievances ({room?.grievances?.length ?? 0})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="candidates" className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3 py-2 border-b border-border/50">
              <Input
                placeholder="Search candidates by name or institute..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-xs h-9"
              />
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["all", "pending", "shortlisted", "accepted", "rejected"].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "outline"}
                    className="h-9 px-3 text-[11px] capitalize"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[50vh]">
              {filteredApps.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  No matching applications found.
                </div>
              ) : (
                filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-lg border border-border/70 p-4 bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm truncate">{app.user_name}</span>
                          <Badge
                            variant="outline"
                            className="h-5 text-[9px] capitalize border-brand/30 px-1.5"
                          >
                            {app.status}
                          </Badge>
                          {app.submission_review_status &&
                            app.submission_review_status !== "not_submitted" && (
                              <Badge
                                variant="outline"
                                className="h-5 text-[9px] capitalize bg-emerald-500/10 border-emerald-500/30 text-emerald-600 px-1.5"
                              >
                                {app.submission_review_status.replace("_", " ")}
                              </Badge>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {app.user_institution} · {app.user_email || "No email"}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 min-w-[320px] md:items-end">
                        {/* Submission block */}
                        {app.submission ? (
                          <div className="space-y-2 w-full rounded-md bg-secondary/40 p-3 md:text-right border border-border/40">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:text-right text-left">
                              Submission Review
                            </div>
                            <div className="flex flex-wrap md:justify-end gap-1.5">
                              <Button
                                asChild={Boolean(app.submission.live_url)}
                                size="sm"
                                variant="outline"
                                className={`h-7 px-2 text-[10px] ${
                                  app.submission.live_url
                                    ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10"
                                    : "opacity-50 cursor-not-allowed bg-muted"
                                }`}
                                disabled={!app.submission.live_url}
                              >
                                {app.submission.live_url ? (
                                  <a href={app.submission.live_url} target="_blank" rel="noreferrer">
                                    Live URL{" "}
                                    <span className="ml-1 text-[9px] text-emerald-500 font-bold">
                                      ✓
                                    </span>
                                  </a>
                                ) : (
                                  <span>
                                    Live URL{" "}
                                    <span className="ml-1 text-[9px] text-muted-foreground font-bold">
                                      ✗
                                    </span>
                                  </span>
                                )}
                              </Button>
                              <Button
                                asChild={Boolean(app.submission.github_url)}
                                size="sm"
                                variant="outline"
                                className={`h-7 px-2 text-[10px] ${
                                  app.submission.github_url
                                    ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10"
                                    : "opacity-50 cursor-not-allowed bg-muted"
                                }`}
                                disabled={!app.submission.github_url}
                              >
                                {app.submission.github_url ? (
                                  <a href={app.submission.github_url} target="_blank" rel="noreferrer">
                                    GitHub{" "}
                                    <span className="ml-1 text-[9px] text-emerald-500 font-bold">
                                      ✓
                                    </span>
                                  </a>
                                ) : (
                                  <span>
                                    GitHub{" "}
                                    <span className="ml-1 text-[9px] text-muted-foreground font-bold">
                                      ✗
                                    </span>
                                  </span>
                                )}
                              </Button>
                              <Button
                                asChild={Boolean(app.submission.screenshot_url)}
                                size="sm"
                                variant="outline"
                                className={`h-7 px-2 text-[10px] ${
                                  app.submission.screenshot_url
                                    ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10"
                                    : "opacity-50 cursor-not-allowed bg-muted"
                                }`}
                                disabled={!app.submission.screenshot_url}
                              >
                                {app.submission.screenshot_url ? (
                                  <a
                                    href={app.submission.screenshot_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Screenshot{" "}
                                    <span className="ml-1 text-[9px] text-emerald-500 font-bold">
                                      ✓
                                    </span>
                                  </a>
                                ) : (
                                  <span>
                                    Screenshot{" "}
                                    <span className="ml-1 text-[9px] text-muted-foreground font-bold">
                                      ✗
                                    </span>
                                  </span>
                                )}
                              </Button>
                            </div>
                            {app.submission.notes && (
                              <p className="text-[10px] text-muted-foreground italic md:text-right text-left mt-1">
                                "{app.submission.notes}"
                              </p>
                            )}
                            <div className="flex flex-wrap md:justify-end gap-1.5 pt-1">
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[9px] bg-success text-primary-foreground hover:bg-success/90"
                                disabled={updatingApplicationId === app.id}
                                onClick={() => updateSubmissionReviewStatus(app.id, "passed")}
                              >
                                Mark Passed
                              </Button>
                              {app.submission_review_status !== "passed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[9px]"
                                  disabled={updatingApplicationId === app.id}
                                  onClick={() => updateSubmissionReviewStatus(app.id, "needs_changes")}
                                >
                                  Needs Changes
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            No submission uploaded yet
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-1.5 md:justify-end">
                          {app.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-[10px]"
                                disabled={updatingApplicationId === app.id}
                                onClick={() => updateApplicationStatus(app.id, "shortlisted")}
                              >
                                Shortlist
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-[10px] bg-success text-primary-foreground hover:bg-success/90"
                                disabled={updatingApplicationId === app.id}
                                onClick={() => updateApplicationStatus(app.id, "accepted")}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2.5 text-[10px]"
                                disabled={updatingApplicationId === app.id}
                                onClick={() => updateApplicationStatus(app.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {app.status === "shortlisted" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-[10px] bg-success text-primary-foreground hover:bg-success/90"
                                disabled={updatingApplicationId === app.id}
                                onClick={() => updateApplicationStatus(app.id, "accepted")}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2.5 text-[10px]"
                                disabled={updatingApplicationId === app.id}
                                onClick={() => updateApplicationStatus(app.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="roster" className="flex-1 flex flex-col min-h-0 space-y-3">
            {loadingRoom ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading team roster...
              </div>
            ) : !room || !room.participants || room.participants.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg flex flex-col items-center justify-center">
                <Users className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p>No active participants in the project yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Students will appear here once they commit XP and join.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[50vh]">
                {room.participants.map((p) => {
                  const uObj = typeof p.user === 'object' ? p.user : null;
                  const uId = uObj?._id || uObj?.id || (typeof p.user === 'string' ? p.user : "");
                  const uName = uObj?.name || "Unknown Student";
                  const uEmail = uObj?.email || "No email";
                  const isLeader = room.temporaryCoordinator && room.temporaryCoordinator === uId;
                  
                  return (
                    <div
                      key={uId}
                      className="rounded-lg border border-border/70 p-4 bg-background/50 hover:bg-background/80 transition-all hover:border-brand/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand uppercase border border-brand/20">
                              {uName[0]}
                            </div>
                            {isLeader && (
                              <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-md" title="Team Coordinator">
                                <Crown className="h-3 w-3 fill-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{uName}</span>
                              {isLeader && (
                                <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-[9px] font-bold py-0 h-4 border-amber-500/20">
                                  Coordinator
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0 px-1 border-border font-mono text-muted-foreground h-4">
                                {p.role || "participant"}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {uEmail}
                            </div>
                          </div>
                        </div>

                        {/* Roster Actions */}
                        <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                          {/* Role Select Dropdown */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Role:</span>
                            <Select
                              value={p.role || "Contributor"}
                              onValueChange={(val) => handleRoleChange(uId, val)}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Contributor">Contributor</SelectItem>
                                <SelectItem value="Developer">Developer</SelectItem>
                                <SelectItem value="Designer">Designer</SelectItem>
                                <SelectItem value="QA Analyst">QA Analyst</SelectItem>
                                <SelectItem value="Researcher">Researcher</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Promote to Leader Button */}
                          {!isLeader && isTeamProject && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[11px] font-medium border-amber-500/20 text-amber-600 hover:bg-amber-500/5 hover:border-amber-500 flex items-center gap-1"
                              onClick={() => handlePromoteLeader(uId)}
                              title="Promote to Project Coordinator"
                            >
                              <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500/30" />
                              Promote
                            </Button>
                          )}

                          {/* Remove/Kick Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/5 hover:text-destructive"
                            onClick={() => handleRemoveParticipant(uId)}
                            title="Remove Participant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {isTeamProject && (
            <TabsContent value="grievances" className="flex-1 flex flex-col min-h-0 space-y-3">
              {loadingRoom ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Loading grievances...
                </div>
              ) : !room || !room.grievances || room.grievances.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg flex flex-col items-center justify-center">
                  <ShieldAlert className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p>No grievances lodged for this project yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Student project leaders can raise grievances about blockers or team issues from their project room.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh]">
                  {room.grievances.map((g) => {
                    const gId = g.id || g._id || "";
                    const creatorObj = typeof g.createdBy === 'object' ? g.createdBy : null;
                    const creatorName = creatorObj?.name || "Unknown Student";
                    const isResolved = g.status === "resolved";
                    
                    return (
                      <div
                        key={gId}
                        className={`rounded-xl border p-4 bg-background/50 hover:bg-background/80 transition-all ${
                          isResolved ? "border-emerald-500/20 bg-emerald-500/[0.01]" : "border-amber-500/20 bg-amber-500/[0.01]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="font-bold text-sm text-foreground">{g.title}</h5>
                              <Badge
                                variant="outline"
                                className={`text-[9px] uppercase tracking-wider py-0.5 px-1.5 font-bold rounded-full ${
                                  isResolved
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                                }`}
                              >
                                {g.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Raised by <span className="font-medium text-foreground">{creatorName}</span> on {new Date(g.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-foreground/80 bg-secondary/20 rounded-lg p-3 border border-border/40 whitespace-pre-wrap leading-relaxed">
                          {g.description}
                        </div>

                        {/* Admin Response Section */}
                        <div className="mt-4 border-t border-border/50 pt-4">
                          {isResolved ? (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block mb-1">
                                Admin Response
                              </span>
                              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {g.adminResponse || "Grievance resolved without notes."}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 block">
                                Reply & Resolve Grievance
                              </span>
                              <Textarea
                                placeholder="Enter admin instructions, resources, or resolution notes..."
                                value={responses[gId] || ""}
                                onChange={(e) =>
                                  setResponses((prev) => ({ ...prev, [gId]: e.target.value }))
                                }
                                className="text-xs h-20 focus-visible:ring-amber-500/30"
                              />
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 flex items-center gap-1.5 shadow-sm shadow-orange-500/10 transition-all duration-300"
                                  disabled={resolvingGrievanceId === gId}
                                  onClick={() => handleResolveGrievance(gId)}
                                >
                                  {resolvingGrievanceId === gId ? (
                                    <span>Resolving...</span>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>Respond & Resolve</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
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

function InstitutionAccountForm({ institutions }: { institutions: Institution[] }) {
  const firstInstitution = institutions[0];
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [institutionId, setInstitutionId] = useState(firstInstitution?.id ?? "");
  const [existingAdmin, setExistingAdmin] = useState<ScopeUser | null>(null);
  const selected =
    institutions.find((institution) => institution.id === institutionId) ?? firstInstitution;
  const eligible = selected?.stage === "Launch Pending";
  const [form, setForm] = useState({
    name: firstInstitution ? `${firstInstitution.name} Admin` : "",
    email: firstInstitution?.email ?? "",
    password: "Password123!",
  });
  const [resetPassword, setResetPassword] = useState("Password123!");
  const [repeatResetPassword, setRepeatResetPassword] = useState("Password123!");

  useEffect(() => {
    if (institutionId || !firstInstitution) return;
    setInstitutionId(firstInstitution.id);
    setForm((current) => ({
      ...current,
      name: current.name || `${firstInstitution.name} Admin`,
      email: current.email || firstInstitution.email,
    }));
  }, [firstInstitution, institutionId]);

  useEffect(() => {
    let cancelled = false;
    if (!institutionId) {
      setExistingAdmin(null);
      return;
    }

    setExistingAdmin(null);
    setLookupLoading(true);
    void backendUsers
      .list({ institutionId, role: "institution_admin" })
      .then((response) => {
        if (cancelled) return;
        const admin = response.items.find((item) => item.role === "institution_admin") ?? null;
        setExistingAdmin(admin);
      })
      .catch(() => {
        if (cancelled) return;
        setExistingAdmin(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLookupLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  useEffect(() => {
    if (!existingAdmin) return;
    setForm((current) => ({
      ...current,
      name: existingAdmin.name || current.name,
      email: existingAdmin.email || current.email,
    }));
  }, [existingAdmin]);

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) {
      toast.error("Create an institution lead first.");
      return;
    }
    if (!eligible) {
      toast.error("Credential generation is only available at Launch Pending stage.");
      return;
    }
    if (existingAdmin) {
      toast.error("A linked institution admin already exists. Use Edit linked account instead.");
      return;
    }
    if (!form.name || !form.email || form.password.length < 8) {
      toast.error("Name, email, and an 8+ character password are required.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await backendAdminUsers.create({
        name: form.name,
        email: form.email,
        password: form.password,
        role: "institution_admin",
        role_variant: "institutional_admin",
        institution_id: selected.id,
      });
      setExistingAdmin(user);
      toast.success(`${selected.name} login created.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create institution login.");
    } finally {
      setLoading(false);
    }
  };

  const editLinkedAccount = async () => {
    if (!selected) {
      toast.error("Select an institution first.");
      return;
    }
    if (!existingAdmin) {
      toast.error("No linked institution admin account exists yet.");
      return;
    }
    if (!form.name || !form.email) {
      toast.error("Name and email are required.");
      return;
    }

    setEditLoading(true);
    try {
      const { user } = await backendAdminUsers.update(existingAdmin.id, {
        name: form.name,
        email: form.email,
        institution_id: selected.id,
      });
      setExistingAdmin(user);
      toast.success(`${selected.name} linked account updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update linked institution login.");
    } finally {
      setEditLoading(false);
    }
  };

  const resetInstitutionPassword = async () => {
    if (!selected) {
      toast.error("Select an institution first.");
      return;
    }
    if (!existingAdmin) {
      toast.error("No institution admin account exists yet for this institution.");
      return;
    }
    if (resetPassword.length < 8) {
      toast.error("Use an 8+ character password.");
      return;
    }
    if (resetPassword !== repeatResetPassword) {
      toast.error("password not matched");
      return;
    }

    setResetLoading(true);
    try {
      await backendAdminUsers.resetPassword(existingAdmin.id, resetPassword);
      toast.success(`Password reset for ${selected.name}.`);
      setResetPassword("Password123!");
      setRepeatResetPassword("Password123!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset institution password.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold">Create Institution Login</h3>
          <p className="text-xs text-muted-foreground">
            Creates an institution_admin account linked to an assigned institution.
          </p>
        </div>
        {selected && (
          <Badge variant={eligible ? "default" : "outline"}>
            {eligible ? "Launch Pending" : `${selected.stage}: locked`}
          </Badge>
        )}
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
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Admin name</Label>
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Username / email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="mt-1.5"
          />
        </div>
        <div className="lg:col-span-5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={loading || editLoading || lookupLoading || !selected || !eligible}
              className="bg-gradient-brand text-brand-foreground"
            >
              {loading ? "Creating..." : "Create linked account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={editLinkedAccount}
              disabled={loading || editLoading || lookupLoading || !selected || !existingAdmin}
            >
              {editLoading ? "Saving..." : "Edit linked account"}
            </Button>
          </div>
          {!eligible && selected && (
            <p className="mt-2 text-xs text-muted-foreground">
              Institution login unlocks only when the institution reaches Launch Pending.
            </p>
          )}

          <div className="mt-4 rounded-lg border border-border/60 p-3">
            <div className="text-xs font-semibold text-foreground">Reset Institution Password</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Scope Admin can reset the linked institution admin login password here.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Input
                  type="text"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="Enter new password"
                />
                <Input
                  type="password"
                  value={repeatResetPassword}
                  onChange={(event) => setRepeatResetPassword(event.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={resetInstitutionPassword}
                disabled={resetLoading || lookupLoading || !selected || !existingAdmin || resetPassword.length < 8}
              >
                {resetLoading ? "Resetting..." : "Reset password"}
              </Button>
            </div>
            {lookupLoading ? (
              <p className="mt-2 text-xs text-muted-foreground">Checking institution admin account...</p>
            ) : existingAdmin ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Active institution admin: {existingAdmin.email}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No institution admin account found for this institution yet.
              </p>
            )}
          </div>
        </div>
      </form>
    </Card>
  );
}

function PipelineBoard({ institutions }: { institutions: Institution[] }) {
  const [filter, setFilter] = useState<PipelineStage | "all">("all");
  const filtered = filter === "all" ? institutions : institutions.filter((i) => i.stage === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All ({institutions.length})
        </Button>
        {PIPELINE_STAGES.map((s) => {
          const count = institutions.filter((i) => i.stage === s).length;
          if (count === 0) return null;
          return (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
            >
              {s} ({count})
            </Button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((i) => (
          <InstitutionCard key={i.id} inst={i} />
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
            No institutions in this stage yet.
          </Card>
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
        <div className="flex items-center gap-1.5">
          <Phone className="h-3 w-3" /> {inst.phone}
        </div>
        <div className="flex items-center gap-1.5">
          <Mail className="h-3 w-3" /> {inst.email}
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="h-3 w-3 text-brand" /> Priority {inst.priority} · ₹
          {(inst.potentialValue / 1000).toFixed(0)}k potential
        </div>
      </div>
      {inst.notes && (
        <p className="mt-2 line-clamp-2 rounded-md bg-secondary/40 p-2 text-xs">{inst.notes}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Select
          value={stage}
          onValueChange={(v) => {
            setStage(v as PipelineStage);
            crm.moveStage(inst.id, v as PipelineStage);
            toast.success(`Moved to ${v}`);
          }}
        >
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              Notes
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{inst.name}</DialogTitle>
            </DialogHeader>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {inst.notes || "No notes yet."}
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
            />
            <Button
              onClick={() => {
                crm.addNote(inst.id, note);
                setNote("");
                toast.success("Note added");
              }}
            >
              Add note
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

function NewLeadDialog({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    state: "West Bengal",
    contactPerson: "",
    phone: "",
    email: "",
  });
  const submit = () => {
    if (!form.name || !form.city) {
      toast.error("Name and city required");
      return;
    }
    crm.upsertInstitution({
      id: `i${Date.now()}`,
      name: form.name,
      type: "Other",
      city: form.city,
      state: form.state,
      contactPerson: form.contactPerson,
      designation: "",
      phone: form.phone,
      email: form.email,
      ownerId,
      priority: 3,
      potentialValue: 100000,
      stage: "Prospect",
      notes: "",
      updatedAt: Date.now(),
    });
    toast.success("Lead added");
    setOpen(false);
    setForm({ name: "", city: "", state: "West Bengal", contactPerson: "", phone: "", email: "" });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand text-brand-foreground">
          <Plus className="mr-1 h-4 w-4" /> Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New institution lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Institution name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Contact person</Label>
            <Input
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={submit} className="bg-gradient-brand text-brand-foreground">
            Save lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VisitPlanner({
  visits,
  institutions,
  ownerId,
}: {
  visits: ReturnType<typeof crm.visits>;
  institutions: Institution[];
  ownerId: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const todayVisits = visits.filter(
    (v) => v.date === today && (v.status === "scheduled" || v.status === "checked_in"),
  );
  const upcoming = visits
    .filter((v) => v.date > today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const [pickInst, setPickInst] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");

  const find = (id: string) => institutions.find((i) => i.id === id);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-2">
        <h3 className="text-sm font-bold">Today's visits</h3>
        <div className="mt-3 space-y-2">
          {todayVisits.length === 0 && (
            <p className="text-sm text-muted-foreground">No visits scheduled today.</p>
          )}
          {todayVisits.map((v) => {
            const i = find(v.institutionId);
            if (!i) return null;
            return (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <div className="text-sm font-semibold">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.time} · {i.city}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps/search/${encodeURIComponent(i.name + " " + i.city)}`}
                    >
                      <MapPin className="mr-1 h-3 w-3" /> Map
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      crm.setVisitStatus(v.id, "checked_in");
                      toast.success("Checked in");
                    }}
                  >
                    Check-in
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      crm.setVisitStatus(v.id, "completed");
                      toast.success("Marked complete");
                    }}
                  >
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Delete this visit?")) {
                        crm.deleteVisit(v.id);
                        toast.success("Visit deleted");
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <h3 className="mt-6 text-sm font-bold">Upcoming</h3>
        <div className="mt-3 space-y-2">
          {upcoming.slice(0, 6).map((v) => {
            const i = find(v.institutionId);
            if (!i) return null;
            return (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.date} · {v.time}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{v.status}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Delete this upcoming visit?")) {
                        crm.deleteVisit(v.id);
                        toast.success("Visit deleted");
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming visits.</p>
          )}
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-bold">Schedule a visit</h3>
        <div className="mt-3 grid gap-3">
          <div>
            <Label>Institution</Label>
            <Select value={pickInst} onValueChange={setPickInst}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <Button
            className="bg-gradient-brand text-brand-foreground"
            onClick={() => {
              if (!pickInst) {
                toast.error("Pick institution");
                return;
              }
              crm.scheduleVisit({ institutionId: pickInst, date, time, ownerId });
              toast.success("Visit scheduled");
              setPickInst("");
            }}
          >
            Schedule
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ProposalCenter({ institutions }: { institutions: Institution[] }) {
  const tracked = institutions;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5">
        <h3 className="text-sm font-bold">Quick actions</h3>
        <p className="mt-1 text-xs text-muted-foreground italic mb-4">
          Upload documents once to send them to any institution.
        </p>
        <div className="space-y-3">
          <FileUploadAction kind="brochure" label="Upload Brochure" icon={Upload} />
          <FileUploadAction kind="proposal" label="Upload Proposal" icon={FileUp} />
          <FileUploadAction kind="pricing" label="Upload Pricing Deck" icon={Layers} />
          <FileUploadAction kind="mou" label="Upload MoU Draft" icon={FileText} />
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Library (Recent Uploads)
          </h4>
          <div className="mt-2 space-y-1">
            <RecentUploadsList />
          </div>
        </div>
      </Card>
      <Card className="p-5 lg:col-span-2">
        <h3 className="text-sm font-bold">Tracking</h3>
        <div className="mt-3 divide-y divide-border max-h-[500px] overflow-y-auto pr-2">
          {tracked.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{i.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {i.contactPerson} · {i.email}
                </div>
                {i.documents && i.documents.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {i.documents.map((d, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[9px] px-1 h-4">
                        {d.kind} sent
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STAGE_COLORS[i.stage]}>{i.stage}</Badge>
                <SendDocumentDialog institution={i} />
              </div>
            </div>
          ))}
          {tracked.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground text-center">
              No proposals tracked yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function LaunchTracker({ institutions }: { institutions: Institution[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {institutions.map((i) => {
        const ck = crm.launch(i.id);
        const steps: { key: keyof Omit<typeof ck, "institutionId">; label: string }[] = [
          { key: "facultyAssigned", label: "Faculty Coordinator Assigned" },
          { key: "leaderShortlisted", label: "Campus Leader Shortlisted" },
          { key: "launchScheduled", label: "Launch Event Scheduled" },
          { key: "registrationsStarted", label: "Student Registrations Started" },
          { key: "pageLive", label: "Chapter Page Live" },
          { key: "challengeActivated", label: "First Challenge Activated" },
        ];
        const done = steps.filter((s) => ck[s.key]).length;
        return (
          <Card key={i.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.city}</div>
              </div>
              <Badge variant="outline">
                {done}/{steps.length}
              </Badge>
            </div>
            <div className="mt-3 space-y-1.5">
              {steps.map((s) => (
                <button
                  key={s.key}
                  onClick={() => crm.toggleLaunchStep(i.id, s.key)}
                  className="flex w-full items-center gap-2 rounded-md p-1.5 text-left text-sm transition-colors hover:bg-secondary"
                >
                  {ck[s.key] ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={ck[s.key] ? "text-foreground" : "text-muted-foreground"}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        );
      })}
      {institutions.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">
          No active launches yet. Sign your first MoU!
        </Card>
      )}
    </div>
  );
}

function PerformanceScorecard({
  institutions,
  visits,
  admins,
}: {
  institutions: Institution[];
  visits: ReturnType<typeof crm.visits>;
  admins: ReturnType<typeof crm.admins>;
}) {
  // 1. Personal / Territory Stats
  const meetings = visits.filter((v) => v.status === "completed").length;
  const closures = institutions.filter((i) =>
    ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage),
  ).length;
  const rate = institutions.length ? Math.round((closures / institutions.length) * 100) : 0;
  const reactivated = institutions.filter((i) => i.stage === "Live Chapter").length;

  // 2. Team Aggregates
  const totalTeamMeetings = admins.reduce((s, a) => s + a.meetings, 0);
  const totalTeamClosures = admins.reduce((s, a) => s + a.closures, 0);
  const teamRate = totalTeamMeetings
    ? Math.round((totalTeamClosures / totalTeamMeetings) * 100)
    : 0;

  const stats = [
    { label: "My Territory Meetings", value: meetings, icon: Calendar },
    { label: "My Territory Closures", value: closures, icon: CheckCircle2 },
    { label: "My Conversion Rate", value: `${rate}%`, icon: ArrowRight },
    { label: "Team Total Meetings", value: totalTeamMeetings, icon: Users, accent: true },
    { label: "Team Total Closures", value: totalTeamClosures, icon: Target, accent: true },
    { label: "Team Avg Conversion", value: `${teamRate}%`, icon: TrendingUp, accent: true },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`p-4 relative overflow-hidden ${s.accent ? "border-brand/35 bg-brand/5" : ""}`}
          >
            {s.accent && (
              <div className="absolute top-0 right-0 h-1.5 w-12 bg-gradient-brand rounded-bl-lg" />
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.accent ? "text-brand" : "text-muted-foreground"}`} />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Partnership Representative Leaderboard */}
      <Card className="overflow-hidden border-brand/10 p-0">
        <div className="border-b border-border bg-muted/20 px-6 py-4">
          <h3 className="text-sm font-bold text-foreground">Partnership Team Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time rank and closure tracking connected to backend Mongoose CRM records.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-3">Representative</th>
                <th className="px-6 py-3">Territory / Focus</th>
                <th className="px-6 py-3 text-center">Meetings Done</th>
                <th className="px-6 py-3">Closures / Target</th>
                <th className="px-6 py-3 text-center">Conversion</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-muted-foreground italic text-xs"
                  >
                    No representatives registered in the system.
                  </td>
                </tr>
              )}
              {admins.map((admin) => {
                const closurePct =
                  admin.target > 0
                    ? Math.min(Math.round((admin.closures / admin.target) * 100), 100)
                    : 0;
                const adminRate =
                  admin.meetings > 0 ? Math.round((admin.closures / admin.meetings) * 100) : 0;

                return (
                  <tr key={admin.id} className="transition-colors hover:bg-muted/10">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-brand-foreground uppercase border border-brand/20">
                          {admin.name[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{admin.name}</span>
                          <span className="text-[10px] text-muted-foreground">{admin.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{admin.region}</span>
                        <span className="text-[10px] text-muted-foreground">{admin.focus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{admin.meetings}</td>
                    <td className="px-6 py-4 min-w-[180px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{admin.closures} closures</span>
                          <span className="text-[10px] text-muted-foreground">
                            Target: {admin.target}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all duration-1000"
                            style={{ width: `${closurePct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="secondary" className="font-bold">
                        {adminRate}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant={admin.status === "active" ? "default" : "outline"}
                        className={`capitalize px-2 py-0.5 text-[10px] ${
                          admin.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {admin.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Territory Identity Card */}
      <Card className="p-5">
        <h3 className="text-sm font-bold">Territory Identity & Zones</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          High-performing zones compound faster and gain premium access tags.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className="bg-brand/10 text-brand">Kolkata Region</Badge>
          <Badge variant="outline">Engineering Colleges East Zone</Badge>
          <Badge variant="outline">CBSE Partnerships</Badge>
          <Badge variant="outline" className="border-brand/20">
            National Outreach Hub
          </Badge>
        </div>
      </Card>
    </div>
  );
}
function FileUploadAction({ kind, label, icon: Icon }: { kind: string; label: string; icon: any }) {
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    try {
      const res = await fetch("/api/v1/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("scope_access_token")}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const doc = { id: data.data.file.id, name: file.name, url: data.data.file.url, kind };
        const cache = JSON.parse(localStorage.getItem("scope_uploaded_docs") || "[]");
        const next = [doc, ...cache.filter((d: any) => d.kind !== kind)].slice(0, 10);
        localStorage.setItem("scope_uploaded_docs", JSON.stringify(next));
        window.dispatchEvent(new Event("scope:docs-updated"));
        toast.success(`${label} uploaded and cached.`);
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-start relative overflow-hidden"
        disabled={uploading}
      >
        <Icon className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : label}
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={handleUpload}
          accept=".pdf,.doc,.docx"
        />
      </Button>
    </div>
  );
}

function SendDocumentDialog({ institution }: { institution: Institution }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await backendDocuments.list();
      setDocs(res.files);
    } catch {
      const local = JSON.parse(localStorage.getItem("scope_uploaded_docs") || "[]");
      setDocs(local.map((d: any) => ({ ...d, file_name: d.name })));
    }
  };
  useEffect(() => {
    load();
    window.addEventListener("scope:docs-updated", load);
    return () => window.removeEventListener("scope:docs-updated", load);
  }, []);

  const send = async (doc: any) => {
    setLoading(true);
    try {
      await backendInstitutions.sendDocument(institution.id, {
        kind: doc.kind as any,
        file_id: doc.id,
        file_name: doc.file_name,
        file_url: doc.url,
      });
      toast.success(`${doc.kind} sent to ${institution.name}`);
      void crm.syncFromBackend();
    } catch (err) {
      toast.error("Failed to send document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-brand/30 text-brand hover:bg-brand/5"
        >
          <Send className="h-3.5 w-3.5" />
          Send Doc
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send document to {institution.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {docs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center italic">
              No documents uploaded yet. Upload them first using "Quick Actions".
            </p>
          )}
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <div className="text-sm font-semibold capitalize">{d.kind}</div>
                <div className="text-xs text-muted-foreground">{d.file_name}</div>
              </div>
              <Button size="sm" onClick={() => send(d)} disabled={loading}>
                Send
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecentUploadsList() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await backendDocuments.list();
      setDocs(res.files);
    } catch {
      // Fallback to local if backend fails
      const local = JSON.parse(localStorage.getItem("scope_uploaded_docs") || "[]");
      setDocs(local.map((d: any) => ({ ...d, file_name: d.name })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener("scope:docs-updated", load);
    return () => window.removeEventListener("scope:docs-updated", load);
  }, []);

  if (loading)
    return <p className="text-[10px] text-muted-foreground animate-pulse">Syncing library...</p>;
  if (docs.length === 0)
    return <p className="text-[10px] text-muted-foreground italic">No files in your library.</p>;

  return (
    <div className="space-y-1">
      {docs.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between rounded-md bg-secondary/30 px-2 py-1.5 transition-colors hover:bg-secondary/50"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium">{d.file_name}</div>
            <div className="text-[9px] uppercase tracking-tighter text-muted-foreground">
              {d.kind}
            </div>
          </div>
          <CheckCircle2 className="h-3 w-3 text-brand opacity-60" />
        </div>
      ))}
    </div>
  );
}

function StudentIdeasManager() {
  const [ideas, setIdeas] = useState<BackendProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<BackendProposal | null>(null);
  const [status, setStatus] = useState<BackendProposal["status"]>("reviewed");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await backendProposals.list();
      setIdeas(res.items);
    } catch (err) {
      toast.error("Failed to load student proposals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openReview = (idea: BackendProposal) => {
    setSelectedIdea(idea);
    setStatus(idea.status === "pending" ? "reviewed" : idea.status);
    setComment(idea.adminComment || "");
  };

  const submitReview = async () => {
    if (!selectedIdea) return;
    setSubmitting(true);
    try {
      await backendProposals.patch(selectedIdea.id, {
        status,
        admin_comment: comment.trim(),
      });
      toast.success("Proposal review updated successfully!");
      setSelectedIdea(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update review.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return ideas;
    return ideas.filter((i) => i.status === filter);
  }, [ideas, filter]);

  const stats = useMemo(() => {
    const total = ideas.length;
    const pending = ideas.filter((i) => i.status === "pending").length;
    const accepted = ideas.filter((i) => i.status === "accepted").length;
    const rejected = ideas.filter((i) => i.status === "rejected").length;
    return { total, pending, accepted, rejected };
  }, [ideas]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  const STATUS_BADGES: Record<BackendProposal["status"], { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className:
        "bg-amber-500/15 text-amber-600 border border-amber-500/25 animate-pulse",
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-blue-500/15 text-blue-600 border border-blue-500/25",
    },
    accepted: {
      label: "Accepted",
      className:
        "bg-emerald-500/15 text-emerald-600 border border-emerald-500/25",
    },
    rejected: {
      label: "Rejected",
      className: "bg-rose-500/15 text-rose-600 border border-rose-500/25",
    },
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-border bg-secondary/10">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Suggested
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
        </Card>
        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
            Pending Review
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{stats.pending}</div>
        </Card>
        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            Accepted Ideas
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{stats.accepted}</div>
        </Card>
        <Card className="p-4 border-rose-500/20 bg-rose-500/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600">
            Rejected / Archived
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-600">{stats.rejected}</div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          💡 Student Suggested Ideas
          <Badge className="bg-brand/10 text-brand border border-brand/20 text-xs">
            {filtered.length}
          </Badge>
        </h2>
        <div className="flex items-center gap-1.5 rounded-lg bg-secondary/50 p-1">
          {["all", "pending", "reviewed", "accepted", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all ${
                filter === st
                  ? "bg-gradient-brand text-brand-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* List of proposed ideas */}
      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((idea) => {
          const authorLabel = idea.anonymous
            ? "Anonymous Student"
            : idea.user?.name || "Unknown Builder";
          const authorEmail = idea.anonymous ? null : idea.user?.email || null;
          const statusBadge = STATUS_BADGES[idea.status];

          return (
            <Card
              key={idea.id}
              className="group flex flex-col justify-between overflow-hidden border-border bg-card p-5 hover-lift transition-all animate-fade-in"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(idea.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground leading-snug">
                  {idea.title}
                </h3>
                <p className="mt-1.5 text-xs font-semibold text-brand/80">
                  Submitted by: {authorLabel} {authorEmail ? `(${authorEmail})` : ""}
                </p>

                <div className="mt-4 space-y-3 text-sm text-foreground/90">
                  <div className="rounded-lg bg-secondary/40 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Problem Statement
                    </span>
                    <p className="line-clamp-4 leading-relaxed">{idea.problem}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Why it matters
                    </span>
                    <p className="line-clamp-4 leading-relaxed">{idea.why}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-border p-2">
                    <span className="font-bold text-muted-foreground block">Team Skills</span>
                    <span className="truncate block mt-0.5">{idea.teamSkills || "Any"}</span>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <span className="font-bold text-muted-foreground block">Campus Relevance</span>
                    <span className="truncate block mt-0.5">
                      {idea.campusRelevance || "Global"}
                    </span>
                  </div>
                </div>

                {idea.adminComment && (
                  <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs">
                    <span className="font-bold text-brand block mb-1">Scope Admin Feedback</span>
                    <p className="text-muted-foreground leading-relaxed">{idea.adminComment}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-border/40 pt-4 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => openReview(idea)}
                  className="bg-gradient-brand text-brand-foreground shadow-brand"
                >
                  Review Proposal
                </Button>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">
              💡
            </div>
            <h3 className="text-lg font-bold text-foreground">No ideas suggested</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Student proposals in this filter will appear here once submitted.
            </p>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      {selectedIdea && (
        <Dialog open={true} onOpenChange={() => setSelectedIdea(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Review Idea: {selectedIdea.title}
              </DialogTitle>
              <DialogDescription>
                Provide status updates and direct feedback to the student builder.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm max-h-[400px] overflow-y-auto pr-2">
              <div className="rounded-lg bg-secondary/50 p-4">
                <div className="font-bold text-foreground">Idea Details</div>
                <div className="mt-2 grid gap-2">
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider font-bold">
                      Problem Statement
                    </span>
                    <p className="mt-0.5 text-foreground leading-relaxed">{selectedIdea.problem}</p>
                  </div>
                  <div className="mt-2">
                    <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider font-bold">
                      Why it matters
                    </span>
                    <p className="mt-0.5 text-foreground leading-relaxed">{selectedIdea.why}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="review-status"
                  className="font-bold text-xs uppercase tracking-wider text-muted-foreground block mb-2"
                >
                  Decision Status
                </Label>
                <select
                  id="review-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="reviewed">Reviewed (In Review)</option>
                  <option value="accepted">Accepted (Launch Proposal)</option>
                  <option value="rejected">Rejected / Archive</option>
                </select>
              </div>

              <div>
                <Label
                  htmlFor="admin-comment"
                  className="font-bold text-xs uppercase tracking-wider text-muted-foreground block mb-2"
                >
                  Scope Team Feedback (Sent to student)
                </Label>
                <Textarea
                  id="admin-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell the builder what we like, what needs changes, or what next steps are..."
                  rows={4}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setSelectedIdea(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={submitReview}
                disabled={submitting}
                className="bg-gradient-brand text-brand-foreground shadow-brand"
              >
                {submitting ? "Saving..." : "Save Review Decision"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Feedback Manager Component ──────────────────────────────────────────────
function FeedbackManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await backendAdminUsers.listFeedback();
      setItems(res.feedback || []);
    } catch (err) {
      toast.error("Failed to load user feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await backendAdminUsers.deleteFeedback(id);
      toast.success("Feedback entry archived/deleted.");
      await load();
    } catch (err) {
      toast.error("Failed to delete feedback entry.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusUpdate = async (id: string, status: "new" | "reviewed" | "closed") => {
    try {
      await backendAdminUsers.updateFeedbackStatus(id, status);
      toast.success("Status updated.");
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesType = filterType === "all" || item.type === filterType;
      const matchesRating = filterRating === "all" || item.rating === filterRating;
      const matchesSearch =
        !search ||
        item.message.toLowerCase().includes(search.toLowerCase()) ||
        (item.type && item.type.toLowerCase().includes(search.toLowerCase()));
      return matchesType && matchesRating && matchesSearch;
    });
  }, [items, filterType, filterRating, search]);

  const stats = useMemo(() => {
    const total = items.length;
    const ratings = items.filter((i) => i.rating != null).map((i) => i.rating);
    const avgRating = ratings.length
      ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
      : "0.0";
    const bugs = items.filter((i) => i.type === "Bug report").length;
    const features = items.filter((i) => i.type === "Feature request").length;
    return { total, avgRating, bugs, features };
  }, [items]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4 border-border bg-secondary/5 relative overflow-hidden group hover:border-border/80 transition-colors">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Feedbacks
          </div>
          <div className="mt-2 text-3xl font-extrabold text-foreground">{stats.total}</div>
          <div className="absolute right-3 bottom-3 text-muted-foreground/10 group-hover:scale-110 transition-transform">
            <MessageSquare className="h-12 w-12" />
          </div>
        </Card>
        <Card className="p-4 border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">
            Average Rating
          </div>
          <div className="mt-2 text-3xl font-extrabold text-cyan-500 flex items-baseline gap-1">
            {stats.avgRating} <span className="text-xs text-muted-foreground font-normal">/ 5</span>
          </div>
          <div className="absolute right-3 bottom-3 text-cyan-500/10 group-hover:scale-110 transition-transform">
            <Star className="h-12 w-12 fill-cyan-500/10" />
          </div>
        </Card>
        <Card className="p-4 border-rose-500/20 bg-rose-500/5 relative overflow-hidden group hover:border-rose-500/30 transition-colors">
          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
            Bug Reports
          </div>
          <div className="mt-2 text-3xl font-extrabold text-rose-500">
            {stats.bugs}
          </div>
          <div className="absolute right-3 bottom-3 text-rose-500/10 group-hover:scale-110 transition-transform">
            <ShieldAlert className="h-12 w-12" />
          </div>
        </Card>
        <Card className="p-4 border-amber-500/20 bg-amber-500/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
            Feature Requests
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-500">
            {stats.features}
          </div>
          <div className="absolute right-3 bottom-3 text-amber-500/10 group-hover:scale-110 transition-transform">
            <Zap className="h-12 w-12" />
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            💬 Platform User Feedback
            <Badge className="bg-brand/10 text-brand border border-brand/20 text-xs px-2.5 py-0.5 rounded-full">
              {filtered.length}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Read what students, faculty and guest builders suggest for improvement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <Input
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-48 bg-secondary/15 border-border/50 text-xs"
          />

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand/40"
          >
            <option value="all">All Categories</option>
            <option value="Feature request">Feature Requests</option>
            <option value="Bug report">Bug Reports</option>
            <option value="Opportunity Verification">Verification Requests</option>
            <option value="General suggestion">Suggestions</option>
            <option value="Other">Other</option>
          </select>

          {/* Rating Filter */}
          <select
            value={filterRating}
            onChange={(e) =>
              setFilterRating(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand/40"
          >
            <option value="all">All Ratings</option>
            <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
            <option value="4">⭐⭐⭐⭐ (4/5)</option>
            <option value="3">⭐⭐⭐ (3/5)</option>
            <option value="2">⭐⭐ (2/5)</option>
            <option value="1">⭐ (1/5)</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed border-muted-foreground/20 bg-secondary/5 rounded-xl">
          <div className="text-5xl mb-4 grayscale">💬</div>
          <h3 className="text-base font-bold text-foreground">No feedback entries found</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
            There are no feedback submissions matching your current search terms or category/rating
            filters.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={`group relative flex flex-col justify-between overflow-hidden border border-border/70 bg-gradient-to-b from-background to-secondary/10 p-5 hover:border-brand/40 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md rounded-xl ${
                item.status === "closed" ? "opacity-60 grayscale-[0.5]" : ""
              }`}
            >
              <div className="space-y-4">
                {/* Header details */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {item.user && (
                      <span className="text-[10px] font-bold text-brand truncate max-w-[120px]">
                        {item.user.name}
                      </span>
                    )}
                    {item.institution && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">
                        {item.institution.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex gap-1.5">
                      {item.type && (
                        <Badge
                          className={`text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                            item.type === "Bug report"
                              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              : item.type === "Feature request"
                                ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20"
                                : "bg-secondary text-foreground border border-border/40"
                          }`}
                        >
                          {item.type}
                        </Badge>
                      )}
                      <Badge
                        className={`text-[9px] px-2 py-0.5 border border-border/40 rounded-full ${
                          item.status === "new"
                            ? "bg-brand/10 text-brand"
                            : item.status === "reviewed"
                              ? "bg-amber-500/10 text-amber-500"
                              : item.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : item.status === "rejected"
                                  ? "bg-rose-500/10 text-rose-500"
                                  : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>
                    <Badge className="text-[9px] px-2 py-0.5 bg-secondary/80 text-muted-foreground border border-border/40 rounded-full">
                      {item.source === "feedback_widget" ? "Widget" : "Page"}
                    </Badge>
                  </div>
                </div>

                {/* Rating stars rendering */}
                {item.rating != null && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 transition-colors ${
                          star <= item.rating
                            ? "fill-brand text-brand"
                            : "text-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Message body */}
                <p className="text-sm text-foreground/80 leading-relaxed font-normal italic whitespace-pre-wrap select-text">
                  "{item.message}"
                </p>
              </div>

              {/* Action/Delete footer bar */}
              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3">
                <select
                  value={item.status}
                  onChange={(e) => handleStatusUpdate(item.id, e.target.value as any)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-[10px] font-bold uppercase focus:outline-none focus:ring-1 focus:ring-brand/40"
                >
                  <option value="new">New</option>
                  <option value="reviewed">In Review</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="closed">Closed</option>
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                  className="h-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 text-xs px-2.5 rounded-lg transition-colors"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {deletingId === item.id ? "Archiving..." : "Archive"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Student Verification Center Component ───────────────────────────────────
function StudentVerificationCenter() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await backendAdminUsers.listFeedback();
      const verifications = (res.feedback || []).filter(
        (item: any) => item.kind === "opportunity_verification",
      );
      setItems(verifications);
    } catch (err) {
      toast.error("Failed to load student verification requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusUpdate = async (id: string, status: "verified" | "rejected") => {
    setProcessingId(id);
    try {
      await backendAdminUsers.updateFeedbackStatus(id, status);
      toast.success(
        status === "verified"
          ? "Student successfully verified and opportunities unlocked!"
          : "Student verification request marked as rejected.",
      );
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch (err) {
      toast.error("Failed to update verification status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to archive this verification request?")) return;
    setProcessingId(id);
    try {
      await backendAdminUsers.deleteFeedback(id);
      toast.success("Verification request archived.");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error("Failed to archive verification request.");
    } finally {
      setProcessingId(null);
    }
  };

  const parsedItems = useMemo(() => {
    return items.map((item) => {
      const links = parseVerificationMessage(item.message);
      return {
        ...item,
        parsedLinks: links,
      };
    });
  }, [items]);

  const filtered = useMemo(() => {
    return parsedItems.filter((item) => {
      // Status matching
      let matchesStatus = true;
      if (filterStatus === "pending") {
        matchesStatus = item.status === "new" || item.status === "reviewed";
      } else if (filterStatus !== "all") {
        matchesStatus = item.status === filterStatus;
      }

      // Search matching
      const query = search.toLowerCase();
      const matchesSearch =
        !search ||
        (item.user?.name || "").toLowerCase().includes(query) ||
        (item.user?.email || "").toLowerCase().includes(query) ||
        (item.institution?.name || "").toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [parsedItems, filterStatus, search]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === "new" || i.status === "reviewed").length;
    const verified = items.filter((i) => i.status === "verified").length;
    const rejected = items.filter((i) => i.status === "rejected").length;
    return { total, pending, verified, rejected };
  }, [items]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4 border-border bg-secondary/5 relative overflow-hidden group hover:border-border/80 transition-colors">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Requests
          </div>
          <div className="mt-2 text-3xl font-extrabold text-foreground">{stats.total}</div>
          <div className="absolute right-3 bottom-3 text-muted-foreground/10 group-hover:scale-110 transition-transform">
            <BadgeCheck className="h-12 w-12" />
          </div>
        </Card>
        <Card className="p-4 border-amber-500/20 bg-amber-500/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
            Pending Review
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-500">
            {stats.pending}
          </div>
          <div className="absolute right-3 bottom-3 text-amber-500/10 group-hover:scale-110 transition-transform">
            <Clock className="h-12 w-12" />
          </div>
        </Card>
        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            Verified Builders
          </div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-500">
            {stats.verified}
          </div>
          <div className="absolute right-3 bottom-3 text-emerald-500/10 group-hover:scale-110 transition-transform">
            <Award className="h-12 w-12 fill-emerald-500/10" />
          </div>
        </Card>
        <Card className="p-4 border-rose-500/20 bg-rose-500/5 relative overflow-hidden group hover:border-rose-500/30 transition-colors">
          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
            Rejected Portfolios
          </div>
          <div className="mt-2 text-3xl font-extrabold text-rose-500">
            {stats.rejected}
          </div>
          <div className="absolute right-3 bottom-3 text-rose-500/10 group-hover:scale-110 transition-transform">
            <Ban className="h-12 w-12" />
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🛡️ Student Verification Center
            <Badge className="bg-brand/10 text-brand border border-brand/20 text-xs px-2.5 py-0.5 rounded-full">
              {filtered.length}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review, verify, and approve student portfolios to grant opportunities page access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search name or campus..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 pr-4 w-full sm:w-48 bg-secondary/15 border-border/50 text-xs"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand/40"
          >
            <option value="all">All Submissions</option>
            <option value="pending">Pending Review</option>
            <option value="verified">Verified Builders</option>
            <option value="rejected">Rejected Requests</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed border-muted-foreground/20 bg-secondary/5 rounded-xl">
          <BadgeCheck className="h-12 w-12 mb-4 text-muted-foreground/30" />
          <h3 className="text-base font-bold text-foreground">No verification requests found</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
            There are no student portfolio submissions matching your search queries or status
            filters.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const l = item.parsedLinks;
            const hasPortfolio =
              l.github || l.linkedin || l.website || l.portfolio || l.resume || l.portfolioPdf;

            return (
              <Card
                key={item.id}
                className={`group relative flex flex-col justify-between overflow-hidden border border-border/70 bg-gradient-to-b from-background to-secondary/10 p-5 hover:border-brand/45 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md rounded-xl ${
                  item.status === "verified"
                    ? "border-emerald-500/20 bg-emerald-950/5"
                    : item.status === "rejected"
                      ? "opacity-60 grayscale-[0.4]"
                      : ""
                }`}
              >
                <div className="space-y-4">
                  {/* Header details */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <h3
                        className="font-bold text-foreground text-base mt-1 truncate max-w-[170px]"
                        title={item.user?.name}
                      >
                        {item.user?.name || "Anonymous Student"}
                      </h3>
                      <p
                        className="text-[10px] text-brand font-medium truncate max-w-[170px]"
                        title={item.user?.email}
                      >
                        {item.user?.email}
                      </p>
                      {item.institution && (
                        <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5 truncate max-w-[170px]">
                          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          {item.institution.name}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge
                        className={`text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${
                          item.status === "verified"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : item.status === "rejected"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {item.status === "new" || item.status === "reviewed"
                          ? "Pending"
                          : item.status}
                      </Badge>
                      <Badge className="text-[9px] px-2 py-0.5 bg-secondary text-muted-foreground border border-border/30 rounded-full font-semibold">
                        Builder Profile
                      </Badge>
                    </div>
                  </div>

                  {/* Portfolio Credentials Grid */}
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Submitted Portfolio Links
                    </div>
                    {hasPortfolio ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {l.github && (
                          <a
                            href={l.github}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2 py-1.5 hover:bg-secondary hover:border-brand/40 text-foreground transition-all truncate"
                          >
                            <Github className="h-3.5 w-3.5 shrink-0 text-foreground" />
                            <span className="truncate">GitHub</span>
                          </a>
                        )}
                        {l.linkedin && (
                          <a
                            href={l.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2 py-1.5 hover:bg-secondary hover:border-brand/40 text-foreground transition-all truncate"
                          >
                            <Linkedin className="h-3.5 w-3.5 shrink-0 text-[#0077b5]" />
                            <span className="truncate">LinkedIn</span>
                          </a>
                        )}
                        {l.website && (
                          <a
                            href={l.website}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2 py-1.5 hover:bg-secondary hover:border-brand/40 text-foreground transition-all truncate"
                          >
                            <Globe className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                            <span className="truncate">Website</span>
                          </a>
                        )}
                        {l.portfolio && (
                          <a
                            href={l.portfolio}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2 py-1.5 hover:bg-secondary hover:border-brand/40 text-foreground transition-all truncate"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span className="truncate">Portfolio Page</span>
                          </a>
                        )}
                        {l.resume && (
                          <a
                            href={l.resume}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2 py-1.5 hover:bg-secondary hover:border-brand/40 text-foreground transition-all truncate"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            <span className="truncate">CV / Resume</span>
                          </a>
                        )}
                        {l.portfolioPdf && (
                          <a
                            href={l.portfolioPdf}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2 py-1.5 hover:bg-secondary hover:border-brand/40 text-foreground transition-all truncate"
                          >
                            <FileUp className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                            <span className="truncate">Portfolio PDF</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic bg-secondary/10 rounded-lg p-3 text-center">
                        No active portfolio URLs attached to this request.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer verification controls */}
                <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3 gap-2">
                  <div className="flex gap-1.5">
                    {item.status !== "verified" && (
                      <Button
                        size="sm"
                        disabled={processingId === item.id}
                        onClick={() => handleStatusUpdate(item.id, "verified")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-8 px-2.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Verify
                      </Button>
                    )}
                    {item.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingId === item.id}
                        onClick={() => handleStatusUpdate(item.id, "rejected")}
                        className="border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-bold text-[10px] h-8 px-2.5 rounded-lg transition-all flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={processingId === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="h-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 text-[10px] px-2.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function parseVerificationMessage(message: string) {
  const defaultLinks = {
    website: "",
    github: "",
    linkedin: "",
    portfolio: "",
    resume: "",
    portfolioPdf: "",
    portfolioLinks: {} as Record<string, string>,
  };

  try {
    const idx = message.indexOf("Portfolio Links:");
    if (idx === -1) return defaultLinks;
    const jsonStr = message.slice(idx + "Portfolio Links:".length).trim();
    const parsed = JSON.parse(jsonStr);
    return {
      website: parsed.website || "",
      github: parsed.github || "",
      linkedin: parsed.linkedin || "",
      portfolio: parsed.portfolio || "",
      resume: parsed.resume || "",
      portfolioPdf: parsed.portfolioPdf || "",
      portfolioLinks: parsed.portfolioLinks || {},
    };
  } catch (err) {
    console.warn("Failed to parse verification message links", err);
    return defaultLinks;
  }
}
