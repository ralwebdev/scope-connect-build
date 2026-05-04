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
  useXP, useLevel, useLevelProgress, useStreak, useProfileStrength,
} from "@/hooks/use-scope";
import type { RoleId } from "@/lib/rbac";
import { cn } from "@/lib/utils";

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
      className="flex items-center gap-1.5 rounded-full px-2 py-1"
      title={kpi.hint ?? `${kpi.label}: ${kpi.value}`}
    >
      <span style={{ color: "var(--nav-glow)" }} className="flex items-center"><Icon className="h-3.5 w-3.5 shrink-0" /></span>
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-xs font-semibold tabular-nums text-foreground">{kpi.value}</span>
        <span className="hidden text-[10px] uppercase tracking-wide text-muted-foreground lg:inline">
          {kpi.label}
        </span>
      </div>
      {typeof kpi.progress === "number" && (
        <div className="hidden h-1 w-10 overflow-hidden rounded-full bg-secondary lg:block">
          <div
            className="h-full transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, kpi.progress))}%`, background: "var(--nav-glow)" }}
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
    <div className="hidden items-center gap-1 rounded-full border border-border/40 bg-secondary/40 px-1.5 py-0.5 md:flex">
      {kpis.map((k, i) => (
        <div key={k.key} className="flex items-center">
          <Chip kpi={k} />
          {i < kpis.length - 1 && (
            <span className="mx-0.5 hidden h-3 w-px bg-border/60 lg:inline-block" />
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

export function InstitutionKpis() {
  return (
    <MetricsRail
      kpis={[
        { key: "chapters", icon: MapPin, label: "Chapters", value: "12" },
        { key: "users", icon: Users, label: "Users", value: "3.4k" },
        { key: "engagement", icon: Activity, label: "Engagement", value: "62%", progress: 62 },
        { key: "projects", icon: Building2, label: "Projects", value: "48" },
      ]}
    />
  );
}

export function ScopeAdminKpis() {
  return (
    <MetricsRail
      kpis={[
        { key: "leads", icon: Target, label: "Leads", value: "37" },
        { key: "meetings", icon: Calendar, label: "Meetings", value: "11" },
        { key: "mous", icon: Handshake, label: "MoUs", value: "6" },
        { key: "target", icon: BarChart3, label: "Target", value: "72%", progress: 72 },
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
