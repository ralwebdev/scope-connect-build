import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shield, Database, Megaphone, Users, BarChart3, AlertTriangle, Trash2, RefreshCw, Plus, Wrench, LineChart, Zap, Building2, Inbox, ListChecks, Star, Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/hooks/use-scope";
import { curated, applications, ideaSubmissions, feed, projects, notifications, meta } from "@/lib/scope-store";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";

const ADMIN_EMAILS = ["admin@scope.in", "team@scope.in", "founder@scope.in"];

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Tab = "overview" | "analytics" | "projects" | "content" | "broadcast" | "campus" | "support" | "ops" | "moderation";

/* ----------- Lightweight admin overlays in localStorage ----------- */
const ADMIN_KEYS = {
  featured: "scope_admin_featured",
  archived: "scope_admin_archived",
  feedbackResolved: "scope_admin_feedback_resolved",
  ideaResolved: "scope_admin_idea_resolved",
  customCampuses: "scope_admin_campuses",
  opsChecklist: "scope_admin_ops_checklist",
  opsChecklistDate: "scope_admin_ops_date",
  homepageOverrides: "scope_admin_homepage",
} as const;

function lsRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { try { localStorage.removeItem(key); } catch { /* noop */ } return fallback; }
}
function lsWrite<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
}

function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

function AdminPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    try { if (sessionStorage.getItem("scope_admin_unlocked") === "1") setUnlocked(true); } catch { /* noop */ }
  }, []);

  const isAdminEmail = !!user && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const tryUnlock = () => {
    if (pin === "scope2026" || isAdminEmail) {
      try { sessionStorage.setItem("scope_admin_unlocked", "1"); } catch { /* noop */ }
      setUnlocked(true);
      toast.success("Admin mode unlocked");
    } else {
      toast.error("Invalid pin");
    }
  };

  if (!unlocked && !isAdminEmail) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md px-4 py-20 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-brand"><Shield className="h-6 w-6" /></div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Scope Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">Restricted area. Authorized team members only.</p>
            <div className="mt-5 space-y-3">
              <div>
                <Label htmlFor="pin">Admin PIN</Label>
                <Input id="pin" type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="mt-1.5" placeholder="••••••••" onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }} />
              </div>
              <Button onClick={tryUnlock} className="w-full bg-gradient-brand text-brand-foreground">Unlock</Button>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
            </div>
          </Card>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-8 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div>
            <Badge className="bg-cyan/15 text-cyan"><Shield className="mr-1 h-3 w-3" /> Admin Console</Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Scope Operations</h1>
            <p className="mt-1 text-sm text-primary-foreground/70">Platform pulse looks strong today.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground">
              <Link to="/admin/config"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Config Center</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground">
              <Link to="/admin/campuses/new"><Building2 className="mr-1.5 h-3.5 w-3.5" /> New campus</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground">
              <Link to="/scope-admin" search={{ tab: "crm" }}><Building2 className="mr-1.5 h-3.5 w-3.5" /> Scope Admin</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground">
              <Link to="/scope-super-admin"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Command Center</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground">
              <Link to="/ops"><Wrench className="mr-1.5 h-3.5 w-3.5" /> Ops console</Link>
            </Button>
            <Button variant="outline" size="sm" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground" onClick={() => { try { sessionStorage.removeItem("scope_admin_unlocked"); } catch { /* noop */ } setUnlocked(false); }}>Lock</Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {([
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "analytics", label: "Analytics", icon: LineChart },
            { id: "projects", label: "Projects CMS", icon: Database },
            { id: "content", label: "Content", icon: Sparkles },
            { id: "broadcast", label: "Broadcast", icon: Megaphone },
            { id: "campus", label: "Campus", icon: Building2 },
            { id: "support", label: "Support", icon: Inbox },
            { id: "ops", label: "Ops", icon: ListChecks },
            { id: "moderation", label: "Moderation", icon: AlertTriangle },
          ] as { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "overview" && <Overview onJump={setTab} />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "projects" && <ProjectsCMS />}
          {tab === "content" && <ContentManager />}
          {tab === "broadcast" && <BroadcastTab />}
          {tab === "campus" && <CampusConsole />}
          {tab === "support" && <SupportInbox />}
          {tab === "ops" && <OpsChecklists />}
          {tab === "moderation" && <ModerationTab />}
        </div>
      </section>
    </AppShell>
  );
}

/* ----------------------------- Overview + Quick Actions ----------------------------- */

function Overview({ onJump }: { onJump: (t: Tab) => void }) {
  const stats = useMemo(() => ({
    apps: applications.all().length,
    ideas: ideaSubmissions.all().length,
    posts: feed.all().length,
    userProjects: projects.all().filter((p) => !p.id.startsWith("seed_")).length,
    visits: meta.visits(),
    unread: notifications.unread(),
    challenges: curated.scopeChallenges().length,
    waitlist: safeCount("scope_waitlist"),
    feedback: safeCount("scope_feedback"),
    ambassadors: safeCount("scope_ambassador_apps"),
  }), []);

  const quickActions = [
    { label: "Create challenge", icon: Plus, hint: "Add to live opportunities", onClick: () => onJump("projects") },
    { label: "Push announcement", icon: Megaphone, hint: "Reach all users instantly", onClick: () => onJump("broadcast") },
    { label: "Toggle featured", icon: Star, hint: "Spotlight a project", onClick: () => onJump("projects") },
    { label: "Edit homepage", icon: Sparkles, hint: "Hero, metrics, banner", onClick: () => onJump("content") },
    { label: "Add campus", icon: Building2, hint: "Expand to a new institution", onClick: () => onJump("campus") },
    { label: "Review feedback", icon: Inbox, hint: `${stats.feedback + stats.ideas} items waiting`, onClick: () => onJump("support") },
    { label: "Daily checklist", icon: ListChecks, hint: "10-min ops routine", onClick: () => onJump("ops") },
    { label: "See analytics", icon: LineChart, hint: "DAU, WAU, top routes", onClick: () => onJump("analytics") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">10-minute command center</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((q) => (
            <button key={q.label} onClick={q.onClick} className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-cyan/40 hover:shadow-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors group-hover:bg-cyan/15 group-hover:text-cyan">
                <q.icon className="h-4 w-4" />
              </div>
              <div className="mt-3 text-sm font-semibold text-foreground">{q.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{q.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's pulse</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Applications" value={stats.apps} />
          <Stat label="Idea submissions" value={stats.ideas} />
          <Stat label="Feed posts" value={stats.posts} />
          <Stat label="User projects" value={stats.userProjects} />
          <Stat label="Live challenges" value={stats.challenges} />
          <Stat label="Waitlist signups" value={stats.waitlist} />
          <Stat label="Feedback entries" value={stats.feedback} />
          <Stat label="Ambassador applications" value={stats.ambassadors} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5 hover-lift">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
    </Card>
  );
}

function safeCount(key: string): number {
  if (typeof window === "undefined") return 0;
  try { return (JSON.parse(localStorage.getItem(key) || "[]") as unknown[]).length; } catch { return 0; }
}

/* ----------------------------- Projects CMS (with featured toggle) ----------------------------- */

function ProjectsCMS() {
  const all = curated.all();
  const [featured, setFeatured] = useState<string[]>(() => lsRead<string[]>(ADMIN_KEYS.featured, []));
  const [archived, setArchived] = useState<string[]>(() => lsRead<string[]>(ADMIN_KEYS.archived, []));
  const [filter, setFilter] = useState<"all" | "live" | "closing-soon" | "archived">("all");
  const [query, setQuery] = useState("");

  const toggleFeatured = (id: string) => {
    const next = featured.includes(id) ? featured.filter((x) => x !== id) : [...featured, id];
    setFeatured(next); lsWrite(ADMIN_KEYS.featured, next);
    toast.success(next.includes(id) ? "Marked as featured" : "Removed from featured");
  };
  const toggleArchive = (id: string) => {
    const next = archived.includes(id) ? archived.filter((x) => x !== id) : [...archived, id];
    setArchived(next); lsWrite(ADMIN_KEYS.archived, next);
    toast.success(next.includes(id) ? "Moved to archive." : "Restored from archive.");
  };

  const filtered = all.filter((p) => {
    const isArch = archived.includes(p.id);
    if (filter === "archived") return isArch;
    if (filter === "live") return !isArch && p.status === "live";
    if (filter === "closing-soon") return !isArch && p.status === "closing-soon";
    if (isArch) return false;
    if (!query) return true;
    return p.title.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search challenges…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
          <div className="flex gap-1">
            {(["all", "live", "closing-soon", "archived"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">Showing {filtered.length} of {all.length}</div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-secondary/30 p-4">
          <div className="text-sm font-semibold text-foreground">Curated projects</div>
          <div className="text-xs text-muted-foreground">Featured & archive flags persist on this device. New challenge creation ships in v2.</div>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No challenges match these filters.</div>
          ) : filtered.map((p) => {
            const isFeatured = featured.includes(p.id);
            const isArch = archived.includes(p.id);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="text-2xl">{p.cover}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-foreground">{p.title}</div>
                    {isFeatured && <Badge className="bg-cyan/15 text-cyan text-[10px]"><Star className="mr-0.5 h-2.5 w-2.5 fill-current" /> Featured</Badge>}
                    {isArch && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.scope} · {p.category} · {p.seatsFilled}/{p.seatsTotal} seats · {p.status}</div>
                </div>
                <Badge variant="outline" className="text-xs">{p.difficulty}</Badge>
                <Button size="sm" variant={isFeatured ? "default" : "outline"} onClick={() => toggleFeatured(p.id)}>
                  <Star className={`mr-1 h-3 w-3 ${isFeatured ? "fill-current" : ""}`} /> {isFeatured ? "Featured" : "Feature"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleArchive(p.id)}>{isArch ? "Restore" : "Archive"}</Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------- Content / Homepage CMS ----------------------------- */

type HomepageOverrides = {
  heroHeadline?: string;
  heroSubheadline?: string;
  banner?: string;
  bannerActive?: boolean;
};

function ContentManager() {
  const [overrides, setOverrides] = useState<HomepageOverrides>(() => lsRead<HomepageOverrides>(ADMIN_KEYS.homepageOverrides, {}));

  const save = () => { lsWrite(ADMIN_KEYS.homepageOverrides, overrides); toast.success("Homepage updated."); };
  const reset = () => { setOverrides({}); lsWrite(ADMIN_KEYS.homepageOverrides, {}); toast.success("Reverted to defaults."); };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground">Homepage CMS</h3>
        <p className="mt-1 text-xs text-muted-foreground">Edit hero copy and announcement banner. Persists locally; no code changes needed.</p>
        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="hero" className="text-xs">Hero headline</Label>
            <Input id="hero" value={overrides.heroHeadline ?? ""} onChange={(e) => setOverrides({ ...overrides, heroHeadline: e.target.value })} className="mt-1.5" placeholder="India's builder ecosystem starts here" />
          </div>
          <div>
            <Label htmlFor="sub" className="text-xs">Hero subheadline</Label>
            <Textarea id="sub" rows={2} value={overrides.heroSubheadline ?? ""} onChange={(e) => setOverrides({ ...overrides, heroSubheadline: e.target.value })} className="mt-1.5" placeholder="Build proof of work…" />
          </div>
          <div>
            <Label htmlFor="banner" className="text-xs">Announcement banner</Label>
            <Input id="banner" value={overrides.banner ?? ""} onChange={(e) => setOverrides({ ...overrides, banner: e.target.value })} className="mt-1.5" placeholder="Scope Hack '26 registrations open" />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <Checkbox checked={!!overrides.bannerActive} onCheckedChange={(c) => setOverrides({ ...overrides, bannerActive: c === true })} />
            Show banner sitewide
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} className="bg-gradient-brand text-brand-foreground">Save changes</Button>
            <Button size="sm" variant="outline" onClick={reset}>Revert to defaults</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground">Homepage stats</h3>
          <p className="mt-1 text-xs text-muted-foreground">Defined in <code className="rounded bg-secondary px-1">src/lib/mock-data.ts</code> · liveMetrics.</p>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground">Testimonials</h3>
          <p className="mt-1 text-xs text-muted-foreground">8 active. Edit in <code className="rounded bg-secondary px-1">mock-data.ts</code> · testimonials.</p>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground">FAQs</h3>
          <p className="mt-1 text-xs text-muted-foreground">15 entries on <code className="rounded bg-secondary px-1">/support</code>.</p>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground">Campus partners</h3>
          <p className="mt-1 text-xs text-muted-foreground">Manage in the Campus tab.</p>
        </Card>
      </div>
    </div>
  );
}

/* ----------------------------- Broadcast (with templates) ----------------------------- */

const TEMPLATES = [
  "📣 Fresh opportunities just dropped. Check the new challenges live now.",
  "🏆 Your campus climbed the rankings this week. Keep the momentum going.",
  "⚡ Weekly sprint starts tonight at 8 PM IST. RSVP from the events page.",
  "🚀 New AI challenge accepting applications — limited seats remaining.",
  "💡 Builders shipped 12 new projects this week. Yours next?",
];

function BroadcastTab() {
  const [text, setText] = useState("");
  const [scope, setScope] = useState<"all" | "campus">("all");
  const [campusName, setCampusName] = useState("");

  const send = () => {
    if (text.trim().length < 10) { toast.error("Announcement needs 10+ chars."); return; }
    const prefix = scope === "campus" && campusName ? `[${campusName}] ` : "";
    notifications.push({ icon: "spark", text: `📣 ${prefix}${text.trim()}` });
    toast.success("Broadcast sent.");
    setText("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <h3 className="font-semibold text-foreground">Push announcement</h3>
        <p className="mt-1 text-xs text-muted-foreground">Reaches every user on this browser via the notification bell.</p>

        <div className="mt-4 flex gap-2">
          <Button size="sm" variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>Global</Button>
          <Button size="sm" variant={scope === "campus" ? "default" : "outline"} onClick={() => setScope("campus")}>Campus-specific</Button>
        </div>

        {scope === "campus" && (
          <Input className="mt-3" placeholder="Campus name (e.g. IIT Bombay)" value={campusName} onChange={(e) => setCampusName(e.target.value)} />
        )}

        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={240} className="mt-3" placeholder="Scope Hack '26 registrations open today…" />
        <div className="mt-1 text-right text-[10px] text-muted-foreground">{text.length}/240</div>
        <Button onClick={send} className="mt-2 bg-gradient-brand text-brand-foreground"><Plus className="mr-1.5 h-3.5 w-3.5" /> Broadcast</Button>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground">Templates</h3>
        <p className="mt-1 text-xs text-muted-foreground">Click to load.</p>
        <ul className="mt-3 space-y-2">
          {TEMPLATES.map((t, i) => (
            <li key={i}>
              <button onClick={() => setText(t.replace(/^[^\s]+\s/, ""))} className="w-full rounded-lg border border-border p-2.5 text-left text-xs text-foreground transition-colors hover:bg-secondary/50">
                {t}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ----------------------------- Campus Expansion Console ----------------------------- */

type CustomCampus = { id: string; name: string; city: string; chapterLead: string; createdAt: number };

function CampusConsole() {
  const [list, setList] = useState<CustomCampus[]>(() => lsRead<CustomCampus[]>(ADMIN_KEYS.customCampuses, []));
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [lead, setLead] = useState("");

  const add = () => {
    if (!name.trim() || !city.trim()) { toast.error("Campus name and city required."); return; }
    const next: CustomCampus = { id: `c_${Date.now()}`, name: name.trim(), city: city.trim(), chapterLead: lead.trim() || "TBD", createdAt: Date.now() };
    const updated = [next, ...list];
    setList(updated); lsWrite(ADMIN_KEYS.customCampuses, updated);
    setName(""); setCity(""); setLead("");
    toast.success(`${next.name} added · starter pack seeded.`);
  };

  const remove = (id: string) => {
    const updated = list.filter((c) => c.id !== id);
    setList(updated); lsWrite(ADMIN_KEYS.customCampuses, updated);
    toast.success("Campus removed.");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1">
        <h3 className="font-semibold text-foreground">Add new campus</h3>
        <p className="mt-1 text-xs text-muted-foreground">Includes starter growth + challenges + feed pack.</p>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="cname" className="text-xs">Campus name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="IIM Ahmedabad" />
          </div>
          <div>
            <Label htmlFor="ccity" className="text-xs">City</Label>
            <Input id="ccity" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5" placeholder="Ahmedabad" />
          </div>
          <div>
            <Label htmlFor="clead" className="text-xs">Chapter lead (optional)</Label>
            <Input id="clead" value={lead} onChange={(e) => setLead(e.target.value)} className="mt-1.5" placeholder="Riya Patel" />
          </div>
          <Button onClick={add} className="w-full bg-gradient-brand text-brand-foreground"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add campus</Button>
        </div>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h3 className="font-semibold text-foreground">Custom campuses ({list.length})</h3>
        {list.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No custom campuses yet. Add one to start expansion.</p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {list.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.city} · Lead: {c.chapterLead}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ----------------------------- Support / Feedback Inbox ----------------------------- */

type FeedbackItem = { id?: string; type?: string; message?: string; email?: string; at?: number; [k: string]: unknown };

function SupportInbox() {
  const [items, setItems] = useState<FeedbackItem[]>(() => lsRead<FeedbackItem[]>("scope_feedback", []));
  const [resolved, setResolved] = useState<string[]>(() => lsRead<string[]>(ADMIN_KEYS.feedbackResolved, []));
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  const toggleResolve = (id: string) => {
    const next = resolved.includes(id) ? resolved.filter((x) => x !== id) : [...resolved, id];
    setResolved(next); lsWrite(ADMIN_KEYS.feedbackResolved, next);
  };

  const idOf = (it: FeedbackItem, idx: number) => it.id || `fb_${idx}`;
  const filtered = items.filter((it, idx) => {
    const id = idOf(it, idx);
    const isRes = resolved.includes(id);
    if (filter === "open") return !isRes;
    if (filter === "resolved") return isRes;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-foreground">Feedback inbox</div>
          <Badge variant="outline" className="text-xs">{items.length} total</Badge>
          <div className="ml-auto flex gap-1">
            {(["open", "resolved", "all"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => { setItems(lsRead<FeedbackItem[]>("scope_feedback", [])); toast.success("Refreshed"); }}><RefreshCw className="h-3 w-3" /></Button>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {filter === "open" ? "Feedback queue cleared. 🎉" : "Nothing here yet."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((it, idx) => {
            const id = idOf(it, idx);
            const isRes = resolved.includes(id);
            return (
              <Card key={id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{it.type || "general"}</Badge>
                      {it.at && <span className="text-[10px] text-muted-foreground">{new Date(it.at).toLocaleString()}</span>}
                      {isRes && <Badge className="bg-cyan/15 text-cyan text-[10px]"><Check className="mr-0.5 h-2.5 w-2.5" /> Resolved</Badge>}
                    </div>
                    <div className="mt-2 text-sm text-foreground">{it.message || "(no message)"}</div>
                    {it.email && <div className="mt-1 text-xs text-muted-foreground">{it.email}</div>}
                  </div>
                  <Button size="sm" variant={isRes ? "outline" : "default"} onClick={() => toggleResolve(id)}>
                    {isRes ? "Reopen" : "Resolve"}
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

/* ----------------------------- Ops Checklists ----------------------------- */

const DAILY_CHECKLIST = [
  "Check signups",
  "Review feedback queue",
  "Approve / update featured challenge",
  "Check broken content & reports",
  "Push one engagement message",
];
const WEEKLY_CHECKLIST = [
  "Launch a new challenge",
  "Refresh homepage metrics",
  "Rotate testimonials",
  "Update rankings",
  "Review analytics trends",
];

function OpsChecklists() {
  const today = todayKey();
  const stored = useMemo(() => lsRead<{ date: string; daily: string[]; weekly: string[] }>(ADMIN_KEYS.opsChecklist, { date: today, daily: [], weekly: [] }), [today]);
  const initialDaily = stored.date === today ? stored.daily : [];
  const [daily, setDaily] = useState<string[]>(initialDaily);
  const [weekly, setWeekly] = useState<string[]>(stored.weekly);

  useEffect(() => {
    lsWrite(ADMIN_KEYS.opsChecklist, { date: today, daily, weekly });
  }, [daily, weekly, today]);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const dailyDone = daily.length;
  const weeklyDone = weekly.length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Today's checklist</h3>
          <Badge variant="outline" className="text-xs">{dailyDone}/{DAILY_CHECKLIST.length}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">10 minutes. That's it.</p>
        <ul className="mt-4 space-y-2">
          {DAILY_CHECKLIST.map((item) => {
            const done = daily.includes(item);
            return (
              <li key={item}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50">
                  <Checkbox checked={done} onCheckedChange={() => toggle(daily, setDaily, item)} />
                  <span className={`text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {dailyDone === DAILY_CHECKLIST.length && (
          <div className="mt-4 rounded-lg bg-cyan/10 p-3 text-xs text-foreground">✅ Daily ops complete. See you tomorrow.</div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">This week's checklist</h3>
          <Badge variant="outline" className="text-xs">{weeklyDone}/{WEEKLY_CHECKLIST.length}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Resets manually. Keep momentum.</p>
        <ul className="mt-4 space-y-2">
          {WEEKLY_CHECKLIST.map((item) => {
            const done = weekly.includes(item);
            return (
              <li key={item}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50">
                  <Checkbox checked={done} onCheckedChange={() => toggle(weekly, setWeekly, item)} />
                  <span className={`text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => { setWeekly([]); toast.success("Weekly reset"); }}>Reset week</Button>
      </Card>
    </div>
  );
}

/* ----------------------------- Moderation ----------------------------- */

function ModerationTab() {
  const ideas = ideaSubmissions.all();
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Idea submissions ({ideas.length})</h3>
          <Button variant="outline" size="sm" onClick={() => { try { localStorage.removeItem("scope_idea_submissions"); window.dispatchEvent(new CustomEvent("scope:store-change")); toast.success("Cleared"); } catch { /* noop */ } }}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear all</Button>
        </div>
        {ideas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No private idea submissions yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ideas.slice(0, 8).map((i) => (
              <li key={i.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{i.anonymous ? "Anonymous" : "Identified"}</Badge><span className="text-xs text-muted-foreground">{new Date(i.at).toLocaleString()}</span></div>
                <div className="mt-2 text-sm font-semibold text-foreground">{i.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.problem}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-destructive/30 bg-destructive/5 p-5">
        <h3 className="font-semibold text-foreground">Danger zone</h3>
        <p className="mt-1 text-xs text-muted-foreground">Wipe all local data on this device. Useful for fresh demos.</p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => { meta.resetAll(); toast.success("All local data reset"); }}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset demo data</Button>
      </Card>
    </div>
  );
}

/* ----------------------------- Analytics ----------------------------- */

function AnalyticsTab() {
  const snap = useMemo(() => analytics.snapshot(), []);
  const topRoutes = useMemo(() => analytics.topRoutes(6), []);
  const signups7 = useMemo(() => analytics.signupsLast7(), []);
  const wau = analytics.activeLast7();
  const dau = analytics.activeToday();
  const max = Math.max(1, ...signups7.map((d) => d.count));

  const totalSignups = snap.events.signup_completed || 0;
  const totalApply = snap.events.project_apply || 0;
  const totalView = snap.events.project_view || 0;
  const totalRSVP = snap.events.event_rsvp || 0;
  const totalPosts = snap.events.feed_post_created || 0;
  const totalPortfolio = snap.events.portfolio_item_added || 0;
  const sessions = snap.sessions;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total signups" value={totalSignups} />
        <Stat label="DAU (today)" value={dau} />
        <Stat label="WAU (7d)" value={wau} />
        <Stat label="Sessions" value={sessions} />
        <Stat label="Applications" value={totalApply} />
        <Stat label="Project views" value={totalView} />
        <Stat label="Event RSVPs" value={totalRSVP} />
        <Stat label="Feed posts" value={totalPosts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground">7-day signups trend</h3>
          <div className="mt-5 flex h-32 items-end gap-2">
            {signups7.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t bg-gradient-brand transition-all" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? "4px" : "0" }} title={`${d.count} signups`} />
                </div>
                <div className="text-[10px] text-muted-foreground">{d.day}</div>
                <div className="text-[10px] font-semibold text-foreground">{d.count}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground">Most visited routes</h3>
          {topRoutes.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No route visits tracked yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topRoutes.map((r) => {
                const pct = Math.round((r.count / topRoutes[0].count) * 100);
                return (
                  <li key={r.route}>
                    <div className="flex items-center justify-between text-xs">
                      <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">{r.route}</code>
                      <span className="font-semibold text-foreground">{r.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full bg-cyan" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground">Feature usage breakdown</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(snap.events).map(([ev, n]) => (
            <div key={ev} className="flex items-center justify-between rounded-lg border border-border p-3 text-xs">
              <span className="text-muted-foreground">{ev}</span>
              <span className="font-semibold text-foreground">{n}</span>
            </div>
          ))}
        </div>
        {totalPortfolio === 0 && totalSignups > 0 && (
          <p className="mt-4 rounded-lg bg-cyan/10 p-3 text-xs text-foreground">
            💡 Insight: Profile completion drops at the portfolio step.
          </p>
        )}
      </Card>

      <Card className="border-destructive/30 bg-destructive/5 p-5">
        <h3 className="font-semibold text-foreground">Reset analytics</h3>
        <p className="mt-1 text-xs text-muted-foreground">Clears all event counters. Aggregate-only — no PII stored.</p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => { analytics.reset(); toast.success("Analytics reset"); }}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </Card>
    </div>
  );
}
