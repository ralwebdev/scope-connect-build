// Institutional Admin portal — mapped to a single institution.
// Demo mapping: each user email is bound to one institution_id via a localStorage
// helper. Falls back to a seeded default for demo users.
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Users, BarChart3, Megaphone, CheckCircle2, XCircle, TrendingUp, Award, Calendar, FolderKanban, Send, ImageIcon, Sparkles, ChevronRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUser } from "@/hooks/use-scope";
import { useRole } from "@/hooks/use-rbac";
import { useStoreValue } from "@/hooks/use-scope";
import { crm, type Institution } from "@/lib/crm-store";
import { backendUsers } from "@/lib/api/endpoints";
import type { ScopeUser } from "@/lib/scope-store";
import { rbac, type PermissionKey } from "@/lib/rbac";
import { toast } from "sonner";

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

function InstitutionAdminPortal() {
  const role = useRole();
  const allowed = role === "institutional_admin" || role === "scope_super_admin" || role === "super_admin" || role === "scope_admin";
  const inst = useMyInstitution();

  if (!allowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="manage_institution"
          title="Institution Hub restricted"
          message="Only Institutional Admins (and higher) can access this institution's hub."
          toastMessage="Institutional Admin access required."
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
        <InstitutionRouteSwitcher institutionId={inst.id} institutionName={inst.name} />
      </RbacSidebar>
    </AppShell>
  );
}

/* The institution-admin layout uses a single component that switches body by
 * pathname so we don't have to maintain a child route tree just for tabs. */
function InstitutionRouteSwitcher({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const loc = useLocation();
  const tab = loc.pathname.includes("/members") ? "members"
    : loc.pathname.includes("/analytics") ? "analytics"
    : loc.pathname.includes("/communications") ? "communications"
    : "hub";
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2"><Building2 className="mr-1 h-3 w-3" /> Institutional Admin</Badge>
          <h1 className="text-3xl font-bold tracking-tight">{institutionName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mapped scope: this institution only.</p>
        </div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <TabLink to="/institution-admin" label="Hub" active={tab === "hub"} />
        <TabLink to="/institution-admin/members" label="Members" active={tab === "members"} />
        <TabLink to="/institution-admin/analytics" label="Analytics" active={tab === "analytics"} />
        <TabLink to="/institution/reports" label="Reports" active={false} />
        <TabLink to="/institution-admin/communications" label="Communications" active={tab === "communications"} />
      </nav>

      <div className="mt-6">
        {tab === "hub" && <HubView institutionId={institutionId} institutionName={institutionName} />}
        {tab === "members" && <MembersView institutionId={institutionId} />}
        {tab === "analytics" && <AnalyticsView institutionId={institutionId} />}
        {tab === "communications" && <CommunicationsView institutionName={institutionName} />}
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

const KPI_KEY = "sc_inst_kpi_seed";
function seedKpis(id: string) {
  // deterministic-ish KPIs per institution for demo
  const n = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return {
    total: 80 + (n % 220),
    active: 40 + (n % 140),
    profile: 55 + (n % 35),
    projects: 12 + (n % 18),
    rank: (n % 12) + 1,
    events: 3 + (n % 6),
  };
}

function HubView({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const k = seedKpis(institutionId);
  const items = [
    { label: "Total members", v: k.total, icon: Users },
    { label: "Active students", v: k.active, icon: TrendingUp, accent: true },
    { label: "Profile completion", v: `${k.profile}%`, icon: Award },
    { label: "Projects participation", v: k.projects, icon: FolderKanban },
    { label: "Campus rank", v: `#${k.rank}`, icon: Award, accent: true },
    { label: "Events conducted", v: k.events, icon: Calendar },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
      <QuickActionsPanel />
      <InstitutionProfileEditor institutionId={institutionId} institutionName={institutionName} />
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

const PROFILE_KEY = "sc_inst_profile";
type InstProfile = { logoText: string; description: string; departments: string[]; topSkills: string[] };
function readProfile(id: string): InstProfile {
  if (typeof window === "undefined") return { logoText: "", description: "", departments: [], topSkills: [] };
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY}:${id}`);
    return raw ? JSON.parse(raw) : { logoText: "", description: "Building India's most ambitious student community.", departments: ["CSE","ECE","ME"], topSkills: ["AI/ML","Web","Design"] };
  } catch { return { logoText: "", description: "", departments: [], topSkills: [] }; }
}
function writeProfile(id: string, p: InstProfile) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(`${PROFILE_KEY}:${id}`, JSON.stringify(p)); } catch { /* noop */ }
}

function InstitutionProfileEditor({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const [p, setP] = useState<InstProfile>(() => readProfile(institutionId));
  const [dept, setDept] = useState("");
  const [skill, setSkill] = useState("");
  const save = () => { writeProfile(institutionId, p); toast.success("Institution profile saved"); };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Institution profile</h3>
        <Button size="sm" onClick={save} className="bg-gradient-brand text-brand-foreground">Save</Button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label>Logo text / monogram</Label>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-lg font-bold text-brand-foreground">
              {(p.logoText || institutionName).slice(0,2).toUpperCase()}
            </div>
            <Input value={p.logoText} onChange={(e) => setP({ ...p, logoText: e.target.value })} placeholder="e.g. ABC" />
          </div>
        </div>
        <div className="md:row-span-2">
          <Label>Description</Label>
          <Textarea rows={5} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
        </div>
        <div>
          <Label>Departments</Label>
          <div className="mt-1 flex gap-2">
            <Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Add department" />
            <Button variant="outline" onClick={() => { if (dept) { setP({ ...p, departments: [...p.departments, dept] }); setDept(""); }}}>Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.departments.map((d, i) => (
              <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setP({ ...p, departments: p.departments.filter((_,j) => j!==i) })}>
                {d} <XCircle className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label>Top skills</Label>
          <div className="mt-1 flex gap-2">
            <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Add skill" />
            <Button variant="outline" onClick={() => { if (skill) { setP({ ...p, topSkills: [...p.topSkills, skill] }); setSkill(""); }}}>Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.topSkills.map((d, i) => (
              <Badge key={i} className="cursor-pointer bg-gradient-brand text-brand-foreground" onClick={() => setP({ ...p, topSkills: p.topSkills.filter((_,j) => j!==i) })}>
                {d} <XCircle className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

const MEMBERS_KEY = "sc_inst_members";
type Member = { id: string; name: string; email: string; role: "student" | "campus_leader" | "faculty_coordinator"; status: "pending" | "active" | "deactivated" };
function readMembers(id: string): Member[] {
  if (typeof window === "undefined") return seedMembers();
  try {
    const raw = localStorage.getItem(`${MEMBERS_KEY}:${id}`);
    if (!raw) { const s = seedMembers(); localStorage.setItem(`${MEMBERS_KEY}:${id}`, JSON.stringify(s)); return s; }
    return JSON.parse(raw);
  } catch { return seedMembers(); }
}
function writeMembers(id: string, m: Member[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(`${MEMBERS_KEY}:${id}`, JSON.stringify(m)); window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: [MEMBERS_KEY] } })); } catch { /* noop */ }
}
function seedMembers(): Member[] {
  return [
    { id: "m1", name: "Aarav Sharma", email: "aarav@stud.in", role: "student", status: "pending" },
    { id: "m2", name: "Riya Sen", email: "riya@stud.in", role: "student", status: "active" },
    { id: "m3", name: "Karan Bose", email: "karan.leader@stud.in", role: "campus_leader", status: "active" },
    { id: "m4", name: "Prof. Mitra", email: "mitra.faculty@inst.in", role: "faculty_coordinator", status: "pending" },
    { id: "m5", name: "Dev Iyer", email: "dev@stud.in", role: "student", status: "active" },
    { id: "m6", name: "Anya Roy", email: "anya@stud.in", role: "student", status: "deactivated" },
  ];
}

function MembersView({ institutionId }: { institutionId: string }) {
  const [remoteMembers, setRemoteMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
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
  const members = remoteMembers;
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "deactivated">("all");
  const list = filter === "all" ? members : members.filter(m => m.status === filter);
  const update = async (id: string, patch: Partial<Member>) => {
    if (patch.status) {
      const studentStatus = patch.status === "active" ? "active" : patch.status === "pending" ? "pending_verification" : "rejected";
      try {
        const { user } = await backendUsers.updateMemberStatus(id, studentStatus);
        setRemoteMembers((current) => current.map((member) => member.id === id ? memberFromUser(user) : member));
        toast.success("Updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update member.");
      }
      return;
    }
    setRemoteMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  };
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold">Members ({list.length})</h3>
        <div className="ml-auto flex gap-1.5">
          {(["all","pending","active","deactivated"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 text-left">Name</th>
              <th className="py-2 text-left">Email</th>
              <th className="py-2 text-left">Role</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingMembers && <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading members...</td></tr>}
            {!loadingMembers && list.map(m => (
              <tr key={m.id} className="border-b border-border/50">
                <td className="py-3 font-semibold">{m.name}</td>
                <td className="py-3 text-xs text-muted-foreground">{m.email}</td>
                <td className="py-3">
                  <select value={m.role} onChange={(e) => update(m.id, { role: e.target.value as Member["role"] })} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                    <option value="student">Student</option>
                    <option value="campus_leader">Campus Leader</option>
                    <option value="faculty_coordinator">Faculty Coordinator</option>
                  </select>
                </td>
                <td className="py-3">
                  <Badge variant={m.status === "active" ? "default" : m.status === "pending" ? "outline" : "destructive"}>{m.status}</Badge>
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    {m.status === "pending" && (
                      <Button size="sm" onClick={() => update(m.id, { status: "active" })}><CheckCircle2 className="mr-1 h-3 w-3" /> Approve</Button>
                    )}
                    {m.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => update(m.id, { status: "deactivated" })}>Deactivate</Button>
                    )}
                    {m.status === "deactivated" && (
                      <Button size="sm" variant="outline" onClick={() => update(m.id, { status: "active" })}>Reactivate</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loadingMembers && list.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No members in this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function memberFromUser(user: ScopeUser): Member {
  const variant = user.role_variant;
  const role: Member["role"] = variant === "campus_leader" ? "campus_leader" : variant === "faculty_coordinator" || user.role === "faculty" ? "faculty_coordinator" : "student";
  const status: Member["status"] = user.student_status === "pending_verification" ? "pending" : user.student_status === "rejected" ? "deactivated" : "active";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    status,
  };
}

function AnalyticsView({ institutionId }: { institutionId: string }) {
  const members = useStoreValue(() => readMembers(institutionId));
  const dau = Math.max(8, Math.round(members.filter(m => m.status === "active").length * 0.3));
  const wau = Math.max(20, Math.round(members.filter(m => m.status === "active").length * 0.7));
  const submitted = 42;
  const movement = 3;
  const top = members.filter(m => m.status === "active").slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="DAU" value={dau} />
        <Stat label="WAU" value={wau} />
        <Stat label="Applications submitted" value={submitted} />
        <Stat label="Leaderboard movement" value={`▲ ${movement}`} accent />
      </div>
      <Card className="p-5">
        <h3 className="text-sm font-bold">Top performers</h3>
        <div className="mt-3 divide-y divide-border">
          {top.map((m, i) => (
            <div key={m.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold">{i+1}</div>
                <div>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.role.replace("_"," ")}</div>
                </div>
              </div>
              <Badge variant="outline">{1200 - i * 140} XP</Badge>
            </div>
          ))}
          {top.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No active members yet.</p>}
        </div>
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

const COMM_KEY = "sc_inst_comms";
type Announcement = { id: string; title: string; body: string; channel: "broadcast" | "email" | "notice"; at: number };
function readComms(): Announcement[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(COMM_KEY) ?? "[]"); } catch { return []; }
}
function writeComms(a: Announcement[]) { if (typeof window !== "undefined") { localStorage.setItem(COMM_KEY, JSON.stringify(a)); window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: [COMM_KEY] } })); } }

function CommunicationsView({ institutionName }: { institutionName: string }) {
  const list = useStoreValue(readComms);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<Announcement["channel"]>("broadcast");
  const send = () => {
    if (!title || !body) { toast.error("Title and body required"); return; }
    writeComms([{ id: `c${Date.now()}`, title, body, channel, at: Date.now() }, ...list]);
    setTitle(""); setBody("");
    toast.success(`Sent via ${channel}`);
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
              {(["broadcast","email","notice"] as const).map(c => (
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
