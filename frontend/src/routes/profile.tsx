import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Save, Globe, Github, Twitter, Linkedin, FileText, Instagram, Plus, X, Sparkles,
  Trophy, Users, Building2, BarChart3, Handshake, MapPin, Shield, Activity, Trash2, ExternalLink,
  ClipboardCheck, Briefcase, FileBarChart, Megaphone, ArrowRight, Calendar, ShieldCheck, Lock, Clock, CheckCircle2, AlertTriangle, Check
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
import { useUser, useProfileStrength, useXP, useLevel, useLevelProgress, useStreak } from "@/hooks/use-scope";
import { useImageSrc } from "@/hooks/use-image-src";
import { useUserSession } from "@/hooks/use-session";
import { auth, seedInterests, portfolio, type ScopeUser } from "@/lib/scope-store";
import {
  DOMAIN_LABELS, DOMAIN_KEYS, SPECIALIZATIONS, DOMAIN_PORTFOLIO_FIELDS,
  humanize, type DomainKey,
} from "@/lib/portfolio-domains";
import { themeForRole } from "@/lib/role-theme";
import { ROLE_LABELS, type RoleId } from "@/lib/rbac";
import { toast } from "sonner";
import { backendAuth, backendPortfolio, backendUsers, backendUpload, type BackendPortfolioItem } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

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
type BackendOverview = {
  bio: string;
  skills: string[];
  interests: string[];
  primaryDomain: string;
  specialization: string;
  links: {
    website: string;
    github: string;
    twitter: string;
    linkedin: string;
    instagram: string;
    portfolioWebsite: string;
    resume: string;
    portfolioPdf: string;
  };
  portfolioLinks: Record<string, string>;
};

function ProfilePage() {
  const user = useUser();
  const session = useUserSession();
  const role = session.role;
  const isStudentLike = STUDENT_LIKE.includes(role);
  const roleTheme = themeForRole(role);
  const [overviewFromBackend, setOverviewFromBackend] = useState<BackendOverview | null>(null);
  const [overviewPortfolioItems, setOverviewPortfolioItems] = useState<BackendPortfolioItem[]>([]);
  const [overviewPortfolioItemsLoading, setOverviewPortfolioItemsLoading] = useState(true);

  const strength = useProfileStrength();
  const xpValue = useXP();
  const levelData = useLevel();
  const streakValue = useStreak();
  const levelProgressValue = useLevelProgress();

  const refresh = () => {
    if (!user) return;
    setOverviewPortfolioItemsLoading(true);
    Promise.allSettled([backendAuth.me(), backendPortfolio.listMe()])
      .then(([profileResult, portfolioItemsResult]) => {
        if (profileResult.status === "fulfilled") {
          const backendUser = profileResult.value.user;
          const links = backendUser.links ?? {};
          const portfolioLinksFromArray = Object.fromEntries(
            (backendUser.portfolio_links ?? []).map((link) => [link.key, link.url]),
          );
          setOverviewFromBackend({
            bio: backendUser.bio ?? "",
            skills: Array.isArray(backendUser.skills) ? backendUser.skills : [],
            interests: Array.isArray(backendUser.interests) ? backendUser.interests : [],
            primaryDomain: (backendUser.primaryDomain ?? backendUser.primary_domain ?? "") as string,
            specialization: backendUser.specialization ?? "",
            links: {
              website: links.website ?? "",
              github: links.github ?? links.github_url ?? "",
              twitter: links.twitter ?? links.twitter_url ?? "",
              linkedin: links.linkedin_url ?? backendUser.linkedinUrl ?? "",
              instagram: links.instagram_url ?? backendUser.instagramUrl ?? "",
              portfolioWebsite: links.portfolio_website ?? backendUser.portfolioWebsite ?? "",
              resume: links.resume_url ?? backendUser.resumeUrl ?? "",
              portfolioPdf: links.portfolio_pdf_url ?? backendUser.portfolioPdfUrl ?? "",
            },
            portfolioLinks: backendUser.portfolioLinks ?? portfolioLinksFromArray,
          });
        }
        if (portfolioItemsResult.status === "fulfilled") {
          const items = portfolioItemsResult.value.items;
          setOverviewPortfolioItems(items);
          portfolio.sync(items.map(item => ({
            id: item.id,
            userId: item.user_id,
            type: item.type,
            title: item.title,
            description: item.description,
            skills: item.skills,
            link: item.link,
            cover: item.cover,
            createdAt: new Date(item.created_at).getTime(),
          })));
        }
      })
      .finally(() => {
        setOverviewPortfolioItemsLoading(false);
      });
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted) refresh();
  }, [user?.id, mounted]);

  if (!mounted || !user) return null;

  return (
    <AppShell>
      <ProfileHero
        user={user}
        role={role}
        isStudentLike={isStudentLike}
        strength={strength}
        xp={xpValue}
        levelName={levelData.name}
        streak={streakValue}
        onUpdate={refresh}
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="overview" className="w-full">
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
                {/* <TabsTrigger value="institution">Institution</TabsTrigger> */}
                {/* <TabsTrigger value="students">Students</TabsTrigger> */}
                {/* <TabsTrigger value="reports">Reports</TabsTrigger> */}
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
              </>}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab
              user={user}
              role={role}
              isStudentLike={isStudentLike}
              strength={strength}
              xp={xpValue}
              level={levelData}
              levelProgress={levelProgressValue}
              streak={streakValue}
              backendOverview={overviewFromBackend}
              portfolioItems={overviewPortfolioItems}
              portfolioItemsLoading={overviewPortfolioItemsLoading}
              accent={roleTheme.glow}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <ActivityTab role={role} />
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <AchievementsTab
              role={role}
              isStudentLike={isStudentLike}
              xp={xpValue}
              level={levelData}
              levelProgress={levelProgressValue}
              streak={streakValue}
              accent={roleTheme.glow}
              user={user}
            />
          </TabsContent>

          {isStudentLike && <>
            <TabsContent value="portfolio" className="mt-6">
              <StudentPortfolioEditor user={user} onUpdate={refresh} />
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
  onUpdate: () => void;
}) {
  const { user, role, isStudentLike, strength, xp, levelName, streak, onUpdate } = props;
  const [uploading, setUploading] = useState(false);
  const avatar = useImageSrc(user.avatarUrl);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { file: backendFile } = await backendUpload.upload(file, "avatar");
      await auth.updateProfile({ avatarUrl: backendFile.url });
      await auth.refreshCurrentUser();
      toast.success("Profile image updated!");
      onUpdate();
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const theme = themeForRole(role);
  return (
    <section className="border-b border-border/40 bg-gradient-hero py-10 text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 sm:px-6 lg:px-8">
        <div className="group relative" key={user.avatarUrl || "no-avatar"}>
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl text-3xl font-bold text-brand-foreground shadow-brand ring-2 ring-white/10 transition-transform group-hover:scale-105"
            style={{ background: avatar.hasImage ? "transparent" : user.avatarColor }}>
            {avatar.hasImage ? (
              <img
                src={avatar.src}
                alt={user.name}
                className="h-full w-full object-cover"
                onError={avatar.onError}
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <Label
            htmlFor="avatar-upload"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-all hover:scale-110 active:scale-95"
          >
            {uploading ? <Sparkles className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </Label>
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
  strength: number; xp: number; level: { name: string; next: string }; levelProgress: number; streak: number;
  backendOverview?: BackendOverview | null;
  portfolioItems: BackendPortfolioItem[];
  portfolioItemsLoading: boolean;
  accent: string;
}) {
  const { user, role, isStudentLike, strength, xp, level, levelProgress, streak, backendOverview, portfolioItems, portfolioItemsLoading, accent } = props;
  const bio = user.bio || backendOverview?.bio || "";
  const skills = user.skills?.length ? user.skills : (backendOverview?.skills ?? []);
  const interests = user.interests?.length ? user.interests : (backendOverview?.interests ?? []);
  const primaryDomain = user.primaryDomain || backendOverview?.primaryDomain || "";
  const specialization = user.specialization || backendOverview?.specialization || "";

  const normalizedLinks = {
    website: backendOverview?.links?.website ?? user.links?.website ?? "",
    github: backendOverview?.links?.github ?? user.links?.github ?? user.links?.github_url ?? "",
    twitter: backendOverview?.links?.twitter ?? user.links?.twitter ?? user.links?.twitter_url ?? "",
    linkedin: backendOverview?.links?.linkedin ?? user.linkedinUrl ?? user.links?.linkedin_url ?? "",
    instagram: backendOverview?.links?.instagram ?? user.instagramUrl ?? user.links?.instagram_url ?? "",
    portfolioWebsite: backendOverview?.links?.portfolioWebsite ?? user.portfolioWebsite ?? user.links?.portfolio_website ?? "",
    resume: backendOverview?.links?.resume ?? user.resumeUrl ?? user.links?.resume_url ?? "",
    portfolioPdf: backendOverview?.links?.portfolioPdf ?? user.portfolioPdfUrl ?? user.links?.portfolio_pdf_url ?? "",
  };

  const normalizeHref = (raw: string, key: string) => {
    const value = raw.trim();
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (key === "github" && value.startsWith("@")) return `https://github.com/${value.slice(1)}`;
    if (key === "twitter" && value.startsWith("@")) return `https://x.com/${value.slice(1)}`;
    if (value.includes(".")) return `https://${value}`;
    return "";
  };

  const typedLinks = [
    { key: "website", label: "Website", value: normalizedLinks.website },
    { key: "github", label: "GitHub", value: normalizedLinks.github },
    { key: "twitter", label: "Twitter", value: normalizedLinks.twitter },
    { key: "linkedin", label: "LinkedIn", value: normalizedLinks.linkedin },
    { key: "instagram", label: "Instagram", value: normalizedLinks.instagram },
    { key: "portfolioWebsite", label: "Portfolio Website", value: normalizedLinks.portfolioWebsite },
    { key: "resume", label: "Resume URL", value: normalizedLinks.resume },
    { key: "portfolioPdf", label: "Portfolio PDF", value: normalizedLinks.portfolioPdf },
  ]
    .map((item) => ({ ...item, href: normalizeHref(item.value, item.key) }))
    .filter((item) => item.href);

  const portfolioLinks = backendOverview?.portfolioLinks ?? user.portfolioLinks ?? {};
  const dynamicLinks = Object.entries(portfolioLinks)
    .filter(([, value]) => value?.trim())
    .map(([key, value]) => ({ key, label: humanize(key), value: value.trim(), href: normalizeHref(value, key) }))
    .filter((item) => item.href);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-foreground">About</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {bio || "No bio yet. Add a short intro from the Portfolio tab."}
        </p>
        {skills.length > 0 && (
          <div className="mt-4">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Skills</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          </div>
        )}
        {interests.length > 0 && (
          <div className="mt-4">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Interests</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {interests.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h4 className="text-sm font-semibold text-foreground">Portfolio details</h4>
          </div>

          {(primaryDomain || specialization) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {primaryDomain && <Badge variant="secondary">{humanize(primaryDomain)}</Badge>}
              {specialization && <Badge variant="outline">{humanize(specialization)}</Badge>}
            </div>
          )}

          {(typedLinks.length > 0 || dynamicLinks.length > 0) ? (
            <div className="mt-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Links</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {typedLinks.map((link) => (
                  <a
                    key={`typed-${link.key}`}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground hover:border-brand/40"
                  >
                    <span className="truncate">{link.label}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                ))}
                {dynamicLinks.map((link) => (
                  <a
                    key={`dynamic-${link.key}`}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground hover:border-brand/40"
                  >
                    <span className="truncate">{link.label}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No portfolio links added yet.</p>
          )}

          <div className="mt-4 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Portfolio items</Label>
            {portfolioItemsLoading && <p className="text-xs text-muted-foreground">Loading portfolio items...</p>}
            {!portfolioItemsLoading && portfolioItems.length === 0 && (
              <p className="text-xs text-muted-foreground">No portfolio items yet.</p>
            )}
            {portfolioItems.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{item.cover} {item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.type}</div>
                  </div>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
                {item.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.skills.map((skill) => <Badge key={`${item.id}-${skill}`} variant="secondary" className="text-[10px]">{skill}</Badge>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Level</span><b>{level.name}</b></div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full transition-all duration-1000" style={{ width: `${levelProgress}%`, backgroundColor: accent }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">Next: {level.next}</p>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Streak</span><b>{streak} days</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><b>{user.joinedAt && !isNaN(new Date(user.joinedAt).getTime()) ? new Date(user.joinedAt).toLocaleDateString() : "—"}</b></div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-foreground">Account</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Role</span><b>{ROLE_LABELS[role]}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Organization</span><b>{user.campus || "—"}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><b>{user.joinedAt && !isNaN(new Date(user.joinedAt).getTime()) ? new Date(user.joinedAt).toLocaleDateString() : "—"}</b></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ role }: { role: RoleId }) {
  type ActivityItem = {
    id: string;
    text: string;
    created_at: string;
  };
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const formatActivityDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      return `${dayName}, ${monthDay} · ${timeStr}`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    backendUsers.activity(30)
      .then(({ items: activityItems }) => {
        if (cancelled) return;
        setItems(activityItems);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [role]);

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-foreground">Recent activity</h3>
      {loading && <p className="mt-3 text-sm text-muted-foreground">Loading activity...</p>}
      <ul className="mt-4 space-y-3">
        {!loading && items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 py-2 border-b border-border/30 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span className="text-sm text-foreground/90 font-medium">{item.text}</span>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary/70 border border-border/40 px-2.5 py-0.5 rounded-full shrink-0 self-start sm:self-auto">
              {formatActivityDate(item.created_at)}
            </span>
          </li>
        ))}
        {!loading && items.length === 0 && <li className="text-sm text-muted-foreground">No backend activity yet.</li>}
      </ul>
    </Card>
  );
}

function AchievementsTab({ role, isStudentLike, xp, level, levelProgress, streak, accent, user }: {
  role: RoleId; isStudentLike: boolean; xp: number; level: { name: string; min: number; max: number; next: string }; levelProgress: number; streak: number; accent: string; user?: ScopeUser | null;
}) {
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

  const unlockedSet = new Set(user?.achievements || ["early_adopter"]);

  const milestones = [
    { name: "Early Adopter", desc: "Joined during Beta", icon: Sparkles, unlocked: unlockedSet.has("early_adopter") },
    { name: "Verified Builder", desc: "Institution verified", icon: Shield, unlocked: unlockedSet.has("verified_builder") },
    { name: "First Project", desc: "Launched a work item", icon: Briefcase, unlocked: unlockedSet.has("first_project") },
    { name: "Team Player", desc: "Voted on 5 projects", icon: Users, unlocked: unlockedSet.has("team_player") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="relative overflow-hidden p-6">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-10">
            <Trophy className="h-24 w-24" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Current Tier</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">{level.name}</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{xp} XP</span>
              <span>Next: {level.next} ({level.max} XP)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full transition-all duration-1000" style={{ width: `${levelProgress}%`, backgroundColor: accent }} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Scope Points</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">{xp.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">Lifetime earnings</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Daily Streak</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">🔥 {streak}d</p>
          <p className="mt-1 text-xs text-muted-foreground">Keep building daily!</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground">Unlocked Achievements</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {milestones.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.name} className={cn(
                "flex flex-col items-center rounded-xl border p-5 text-center transition-all duration-300",
                m.unlocked 
                  ? "border-brand/20 bg-brand/5 shadow-[0_0_15px_-3px_rgba(0,209,255,0.15)] hover:scale-102 hover:shadow-[0_0_20px_1px_rgba(0,209,255,0.25)] hover:border-brand/40" 
                  : "border-border bg-muted/10 opacity-40 grayscale hover:opacity-50 hover:grayscale-[50%]"
              )}>
                <div className={cn(
                  "mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300",
                  m.unlocked 
                    ? "bg-brand/10 text-brand shadow-[inset_0_0_10px_rgba(0,209,255,0.2)]" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-foreground">{m.name}</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-snug">{m.desc}</p>
                {m.unlocked && (
                  <Badge variant="secondary" className="mt-3 bg-brand/10 text-brand hover:bg-brand/20 border-none text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                    Unlocked
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

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

function VerificationTab({ user, accent }: { user: ScopeUser; accent: string }) {
  const [submitting, setSubmitting] = useState(false);
  const v = user.verification ?? { email_verified: false, institution_verified: false, trust_score: 0 };
  const oppStatus = user.opportunitiesVerificationStatus ?? "none";

  const handleVerifyOpportunities = async () => {
    setSubmitting(true);
    try {
      await backendUsers.submitOpportunityVerification();
      toast.success("Verification request sent to Scope Admin.");
      await auth.refreshCurrentUser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send verification request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Extract all portfolio links from the user profile
  const links = {
    github: user.links?.github || "",
    linkedin: user.linkedinUrl || "",
    website: user.links?.website || "",
    portfolio: user.portfolioWebsite || "",
    resume: user.resumeUrl || "",
    portfolioPdf: user.portfolioPdfUrl || "",
    customLinks: user.portfolioLinks || {},
  };

  const hasLinks = Boolean(
    links.github ||
    links.linkedin ||
    links.website ||
    links.portfolio ||
    links.resume ||
    links.portfolioPdf ||
    Object.keys(links.customLinks).length > 0
  );

  const handleGoToPortfolio = () => {
    const trigger = document.querySelector('button[value="portfolio"]') as HTMLButtonElement | null;
    if (trigger) {
      trigger.click();
    } else {
      toast.error("Could not navigate automatically. Please click the 'Portfolio' tab above.");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <ShieldCheck className="h-5 w-5 text-brand" />
          Trust & Verification
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-secondary/5 p-4">
            <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Status</div>
            <div className="flex items-center gap-2">
              {v.email_verified ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Verified</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/5 p-4">
            <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Chapter Status</div>
            <div className="flex items-center gap-2">
              {v.institution_verified ? (
                <Badge className="bg-brand/10 text-brand border-brand/20">Active Member</Badge>
              ) : (
                <Badge variant="outline">Unverified</Badge>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/5 p-4">
            <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Trust Score</div>
            <div className="text-xl font-bold text-foreground">{v.trust_score}%</div>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-brand/20 bg-gradient-to-br from-brand/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-brand" />
              Opportunities Access
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl">
              Verification of your portfolio links is required to unlock the high-value opportunities page.
              Our team reviews your GitHub, LinkedIn, and project links to ensure quality.
            </p>
          </div>

          <div className="shrink-0 pt-1">
            {oppStatus === "verified" ? (
              <div className="flex items-center gap-2 text-emerald-500 font-bold">
                <CheckCircle2 className="h-6 w-6" />
                Unlocked
              </div>
            ) : oppStatus === "pending" ? (
              <Button disabled className="bg-amber-500/20 text-amber-600 border border-amber-500/30">
                <Clock className="mr-2 h-4 w-4 animate-pulse" /> Reviewing Portfolio...
              </Button>
            ) : (
              <Button
                onClick={handleVerifyOpportunities}
                disabled={submitting || !hasLinks}
                className={cn(
                  "bg-gradient-brand text-brand-foreground shadow-lg shadow-brand/20",
                  !hasLinks && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting ? "Sending..." : "Submit for Verification"}
              </Button>
            )}
          </div>
        </div>

        {/* Links Preview Section */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Your Submitted Portfolio Links
          </h4>

          {!hasLinks ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-start gap-2.5 text-amber-600">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-sm">No portfolio links found</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    You have not configured any active links (GitHub, LinkedIn, Website, or Resume) on your profile.
                    Scope Admins cannot verify empty profiles. Please populate your links first.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGoToPortfolio}
                variant="outline"
                size="sm"
                className="text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Configure Portfolio Links
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Ready for review! The links below will be shared with the review board.</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {links.github && (
                  <a
                    href={links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3 hover:bg-secondary hover:border-brand/40 transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Github className="h-4 w-4 shrink-0 text-foreground" />
                      <div className="truncate">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">GitHub</div>
                        <div className="text-xs font-medium text-foreground truncate">{links.github}</div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {links.linkedin && (
                  <a
                    href={links.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3 hover:bg-secondary hover:border-brand/40 transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Linkedin className="h-4 w-4 shrink-0 text-[#0077b5]" />
                      <div className="truncate">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">LinkedIn</div>
                        <div className="text-xs font-medium text-foreground truncate">{links.linkedin}</div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {links.website && (
                  <a
                    href={links.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3 hover:bg-secondary hover:border-brand/40 transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="h-4 w-4 shrink-0 text-cyan-500" />
                      <div className="truncate">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Personal Website</div>
                        <div className="text-xs font-medium text-foreground truncate">{links.website}</div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {links.portfolio && (
                  <a
                    href={links.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3 hover:bg-secondary hover:border-brand/40 transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="h-4 w-4 shrink-0 text-emerald-500" />
                      <div className="truncate">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Portfolio Page</div>
                        <div className="text-xs font-medium text-foreground truncate">{links.portfolio}</div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {links.resume && (
                  <a
                    href={links.resume}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3 hover:bg-secondary hover:border-brand/40 transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 shrink-0 text-amber-500" />
                      <div className="truncate">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CV / Resume</div>
                        <div className="text-xs font-medium text-foreground truncate">{links.resume}</div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {links.portfolioPdf && (
                  <a
                    href={links.portfolioPdf}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3 hover:bg-secondary hover:border-brand/40 transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 shrink-0 text-rose-500" />
                      <div className="truncate">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Portfolio PDF</div>
                        <div className="text-xs font-medium text-foreground truncate">{links.portfolioPdf}</div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {Object.entries(links.customLinks).map(([k, v]) => (
                  <a
                    key={k}
                    href={v}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3 hover:bg-secondary hover:border-brand/40 transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="h-4 w-4 shrink-0 text-brand" />
                      <div className="truncate">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                          {k.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs font-medium text-foreground truncate">{v}</div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {oppStatus === "rejected" && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Your previous request was not approved. Please update your portfolio links and try again.</span>
          </div>
        )}
      </Card>

      <div className="rounded-xl bg-secondary/10 p-6 border border-dashed border-border">
        <h4 className="font-bold mb-2 text-sm uppercase tracking-widest text-muted-foreground">Verification Roadmap</h4>
        <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
          <div className="relative pl-8">
            <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-white" />
            </div>
            <div className="font-bold text-sm">Account Created</div>
            <div className="text-xs text-muted-foreground">Base access granted.</div>
          </div>
          <div className="relative pl-8">
            <div className={`absolute left-0 top-1 h-4 w-4 rounded-full flex items-center justify-center ${v.institution_verified ? 'bg-emerald-500' : 'bg-muted border border-border'}`}>
              {v.institution_verified && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <div className="font-bold text-sm">Campus Verification</div>
            <div className="text-xs text-muted-foreground">Join your chapter and get verified by your admin.</div>
          </div>
          <div className="relative pl-8">
            <div className={`absolute left-0 top-1 h-4 w-4 rounded-full flex items-center justify-center ${oppStatus === 'verified' ? 'bg-emerald-500' : 'bg-muted border border-border'}`}>
              {oppStatus === 'verified' && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <div className="font-bold text-sm">Portfolio Review</div>
            <div className="text-xs text-muted-foreground">Send signal with links to unlock Opportunities page.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentPortfolioEditor({ user, onUpdate }: { user: ScopeUser; onUpdate?: () => void }) {
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
  const [portfolioItems, setPortfolioItems] = useState<BackendPortfolioItem[]>([]);
  const [portfolioItemsLoading, setPortfolioItemsLoading] = useState(true);
  const [newItemType, setNewItemType] = useState<BackendPortfolioItem["type"]>("Project");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemSkills, setNewItemSkills] = useState("");
  const [newItemLink, setNewItemLink] = useState("");
  const [newItemCover, setNewItemCover] = useState("🚀");

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
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;
    setPortfolioItemsLoading(true);
    backendPortfolio.listMe()
      .then(({ items }) => {
        if (!cancelled) setPortfolioItems(items);
      })
      .catch(() => {
        if (!cancelled) setPortfolioItems([]);
      })
      .finally(() => {
        if (!cancelled) setPortfolioItemsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user.id]);

  const domainFields = useMemo(() => (primaryDomain ? DOMAIN_PORTFOLIO_FIELDS[primaryDomain] : []), [primaryDomain]);
  const specializations = useMemo(() => (primaryDomain ? SPECIALIZATIONS[primaryDomain] : []), [primaryDomain]);

  const isValidUrl = (v: string) => {
    if (!v) return true;
    const value = v.trim();
    if (!value.startsWith("http://") && !value.startsWith("https://") && !value.includes(".")) {
      return false;
    }
    try { new URL(value.startsWith("http") ? value : `https://${value}`); return true; } catch { return false; }
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
      next[key] = val;
      return next;
    });
  };
  const removeCustomLink = (key: string) => {
    setPortfolioLinks((prev) => {
      const next = { ...prev };
      delete next[key];
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

  const addPortfolioItem = async () => {
    if (!newItemTitle.trim() || !newItemDescription.trim()) {
      toast.error("Portfolio item title and description are required.");
      return;
    }
    const skills = newItemSkills.split(",").map((skill) => skill.trim()).filter(Boolean);
    try {
      const { item } = await backendPortfolio.create({
        type: newItemType,
        title: newItemTitle.trim(),
        description: newItemDescription.trim(),
        skills,
        link: newItemLink.trim(),
        cover: newItemCover,
      });
      setPortfolioItems((current) => [item, ...current]);
      setNewItemTitle("");
      setNewItemDescription("");
      setNewItemSkills("");
      setNewItemLink("");
      toast.success("Portfolio item added.");
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add portfolio item.");
    }
  };

  const removePortfolioItem = async (id: string) => {
    try {
      await backendPortfolio.remove(id);
      setPortfolioItems((current) => current.filter((item) => item.id !== id));
      toast.success("Portfolio item removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove portfolio item.");
    }
  };

  const save = async () => {
    const formatUrl = (v: string) => {
      const trimmed = v.trim();
      if (!trimmed) return "";
      return (trimmed.startsWith("http://") || trimmed.startsWith("https://")) ? trimmed : `https://${trimmed}`;
    };

    const formatGithub = (v: string) => {
      const trimmed = v.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
      const username = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
      return `https://github.com/${username}`;
    };

    const formatTwitter = (v: string) => {
      const trimmed = v.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
      const username = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
      return `https://x.com/${username}`;
    };

    const normWebsite = formatUrl(website);
    const normLinkedin = formatUrl(linkedinUrl);
    const normPortfolioWeb = formatUrl(portfolioWebsite);
    const normResume = formatUrl(resumeUrl);
    const normPortfolioPdf = formatUrl(portfolioPdfUrl);
    const normInstagram = formatUrl(instagramUrl);
    const normGithub = formatGithub(github);
    const normTwitter = formatTwitter(twitter);

    const cleanedLinks = { ...portfolioLinks };
    for (const k in cleanedLinks) {
      const trimmed = cleanedLinks[k]?.trim();
      if (!trimmed) {
        delete cleanedLinks[k];
      } else {
        cleanedLinks[k] = formatUrl(trimmed);
      }
    }

    const urlChecks: Array<[string, string]> = [
      ["Website", normWebsite], ["LinkedIn", normLinkedin], ["Portfolio", normPortfolioWeb],
      ["Resume", normResume], ["Portfolio PDF", normPortfolioPdf], ["Instagram", normInstagram],
      ["GitHub", normGithub], ["Twitter", normTwitter],
      ...Object.entries(cleanedLinks).map(([k, v]) => [humanize(k), v] as [string, string]),
    ];
    for (const [name, val] of urlChecks) if (val && !isValidUrl(val)) return toast.error(`${name} URL is invalid`);
    try {
      await auth.updateProfile({
        bio, skills, interests, campus,
        links: { website: normWebsite, github: normGithub, twitter: normTwitter },
        availability,
        linkedinUrl: normLinkedin, portfolioWebsite: normPortfolioWeb, resumeUrl: normResume, portfolioPdfUrl: normPortfolioPdf, instagramUrl: normInstagram,
        primaryDomain: primaryDomain || undefined,
        specialization: specialization || undefined,
        portfolioLinks: cleanedLinks,
      });
      setWebsite(normWebsite);
      setLinkedinUrl(normLinkedin);
      setPortfolioWebsite(normPortfolioWeb);
      setResumeUrl(normResume);
      setPortfolioPdfUrl(normPortfolioPdf);
      setInstagramUrl(normInstagram);
      setPortfolioLinks(cleanedLinks);
      toast.success("Profile saved. Your profile attracts collaborators.");
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile.");
    }
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomLink(k)}>
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

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand" />
            <h4 className="text-sm font-semibold text-foreground">Portfolio Items</h4>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Hydrated from backend. Add work items directly from this tab.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Type</Label>
              <select value={newItemType} onChange={(e) => setNewItemType(e.target.value as BackendPortfolioItem["type"])} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {["Project", "Design", "Research", "Startup Idea", "Campaign", "Certificate"].map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <Label>Cover Emoji</Label>
              <Input value={newItemCover} onChange={(e) => setNewItemCover(e.target.value)} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <Input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Skills (comma-separated)</Label>
              <Input value={newItemSkills} onChange={(e) => setNewItemSkills(e.target.value)} placeholder="React, Figma" className="mt-1.5" />
            </div>
            <div>
              <Label>Link (optional)</Label>
              <Input value={newItemLink} onChange={(e) => setNewItemLink(e.target.value)} placeholder="https://" className="mt-1.5" />
            </div>
          </div>

          <div className="mt-3">
            <Button type="button" onClick={addPortfolioItem} variant="outline"><Plus className="mr-1 h-4 w-4" /> Add portfolio item</Button>
          </div>

          <div className="mt-4 space-y-2">
            {portfolioItemsLoading && <p className="text-sm text-muted-foreground">Loading portfolio items...</p>}
            {!portfolioItemsLoading && portfolioItems.length === 0 && <p className="text-sm text-muted-foreground">No portfolio items yet.</p>}
            {portfolioItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{item.cover} {item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.type}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                  {item.link && (
                    <a className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline" href={item.link} target="_blank" rel="noreferrer">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => removePortfolioItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
