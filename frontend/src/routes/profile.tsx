import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Save, Globe, Github, Twitter, Linkedin, FileText, Instagram, Plus, X, Sparkles,
  Trophy, Users, Building2, BarChart3, Handshake, MapPin, Shield, Activity,
  ClipboardCheck, Briefcase, FileBarChart, Megaphone, ArrowRight, Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { useUser, useProfileStrength, useXP, useLevel, useStreak } from "@/hooks/use-scope";
import { useUserSession } from "@/hooks/use-session";
import { auth, seedInterests, type ScopeUser } from "@/lib/scope-store";
import {
  DOMAIN_LABELS, DOMAIN_KEYS, SPECIALIZATIONS, DOMAIN_PORTFOLIO_FIELDS,
  humanize, type DomainKey,
} from "@/lib/portfolio-domains";
import { themeForRole } from "@/lib/role-theme";
import { ROLE_LABELS, type RoleId } from "@/lib/rbac";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Scope Connect" },
      { name: "description", content: "Your role-aware Scope Connect profile." },
    ],
  }),
  component: () => <AuthGate><ProfilePage /></AuthGate>,
});

const AVAILABILITY = ["Open to collab", "Building solo", "Hiring teammates", "Looking for internship"] as const;
const SUGGESTED_SKILLS = ["React", "TypeScript", "Tailwind", "Python", "ML", "Figma", "Product", "Growth", "Web3", "Rust"];

/** Roles that see student-style growth (XP, level, streak, portfolio editor). */
const STUDENT_LIKE: RoleId[] = ["student", "viewer"];

function ProfilePage() {
  const user = useUser();
  const session = useUserSession();
  const role = session.role;
  const isStudentLike = STUDENT_LIKE.includes(role);
  const roleTheme = themeForRole(role);

  const strength = useProfileStrength();
  const xp = useXP();
  const level = useLevel();
  const streak = useStreak();

  if (!user) return null;

  return (
    <AppShell>
      <ProfileHero user={user} role={role} isStudentLike={isStudentLike}
        strength={strength} xp={xp} levelName={level.name} streak={streak} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="overview" className="w-full">
          {/* Horizontally scrollable tab strip on mobile */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto w-max gap-1 rounded-xl bg-muted p-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>

              {isStudentLike && <>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="verification">Verification</TabsTrigger>
              </>}

              {role === "institutional_admin" && <>
                <TabsTrigger value="institution">Institution</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </>}

              {role === "faculty_coordinator" && <>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="supervised">Supervised</TabsTrigger>
                <TabsTrigger value="approvals">Approvals</TabsTrigger>
              </>}

              {role === "campus_leader" && <>
                <TabsTrigger value="campus">Campus</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
              </>}

              {role === "scope_admin" && <>
                <TabsTrigger value="territories">Territories</TabsTrigger>
                <TabsTrigger value="mou">MoU Pipeline</TabsTrigger>
                <TabsTrigger value="visits">Visits</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </>}

              {(role === "scope_super_admin" || role === "super_admin") && <>
                <TabsTrigger value="platform">Platform</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="moderation">Moderation</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </>}
            </TabsList>
          </div>

          {/* ---------- Common tabs ---------- */}
          <TabsContent value="overview" className="mt-6">
            <OverviewTab user={user} role={role} isStudentLike={isStudentLike}
              strength={strength} xp={xp} level={level.name} streak={streak} />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <ActivityTab role={role} />
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <AchievementsTab role={role} isStudentLike={isStudentLike}
              xp={xp} level={level.name} streak={streak} />
          </TabsContent>

          {/* ---------- Student-only tabs ---------- */}
          {isStudentLike && <>
            <TabsContent value="portfolio" className="mt-6">
              <StudentPortfolioEditor user={user} />
            </TabsContent>
            <TabsContent value="projects" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Applied projects", desc: "Projects you applied to", to: "/projects", icon: Briefcase },
                { title: "Ongoing projects", desc: "Currently active builds", to: "/projects", icon: Activity },
                { title: "Completed", desc: "Wrapped projects & reviews", to: "/projects", icon: Trophy },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="opportunities" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Applied", desc: "Opportunities you applied to", to: "/opportunities", icon: Briefcase },
                { title: "Shortlisted", desc: "You're under consideration", to: "/opportunities", icon: ClipboardCheck },
                { title: "Closed", desc: "Past opportunities", to: "/opportunities", icon: FileText },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="verification" className="mt-6">
              <VerificationTab user={user} accent={roleTheme.glow} />
            </TabsContent>
          </>}

          {/* ---------- Institution Admin ---------- */}
          {role === "institutional_admin" && <>
            <TabsContent value="institution" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Institution overview", desc: "Campuses, students, participation", to: "/institution-admin", icon: Building2 },
                { title: "Communications", desc: "Announcements & broadcasts", to: "/institution-admin/communications", icon: Megaphone },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="students" className="mt-6">
              <RoleLinkGrid items={[
                { title: "All students", desc: "Total / verified / active", to: "/institution-admin/members", icon: Users },
                { title: "Member management", desc: "Approve, suspend, promote", to: "/institution-admin/members", icon: ClipboardCheck },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="reports" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Engagement analytics", desc: "DAU, WAU, growth", to: "/institution-admin/analytics", icon: BarChart3 },
                { title: "Performance insights", desc: "Top performers", to: "/institution-admin/analytics", icon: Trophy },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="settings" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Account settings", desc: "Branding, contact, permissions", to: "/settings", icon: Shield },
              ]} accent={roleTheme.glow} />
            </TabsContent>
          </>}

          {/* ---------- Faculty ---------- */}
          {role === "faculty_coordinator" && <>
            <TabsContent value="students" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Student list", desc: "Track progress & verification", to: "/institution-admin/members", icon: Users },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="supervised" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Active projects", desc: "Projects under your supervision", to: "/projects", icon: Briefcase },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="approvals" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Verification queue", desc: "Approve student validations", to: "/faculty", icon: ClipboardCheck },
              ]} accent={roleTheme.glow} />
            </TabsContent>
          </>}

          {/* ---------- Campus Leader ---------- */}
          {role === "campus_leader" && <>
            <TabsContent value="campus" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Campus dashboard", desc: "Rank, members, growth", to: "/campus-leader", icon: Building2 },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="members" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Members", desc: "Approve & manage builders", to: "/campus", icon: Users },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="events" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Campus events", desc: "Schedule & track turnout", to: "/events", icon: Calendar },
              ]} accent={roleTheme.glow} />
            </TabsContent>
          </>}

          {/* ---------- Scope Admin ---------- */}
          {role === "scope_admin" && <>
            <TabsContent value="territories" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Assigned territories", desc: "Cities, regions, institutions", to: "/scope-admin/institutions", icon: MapPin },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="mou" className="mt-6">
              <RoleLinkGrid items={[
                { title: "MoU pipeline", desc: "Leads, in-discussion, signed", to: "/scope-admin/mou-pipeline", icon: Handshake },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="visits" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Institution visits", desc: "Visit logs & meeting notes", to: "/scope-admin/visits", icon: Calendar },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="performance" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Targets & conversions", desc: "Active pipelines", to: "/scope-admin/dashboard", icon: BarChart3 },
                { title: "Reports", desc: "Weekly territory performance", to: "/scope-admin/reports", icon: FileBarChart },
              ]} accent={roleTheme.glow} />
            </TabsContent>
          </>}

          {/* ---------- Super Admin ---------- */}
          {(role === "scope_super_admin" || role === "super_admin") && <>
            <TabsContent value="platform" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Platform overview", desc: "Total users, growth, institutions", to: "/scope-super-admin", icon: BarChart3 },
                { title: "Projects engine", desc: "Active vs completed, engagement", to: "/projects", icon: Briefcase },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="system" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Feature toggles", desc: "Platform configuration", to: "/admin/config", icon: Shield },
                { title: "RBAC audit", desc: "Role permissions & access review", to: "/scope-super-admin/rbac-audit", icon: ClipboardCheck },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="moderation" className="mt-6">
              <RoleLinkGrid items={[
                { title: "Flagged users", desc: "Reports & actions taken", to: "/scope-super-admin", icon: Activity },
              ]} accent={roleTheme.glow} />
            </TabsContent>
            <TabsContent value="analytics" className="mt-6">
              <RoleLinkGrid items={[
                { title: "DAU / WAU", desc: "Funnel metrics & retention", to: "/scope-super-admin", icon: BarChart3 },
                { title: "Admin logs", desc: "Action history & changes", to: "/scope-super-admin/rbac-audit", icon: FileBarChart },
              ]} accent={roleTheme.glow} />
            </TabsContent>
          </>}
        </Tabs>
      </section>
    </AppShell>
  );
}

/* ---------- Hero ---------- */
function ProfileHero(props: {
  user: ScopeUser; role: RoleId; isStudentLike: boolean;
  strength: number; xp: number; levelName: string; streak: number;
}) {
  const { user, role, isStudentLike, strength, xp, levelName, streak } = props;
  const theme = themeForRole(role);
  return (
    <section className="border-b border-border/40 bg-gradient-hero py-10 text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold text-brand-foreground shadow-brand"
          style={{ background: user.avatarColor }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="truncate text-sm text-primary-foreground/70">{user.email} · {user.campus || "—"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge style={{ background: `color-mix(in oklab, ${theme.glow} 22%, transparent)`, color: theme.glow, borderColor: `color-mix(in oklab, ${theme.glow} 40%, transparent)` }}
              className="border">
              {theme.dot} {ROLE_LABELS[role]}
            </Badge>
            {isStudentLike && <>
              <Badge className="bg-cyan/20 text-cyan-foreground">{levelName}</Badge>
              <Badge className="bg-primary-foreground/10 text-primary-foreground">{xp.toLocaleString()} XP</Badge>
              <Badge className="bg-primary-foreground/10 text-primary-foreground">🔥 {streak}d streak</Badge>
              <Badge className="bg-primary-foreground/10 text-primary-foreground">Profile {strength}%</Badge>
            </>}
            <Badge className="bg-primary-foreground/10 text-primary-foreground">{user.availability}</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Common: Overview ---------- */
function OverviewTab(props: {
  user: ScopeUser; role: RoleId; isStudentLike: boolean;
  strength: number; xp: number; level: string; streak: number;
}) {
  const { user, role, isStudentLike, strength, xp, level, streak } = props;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-foreground">About</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {user.bio || "No bio yet. Add a short intro from the Portfolio tab."}
        </p>
        {user.skills.length > 0 && (
          <div className="mt-4">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Skills</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          </div>
        )}
        {user.interests.length > 0 && (
          <div className="mt-4">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Interests</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.interests.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
            </div>
          </div>
        )}
      </Card>
      <div className="space-y-6">
        {isStudentLike ? (
          <>
            <Card className="p-6">
              <h3 className="font-semibold text-foreground">Profile strength</h3>
              <div className="mt-3 text-3xl font-bold text-foreground">{strength}%</div>
              <Progress value={strength} className="mt-2" />
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold text-foreground">Builder stats</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Scope Points</span><b>{xp.toLocaleString()}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Level</span><b>{level}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Streak</span><b>{streak} days</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><b>{new Date(user.joinedAt).toLocaleDateString()}</b></div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-foreground">Account</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Role</span><b>{ROLE_LABELS[role]}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Organization</span><b>{user.campus || "—"}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><b>{new Date(user.joinedAt).toLocaleDateString()}</b></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ role }: { role: RoleId }) {
  const items = role === "scope_admin"
    ? ["Logged 2 institutional visits this week", "1 MoU moved to Signed", "3 follow-ups scheduled"]
    : role === "institutional_admin"
    ? ["48 students onboarded this month", "Engagement +12% WoW", "5 broadcasts sent"]
    : role === "faculty_coordinator"
    ? ["12 student verifications approved", "3 projects under supervision updated"]
    : (role === "scope_super_admin" || role === "super_admin")
    ? ["3 feature flags toggled", "RBAC audit reviewed", "2 alerts cleared"]
    : ["Joined 2 projects", "Logged a 3-day streak", "Updated portfolio links"];
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-foreground">Recent activity</h3>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{t}</li>)}
      </ul>
    </Card>
  );
}

function AchievementsTab({ role, isStudentLike, xp, level, streak }: {
  role: RoleId; isStudentLike: boolean; xp: number; level: string; streak: number;
}) {
  // Hide XP/streak for non-students entirely (spec).
  if (!isStudentLike) {
    const milestones = (role === "scope_super_admin" || role === "super_admin")
      ? ["Platform launch", "1k+ active users", "100+ partner institutions"]
      : role === "scope_admin"
      ? ["First MoU signed", "10 institutions onboarded"]
      : role === "institutional_admin"
      ? ["Institution verified", "1000+ students onboarded"]
      : role === "faculty_coordinator"
      ? ["100 verifications approved"]
      : ["Top campus leaderboard"];
    return (
      <Card className="p-6">
        <h3 className="font-semibold text-foreground">Milestones</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {milestones.map((m) => <Badge key={m} variant="secondary">{m}</Badge>)}
        </div>
      </Card>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      <Card className="p-6"><h3 className="font-semibold text-foreground">Level</h3><p className="mt-2 text-2xl font-bold">{level}</p></Card>
      <Card className="p-6"><h3 className="font-semibold text-foreground">Scope Points</h3><p className="mt-2 text-2xl font-bold">{xp.toLocaleString()}</p></Card>
      <Card className="p-6"><h3 className="font-semibold text-foreground">Streak</h3><p className="mt-2 text-2xl font-bold">🔥 {streak}d</p></Card>
    </div>
  );
}

/* ---------- Reusable role-tab grid ---------- */
function RoleLinkGrid({ items, accent }: { items: { title: string; desc: string; to: string; icon: React.ComponentType<{ className?: string }> }[]; accent: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link key={it.title} to={it.to} className="group">
            <Card className="h-full p-5 transition-all hover:border-brand/40 hover:shadow-elegant">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)`, color: accent }}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{it.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{it.desc}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- Verification (student) ---------- */
function VerificationTab({ user, accent }: { user: ScopeUser; accent: string }) {
  const verified = (user as ScopeUser & { verificationStatus?: string }).verificationStatus === "verified";
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)`, color: accent }}>
          <Shield className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Verification status</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {verified ? "You're a verified Scope builder." : "Submit verification to unlock trust badges and apply to gated opportunities."}
          </p>
          <div className="mt-3">
            <Button asChild variant={verified ? "outline" : "default"} size="sm">
              <Link to="/settings">{verified ? "Manage verification" : "Submit verification"}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Student portfolio editor (existing form, scoped) ---------- */
function StudentPortfolioEditor({ user }: { user: ScopeUser }) {
  const [bio, setBio] = useState(user.bio);
  const [skills, setSkills] = useState<string[]>(user.skills);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [campus, setCampus] = useState(user.campus);
  const [website, setWebsite] = useState(user.links.website ?? "");
  const [github, setGithub] = useState(user.links.github ?? "");
  const [twitter, setTwitter] = useState(user.links.twitter ?? "");
  const [availability, setAvailability] = useState<typeof AVAILABILITY[number]>(user.availability);
  const [skillDraft, setSkillDraft] = useState("");

  const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl ?? "");
  const [portfolioWebsite, setPortfolioWebsite] = useState(user.portfolioWebsite ?? "");
  const [resumeUrl, setResumeUrl] = useState(user.resumeUrl ?? "");
  const [portfolioPdfUrl, setPortfolioPdfUrl] = useState(user.portfolioPdfUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(user.instagramUrl ?? "");
  const [primaryDomain, setPrimaryDomain] = useState<DomainKey | "">((user.primaryDomain as DomainKey) ?? "");
  const [specialization, setSpecialization] = useState(user.specialization ?? "");
  const [portfolioLinks, setPortfolioLinks] = useState<Record<string, string>>(user.portfolioLinks ?? {});
  const [customKey, setCustomKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  useEffect(() => {
    setBio(user.bio); setSkills(user.skills); setInterests(user.interests); setCampus(user.campus);
    setWebsite(user.links.website ?? ""); setGithub(user.links.github ?? ""); setTwitter(user.links.twitter ?? "");
    setAvailability(user.availability);
    setLinkedinUrl(user.linkedinUrl ?? ""); setPortfolioWebsite(user.portfolioWebsite ?? "");
    setResumeUrl(user.resumeUrl ?? ""); setPortfolioPdfUrl(user.portfolioPdfUrl ?? "");
    setInstagramUrl(user.instagramUrl ?? "");
    setPrimaryDomain((user.primaryDomain as DomainKey) ?? "");
    setSpecialization(user.specialization ?? "");
    setPortfolioLinks(user.portfolioLinks ?? {});
  }, [user]);

  const domainFields = useMemo(() => (primaryDomain ? DOMAIN_PORTFOLIO_FIELDS[primaryDomain] : []), [primaryDomain]);
  const specializations = useMemo(() => (primaryDomain ? SPECIALIZATIONS[primaryDomain] : []), [primaryDomain]);

  const isValidUrl = (v: string) => {
    if (!v) return true;
    try { new URL(v.startsWith("http") ? v : `https://${v}`); return true; } catch { return false; }
  };
  const addSkill = (s: string) => {
    const v = s.trim(); if (!v || skills.includes(v)) return;
    setSkills([...skills, v]); setSkillDraft("");
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));
  const toggleInterest = (t: string) => setInterests((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
  const setPortfolioLink = (key: string, val: string) => {
    setPortfolioLinks((prev) => {
      const next = { ...prev };
      if (!val.trim()) delete next[key]; else next[key] = val.trim();
      return next;
    });
  };
  const addCustomLink = () => {
    const k = customKey.trim().toLowerCase().replace(/\s+/g, "_");
    const v = customUrl.trim();
    if (!k || !v) return toast.error("Add both a label and URL");
    if (!isValidUrl(v)) return toast.error("Enter a valid URL");
    if (portfolioLinks[k]) return toast.error("That label already exists");
    setPortfolioLinks({ ...portfolioLinks, [k]: v });
    setCustomKey(""); setCustomUrl("");
  };

  const save = () => {
    const urlChecks: Array<[string, string]> = [
      ["Website", website], ["LinkedIn", linkedinUrl], ["Portfolio", portfolioWebsite],
      ["Resume", resumeUrl], ["Portfolio PDF", portfolioPdfUrl], ["Instagram", instagramUrl],
      ...Object.entries(portfolioLinks).map(([k, v]) => [humanize(k), v] as [string, string]),
    ];
    for (const [name, val] of urlChecks) if (val && !isValidUrl(val)) return toast.error(`${name} URL is invalid`);
    auth.updateProfile({
      bio, skills, interests, campus,
      links: { website, github, twitter },
      availability,
      linkedinUrl, portfolioWebsite, resumeUrl, portfolioPdfUrl, instagramUrl,
      primaryDomain: primaryDomain || undefined,
      specialization: specialization || undefined,
      portfolioLinks,
    });
    toast.success("Profile saved. Your profile attracts collaborators.");
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground">Edit portfolio</h3>
      <p className="text-sm text-muted-foreground">Showcase what you build, design, or research.</p>

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you building? What do you care about?" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="campus">Campus</Label>
          <Input id="campus" value={campus} onChange={(e) => setCampus(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label>Skills</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.map((s) => (
              <button key={s} onClick={() => removeSkill(s)} className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/20">{s} ×</button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(skillDraft))} placeholder="Add a skill (press Enter)" />
            <Button onClick={() => addSkill(skillDraft)} variant="outline">Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
              <button key={s} onClick={() => addSkill(s)} className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-brand hover:text-brand">+ {s}</button>
            ))}
          </div>
        </div>

        <div>
          <Label>Interests</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {seedInterests.map((t) => {
              const active = interests.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleInterest(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${active ? "border-transparent bg-gradient-brand text-brand-foreground shadow-brand" : "border-border bg-background text-muted-foreground hover:border-brand/40"}`}
                >{t}</button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="web"><Globe className="mr-1 inline h-3 w-3" /> Website</Label>
            <Input id="web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="gh"><Github className="mr-1 inline h-3 w-3" /> GitHub</Label>
            <Input id="gh" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="@handle" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="tw"><Twitter className="mr-1 inline h-3 w-3" /> Twitter</Label>
            <Input id="tw" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@handle" className="mt-1.5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h4 className="text-sm font-semibold text-foreground">Showcase Your Work</h4>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Add links that prove what you can build, design, or create.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="li"><Linkedin className="mr-1 inline h-3 w-3" /> LinkedIn <span className="text-[10px] text-brand">recommended</span></Label>
              <Input id="li" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/…" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pw"><Globe className="mr-1 inline h-3 w-3" /> Portfolio Website</Label>
              <Input id="pw" value={portfolioWebsite} onChange={(e) => setPortfolioWebsite(e.target.value)} placeholder="https://" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="rs"><FileText className="mr-1 inline h-3 w-3" /> Resume URL</Label>
              <Input id="rs" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://drive.google.com/…" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf"><FileText className="mr-1 inline h-3 w-3" /> Portfolio PDF</Label>
              <Input id="pdf" value={portfolioPdfUrl} onChange={(e) => setPortfolioPdfUrl(e.target.value)} placeholder="https://" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ig"><Instagram className="mr-1 inline h-3 w-3" /> Instagram (optional)</Label>
              <Input id="ig" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/…" className="mt-1.5" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Primary Domain</Label>
              <Select value={primaryDomain} onValueChange={(v) => { setPrimaryDomain(v as DomainKey); setSpecialization(""); }}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select your domain" /></SelectTrigger>
                <SelectContent>
                  {DOMAIN_KEYS.map((k) => <SelectItem key={k} value={k}>{DOMAIN_LABELS[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Specialization</Label>
              <Select value={specialization} onValueChange={setSpecialization} disabled={!primaryDomain}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder={primaryDomain ? "Select specialization" : "Pick a domain first"} /></SelectTrigger>
                <SelectContent>
                  {specializations.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {primaryDomain && domainFields.length > 0 && (
            <div className="mt-5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{DOMAIN_LABELS[primaryDomain]} links</Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {domainFields.map((f) => (
                  <div key={f}>
                    <Label htmlFor={`pf-${f}`} className="text-xs">{humanize(f)}</Label>
                    <Input id={`pf-${f}`} value={portfolioLinks[f] ?? ""} onChange={(e) => setPortfolioLink(f, e.target.value)} placeholder="https://" className="mt-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Custom links</Label>
            <div className="mt-2 space-y-2">
              {Object.entries(portfolioLinks)
                .filter(([k]) => !domainFields.includes(k))
                .map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">{humanize(k)}</Badge>
                    <Input value={v} onChange={(e) => setPortfolioLink(k, e.target.value)} className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPortfolioLink(k, "")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input value={customKey} onChange={(e) => setCustomKey(e.target.value)} placeholder="Label (e.g. Notion)" className="sm:max-w-[180px]" />
              <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://" className="flex-1" />
              <Button type="button" variant="outline" onClick={addCustomLink}><Plus className="mr-1 h-4 w-4" /> Add</Button>
            </div>
          </div>
        </div>

        <div>
          <Label>Availability</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVAILABILITY.map((a) => (
              <button key={a} type="button" onClick={() => setAvailability(a)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${availability === a ? "border-transparent bg-cyan/20 text-cyan-foreground" : "border-border text-muted-foreground hover:border-cyan/40"}`}
              >{a}</button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} className="bg-gradient-brand text-brand-foreground"><Save className="mr-2 h-4 w-4" /> Save profile</Button>
        </div>
      </div>
    </Card>
  );
}
