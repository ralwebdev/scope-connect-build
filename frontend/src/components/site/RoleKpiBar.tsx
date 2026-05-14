// 🧠 Role-aware KPI bar shown in the center of the floating Navbar.
//
// CRITICAL: This component is the single source of truth for what KPIs each
// role sees in the navbar. Student/viewer roles get growth-oriented progress
// (XP, level, streak, profile %). Every other role gets metrics relevant to
// their job. NO admin role ever renders student gamification widgets.
//
// All KPI surfaces share the same visual shape (chip with icon + label +
// value) so the layout stays identical across roles — only the content
// changes. This makes role leakage structurally impossible.
import {
  Trophy, Zap, Flame, Users, ClipboardList, Calendar, MapPin, Building2,
  Activity, BarChart3, Target, Handshake, FileSignature, TrendingUp,
  AlertTriangle, IndianRupee, UserCheck, FileBarChart,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useXP, useLevel, useLevelProgress, useStreak, useProfileStrength, useStoreValue,
} from "@/hooks/use-scope";
import type { RoleId } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-scope";
import { backendProjects, backendUsers } from "@/lib/api/endpoints";

type Kpi = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  /** Optional small bar (0–100) shown under the value. */
  progress?: number;
};

function Chip({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors hover:bg-secondary/30"
      title={kpi.hint ?? `${kpi.label}: ${kpi.value}`}
    >
      <span className="flex items-center text-indigo-400/90"><Icon className="h-3.5 w-3.5 shrink-0" /></span>
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-[12px] font-bold tabular-nums text-[#1a1a1a] dark:text-foreground">{kpi.value}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
          {kpi.label}
        </span>
      </div>
      {typeof kpi.progress === "number" && (
        <div className="ml-1 hidden h-1 w-10 overflow-hidden rounded-full bg-secondary/60 lg:block">
          <div
            className="h-full bg-blue-500/80 transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, kpi.progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------- Student / Viewer — Growth psychology ---------------- */
export function StudentKpis() {
  const xpTotal = useXP();
  const level = useLevel();
  const levelProgress = useLevelProgress();
  const streak = useStreak();
  const strength = useProfileStrength();

  // Subtle burst when level changes or profile hits 100%.
  const [burst, setBurst] = useState(false);
  const lastLevel = useRef(level.name);
  useEffect(() => {
    if (lastLevel.current !== level.name) {
      lastLevel.current = level.name;
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 1200);
      return () => clearTimeout(t);
    }
  }, [level.name]);
  useEffect(() => {
    if (strength === 100) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 1200);
      return () => clearTimeout(t);
    }
  }, [strength]);

  return (
    <div className={cn("hidden items-center gap-1.5 rounded-full border border-border/40 bg-secondary/40 px-2 py-0.5 md:flex", burst && "animate-nav-burst")}>
      {/* Profile completion ring */}
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full" title={`Profile ${strength}% complete`}>
        <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15" fill="none"
            stroke="var(--nav-glow, currentColor)" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(strength / 100) * 94.2} 94.2`}
            style={{ transition: "stroke-dasharray 600ms ease-out" }}
          />
        </svg>
        <span className="text-[9px] font-bold tabular-nums text-foreground">{strength}</span>
      </div>
      {/* Level */}
      <div className="flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5" style={{ color: "var(--nav-glow)" }} />
        <span className="text-xs font-semibold text-foreground">{level.name}</span>
        <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-secondary lg:block">
          <div
            className="h-full transition-[width] duration-500"
            style={{ width: `${levelProgress}%`, background: "var(--nav-glow)" }}
          />
        </div>
      </div>
      {/* XP */}
      <div className="hidden items-center gap-1 text-xs font-semibold text-foreground lg:flex">
        <Zap className="h-3 w-3" style={{ color: "var(--nav-glow)" }} />
        <span className="tabular-nums">{xpTotal.toLocaleString()}</span>
        <span className="text-muted-foreground">XP</span>
      </div>
      {/* Streak */}
      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
        <Flame className={cn("h-3 w-3", streak >= 3 && "animate-flame-pulse")} style={{ color: "var(--nav-glow)" }} />
        <span className="tabular-nums">{streak}d</span>
      </div>
    </div>
  );
}

/* ---------------- Reusable metrics rail (admin roles) ---------------- */
function MetricsRail({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="hidden items-center gap-0 rounded-full border border-border/20 bg-secondary/10 px-1.5 py-0.5 backdrop-blur-sm md:flex">
      {kpis.map((k, i) => (
        <div key={k.key} className="flex items-center">
          <Chip kpi={k} />
          {i < kpis.length - 1 && (
            <span className="mx-0.5 h-3 w-px bg-border/30" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Per-role KPI sets (mock-aware) ---------------- */
export function CampusLeaderKpis() {
  return (
    <MetricsRail
      kpis={[
        { key: "rank", icon: Trophy, label: "Rank", value: "#7" },
        { key: "members", icon: Users, label: "Members", value: "142" },
        { key: "pending", icon: ClipboardList, label: "Pending", value: "9" },
        { key: "events", icon: Calendar, label: "Events", value: "4" },
      ]}
    />
  );
}

export function FacultyKpis() {
  return (
    <MetricsRail
      kpis={[
        { key: "verified", icon: UserCheck, label: "Verified", value: "286" },
        { key: "pending", icon: ClipboardList, label: "Pending", value: "12" },
        { key: "trend", icon: TrendingUp, label: "Trend", value: "+8%" },
        { key: "reports", icon: FileBarChart, label: "Reports", value: "3" },
      ]}
    />
  );
}

import { crm } from "@/lib/crm-store";

export function InstitutionKpis() {
  const user = useUser();
  const institutionId = user?.institution?.id;
  const [stats, setStats] = useState({
    chapters: crm.institutions().length,
    users: 0,
    engagement: 0,
    projects: 0,
  });

  useEffect(() => {
    // Initial sync
    setStats(prev => ({ ...prev, chapters: crm.institutions().length }));

    if (!institutionId) return;
    let cancelled = false;
    Promise.all([
      backendUsers.list({ institutionId, role: "student" }),
      backendProjects.list(),
    ])
      .then(([users, projects]) => {
        if (cancelled) return;
        const members = users.items;
        const activeMembers = members.filter((member) => member.student_status === "active").length;
        const engagement = members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0;
        
        // Count only projects that belong to this institution
        const institutionProjectsCount = projects.items.filter((p) => p.institution_id === institutionId).length;

        setStats({
          chapters: crm.institutions().length,
          users: members.length,
          engagement: engagement,
          projects: institutionProjectsCount,
        });
      })
      .catch(() => {
        if (!cancelled) setStats({ chapters: crm.institutions().length, users: 0, engagement: 0, projects: 0 });
      });
    return () => { cancelled = true; };
  }, [institutionId]);

  return (
    <MetricsRail
      kpis={[
        { key: "chapters", icon: MapPin, label: "Chapters", value: String(stats.chapters) },
        { key: "users", icon: Users, label: "Users", value: stats.users >= 1000 ? `${(stats.users / 1000).toFixed(1)}k` : stats.users.toLocaleString() },
        { key: "engagement", icon: Activity, label: "Engagement", value: `${stats.engagement}%`, progress: stats.engagement },
        { key: "projects", icon: Building2, label: "Projects", value: String(stats.projects) },
      ]}
    />
  );
}

export function ScopeAdminKpis() {
  const user = useUser();
  const all = useStoreValue(() => crm.all());
  
  // Calculate real metrics from the crm store
  const leads = all.institutions.length;
  const meetings = all.visits.length;
  const mous = all.institutions.filter((i) =>
    ["MoU Signed", "Launch Pending", "Live Chapter"].includes(i.stage),
  ).length;

  // Derive target progress from the current admin profile
  const myProfile = all.admins.find((a) => a.id === user?.id);
  const targetGoal = myProfile?.target || 6;
  const targetPercent = targetGoal > 0 ? Math.round((mous / targetGoal) * 100) : 0;

  return (
    <MetricsRail
      kpis={[
        { key: "leads", icon: Target, label: "Leads", value: String(leads) },
        { key: "meetings", icon: Calendar, label: "Meetings", value: String(meetings) },
        { key: "mous", icon: Handshake, label: "MoUs", value: String(mous) },
        { key: "target", icon: BarChart3, label: "Target", value: `${targetPercent}%`, progress: targetPercent },
      ]}
    />
  );
}

export function SuperAdminKpis() {
  return (
    <MetricsRail
      kpis={[
        { key: "users", icon: Users, label: "Users", value: "12.4k" },
        { key: "dau", icon: Activity, label: "DAU", value: "2.1k" },
        { key: "wau", icon: TrendingUp, label: "WAU", value: "7.8k" },
        { key: "revenue", icon: IndianRupee, label: "Revenue", value: "₹4.2L" },
        { key: "alerts", icon: AlertTriangle, label: "Alerts", value: "2" },
      ]}
    />
  );
}

export function GenericAdminKpis() {
  // Regional / campus / content / growth / support — operational summary.
  return (
    <MetricsRail
      kpis={[
        { key: "tasks", icon: ClipboardList, label: "Tasks", value: "8" },
        { key: "events", icon: Calendar, label: "Events", value: "3" },
        { key: "trend", icon: TrendingUp, label: "Trend", value: "+5%" },
        { key: "alerts", icon: AlertTriangle, label: "Alerts", value: "0" },
      ]}
    />
  );
}

/* ---------------- Public dispatcher ---------------- */
export function RoleKpiBar({ role }: { role: RoleId }) {
  switch (role) {
    case "student":
    case "viewer":
      return <StudentKpis />;
    case "campus_leader":
      return <CampusLeaderKpis />;
    case "faculty_coordinator":
      return <FacultyKpis />;
    case "institutional_admin":
      return <InstitutionKpis />;
    case "scope_admin":
      return <ScopeAdminKpis />;
    case "scope_super_admin":
    case "super_admin":
      return <SuperAdminKpis />;
    case "regional_admin":
    case "campus_admin":
    case "content_admin":
    case "growth_admin":
    case "support_admin":
      return <GenericAdminKpis />;
    default:
      return null;
  }
}
