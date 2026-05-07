import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Rocket, Sparkles, ShieldCheck, MapPin, Globe2, Briefcase, Clock, Users,
  Bookmark, BookmarkCheck, Share2, Lightbulb, Check, X, Lock, ArrowRight, Flame, Coins,
} from "lucide-react";
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
import {
  useStoreValue, useIsLoggedIn, useUser,
} from "@/hooks/use-scope";
import {
  curated, applications, savedProjects, ideaSubmissions,
  type CuratedProject,
} from "@/lib/scope-store";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { backendProjects } from "@/lib/api/endpoints";
import { useRole } from "@/hooks/use-rbac";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects & Opportunities — Scope Connect" },
      { name: "description", content: "Curated live challenges, campus opportunities and open builds — launched by Scope." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const role = useRole();
  const isAdmin = role === "scope_admin" || role === "scope_super_admin" || role === "super_admin";
  const isAuthed = useIsLoggedIn();
  const user = useUser();
  const scopeChallenges = useStoreValue(() => curated.scopeChallenges());
  const campusProjects = useStoreValue(() => curated.campusFor(user?.campus ?? null));
  const openProjects = useStoreValue(() => curated.openProjects());
  const saved = useStoreValue(() => savedProjects.all());
  const userApps = useStoreValue(() => (user ? applications.forUser(user.id) : []));

  const [confettiKey, setConfettiKey] = useState(0);
  const [applyTarget, setApplyTarget] = useState<CuratedProject | null>(null);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminProjects, setAdminProjects] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTimeline, setNewTimeline] = useState("6 weeks");
  const [newSeatsTotal, setNewSeatsTotal] = useState("8");
  const [newSeatsFilled, setNewSeatsFilled] = useState("0");
  const [newSkills, setNewSkills] = useState("React, LLM APIs, Product Design");
  const [newRewards, setNewRewards] = useState("Brand lab credit · 300 XP · Mentor access");
  const [newCategory, setNewCategory] = useState("Engineering");
  const [newDifficulty, setNewDifficulty] = useState("Intermediate");
  const [detailTarget, _setDetailTarget] = useState<CuratedProject | null>(null);
  const setDetailTarget = (p: CuratedProject | null) => {
    if (p) analytics.track("project_view");
    _setDetailTarget(p);
  };

  const appliedIds = useMemo(() => new Set(userApps.map((a) => a.projectId)), [userApps]);
  const refreshAdminProjects = async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const { items } = await backendProjects.list();
      setAdminProjects(items.map((item) => ({ id: item.id, title: item.title, status: item.status })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load project list.");
    } finally {
      setAdminLoading(false);
    }
  };
  useEffect(() => { void refreshAdminProjects(); }, [isAdmin]);

  const handleSave = (id: string, title: string) => {
    const wasSaved = saved.includes(id);
    savedProjects.toggle(id);
    toast(wasSaved ? "Removed from saved" : `Saved · "${title}"`);
  };

  const handleShare = (p: CuratedProject) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/projects#${p.id}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast.success("Link copied to clipboard"));
    } else {
      toast(url);
    }
  };

  const handleApplyClick = (p: CuratedProject) => {
    if (!isAuthed) {
      toast.error("Sign in to apply.");
      return;
    }
    if (appliedIds.has(p.id)) {
      toast("You've already applied to this opportunity.");
      return;
    }
    setApplyTarget(p);
  };

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
              <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
                <Link to="/portfolio"><Rocket className="mr-2 h-4 w-4" /> Launch Portfolio</Link>
              </Button>
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

      {isAdmin && (
        <Section
          eyebrow="Admin Controls"
          title="Manage Project Lists"
          subtitle="Create, update, and retire projects and opportunities."
          accentBadge={{ label: "Super Admin Tasks", className: "bg-foreground text-background" }}
        >
          <Card className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Project title" />
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category (e.g. Engineering)" />
              <Input value={newDifficulty} onChange={(e) => setNewDifficulty(e.target.value)} placeholder="Difficulty (e.g. Intermediate)" />
              <Input value={newTimeline} onChange={(e) => setNewTimeline(e.target.value)} placeholder="Timeline (e.g. 6 weeks)" />
              <Input value={newSeatsTotal} onChange={(e) => setNewSeatsTotal(e.target.value)} placeholder="Seats total (e.g. 8)" />
              <Input value={newSeatsFilled} onChange={(e) => setNewSeatsFilled(e.target.value)} placeholder="Seats filled (e.g. 3)" />
              <Input value={newSkills} onChange={(e) => setNewSkills(e.target.value)} placeholder="Skills (comma-separated)" />
              <Input value={newRewards} onChange={(e) => setNewRewards(e.target.value)} placeholder="Rewards text" className="sm:col-span-2 lg:col-span-3" />
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Full description" className="sm:col-span-2 lg:col-span-3 min-h-[90px]" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={async () => {
                  if (!newTitle.trim()) return toast.error("Title required.");
                  try {
                    const seatsTotal = Math.max(1, Number.parseInt(newSeatsTotal, 10) || 1);
                    const seatsFilled = Math.max(0, Number.parseInt(newSeatsFilled, 10) || 0);
                    const summary = `${newTimeline} · ${Math.max(0, seatsTotal - seatsFilled)} of ${seatsTotal} seats left · ${newSkills}`;
                    await backendProjects.create({
                      id: `tmp-${Date.now()}`,
                      authorId: "",
                      author: "",
                      campus: "",
                      title: newTitle.trim(),
                      description: `${newDescription.trim()}\n\nRewards: ${newRewards.trim()}\nCategory: ${newCategory.trim()} · ${newDifficulty.trim()}`,
                      problem: summary,
                      team: "",
                      category: newCategory.trim() || "Software",
                      votes: 0,
                      cover: "🚀",
                      createdAt: Date.now(),
                    });
                    setNewTitle(""); setNewDescription("");
                    toast.success("Project created.");
                    await refreshAdminProjects();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Create failed.");
                  }
                }}
                className="bg-gradient-brand text-brand-foreground"
              >
                Create Project
              </Button>
              <Button variant="outline" onClick={() => void refreshAdminProjects()}>Refresh</Button>
            </div>
            <div className="mt-4 space-y-2">
              {adminLoading && <p className="text-sm text-muted-foreground">Loading project list...</p>}
              {!adminLoading && adminProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{project.title}</div>
                    <div className="text-xs text-muted-foreground">Status: {project.status}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={async () => {
                    const next = project.status === "open" ? "cancelled" : "open";
                    try {
                      await backendProjects.update(project.id, { status: next });
                      toast.success(`Set to ${next}`);
                      await refreshAdminProjects();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Update failed.");
                    }
                  }}>
                    {project.status === "open" ? "Close" : "Open"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    try {
                      await backendProjects.remove(project.id);
                      toast.success("Project removed.");
                      await refreshAdminProjects();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Delete failed.");
                    }
                  }}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </Section>
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
              applied={appliedIds.has(p.id)}
              saved={saved.includes(p.id)}
              onApply={() => handleApplyClick(p)}
              onSave={() => handleSave(p.id, p.title)}
              onShare={() => handleShare(p)}
              onView={() => setDetailTarget(p)}
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
            body="Scope is preparing exclusive opportunities for your campus. Check back soon."
            cta={{ label: "Open Campus Hub", to: "/campus" }}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campusProjects.map((p) => (
              <ProjectCard
                key={p.id} project={p}
                applied={appliedIds.has(p.id)}
                saved={saved.includes(p.id)}
                onApply={() => handleApplyClick(p)}
                onSave={() => handleSave(p.id, p.title)}
                onShare={() => handleShare(p)}
                onView={() => setDetailTarget(p)}
                tone="campus"
              />
            ))}
          </div>
        )}
      </Section>

      {/* SECTION 3: OPEN PROJECTS */}
      <Section
        eyebrow="🌍 Open Projects"
        title="Open to every verified builder"
        subtitle="Apply from any campus. Open access opportunities curated by Scope."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {openProjects.map((p) => (
            <ProjectCard
              key={p.id} project={p}
              applied={appliedIds.has(p.id)}
              saved={saved.includes(p.id)}
              onApply={() => handleApplyClick(p)}
              onSave={() => handleSave(p.id, p.title)}
              onShare={() => handleShare(p)}
              onView={() => setDetailTarget(p)}
              tone="open"
            />
          ))}
        </div>
      </Section>

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
          onSubmitted={() => {
            setApplyTarget(null);
            setConfettiKey(Date.now());
          }}
        />
      )}

      {/* DETAILS MODAL */}
      {detailTarget && (
        <DetailModal
          project={detailTarget}
          applied={appliedIds.has(detailTarget.id)}
          onApply={() => { const p = detailTarget; setDetailTarget(null); handleApplyClick(p); }}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {/* IDEA SUBMISSION MODAL */}
      {ideaOpen && <IdeaModal onClose={() => setIdeaOpen(false)} />}
    </AppShell>
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

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: { label: string; to: string } }) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-2xl">📭</div>
      <h3 className="mt-3 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Button asChild variant="outline" className="mt-4">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      )}
    </Card>
  );
}

function ProjectCard({
  project, applied, saved, onApply, onSave, onShare, onView, tone,
}: {
  project: CuratedProject;
  applied: boolean;
  saved: boolean;
  onApply: () => void;
  onSave: () => void;
  onShare: () => void;
  onView: () => void;
  tone: "scope" | "campus" | "open";
}) {
  const seatsLeft = project.seatsTotal - project.seatsFilled;
  const seatsFull = seatsLeft <= 0;
  const closed = project.status === "closed";

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
          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
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

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={onApply}
            disabled={applied || closed}
            size="sm"
            className={`flex-1 ${applied ? "bg-success text-primary-foreground hover:bg-success" : "bg-gradient-brand text-brand-foreground"}`}
          >
            {applied ? (<><Check className="mr-1.5 h-4 w-4" /> Applied</>) :
             closed ? "Closed" :
             seatsFull ? "Join Waitlist" : "Apply Now"}
          </Button>
          <Button size="sm" variant="outline" onClick={onSave} aria-label="Save">
            {saved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={onShare} aria-label="Share">
            <Share2 className="h-4 w-4" />
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
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

function ApplyModal({ project, onClose, onSubmitted }: {
  project: CuratedProject; onClose: () => void; onSubmitted: () => void;
}) {
  const [fit, setFit] = useState("");
  const [topSkill, setTopSkill] = useState(project.skills[0] ?? "");
  const [availability, setAvailability] = useState("10 hrs/week");
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (submitting) return;
    if (!fit.trim()) { toast.error("Tell us why you're a fit."); return; }
    if (!topSkill.trim()) { toast.error("Add your top skill."); return; }
    setSubmitting(true);
    const result = applications.apply({ projectId: project.id, fit: fit.trim(), topSkill: topSkill.trim(), availability });
    if (result) {
      analytics.track("project_apply");
      toast.success("Application sent. +20 XP");
      onSubmitted();
    } else {
      toast.error("You've already applied to this opportunity.");
      onClose();
    }
  };

  return (
    <ModalShell onClose={onClose} title={`Apply: ${project.title}`} subtitle="A short pitch goes a long way.">
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
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={submitting} className="bg-gradient-brand text-brand-foreground">
          {submitting ? "Sending…" : "Send Application (+20 XP)"}
        </Button>
      </div>
    </ModalShell>
  );
}

function DetailModal({ project, applied, onApply, onClose }: {
  project: CuratedProject; applied: boolean; onApply: () => void; onClose: () => void;
}) {
  const seatsLeft = project.seatsTotal - project.seatsFilled;
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
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={onApply} disabled={applied} className="bg-gradient-brand text-brand-foreground">
          {applied ? "Applied" : "Apply Now"}
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

  const submit = () => {
    if (!title.trim() || !problem.trim()) {
      toast.error("Title and problem statement are required.");
      return;
    }
    ideaSubmissions.submit({
      title: title.trim(),
      problem: problem.trim(),
      why: why.trim(),
      teamSkills: teamSkills.trim(),
      campusRelevance: campusRelevance.trim(),
      anonymous,
    });
    toast.success("Idea sent privately to Scope. +15 XP");
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title="Suggest an Idea to Scope" subtitle="Your submission stays private. Great ideas deserve the right launch.">
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="iTitle">Idea title</Label>
          <Input id="iTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A new initiative for…" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="iProblem">Problem statement</Label>
          <Textarea id="iProblem" value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="What pain are we solving?" className="mt-1.5" rows={3} />
        </div>
        <div>
          <Label htmlFor="iWhy">Why it matters</Label>
          <Textarea id="iWhy" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why now? Who benefits?" className="mt-1.5" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="iTeam">Suggested team skills</Label>
            <Input id="iTeam" value={teamSkills} onChange={(e) => setTeamSkills(e.target.value)} placeholder="Design, Engineering…" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="iCampus">Campus relevance</Label>
            <Input id="iCampus" value={campusRelevance} onChange={(e) => setCampusRelevance(e.target.value)} placeholder="Pan-India / your campus" className="mt-1.5" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
          <div>
            <div className="text-sm font-medium text-foreground">Submit anonymously</div>
            <div className="text-xs text-muted-foreground">Hide your identity from the Scope team.</div>
          </div>
          <Switch checked={anonymous} onCheckedChange={setAnonymous} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} className="bg-gradient-brand text-brand-foreground">
          <Sparkles className="mr-1.5 h-4 w-4" /> Submit Privately
        </Button>
      </div>
    </ModalShell>
  );
}
