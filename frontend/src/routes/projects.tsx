import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Rocket, Sparkles, ShieldCheck, MapPin, Globe2, Briefcase, Clock, Users,
  Bookmark, BookmarkCheck, Share2, Lightbulb, Check, X, Lock, ArrowRight, Flame, Coins, Trophy, Copy, CheckCheck
} from "lucide-react";
import { ChallengeCountdown } from "@/components/site/ChallengeCountdown";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AppShell } from "@/components/site/AppShell";
import { ConfettiBurst } from "@/components/site/Effects";
import { TrustFAQ } from "@/components/site/TrustFAQ";
import { ScopeVerifiedBadge } from "@/components/site/ScopeVerifiedBadge";
import { PublishedStrip } from "@/components/governance/PublishedStrip";
import {
  useIsLoggedIn, useUser,
} from "@/hooks/use-scope";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { backendProjects, backendApplications, backendReports, backendUpload, backendProposals, backendUsers, type BackendApplication, type BackendProjectRoom, type BackendProjectTask } from "@/lib/api/endpoints";
import { ApiException } from "@/lib/api/client";
import { auth } from "@/lib/scope-store";
import { useRole } from "@/hooks/use-rbac";
import { useFeature } from "@/hooks/use-platform";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects & Opportunities — Scope Connect" },
      { name: "description", content: "Curated live challenges, campus opportunities and open builds — launched by Scope." },
    ],
  }),
  component: ProjectsPage,
});

type CuratedProject = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  timeline: string;
  seatsTotal: number;
  seatsFilled: number;
  skills: string[];
  rewards: string;
  status: "live" | "closing-soon" | "closed";
  cover: string;
  postedBy: string;
  scope: "scope" | "campus" | "open";
  campus?: string;
  endsAt?: number;
  votes?: number;
  userVoted?: boolean;
  entryXpRequired?: number;
  xpCommitmentStake?: number;
};

type ProjectApplication = {
  id: string;
  projectId: string;
  status: BackendApplication["status"];
  submissionReviewStatus: BackendApplication["submission_review_status"];
  submission?: BackendApplication["submission"] | null;
};

function resolveSubmissionDeadline(project: CuratedProject): number | null {
  if (project.endsAt) return project.endsAt;
  const weeksMatch = project.timeline.match(/(\d+)\s*week/i);
  if (!weeksMatch) return null;
  const weeks = Number(weeksMatch[1]);
  if (!Number.isFinite(weeks) || weeks <= 0) return null;
  return Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
}

function ProjectsPage() {
  const role = useRole();
  const openProjectsEnabled = useFeature("openProjects");
  const isAdmin = (role as string) === "scope_admin" || (role as string) === "scope_super_admin" || (role as string) === "super_admin" || role === "faculty_coordinator" || role === "institutional_admin";
  const isAuthed = useIsLoggedIn();
  const user = useUser();
  const [scopeChallenges, setScopeChallenges] = useState<CuratedProject[]>([]);
  const [campusProjects, setCampusProjects] = useState<CuratedProject[]>([]);
  const [openProjects, setOpenProjects] = useState<CuratedProject[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [userApps, setUserApps] = useState<ProjectApplication[]>([]);

  const [confettiKey, setConfettiKey] = useState(0);
  const [applyTarget, setApplyTarget] = useState<CuratedProject | null>(null);
  const [roomTarget, setRoomTarget] = useState<CuratedProject | null>(null);
  const [submissionTarget, setSubmissionTarget] = useState<CuratedProject | null>(null);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<CuratedProject | null>(null);
  const [detailTarget, _setDetailTarget] = useState<CuratedProject | null>(null);
  const setDetailTarget = (p: CuratedProject | null) => {
    if (p) analytics.track("project_view");
    _setDetailTarget(p);
  };

  const appliedIds = useMemo(() => new Set(userApps.map((a) => a.projectId)), [userApps]);

  // Load saved project IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("scope_saved_projects");
      if (stored) setSaved(JSON.parse(stored));
    } catch { /* noop */ }

    // Fetch from backend as source of truth
    if (isAuthed) {
      backendUsers.getSavedProjects().then((res) => {
        setSaved(res.saved_projects);
        try { localStorage.setItem("scope_saved_projects", JSON.stringify(res.saved_projects)); } catch { /* noop */ }
      }).catch(() => {});
    }
  }, [isAuthed]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      backendProjects.list(),
      backendApplications.listMe().catch(() => ({ items: [] })),
    ])
      .then(async ([projectsData, applicationsData]) => {
        if (cancelled) return;
        const mapped: CuratedProject[] = (projectsData.items || []).map((p: any) => {
          const summary = p.summary || p.description || "";
          const seatsMatch = summary.match(/(\d+)\s*of\s*(\d+)\s*seats\s*left/i);
          const seatsLeft = seatsMatch ? Number(seatsMatch[1]) : 6;
          const seatsTotal = seatsMatch ? Number(seatsMatch[2]) : 10;
          const timeline = (summary.split("·")[0] || "6 weeks").trim();
          const skills = (summary.split("·")[2] || p.domain || "General").split(",").map((s: string) => s.trim()).filter(Boolean);
          const rewardsMatch = (p.description || "").match(/Rewards:\s*([^\n]+)/i);
          
          const projectInstitutionId = p.institution_id || p.institution;
          const isCampusProject = !!projectInstitutionId;
          
          return {
            id: p.id,
            title: p.title,
            description: p.description || p.summary || "Live builder opportunity.",
            category: p.domain || "General",
            difficulty: "Intermediate",
            timeline,
            seatsTotal,
            seatsFilled: Math.max(0, seatsTotal - seatsLeft),
            skills,
            rewards: rewardsMatch?.[1] || "Growth rewards",
            status: p.status === "cancelled" ? "closed" : "live",
            cover: p.cover_url || (isCampusProject ? "🏫" : "🚀"),
            postedBy: p.created_by?.name || "Scope Team",
            scope: isCampusProject ? "campus" : "scope",
            campus: projectInstitutionId ? String(projectInstitutionId) : undefined,
            endsAt: p.ends_on ? new Date(p.ends_on).getTime() : undefined,
            votes: p.votes || 0,
            userVoted: p.user_voted || false,
            entryXpRequired: p.minimum_xp_required || 0,
            xpCommitmentStake: p.xp_commitment_stake || 0,
          };


        });

        const myInstitutionId = user?.institution?.id;
        
        // Institutional Projects (Live from DB)
        const campusMapped = mapped.filter((m) => m.scope === "campus" && m.campus === myInstitutionId);
        setCampusProjects(campusMapped);

        // Global Challenges (Backend + Seed Fallback)
        const backendScope = mapped.filter((m) => m.scope === "scope");
        
        // If backend has no global projects, use the premium seed projects to keep the section alive
        if (backendScope.length === 0) {
          const { featuredProjects } = await import("@/lib/mock-data");
          const seeds: CuratedProject[] = featuredProjects.map((p, idx) => ({
            id: `seed_scope_${idx}`,
            title: p.title,
            description: p.description,
            category: p.category,
            difficulty: "Intermediate",
            timeline: "6 weeks",
            seatsTotal: 10,
            seatsFilled: 4,
            skills: p.category === "Design" ? ["UI/UX", "Figma"] : ["React", "System Design"],
            rewards: "Growth rewards · Scope Verified",
            status: "live",
            cover: p.cover || "🚀",
            postedBy: "Scope Official",
            scope: "scope",
            votes: p.votes || 0,
            userVoted: false,
            entryXpRequired: 0,
          }));
          setScopeChallenges(seeds);
        } else {
          setScopeChallenges(backendScope);
        }

        // Open Projects (Other Campuses)
        setOpenProjects(mapped.filter((m) => m.scope === "campus" && m.campus !== myInstitutionId));
        setUserApps((applicationsData.items || []).map((a: BackendApplication) => ({
          id: a.id,
          projectId: a.project_id,
          status: a.status,
          submissionReviewStatus: a.submission_review_status,
          submission: a.submission,
        })));
      })
      .catch((error) => {
        console.error("Projects Load Error:", error);
        toast.error("Could not load projects list.");
      });
    return () => { cancelled = true; };
  }, [user?.institution?.id, isAuthed]);

  // Auto-open project details if URL has a hash
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const targetId = window.location.hash.slice(1);
      const allLoaded = [...scopeChallenges, ...campusProjects, ...openProjects];
      const targetProject = allLoaded.find((p) => p.id === targetId);
      if (targetProject) {
        setDetailTarget(targetProject);
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [scopeChallenges, campusProjects, openProjects]);

  const handleSave = async (id: string, title: string) => {
    const wasSaved = saved.includes(id);
    const action = wasSaved ? "unsave" : "save";
    const next = wasSaved ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem("scope_saved_projects", JSON.stringify(next)); } catch { /* noop */ }
    
    if (isAuthed) {
      try {
        await backendUsers.toggleSavedProject(id, action);
      } catch (e) {
        // Revert on error
        setSaved(wasSaved ? [...saved, id] : saved.filter((x) => x !== id));
        toast.error(`Failed to ${action} project`);
        return;
      }
    }
    toast(wasSaved ? "Removed from saved" : `🔖 Saved · "${title}"`);
  };

  const handleVote = async (id: string) => {
    if (!isAuthed) {
      toast.error("Sign in to upvote projects.");
      return;
    }
    
    // Find the project in our local states
    let targetProj: CuratedProject | undefined;
    let type: "scope" | "campus" | "open" | null = null;
    
    if (scopeChallenges.some((p) => p.id === id)) {
      targetProj = scopeChallenges.find((p) => p.id === id);
      type = "scope";
    } else if (campusProjects.some((p) => p.id === id)) {
      targetProj = campusProjects.find((p) => p.id === id);
      type = "campus";
    } else if (openProjects.some((p) => p.id === id)) {
      targetProj = openProjects.find((p) => p.id === id);
      type = "open";
    }
    
    if (!targetProj) return;
    
    const wasVoted = !!targetProj.userVoted;
    const nextVoted = !wasVoted;
    const nextVotes = (targetProj.votes || 0) + (nextVoted ? 1 : -1);
    
    // Optimistic local update
    const updateLocalList = (list: CuratedProject[]) =>
      list.map((p) => (p.id === id ? { ...p, userVoted: nextVoted, votes: nextVotes } : p));
      
    if (type === "scope") setScopeChallenges(updateLocalList);
    else if (type === "campus") setCampusProjects(updateLocalList);
    else if (type === "open") setOpenProjects(updateLocalList);
    
    try {
      const { projects } = await import("@/lib/scope-store");
      await projects.vote(id);
      toast.success(nextVoted ? "🔥 Project upvoted!" : "Removed upvote");
    } catch (err) {
      // Revert optimistic update
      const revertLocalList = (list: CuratedProject[]) =>
        list.map((p) => (p.id === id ? { ...p, userVoted: wasVoted, votes: targetProj!.votes } : p));
      if (type === "scope") setScopeChallenges(revertLocalList);
      else if (type === "campus") setCampusProjects(revertLocalList);
      else if (type === "open") setOpenProjects(revertLocalList);
      toast.error("Failed to sync vote with server.");
    }
  };

  const handleShare = (p: CuratedProject) => {
    setShareTarget(p);
  };

  const handleApplyClick = (p: CuratedProject) => {
    if (!isAuthed) {
      toast.error("Sign in to apply.");
      return;
    }
    const app = userApps.find((a) => a.projectId === p.id);
    if (app) {
      if (app.status === "pending") {
        toast.info("Your application is currently pending admin review.");
        return;
      }
      if (app.status === "rejected") {
        toast.error("Your application has been rejected.");
        return;
      }
      setRoomTarget(p);
      return;
    }
    setApplyTarget(p);
  };

  const appByProjectId = useMemo(
    () => new Map(userApps.map((app) => [app.projectId, app])),
    [userApps],
  );

  return (
    <AppShell>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <ConfettiBurst trigger={confettiKey} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">
            <ShieldCheck className="mr-1 h-3 w-3" /> Curated by Scope
          </Badge>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Projects & Opportunities</h1>
              <p className="mt-2 text-primary-foreground/70">
                Every opportunity here is launched directly by Scope. Most rewards are growth-based — recognition, mentor access, workshop invites and priority for future opportunities. A rare few include a stipend or honorarium.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setIdeaOpen(true)} size="lg" variant="outline" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10">
                <Lightbulb className="mr-2 h-4 w-4" /> Suggest an Idea
              </Button>
              {isAdmin ? (
                <Button onClick={() => setShowAddModal(true)} size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
                  <Sparkles className="mr-2 h-4 w-4" /> Add Project
                </Button>
              ) : (
                <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
                  <Link to="/portfolio"><Rocket className="mr-2 h-4 w-4" /> Launch Portfolio</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Trust bar */}
          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <TrustChip icon={<ShieldCheck className="h-4 w-4" />} label="Verified by Scope" />
            <TrustChip icon={<Flame className="h-4 w-4" />} label="Live opportunities" />
            <TrustChip icon={<Users className="h-4 w-4" />} label="Real teams · real outcomes" />
            <TrustChip icon={<Lock className="h-4 w-4" />} label="No public spam posts" />
          </div>
        </div>
      </section>

      <CampusLeaderboard />

      <PublishedStrip entity="opportunity" title="Campus exclusive" />

      {/* SAVED PROJECTS STRIP */}
      {saved.length > 0 && (() => {
        const allProjects = [...scopeChallenges, ...campusProjects, ...openProjects];
        const savedProjects = allProjects.filter((p) => saved.includes(p.id));
        if (savedProjects.length === 0) return null;
        return (
          <section className="border-b border-brand/20 bg-brand/5">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="h-4 w-4 text-brand" />
                  <span className="text-sm font-semibold text-foreground">{savedProjects.length} saved project{savedProjects.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setDetailTarget(p)}
                      className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-brand/10 transition-colors"
                    >
                      <span>{p.cover}</span>
                      <span className="max-w-[140px] truncate">{p.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSave(p.id, p.title); }}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        aria-label="Unsave"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* APPLIED STRIP */}
      {userApps.length > 0 && (
        <section className="border-b border-border/40 bg-secondary/30">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="text-sm">
              <span className="font-semibold text-foreground">{userApps.length} active application{userApps.length === 1 ? "" : "s"}</span>
              <span className="ml-2 text-muted-foreground">— track status from your dashboard</span>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard">View My Applications <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </section>
      )}

      {/* SECTION 1: SCOPE CHALLENGES */}
      <Section
        eyebrow="🚀 Live Scope Challenges"
        title="Premium challenges launched by Scope"
        subtitle="Hand-picked, high-impact projects with growth rewards — recognition, mentor access, and priority for future opportunities. A rare few include an honorarium."
        accentBadge={{ label: "High Priority", className: "bg-brand text-brand-foreground" }}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {scopeChallenges.map((p) => (
            <ProjectCard
              key={p.id} project={p}
              application={appByProjectId.get(p.id)}
              saved={saved.includes(p.id)}
              canParticipate={!isAdmin}
              onApply={() => handleApplyClick(p)}
              onSave={() => handleSave(p.id, p.title)}
              onShare={() => handleShare(p)}
              onView={() => setDetailTarget(p)}
              onVote={() => handleVote(p.id)}
              tone="scope"
            />
          ))}
        </div>
      </Section>

      {/* SECTION 2: CAMPUS PROJECTS */}
      <Section
        eyebrow="🏫 Campus Projects"
        title={user?.campus ? `Exclusive for ${user.campus}` : "Campus exclusive opportunities"}
        subtitle="Only visible to builders from your institution. Limited seats. Chapter-priority access."
      >
        {campusProjects.length === 0 ? (
          <EmptyState
            title="No campus projects yet for your chapter"
            body={isAdmin 
              ? "As an administrator, you can launch the first exclusive opportunity for your students right now." 
              : "Scope is preparing exclusive opportunities for your campus. Check back soon."
            }
            cta={isAdmin 
              ? { label: "Launch First Project", onClick: () => {
                // Scroll to admin section or open modal
                const adminSection = document.getElementById('admin-project-controls');
                if (adminSection) adminSection.scrollIntoView({ behavior: 'smooth' });
                else toast.info("Use the Admin Controls at the top to add a project.");
              }}
              : { label: "Open Campus Hub", to: "/campus" }
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campusProjects.map((p) => (
              <ProjectCard
                key={p.id} project={p}
                application={appByProjectId.get(p.id)}
                saved={saved.includes(p.id)}
                canParticipate={!isAdmin}
                onApply={() => handleApplyClick(p)}
                onSave={() => handleSave(p.id, p.title)}
                onShare={() => handleShare(p)}
                onView={() => setDetailTarget(p)}
                onVote={() => handleVote(p.id)}
                tone="campus"
              />
            ))}
          </div>
        )}
      </Section>

      {/* SECTION 3: OPEN PROJECTS */}
      {openProjectsEnabled && (
        <Section
          eyebrow="🌍 Open Projects"
          title="Open to every verified builder"
          subtitle="Commit XP from any campus. Open access opportunities curated by Scope."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {openProjects.map((p) => (
              <ProjectCard
                key={p.id} project={p}
                application={appByProjectId.get(p.id)}
                saved={saved.includes(p.id)}
                canParticipate={!isAdmin}
                onApply={() => handleApplyClick(p)}
                onSave={() => handleSave(p.id, p.title)}
                onShare={() => handleShare(p)}
                onView={() => setDetailTarget(p)}
                onVote={() => handleVote(p.id)}
                tone="open"
              />
            ))}
          </div>
        </Section>
      )}

      {/* SECTION 4: PORTFOLIO PROMO */}
      <Section
        eyebrow="🧠 Your Portfolio"
        title="Showcase proof of work"
        subtitle="Every accepted project, design, research piece or campaign — collected in one place."
      >
        <Card className="flex flex-col items-start gap-4 p-6 hover-lift sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-2xl text-brand-foreground shadow-brand">
            🧩
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Build a portfolio that opens doors</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add work items, link demos, tag skills. A strong portfolio raises your match score on every Scope challenge.
            </p>
          </div>
          <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground">
            <Link to="/portfolio">Open My Portfolio <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </Card>
      </Section>

      <TrustFAQ
        heading="Trust questions, answered."
        subheading="Curation, moderation, data, rewards, participation rules — all in one place."
      />

      {/* APPLY MODAL */}
      {applyTarget && (
        <ApplyModal
          project={applyTarget}
          onClose={() => setApplyTarget(null)}
          onApplied={(app) => setUserApps((curr) => [app, ...curr])}
          onSubmitted={() => {
            setApplyTarget(null);
            setConfettiKey(Date.now());
          }}
        />
      )}

      {submissionTarget && (
        <SubmissionModal
          project={submissionTarget}
          application={appByProjectId.get(submissionTarget.id)!}
          onClose={() => setSubmissionTarget(null)}
          isAdmin={isAdmin}
          institutionId={user?.institution?.id}
          onSubmitted={(application) => {
            setUserApps((current) => current.map((app) => (app.id === application.id ? application : app)));
            setSubmissionTarget(null);
            toast.success("Submission sent for Scope review.");
          }}
        />
      )}

      {roomTarget && (
        <ProjectRoomModal
          project={roomTarget}
          application={appByProjectId.get(roomTarget.id)!}
          onClose={() => setRoomTarget(null)}
          onOpenSubmission={() => {
            const target = roomTarget;
            setRoomTarget(null);
            setSubmissionTarget(target);
          }}
        />
      )}

      {/* ADMIN ADD MODAL */}
      {showAddModal && (
        <AdminAddProjectModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => {
            setShowAddModal(false);
            window.location.reload();
          }}
        />
      )}

      {/* DETAILS MODAL */}
      {detailTarget && (
        <DetailModal
          project={detailTarget}
          application={appByProjectId.get(detailTarget.id)}
          onApply={() => { const p = detailTarget; setDetailTarget(null); handleApplyClick(p); }}
          onClose={() => setDetailTarget(null)}
          canParticipate={!isAdmin}
        />
      )}

      {/* IDEA SUBMISSION MODAL */}
      {ideaOpen && <IdeaModal onClose={() => setIdeaOpen(false)} />}

      {/* SHARE SHEET */}
      {shareTarget && (
        <ShareSheet project={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </AppShell>
  );
}

function CampusLeaderboard() {
  const [data, setData] = useState<{ id: string; name: string; xp: number; logo: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backendReports.globalLeaderboard().then((res) => {
      setData(res.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || data.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-brand relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <Trophy className="h-32 w-32" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-10">
          <div className="max-w-xl">
            <Badge className="bg-brand text-brand-foreground"><Trophy className="mr-1 h-3 w-3" /> Chapter War</Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Top Contributing Campuses</h2>
            <p className="mt-2 text-primary-foreground/70">
              The more you build, the higher your campus climbs. These institutions are currently dominating the Scope ecosystem. Build to lead.
            </p>
          </div>
          <div className="flex-1 min-w-[320px]">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {data.slice(0, 4).map((inst, idx) => (
                 <div key={inst.id} className="group flex items-center gap-4 rounded-2xl bg-primary-foreground/5 p-4 ring-1 ring-primary-foreground/10 transition-all hover:bg-primary-foreground/10 hover:scale-[1.02]">
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-xl font-bold text-brand shadow-sm">
                     {idx + 1}
                   </div>
                   <div className="min-w-0 flex-1">
                     <div className="truncate font-semibold group-hover:text-cyan transition-colors">{inst.name}</div>
                     <div className="text-xs text-primary-foreground/60">{inst.xp.toLocaleString()} XP</div>
                   </div>
                   <span className="text-2xl transition-transform group-hover:scale-125 duration-300">{inst.logo}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------- subcomponents ----------------- */

function TrustChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 px-3 py-2 text-xs font-medium text-primary-foreground/90">
      <span className="text-cyan">{icon}</span> {label}
    </div>
  );
}

function Section({
  eyebrow, title, subtitle, accentBadge, children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  accentBadge?: { label: string; className: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {accentBadge && <Badge className={accentBadge.className}>{accentBadge.label}</Badge>}
      </div>
      {children}
    </section>
  );
}


function ProjectCard({
  project, application, saved, onApply, onSave, onShare, onView, onVote, tone, canParticipate = true,
}: {
  project: CuratedProject;
  application?: ProjectApplication;
  saved: boolean;
  onApply: () => void;
  onSave: () => void;
  onShare: () => void;
  onView: () => void;
  onVote: () => void;
  tone: "scope" | "campus" | "open";
  canParticipate?: boolean;
}) {
  const applied = Boolean(application);
  const seatsLeft = project.seatsTotal - project.seatsFilled;
  const seatsFull = seatsLeft <= 0;
  const closed = project.status === "closed";
  const submissionDeadline = resolveSubmissionDeadline(project);
  const entryXpRequired = Math.max(0, project.entryXpRequired || 0);
  const stakeAmount = Math.max(50, project.xpCommitmentStake || 50);

  const isPending = application?.status === "pending";
  const isRejected = application?.status === "rejected";

  const submissionLabel = isPending
    ? "Pending Review"
    : isRejected
      ? "Rejected"
      : application?.submissionReviewStatus === "passed"
        ? "Passed"
        : application?.submissionReviewStatus === "submitted"
          ? "Submitted"
          : application?.submissionReviewStatus === "needs_changes"
            ? "Needs changes"
            : "Awaiting submission";

  const toneBadge = {
    scope: { label: "Scope Verified", className: "bg-brand text-brand-foreground" },
    campus: { label: "Your Campus", className: "bg-cyan/20 text-cyan-foreground border border-cyan/30" },
    open: { label: "Open Access", className: "bg-secondary text-foreground" },
  }[tone];

  const statusBadge =
    closed ? { label: "Closed", className: "bg-muted text-muted-foreground" } :
    project.status === "closing-soon" ? { label: "Closing soon", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" } :
    { label: "Live Now", className: "bg-success/15 text-success" };

  // Detect rare honorarium/stipend rewards (1–2% of projects). Only these
  // surface a cash badge — every other card stays growth-first.
  const isHonorarium = /₹|stipend|honorarium/i.test(project.rewards);

  return (
    <Card className="group flex flex-col overflow-hidden hover-lift animate-fade-in">
      <div className="relative flex h-32 items-center justify-center bg-gradient-hero text-5xl">
        <span className="transition-transform group-hover:scale-110">{project.cover}</span>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {tone === "scope" ? (
            <ScopeVerifiedBadge size="sm" />
          ) : (
            <Badge className={toneBadge.className}>
              {tone === "campus" && <MapPin className="mr-1 h-3 w-3" />}
              {tone === "open" && <Globe2 className="mr-1 h-3 w-3" />}
              {toneBadge.label}
            </Badge>
          )}
          {isHonorarium && (
            <Badge className="bg-amber-500/90 text-white text-[10px]">
              <Coins className="mr-1 h-3 w-3" /> Honorarium Opportunity
            </Badge>
          )}
        </div>
        <div className="absolute right-3 top-3">
          <ChallengeCountdown endsAt={submissionDeadline ?? undefined} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{project.category}</Badge>
          <Badge variant="outline" className="text-xs">{project.difficulty}</Badge>
        </div>

        <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">{project.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {project.timeline}</div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            <span>
              {seatsFull ? "Seats full · waitlist open" : `${seatsLeft} of ${project.seatsTotal} seats left`}
            </span>
          </div>
          <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" /> {project.skills.slice(0, 3).join(" · ")}</div>
        </div>

        <div className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs text-foreground/90">
          <span className="font-semibold">Rewards:</span> {project.rewards}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-secondary/40 text-[10px] font-semibold">
            Entry {entryXpRequired} XP
          </Badge>
          <Badge variant="outline" className="bg-brand/10 text-brand text-[10px] font-semibold">
            Stake {stakeAmount} XP
          </Badge>
        </div>

        {applied && (
          <div className="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                {isPending ? "Application Pending" : isRejected ? "Application Rejected" : "Project Submission"}
              </span>
              <Badge variant="outline" className="capitalize">{submissionLabel}</Badge>
            </div>
            <div className="mt-1 text-muted-foreground">
              {isPending
                ? "Your application is currently pending review by the Scope Admin. You can submit your work once it is accepted."
                : isRejected
                  ? "Your application has been rejected by the admin."
                  : submissionDeadline && !isNaN(new Date(submissionDeadline).getTime())
                    ? `Submission deadline: ${new Date(submissionDeadline).toLocaleDateString()}`
                    : submissionDeadline ? `Submission deadline: ${submissionDeadline}` : "Submit your work when the project is ready for review."}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={onApply}
            disabled={closed || (!applied && !canParticipate) || (applied && (isPending || isRejected))}
            size="sm"
            className={`flex-1 ${
              applied && !isPending && !isRejected
                ? "bg-success text-primary-foreground hover:bg-success/90"
                : applied && isPending
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-not-allowed hover:bg-amber-500/20"
                  : applied && isRejected
                    ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 cursor-not-allowed hover:bg-red-500/20"
                    : "bg-gradient-brand text-brand-foreground"
            }`}
          >
            {!canParticipate && !applied ? "Restricted" :
             applied && isPending ? "Pending Review" :
             applied && isRejected ? "Rejected" :
             applied ? (<><Check className="mr-1.5 h-4 w-4" /> Project Room</>) :
             closed ? "Closed" :
             seatsFull ? "Join Waitlist" : `⚡ Commit ${Math.max(50, project.xpCommitmentStake || 50)} XP`}
          </Button>
          <Button size="sm" variant="outline" onClick={onSave} aria-label="Save">
            {saved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={onShare} aria-label="Share">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onVote}
            className={`flex items-center gap-1.5 transition-all duration-300 ${
              project.userVoted
                ? "text-orange-500 bg-orange-500/10 border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.2)] hover:bg-orange-500/20"
                : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/5 hover:border-orange-500/20"
            }`}
            aria-label="Upvote"
          >
            <Flame className={`h-4 w-4 transition-transform duration-300 ${project.userVoted ? "scale-110 fill-orange-500 animate-pulse" : "group-hover:scale-110"}`} />
            <span className="text-xs font-semibold">{project.votes || 0}</span>
          </Button>
        </div>
        <button onClick={onView} className="mt-3 self-start text-xs font-semibold text-brand hover:underline">
          View details →
        </button>
      </div>
    </Card>
  );
}

/* ----------------- modals ----------------- */

function ModalShell({ children, onClose, title, subtitle }: {
  children: React.ReactNode; onClose: () => void; title: string; subtitle?: string;
}) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (window.confirm("Discard changes and close?")) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={handleBackdropClick}>
      <Card className="w-full max-w-lg p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function ApplyModal({ project, onClose, onSubmitted, onApplied }: {
  project: CuratedProject; onClose: () => void; onSubmitted: () => void;
  onApplied: (app: ProjectApplication) => void;
}) {
  const [fit, setFit] = useState("");
  const [topSkill, setTopSkill] = useState(project.skills[0] ?? "");
  const [availability, setAvailability] = useState("10 hrs/week");
  const [submitting, setSubmitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [xpAfterCommit, setXpAfterCommit] = useState<number | null>(null);
  const [currentXp, setCurrentXp] = useState<number | null>(null);
  const [loadingXp, setLoadingXp] = useState(true);
  const entryAmount = Math.max(0, project.entryXpRequired || 0);

  // Platform minimum XP commitment is 50 XP — use project's stake or default to 50
  const stakeAmount = Math.max(50, project.xpCommitmentStake || 50);

  useEffect(() => {
    // Load current user XP balance from both local cache and backend
    import("@/lib/scope-store").then(({ auth: scopeAuth, xp: xpStore }) => {
      const user = scopeAuth.getUser();
      const localXp = xpStore.get();
      // Prefer stats from user object (backend-synced) over local cache
      const serverXp = user?.stats?.xp ?? localXp;
      setCurrentXp(serverXp);
      setLoadingXp(false);
    });
  }, []);

  const hasEntryXp = currentXp !== null && currentXp >= entryAmount;
  const hasStakeXp = currentXp !== null && currentXp >= stakeAmount;
  const hasEnoughXp = hasEntryXp && hasStakeXp;

  const getEligibilityErrorMessage = (error: unknown): string | null => {
    if (!(error instanceof ApiException)) return null;
    if (error.code !== "PROJECT_ELIGIBILITY_FAILED" && error.code !== "INSUFFICIENT_XP") return null;
    const details = (error.details || {}) as {
      failures?: string[];
      entry_xp_required?: number;
      stake_xp_required?: number;
      current_xp?: number;
    };

    if (error.code === "INSUFFICIENT_XP") {
      return error.message || "You do not have enough XP to commit the project stake.";
    }

    const failures = new Set(details.failures || []);
    if (failures.has("entry_xp")) {
      return `You need ${details.entry_xp_required ?? entryAmount} Entry XP to enter this project.`;
    }
    if (failures.has("stake_xp")) {
      return `Entry XP check passed. You need ${details.stake_xp_required ?? stakeAmount} XP available to commit stake.`;
    }
    if (failures.has("profile_complete")) {
      return "Complete your profile before joining this project.";
    }
    if (failures.has("institution_eligibility")) {
      return "This project is restricted to selected institutions.";
    }
    if (failures.has("max_project_limit")) {
      return "You have reached the maximum number of active projects.";
    }
    return error.message || null;
  };

  const submit = async () => {
    if (submitting || committed) return;
    if (!fit.trim()) { toast.error("Tell us why you're a fit."); return; }
    if (!topSkill.trim()) { toast.error("Add your top skill."); return; }
    if (currentXp !== null && currentXp < entryAmount) {
      toast.error(`You need at least ${entryAmount} Entry XP before you can stake for this project.`);
      return;
    }
    if (currentXp !== null && currentXp < stakeAmount) {
      toast.error(`You need at least ${stakeAmount} XP to commit. You currently have ${currentXp} XP.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await backendProjects.apply(project.id, fit.trim());
      const { application } = result;

      // Refresh user data from backend so XP balance is accurate post-commit
      const updatedUser = await auth.refreshCurrentUser().catch(() => null);

      // Determine post-commit XP from backend response or calculate locally
      const serverNewXp = updatedUser?.stats?.xp;
      const localEstimate = currentXp !== null ? currentXp - stakeAmount : null;
      const newXp = typeof serverNewXp === "number" ? serverNewXp : localEstimate;

      // Sync updated XP into scope-store so sidebar/dashboard reflect it immediately.
      // We write directly to avoid double-counting (xp.add would fire another backend call).
      if (typeof newXp === "number") {
        import("@/lib/scope-store").then(({ xp: xpStore }) => {
          // Read current and only adjust if they differ (avoid redundant writes)
          const prevXp = xpStore.get();
          if (prevXp !== newXp) {
            // Directly write the localStorage key via the internal write helper
            try {
              localStorage.setItem("scope_points", JSON.stringify(newXp));
              window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: ["scope_points"] } }));
            } catch { /* noop */ }
          }
        });
        setXpAfterCommit(newXp);
      }

      // Push an in-app notification about the XP reservation
      import("@/lib/scope-store").then(({ notifications }) => {
        notifications.push({
          icon: "zap",
          text: `🔒 Committed ${stakeAmount} XP to "${project.title}". Your stake is now reserved.`,
          category: "milestone",
          priority: "high",
        });
      });

      setCommitted(true);

      onApplied({
        id: application.id,
        projectId: application.project_id,
        status: application.status,
        submissionReviewStatus: application.submission_review_status,
        submission: application.submission,
      });

      analytics.track("project_commit_xp");

      // Brief pause to show the success screen, then close
      setTimeout(() => {
        toast.success(`⚡ ${stakeAmount} XP committed! Project room is ready.`);
        onSubmitted();
      }, 1400);
    } catch (error) {
      const msg =
        getEligibilityErrorMessage(error) ||
        (error instanceof Error ? error.message : "Could not commit XP.");
      toast.error(msg);
      setSubmitting(false);
    }
  };

  // ── Success screen shown for ~1.4 s after commit ──
  if (committed) {
    return (
      <ModalShell onClose={onClose} title="XP Committed! 🎉" subtitle="You're locked in. Your project room is ready.">
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand/20 to-cyan/10 border border-brand/30 p-6 text-center">
            <div className="text-5xl mb-3">⚡</div>
            <div className="text-2xl font-bold text-foreground">{stakeAmount} XP Reserved</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Locked in for <span className="font-semibold text-foreground">{project.title}</span>
            </div>
            {xpAfterCommit !== null && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <span>Remaining balance:</span>
                <span className="font-bold text-foreground">{xpAfterCommit.toLocaleString()} XP</span>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-sm">
            <div className="font-semibold text-success mb-1">✅ What happens next?</div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Your XP is <em>reserved</em> — not lost — for the project duration</li>
              <li>• Complete the project to reclaim your stake + earn bonus rewards</li>
              <li>• Dropping out early may result in a partial stake forfeit</li>
            </ul>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title={`Commit XP: ${project.title}`} subtitle="Reserve your XP stake and join the project room.">
      {/* XP Balance & Stake Panel */}
      <div className={`mt-4 rounded-xl border p-4 transition-colors ${
        loadingXp ? "border-border bg-secondary/30" :
        hasEnoughXp ? "border-brand/30 bg-brand/5" : "border-red-500/30 bg-red-500/5"
      }`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entry XP</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{entryAmount}</span>
              <span className="text-sm font-medium text-muted-foreground">XP</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stake XP</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{stakeAmount}</span>
              <span className="text-sm font-medium text-muted-foreground">XP</span>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Balance</div>
            <div className="mt-1 flex items-baseline gap-1 justify-end">
              {loadingXp ? (
                <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
              ) : (
                <>
                  <span className={`text-2xl font-bold ${
                    hasEnoughXp ? "text-foreground" : "text-red-500"
                  }`}>
                    {currentXp !== null ? currentXp.toLocaleString() : "—"}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">XP</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Balance progress bar */}
        {!loadingXp && currentXp !== null && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  hasEnoughXp ? "bg-gradient-to-r from-brand to-cyan" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, (currentXp / Math.max(entryAmount, stakeAmount, 1)) * 100)}%` }}
              />
            </div>
            {!hasEnoughXp ? (
              <div className="mt-1.5 text-xs font-medium text-red-500">
                Need {((!hasEntryXp ? entryAmount : stakeAmount) - currentXp).toLocaleString()} more XP before this project can be entered.
              </div>
            ) : (
              <div className="mt-1.5 text-xs text-muted-foreground">
                After commit: <span className="font-semibold text-foreground">{(currentXp - stakeAmount).toLocaleString()} XP</span> remaining
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="fit">Why are you a fit?</Label>
          <Textarea id="fit" value={fit} onChange={(e) => setFit(e.target.value)} placeholder="Briefly: experience, motivation, what you'll ship..." className="mt-1.5" rows={4} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="skill">Top skill</Label>
            <Input id="skill" value={topSkill} onChange={(e) => setTopSkill(e.target.value)} placeholder="React, Figma..." className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="avail">Weekly availability</Label>
            <select id="avail" value={availability} onChange={(e) => setAvailability(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>5 hrs/week</option>
              <option>10 hrs/week</option>
              <option>20 hrs/week</option>
              <option>Full-time sprint</option>
            </select>
          </div>
        </div>

        {/* Entry and stake policy reminder */}
        <div className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Entry and stake policy: </span>
          Entry XP is checked first. If covered, your {stakeAmount} Stake XP is <em>reserved</em>, not permanently lost. Complete the project to reclaim it plus bonus rewards.
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          id="xp-commit-btn"
          onClick={submit}
          disabled={submitting || loadingXp || !hasEnoughXp}
          className="bg-gradient-brand text-brand-foreground disabled:opacity-50"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-foreground/40 border-t-brand-foreground" />
              Committing XP...
            </span>
          ) : (
            `⚡ Commit ${stakeAmount} XP`
          )}
        </Button>
      </div>
    </ModalShell>
  );
}

function ProjectRoomModal({ project, application, onClose, onOpenSubmission }: {
  project: CuratedProject;
  application: ProjectApplication;
  onClose: () => void;
  onOpenSubmission: () => void;
}) {
  const [room, setRoom] = useState<BackendProjectRoom | null>(null);
  const [tasks, setTasks] = useState<BackendProjectTask[]>([]);
  const [flags, setFlags] = useState<Array<{ user_id: string; flag: string; severity: string; [key: string]: unknown }>>([]);
  const [loading, setLoading] = useState(true);
  const [syncNote, setSyncNote] = useState("");
  const [meetingNote, setMeetingNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [evidenceByTask, setEvidenceByTask] = useState<Record<string, string>>({});

  const participantId = (participant: BackendProjectRoom["participants"][number]) => {
    const userRef = participant.user;
    return typeof userRef === "string" ? userRef : userRef.id || userRef._id || "";
  };
  const participantName = (participant: BackendProjectRoom["participants"][number]) => {
    const userRef = participant.user;
    return typeof userRef === "string" ? userRef.slice(-6) : userRef.name || userRef.email || userRef.id || userRef._id || "Participant";
  };

  const reload = async () => {
    setLoading(true);
    try {
      const [roomRes, taskRes, abuseRes] = await Promise.all([
        backendProjects.room(project.id),
        backendProjects.tasks(project.id),
        backendProjects.abuseCheck(project.id).catch(() => ({ flags: [] })),
      ]);
      setRoom(roomRes.room);
      setTasks(taskRes.items || []);
      setFlags(abuseRes.flags || []);
      const firstParticipant = roomRes.room.participants?.[0];
      if (firstParticipant) setTaskAssignee(participantId(firstParticipant));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load project room.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [project.id]);

  const saveRoomUpdate = async () => {
    if (!syncNote.trim() && !meetingNote.trim()) return;
    try {
      const response = await backendProjects.updateRoom(project.id, {
        daily_sync_notes: syncNote.trim() || undefined,
        meeting_note: meetingNote.trim() || undefined,
      });
      setRoom(response.room);
      setSyncNote("");
      setMeetingNote("");
      toast.success("Room updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update room.");
    }
  };

  const createTask = async () => {
    if (!taskTitle.trim()) {
      toast.error("Add a task title.");
      return;
    }
    try {
      const response = await backendProjects.createTask(project.id, {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        assigned_to: taskAssignee ? [taskAssignee] : [],
        priority: "Medium",
      });
      setTasks((current) => [response.task, ...current]);
      setTaskTitle("");
      setTaskDescription("");
      toast.success("Task created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create task.");
    }
  };

  const updateStatus = async (task: BackendProjectTask, status: BackendProjectTask["status"]) => {
    try {
      const response = await backendProjects.updateTask(project.id, task.id || task._id || "", status);
      setTasks((current) => current.map((item) => ((item.id || item._id) === (task.id || task._id) ? response.task : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update task.");
    }
  };

  const addEvidence = async (task: BackendProjectTask) => {
    const taskId = task.id || task._id || "";
    const value = evidenceByTask[taskId]?.trim();
    if (!value) return;
    try {
      const response = await backendProjects.addTaskEvidence(project.id, taskId, {
        kind: value.startsWith("http") ? "link" : "comment",
        value,
      });
      setTasks((current) => current.map((item) => ((item.id || item._id) === taskId ? response.task : item)));
      setEvidenceByTask((current) => ({ ...current, [taskId]: "" }));
      toast.success("Evidence submitted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit evidence.");
    }
  };

  return (
    <ModalShell onClose={onClose} title={`Project Room: ${project.title}`} subtitle="Coordinate tasks, sync notes, evidence, and final delivery.">
      {loading ? (
        <div className="mt-6 text-sm text-muted-foreground">Loading room...</div>
      ) : !room ? (
        <div className="mt-6 text-sm text-muted-foreground">Room is not available yet.</div>
      ) : (
        <div className="mt-4 max-h-[72vh] space-y-5 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={room.status === "locked" ? "secondary" : "outline"} className="capitalize">{room.status}</Badge>
              <Badge variant="outline" className="capitalize">{application.status}</Badge>
              <Badge variant="outline">{room.participants.length} participant{room.participants.length === 1 ? "" : "s"}</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={onOpenSubmission}>Final submission</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {room.participants.map((participant) => (
              <div key={participantId(participant)} className="rounded-lg border border-border/70 p-3">
                <div className="text-sm font-semibold text-foreground">{participantName(participant)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{participant.role || "Contributor"} · {participant.progress || 0}% progress · {participant.contributionScore || 0} score</div>
              </div>
            ))}
          </div>

          {flags.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="text-sm font-semibold text-foreground">Risk signals</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {flags.slice(0, 8).map((flag, index) => (
                  <Badge key={`${flag.flag}-${index}`} variant="secondary" className="capitalize">{String(flag.flag).replaceAll("_", " ")}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">Daily sync</div>
            <Textarea value={syncNote} onChange={(e) => setSyncNote(e.target.value)} rows={2} placeholder="Today’s sync, blockers, handoffs..." />
            <Textarea value={meetingNote} onChange={(e) => setMeetingNote(e.target.value)} rows={2} placeholder="Meeting note..." />
            <Button size="sm" onClick={saveRoomUpdate} disabled={!syncNote.trim() && !meetingNote.trim()}>Save room update</Button>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Create task</div>
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" />
            <Textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={2} placeholder="Task details and deliverables" />
            <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {room.participants.map((participant) => (
                <option key={participantId(participant)} value={participantId(participant)}>{participantName(participant)}</option>
              ))}
            </select>
            <Button size="sm" onClick={createTask}>Create task</Button>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Tasks</div>
            {tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No tasks yet.</div>
            ) : tasks.map((task) => {
              const taskId = task.id || task._id || "";
              return (
                <div key={taskId} className="rounded-lg border border-border/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{task.title}</div>
                      {task.description && <div className="mt-1 text-xs text-muted-foreground">{task.description}</div>}
                    </div>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["In Progress", "Submitted", "Reviewed", "Completed", "Rework Needed"] as BackendProjectTask["status"][]).map((status) => (
                      <Button key={status} size="sm" variant="outline" onClick={() => updateStatus(task, status)}>{status}</Button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input value={evidenceByTask[taskId] || ""} onChange={(e) => setEvidenceByTask((current) => ({ ...current, [taskId]: e.target.value }))} placeholder="Evidence link or comment" />
                    <Button size="sm" onClick={() => addEvidence(task)}>Add</Button>
                  </div>
                  {!!task.evidence?.length && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {task.evidence.slice(-3).map((item, index) => <div key={item.id || index}>{item.kind}: {item.value}</div>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function DetailModal({ project, application, onApply, onClose, canParticipate = true }: {
  project: CuratedProject; application?: ProjectApplication; onApply: () => void; onClose: () => void; canParticipate?: boolean;
}) {
  const applied = Boolean(application);
  const seatsLeft = project.seatsTotal - project.seatsFilled;
  const submissionDeadline = resolveSubmissionDeadline(project);
  return (
    <ModalShell onClose={onClose} title={project.title} subtitle={`Posted by ${project.postedBy}`}>
      <div className="mt-4 space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{project.category}</Badge>
          <Badge variant="outline">{project.difficulty}</Badge>
          <Badge variant="outline">{project.timeline}</Badge>
        </div>
        <p className="text-foreground/90">{project.description}</p>
        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {project.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
          </div>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rewards</div>
          <p className="mt-1 text-foreground/90">{project.rewards}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          {seatsLeft > 0 ? `${seatsLeft} of ${project.seatsTotal} seats remaining` : "Seats filled — joining the waitlist"}
        </div>
        {applied && (
          <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs">
            <div className="font-semibold text-foreground">Submission window</div>
            <div className="mt-1 text-muted-foreground">
              {submissionDeadline
                ? `Submit by ${new Date(submissionDeadline).toLocaleString()}.`
                : project.scope === "campus"
                  ? "Submit your screenshot, live URL, and GitHub link for Institution Admin review."
                  : "You can submit screenshot, live URL, and GitHub link here for Scope review."}
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button 
          onClick={onApply} 
          disabled={!applied && !canParticipate}
          className="bg-gradient-brand text-brand-foreground"
        >
          {applied ? "Open Room" : canParticipate ? `⚡ Commit ${Math.max(50, project.xpCommitmentStake || 50)} XP` : "Restricted for Admins"}
        </Button>
      </div>
    </ModalShell>
  );
}

function SubmissionModal({ project, application, onClose, onSubmitted, isAdmin = false, institutionId }: {
  project: CuratedProject;
  application: ProjectApplication;
  onClose: () => void;
  onSubmitted: (application: ProjectApplication) => void;
  isAdmin?: boolean;
  institutionId?: string;
}) {
  const [liveUrl, setLiveUrl] = useState(application.submission?.live_url || "");
  const [githubUrl, setGithubUrl] = useState(application.submission?.github_url || "");
  const [notes, setNotes] = useState(application.submission?.notes || "");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submissionDeadline = resolveSubmissionDeadline(project);

  // Admin-only: student picker
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!isAdmin || !institutionId) return;
    setLoadingStudents(true);
    import("@/lib/api/endpoints").then(({ backendUsers }) =>
      backendUsers.list({ institutionId })
    ).then(({ items }) => {
      const studs = items
        .filter((m) => {
          const r = (m.role || "").toLowerCase();
          const rv = (m.role_variant || "").toLowerCase();
          return !r.includes("admin") && !rv.includes("admin");
        })
        .map((m) => ({ id: m.id, name: m.name, email: m.email }));
      setStudents(studs);
      if (studs.length > 0) setSelectedStudentId(studs[0].id);
    }).catch(() => { /* non-fatal */ })
      .finally(() => setLoadingStudents(false));
  }, [isAdmin, institutionId]);

  const submit = async () => {
    if (submitting) return;
    if (isAdmin && !selectedStudentId) {
      toast.error("Please select the student this submission is for.");
      return;
    }
    if (!liveUrl.trim() || !githubUrl.trim()) {
      toast.error("Live URL and GitHub URL are required.");
      return;
    }
    if (!application.submission?.screenshot_url && !screenshot) {
      toast.error("Please upload a project screenshot.");
      return;
    }

    setSubmitting(true);
    try {
      let screenshotFileId = application.submission?.screenshot_file_id || "";
      let screenshotUrl = application.submission?.screenshot_url || "";

      if (screenshot) {
        const { file } = await backendUpload.upload(screenshot, "cover");
        screenshotFileId = file.id;
        screenshotUrl = file.url;
      }

      // When admin submits on behalf of a student, prepend a structured tag to notes
      const selectedStudent = students.find((s) => s.id === selectedStudentId);
      const adminNotePrefix = isAdmin && selectedStudent
        ? `[Submitted on behalf of: ${selectedStudent.name} <${selectedStudent.email}>]\n`
        : "";

      const { application: updated } = await backendApplications.submitWork(application.id, {
        live_url: liveUrl.trim(),
        github_url: githubUrl.trim(),
        screenshot_file_id: screenshotFileId,
        screenshot_url: screenshotUrl,
        notes: adminNotePrefix + notes.trim(),
      });

      onSubmitted({
        id: updated.id,
        projectId: updated.project_id,
        status: updated.status,
        submissionReviewStatus: updated.submission_review_status,
        submission: updated.submission,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit project work.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      title={`Submit Work: ${project.title}`}
      subtitle={submissionDeadline ? `Deadline: ${new Date(submissionDeadline).toLocaleString()}` : "Share your final build for Scope review."}
    >
      <div className="mt-4 space-y-3">
        {/* Admin-only: student assignment */}
        {isAdmin && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-amber-600">Admin Submission</span>
              <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-700">On behalf of student</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              You are submitting this project as an institutional admin. Select the student whose work is being submitted.
            </p>
            <label className="text-xs font-medium text-foreground">Student Profile</label>
            {loadingStudents ? (
              <div className="mt-1.5 h-9 animate-pulse rounded-md bg-secondary" />
            ) : students.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">No students found in your institution.</p>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {!isAdmin && (
          <div className={`rounded-lg border p-3 text-xs text-muted-foreground ${project.scope === "campus" ? "border-emerald-400/30 bg-emerald-400/5" : "border-brand/20 bg-brand/5"}`}>
            {project.scope === "campus"
              ? "Your Institution Admin will receive your screenshot, live link, and GitHub link and can mark this campus project as passed after review."
              : "Scope Admin will receive your screenshot, live link, and GitHub link here and can mark the project as passed after review."}
          </div>
        )}

        <div>
          <Label htmlFor="live-url">Live URL</Label>
          <Input id="live-url" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://your-project.vercel.app" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="github-url">GitHub URL</Label>
          <Input id="github-url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/you/project" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="screenshot">Project Screenshot</Label>
          <Input id="screenshot" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} className="mt-1.5" />
          {application.submission?.screenshot_url && !screenshot && (
            <p className="mt-1 text-xs text-muted-foreground">Existing screenshot already uploaded. Upload a new file only if you want to replace it.</p>
          )}
        </div>
        <div>
          <Label htmlFor="submission-notes">Submission Notes</Label>
          <Textarea id="submission-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What should admin verify? Features shipped, login credentials, known limits..." className="mt-1.5" rows={4} />
        </div>
        {application.submissionReviewStatus !== "not_submitted" && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
            <div className="font-semibold text-foreground">Current review status</div>
            <div className="mt-1 capitalize text-muted-foreground">{application.submissionReviewStatus.replace("_", " ")}</div>
            {application.submission?.admin_comment && (
              <div className="mt-2 text-muted-foreground">Admin note: {application.submission.admin_comment}</div>
            )}
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={submitting || (isAdmin && loadingStudents)} className="bg-gradient-brand text-brand-foreground">
          {submitting ? "Submitting..." : isAdmin ? "Submit on Behalf of Student" : "Submit Project"}
        </Button>
      </div>
    </ModalShell>
  );
}

function IdeaModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [why, setWhy] = useState("");
  const [teamSkills, setTeamSkills] = useState("");
  const [campusRelevance, setCampusRelevance] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!title.trim() || !problem.trim()) {
      toast.error("Title and problem statement are required.");
      return;
    }
    setSubmitting(true);
    backendProposals.create({
      title: title.trim(),
      problem: problem.trim(),
      why: why.trim(),
      team_skills: teamSkills.trim(),
      campus_relevance: campusRelevance.trim(),
      anonymous,
    })
      .then(() => {
        toast.success("Idea sent privately to Scope!");
        onClose();
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to submit idea.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <ModalShell onClose={onClose} title="Suggest an Idea to Scope" subtitle="Your submission stays private. Great ideas deserve the right launch.">
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="iTitle">Idea title</Label>
          <Input id="iTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A new initiative for…" className="mt-1.5" disabled={submitting} />
        </div>
        <div>
          <Label htmlFor="iProblem">Problem statement</Label>
          <Textarea id="iProblem" value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="What pain are we solving?" className="mt-1.5" rows={3} disabled={submitting} />
        </div>
        <div>
          <Label htmlFor="iWhy">Why it matters</Label>
          <Textarea id="iWhy" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why now? Who benefits?" className="mt-1.5" rows={2} disabled={submitting} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="iTeam">Suggested team skills</Label>
            <Input id="iTeam" value={teamSkills} onChange={(e) => setTeamSkills(e.target.value)} placeholder="Design, Engineering…" className="mt-1.5" disabled={submitting} />
          </div>
          <div>
            <Label htmlFor="iCampus">Campus relevance</Label>
            <Input id="iCampus" value={campusRelevance} onChange={(e) => setCampusRelevance(e.target.value)} placeholder="Pan-India / your campus" className="mt-1.5" disabled={submitting} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
          <div>
            <div className="text-sm font-medium text-foreground">Submit anonymously</div>
            <div className="text-xs text-muted-foreground">Hide your identity from the Scope team.</div>
          </div>
          <Switch checked={anonymous} onCheckedChange={setAnonymous} disabled={submitting} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} className="bg-gradient-brand text-brand-foreground" disabled={submitting}>
          {submitting ? "Sending..." : <><Sparkles className="mr-1.5 h-4 w-4" /> Submit Privately</>}
        </Button>
      </div>
    </ModalShell>
  );
}


function AdminAddProjectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [timeline, setTimeline] = useState("6 weeks");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const user = useUser();

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in the title and description.");
      return;
    }
    setSubmitting(true);
    try {
      const { projects } = await import("@/lib/scope-store");
      await projects.create({
        title: title.trim(),
        description: description.trim(),
        category,
        problem: `${timeline} · Live builder opportunity`,
        team: user?.campus || "Campus Chapter",
      } as any);
      toast.success("Campus project launched!");
      onSuccess();
    } catch (err) {
      toast.error("Failed to launch project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Launch Campus Project" subtitle="Create an exclusive opportunity for your students.">
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="pTitle">Project Title</Label>
          <Input id="pTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AI Content Generator" className="mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pCat">Category</Label>
            <select id="pCat" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Engineering</option>
              <option>Design</option>
              <option>Marketing</option>
              <option>Founder</option>
            </select>
          </div>
          <div>
            <Label htmlFor="pTime">Timeline</Label>
            <Input id="pTime" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 4 weeks" className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label htmlFor="pDesc">Project Summary</Label>
          <Textarea id="pDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are students building? What are the goals?" className="mt-1.5" rows={4} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={submitting} className="bg-gradient-brand text-brand-foreground shadow-brand">
          {submitting ? "Launching..." : "Launch Project"}
        </Button>
      </div>
    </ModalShell>
  );
}

function EmptyState({ title, body, cta }: {
  title: string; body: string; cta?: { label: string; onClick?: () => void; to?: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-secondary/20 p-12 text-center animate-fade-in">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">🏜️</div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      {cta && (
        <div className="mt-6">
          {cta.to ? (
            <Button asChild className="bg-gradient-brand text-brand-foreground">
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
          ) : (
            <Button onClick={cta.onClick} className="bg-gradient-brand text-brand-foreground">
              {cta.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------- ShareSheet ----------- */
function ShareSheet({ project, onClose }: { project: CuratedProject; onClose: () => void }) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/projects#${project.id}`;
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error("Could not copy link"));
  };

  const tryNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: project.title, text: `Check out this opportunity on Scope Connect: ${project.title}`, url });
      } catch { /* user cancelled */ }
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`Check out this opportunity on Scope Connect: ${project.title}`);

  const socials = [
    {
      label: "WhatsApp",
      icon: "📱",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      label: "Twitter / X",
      icon: "🐦",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "bg-sky-500 hover:bg-sky-600",
    },
    {
      label: "LinkedIn",
      icon: "💼",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "bg-blue-600 hover:bg-blue-700",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-foreground/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero text-xl">{project.cover}</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Share</div>
              <div className="mt-0.5 text-sm font-semibold text-foreground line-clamp-1">{project.title}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Copy Link */}
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Project Link</div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2.5">
            <span className="flex-1 truncate text-xs font-mono text-foreground/80">{url}</span>
            <button
              onClick={copyLink}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/80"
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Social Share */}
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Share via</div>
          <div className="grid grid-cols-3 gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-white transition-transform hover:scale-105 ${s.color}`}
              >
                <span className="text-xl">{s.icon}</span>
                <span className="text-[10px] font-semibold">{s.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Native share button (mobile) */}
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={tryNativeShare}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Share2 className="h-4 w-4" /> More sharing options
          </button>
        )}
      </div>
    </div>
  );
}
