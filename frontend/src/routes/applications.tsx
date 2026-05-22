// Application Tracking Center — student-facing full-page view of all their
// project applications with real-time status, submission tracking, and filters.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Briefcase, CheckCircle2, Clock, XCircle, ArrowRight,
  Search, AlertTriangle, Rocket, Calendar, ChevronDown, ExternalLink,
  Github, FileText, Trophy, Zap, RefreshCw, Eye,
} from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-scope";
import { auth } from "@/lib/scope-store";
import { backendApplications, backendProjects, type BackendApplication, type BackendProject } from "@/lib/api/endpoints";
import { toast } from "sonner";

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const Route = createFileRoute("/applications")({
  head: () => ({
    meta: [
      { title: "My Applications — Scope Connect" },
      { name: "description", content: "Track all your project applications, submission status and results in one place." },
    ],
  }),
  component: () => <AuthGate><ApplicationTrackingCenter /></AuthGate>,
});

type AppStatus = BackendApplication["status"];
type FilterStatus = AppStatus | "all";

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; badgeClass: string; icon: React.ComponentType<{ className?: string }>; progress: number }> = {
  pending:     { label: "Under Review",  color: "text-amber-500",   badgeClass: "border-amber-500/30 bg-amber-500/5 text-amber-500",   icon: Clock,        progress: 25 },
  shortlisted: { label: "Shortlisted",   color: "text-cyan-500",    badgeClass: "border-cyan-500/30 bg-cyan-500/5 text-cyan-500",     icon: Zap,          progress: 60 },
  accepted:    { label: "Accepted 🎉",   color: "text-emerald-500", badgeClass: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500", icon: CheckCircle2, progress: 100 },
  rejected:    { label: "Not Selected",  color: "text-rose-500",    badgeClass: "border-rose-500/30 bg-rose-500/5 text-rose-500",     icon: XCircle,      progress: 100 },
  withdrawn:   { label: "Withdrawn",     color: "text-muted-foreground", badgeClass: "border-border bg-secondary/30 text-muted-foreground", icon: FileText,     progress: 100 },
};

const SUBMISSION_CONFIG = {
  not_submitted: { label: "Not Submitted", class: "text-muted-foreground" },
  submitted:     { label: "Submitted ✓",   class: "text-cyan-500" },
  passed:        { label: "Passed 🏆",      class: "text-emerald-500" },
  needs_changes: { label: "Needs Changes",  class: "text-amber-500" },
};

function ApplicationTrackingCenter() {
  const user = useUser();
  const [applications, setApplications] = useState<BackendApplication[]>([]);
  const [projects, setProjects] = useState<Map<string, BackendProject>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsRes, projectsRes] = await Promise.allSettled([
        backendApplications.listMe(),
        backendProjects.list(),
      ]);

      let apps: BackendApplication[] = [];
      if (appsRes.status === "fulfilled") {
        apps = appsRes.value.items;
        setApplications(apps);
      }

      if (projectsRes.status === "fulfilled") {
        const map = new Map<string, BackendProject>();
        projectsRes.value.items.forEach(p => map.set(p.id, p));
        setProjects(map);
      }
      // Refresh current user stats to synchronize XP UI count immediately
      auth.refreshCurrentUser().catch(() => null);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:       applications.length,
    pending:     applications.filter(a => a.status === "pending").length,
    shortlisted: applications.filter(a => a.status === "shortlisted").length,
    accepted:    applications.filter(a => a.status === "accepted").length,
    rejected:    applications.filter(a => a.status === "rejected").length,
  };
  const successRate = stats.total > 0
    ? Math.round(((stats.accepted + stats.shortlisted) / stats.total) * 100)
    : 0;

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = applications.filter(a => {
    const project = projects.get(a.project_id);
    const matchesStatus = filterStatus === "all" || a.status === filterStatus;
    const matchesSearch = !searchQuery
      || (project?.title ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      || (project?.domain ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filterButtons: { value: FilterStatus; label: string }[] = [
    { value: "all",         label: `All (${stats.total})` },
    { value: "pending",     label: `Under Review (${stats.pending})` },
    { value: "shortlisted", label: `Shortlisted (${stats.shortlisted})` },
    { value: "accepted",    label: `Accepted (${stats.accepted})` },
    { value: "rejected",    label: `Not Selected (${stats.rejected})` },
  ];

  return (
    <AppShell>
      {/* ── Hero Header ── */}
      <section className="bg-gradient-hero py-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,209,255,0.12),transparent_60%)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20 mb-3">
                <Briefcase className="mr-1.5 h-3 w-3" /> Application Tracker
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                My Applications
              </h1>
              <p className="mt-2 text-sm text-primary-foreground/70 max-w-xl">
                Track every project application — from submission to outcome — in one unified dashboard.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
              </Button>
              <Button asChild className="bg-gradient-brand text-brand-foreground shadow-brand">
                <Link to="/projects">
                  Browse Projects <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Total Applied",  value: stats.total,       color: "text-white" },
              { label: "Under Review",   value: stats.pending,     color: "text-amber-400" },
              { label: "Shortlisted",    value: stats.shortlisted, color: "text-cyan-400" },
              { label: "Accepted",       value: stats.accepted,    color: "text-emerald-400" },
              { label: "Success Rate",   value: `${successRate}%`, color: "text-brand" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 backdrop-blur-sm">
                <div className="text-xs text-primary-foreground/60">{label}</div>
                <div className={`mt-1 text-2xl font-black ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ── Filters & Search ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterStatus === value
                    ? "border-brand bg-brand/10 text-brand shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-brand/40 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-9 h-9 text-sm bg-secondary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <Card key={n} className="p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary rounded w-2/3" />
                    <div className="h-3 bg-secondary rounded w-1/3" />
                  </div>
                  <div className="h-6 w-24 bg-secondary rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <Card className="border-dashed border-border p-16 text-center bg-secondary/10">
            <Rocket className="mx-auto h-14 w-14 text-muted-foreground/40 mb-5" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              {applications.length === 0 ? "No applications yet" : "No matches found"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {applications.length === 0
                ? "Your application tracking center is empty. Start by browsing live projects and submitting your first application."
                : "Try adjusting your filters or search query."}
            </p>
            {applications.length === 0 && (
              <Button asChild className="bg-gradient-brand text-brand-foreground shadow-brand">
                <Link to="/projects">Explore Live Projects <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            )}
          </Card>
        )}

        {/* ── Application Cards ── */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((app) => {
              const project = projects.get(app.project_id);
              const statusCfg = STATUS_CONFIG[app.status];
              const submCfg = SUBMISSION_CONFIG[app.submission_review_status];
              const StatusIcon = statusCfg.icon;
              const isExpanded = expandedId === app.id;

              return (
                <Card
                  key={app.id}
                  className="overflow-hidden border-border hover:border-brand/30 transition-all duration-200 hover:shadow-md group"
                >
                  {/* ── Progress Bar Strip ── */}
                  <div
                    className={`h-0.5 w-full transition-all duration-500 ${
                      app.status === "accepted"    ? "bg-emerald-500" :
                      app.status === "shortlisted" ? "bg-cyan-500" :
                      app.status === "rejected"    ? "bg-rose-500/40" :
                      "bg-brand/30"
                    }`}
                    style={{ width: `${statusCfg.progress}%` }}
                  />

                  <div className="p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      {/* ── Project Icon ── */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-brand/20 text-2xl shadow-sm ring-1 ring-brand/10 group-hover:scale-105 transition-transform">
                        {project?.domain?.toLowerCase().includes("ai") ? "🤖" :
                         project?.domain?.toLowerCase().includes("design") ? "🎨" :
                         project?.domain?.toLowerCase().includes("data") ? "📊" :
                         project?.domain?.toLowerCase().includes("web") ? "🌐" :
                         project?.domain?.toLowerCase().includes("mobile") ? "📱" : "🚀"}
                      </div>

                      {/* ── Project Info ── */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground truncate group-hover:text-brand transition-colors">
                            {project?.title ?? "Project"}
                          </h3>
                          {project?.domain && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {project.domain}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {project?.summary ?? project?.description ?? "Campus or Scope project"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                          Applied {timeAgo(app.created_at)}
                          </span>
                          <span className={`flex items-center gap-1 ${submCfg.class}`}>
                            <FileText className="h-3 w-3 shrink-0" />
                            {submCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* ── Status Badge & Toggle ── */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold ${statusCfg.badgeClass}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </Badge>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : app.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-brand/40 hover:text-brand transition-all"
                          title={isExpanded ? "Collapse" : "View details"}
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* ── Progress Tracker ── */}
                    <div className="mt-4 flex items-center gap-1.5">
                      {(["pending", "shortlisted", "accepted"] as AppStatus[]).map((step, i) => {
                        const stepProgress: Partial<Record<AppStatus, number>> = { pending: 1, shortlisted: 2, accepted: 3 };
                        const currentProgress = app.status === "rejected" ? 1.5 : app.status === "withdrawn" ? 1 : (stepProgress[app.status] ?? 1);
                        const filledStep = stepProgress[step as AppStatus] ?? 0;
                        const filled = filledStep <= currentProgress;
                        const isLast = i === 2;
                        return (
                          <div key={step} className="flex items-center gap-1.5 flex-1">
                            <div className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
                              filled
                                ? app.status === "rejected" ? "border-rose-500 bg-rose-500/10 text-rose-500" : "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                                : "border-border bg-background text-muted-foreground"
                            }`}>
                              {filled ? (app.status === "rejected" && step === "pending" ? "!" : "✓") : i + 1}
                            </div>
                            <span className={`text-[10px] font-medium ${filled ? "text-foreground" : "text-muted-foreground"}`}>
                              {step === "pending" ? "Applied" : step === "shortlisted" ? "Shortlisted" : "Accepted"}
                            </span>
                            {!isLast && (
                              <div className={`flex-1 h-px ${filled ? "bg-emerald-500/40" : "bg-border"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Expanded Detail Panel ── */}
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-border space-y-4">
                        {/* Message sent */}
                        {app.message && (
                          <div className="rounded-xl bg-secondary/30 p-4 border border-border/60">
                            <div className="text-xs font-semibold text-muted-foreground mb-1.5">Your Application Message</div>
                            <p className="text-sm text-foreground leading-relaxed">{app.message}</p>
                          </div>
                        )}

                        {/* Submission links */}
                        {app.submission && (app.submission.live_url || app.submission.github_url) && (
                          <div className="rounded-xl bg-brand/5 border border-brand/20 p-4">
                            <div className="text-xs font-semibold text-brand mb-3 flex items-center gap-1.5">
                              <Rocket className="h-3 w-3" /> Submitted Work
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {app.submission.live_url && (
                                <a
                                  href={app.submission.live_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs font-medium text-cyan hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> Live Demo
                                </a>
                              )}
                              {app.submission.github_url && (
                                <a
                                  href={app.submission.github_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-brand hover:underline"
                                >
                                  <Github className="h-3.5 w-3.5" /> GitHub Repo
                                </a>
                              )}
                            </div>
                            {app.submission.notes && (
                              <p className="mt-2 text-xs text-muted-foreground">{app.submission.notes}</p>
                            )}
                          </div>
                        )}

                        {/* Admin comment */}
                        {app.submission?.admin_comment && (
                          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 mb-1.5">
                              <AlertTriangle className="h-3 w-3" /> Reviewer Feedback
                            </div>
                            <p className="text-sm text-foreground">{app.submission.admin_comment}</p>
                          </div>
                        )}

                        {/* Accepted — motivational */}
                        {app.status === "accepted" && (
                          <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan/10 border border-emerald-500/20 p-4 flex items-center gap-3">
                            <Trophy className="h-8 w-8 text-emerald-500 shrink-0" />
                            <div>
                              <div className="font-bold text-emerald-500 text-sm">Congratulations! 🎉</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Your application has been accepted. Check your notifications for the next steps.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {project && (
                            <Button asChild size="sm" variant="outline" className="text-xs">
                              <Link to="/projects">
                                <Eye className="mr-1.5 h-3.5 w-3.5" /> View Project
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Bottom CTA ── */}
        {!loading && applications.length > 0 && (
          <div className="mt-10 rounded-2xl border border-border bg-gradient-to-r from-brand/5 to-cyan/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-foreground">Keep the momentum going</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Explore more live projects and increase your chances of getting accepted.
              </div>
            </div>
            <Button asChild className="shrink-0 bg-gradient-brand text-brand-foreground shadow-brand">
              <Link to="/projects">Browse More Projects <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
