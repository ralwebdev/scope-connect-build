import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Calendar,
  Building2,
  Inbox,
  Lightbulb,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Shield,
  Rocket,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { analytics } from "@/lib/analytics";
import { ExportResultsCard } from "@/components/site/ExportResultsCard";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "Ops · Scope Connect" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OpsPage,
});

type Tab = "bugs" | "calendar" | "campus" | "support" | "requests" | "checklist" | "softlaunch";

const ADMIN_EMAILS = ["admin@scope.in", "team@scope.in", "founder@scope.in"];
const PIN = "scope2026";

function OpsPage() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [tab, setTab] = useState<Tab>("checklist");

  useEffect(() => {
    try {
      if (sessionStorage.getItem("scope_admin_unlocked") === "1") setUnlocked(true);
    } catch {
      /* noop */
    }
  }, []);

  const tryUnlock = () => {
    if (pin === PIN) {
      try {
        sessionStorage.setItem("scope_admin_unlocked", "1");
      } catch {
        /* noop */
      }
      setUnlocked(true);
      toast.success("Ops console unlocked");
    } else {
      toast.error("Invalid pin");
    }
  };

  if (!unlocked) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md px-4 py-20 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-brand">
              <Wrench className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Scope Ops</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Internal operations console for the Scope team.
            </p>
            <div className="mt-5 space-y-3">
              <div>
                <Label htmlFor="opin">Ops PIN</Label>
                <Input
                  id="opin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1.5"
                  placeholder="••••••••"
                />
              </div>
              <Button onClick={tryUnlock} className="w-full bg-gradient-brand text-brand-foreground">
                Unlock
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/dashboard" })}>
                Back to dashboard
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Allowlisted emails: {ADMIN_EMAILS.join(", ")}
            </p>
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
            <Badge className="bg-cyan/15 text-cyan">
              <Wrench className="mr-1 h-3 w-3" /> Ops Console
            </Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Launch Operations</h1>
            <p className="mt-1 text-sm text-primary-foreground/70">
              Bugs, calendar, campus onboarding, support queue, feature requests.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground">
              <Link to="/admin">
                <Shield className="mr-1.5 h-3.5 w-3.5" /> Admin
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {(
            [
              { id: "softlaunch", label: "Soft launch", icon: Rocket },
              { id: "checklist", label: "Launch checklist", icon: CheckCircle2 },
              { id: "bugs", label: "Bugs", icon: Wrench },
              { id: "calendar", label: "Content calendar", icon: Calendar },
              { id: "campus", label: "Campus onboarding", icon: Building2 },
              { id: "support", label: "Support queue", icon: Inbox },
              { id: "requests", label: "Feature requests", icon: Lightbulb },
            ] as { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "softlaunch" && <SoftLaunchPanel />}
          {tab === "checklist" && <LaunchChecklist />}
          {tab === "bugs" && <BugTracker />}
          {tab === "calendar" && <ContentCalendar />}
          {tab === "campus" && <CampusOnboarding />}
          {tab === "support" && <SupportQueue />}
          {tab === "requests" && <FeatureRequests />}
        </div>
      </section>
    </AppShell>
  );
}

/* -------------------- Launch checklist -------------------- */

const LAUNCH_ITEMS = [
  "Homepage metrics updated",
  "At least 20 live opportunities visible",
  "Notifications tested",
  "All routes tested",
  "Support form working",
  "Admin access confirmed",
];
const WEEKLY_RHYTHM = [
  { day: "Monday", task: "Launch new challenge" },
  { day: "Wednesday", task: "Community spotlight" },
  { day: "Friday", task: "Leaderboard update" },
  { day: "Weekend", task: "Review analytics" },
];

function LaunchChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("scope_ops_launch") || "{}");
    } catch {
      return {};
    }
  });
  const toggle = (k: string) => {
    const next = { ...checked, [k]: !checked[k] };
    setChecked(next);
    try {
      localStorage.setItem("scope_ops_launch", JSON.stringify(next));
    } catch {
      /* noop */
    }
  };
  const done = LAUNCH_ITEMS.filter((i) => checked[i]).length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Launch day checklist</h3>
          <Badge variant="outline" className="text-xs">{done}/{LAUNCH_ITEMS.length}</Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-gradient-brand transition-all duration-500"
            style={{ width: `${(done / LAUNCH_ITEMS.length) * 100}%` }}
          />
        </div>
        <ul className="mt-4 space-y-2">
          {LAUNCH_ITEMS.map((item) => {
            const isDone = !!checked[item];
            return (
              <li key={item}>
                <button
                  onClick={() => toggle(item)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-secondary/50"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={isDone ? "text-muted-foreground line-through" : "text-foreground"}>{item}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground">Weekly ops rhythm</h3>
        <p className="mt-1 text-xs text-muted-foreground">The cadence that keeps Scope alive.</p>
        <ul className="mt-4 space-y-2">
          {WEEKLY_RHYTHM.map((r) => (
            <li key={r.day} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-semibold text-foreground">{r.day}</span>
              <span className="text-xs text-muted-foreground">{r.task}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* -------------------- Generic local list helpers -------------------- */

type ListItem<T> = T & { id: string; at: number };

function useLocalList<T extends object>(key: string) {
  const [items, setItems] = useState<ListItem<T>[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  });
  const persist = (next: ListItem<T>[]) => {
    setItems(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };
  const add = (data: T) =>
    persist([{ ...data, id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, at: Date.now() }, ...items]);
  const update = (id: string, patch: Partial<ListItem<T>>) =>
    persist(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id: string) => persist(items.filter((i) => i.id !== id));
  const clear = () => persist([]);
  return { items, add, update, remove, clear };
}

/* -------------------- Bug tracker -------------------- */

type Bug = { title: string; priority: "P0" | "P1" | "P2"; status: "Open" | "Review" | "Fixed"; note: string };

function BugTracker() {
  const { items, add, update, remove } = useLocalList<Bug>("scope_ops_bugs");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Bug["priority"]>("P1");
  const [note, setNote] = useState("");

  const submit = () => {
    if (title.trim().length < 3) {
      toast.error("Bug title is too short.");
      return;
    }
    add({ title: title.trim(), priority, status: "Open", note: note.trim() });
    setTitle("");
    setNote("");
    setPriority("P1");
    toast.success("Bug logged");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1">
        <h3 className="font-semibold text-foreground">Log a bug</h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="bt">Title</Label>
            <Input id="bt" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="bp">Priority</Label>
            <select
              id="bp"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Bug["priority"])}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="P0">P0 — Blocker</option>
              <option value="P1">P1 — High</option>
              <option value="P2">P2 — Normal</option>
            </select>
          </div>
          <div>
            <Label htmlFor="bn">Notes</Label>
            <Textarea id="bn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="mt-1.5" />
          </div>
          <Button onClick={submit} className="w-full bg-gradient-brand text-brand-foreground">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add bug
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden lg:col-span-2">
        <div className="border-b border-border bg-secondary/30 p-4 text-sm font-semibold text-foreground">
          Bug log ({items.length})
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No bugs logged. Smooth sailing.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    b.priority === "P0"
                      ? "border-destructive/40 text-destructive"
                      : b.priority === "P1"
                        ? "border-brand/40 text-brand"
                        : ""
                  }`}
                >
                  {b.priority}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{b.title}</div>
                  {b.note && <div className="line-clamp-1 text-xs text-muted-foreground">{b.note}</div>}
                </div>
                <select
                  value={b.status}
                  onChange={(e) => update(b.id, { status: e.target.value as Bug["status"] })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option>Open</option>
                  <option>Review</option>
                  <option>Fixed</option>
                </select>
                <Button variant="ghost" size="icon" onClick={() => remove(b.id)} aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* -------------------- Content calendar -------------------- */

type CalEntry = { week: string; theme: string; challenge: string; spotlight: string };

function ContentCalendar() {
  const { items, add, remove } = useLocalList<CalEntry>("scope_ops_calendar");
  const [week, setWeek] = useState("");
  const [theme, setTheme] = useState("");
  const [challenge, setChallenge] = useState("");
  const [spotlight, setSpotlight] = useState("");

  const submit = () => {
    if (!week.trim() || !theme.trim()) {
      toast.error("Week and theme are required.");
      return;
    }
    add({ week: week.trim(), theme: theme.trim(), challenge: challenge.trim(), spotlight: spotlight.trim() });
    setWeek("");
    setTheme("");
    setChallenge("");
    setSpotlight("");
    toast.success("Week scheduled");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1">
        <h3 className="font-semibold text-foreground">Plan a week</h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="cw">Week</Label>
            <Input id="cw" placeholder="W18 · Apr 28" value={week} onChange={(e) => setWeek(e.target.value)} className="mt-1.5" maxLength={40} />
          </div>
          <div>
            <Label htmlFor="ct">Theme</Label>
            <Input id="ct" placeholder="AI for Bharat" value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-1.5" maxLength={80} />
          </div>
          <div>
            <Label htmlFor="cc">New challenge</Label>
            <Input id="cc" value={challenge} onChange={(e) => setChallenge(e.target.value)} className="mt-1.5" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="cs">Leaderboard spotlight</Label>
            <Input id="cs" value={spotlight} onChange={(e) => setSpotlight(e.target.value)} className="mt-1.5" maxLength={120} />
          </div>
          <Button onClick={submit} className="w-full bg-gradient-brand text-brand-foreground">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add week
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden lg:col-span-2">
        <div className="border-b border-border bg-secondary/30 p-4 text-sm font-semibold text-foreground">
          Scheduled weeks ({items.length})
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No weeks scheduled yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((e) => (
              <li key={e.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{e.week}</Badge>
                    <span className="text-sm font-semibold text-foreground">{e.theme}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {(e.challenge || e.spotlight) && (
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    {e.challenge && <div>🚀 Challenge: {e.challenge}</div>}
                    {e.spotlight && <div>🌟 Spotlight: {e.spotlight}</div>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* -------------------- Campus onboarding SOP -------------------- */

const CAMPUS_STEPS = [
  "Verify campus exists in tracker",
  "Assign chapter leader",
  "Seed 3 campus projects",
  "Publish welcome banner",
  "Announce in feed",
];

type CampusRecord = { name: string; leader: string; checked: Record<string, boolean> };

function CampusOnboarding() {
  const { items, add, update, remove } = useLocalList<CampusRecord>("scope_ops_campus");
  const [name, setName] = useState("");
  const [leader, setLeader] = useState("");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Campus name required.");
      return;
    }
    add({ name: name.trim(), leader: leader.trim(), checked: {} });
    setName("");
    setLeader("");
    toast.success("Campus added to onboarding");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1">
        <h3 className="font-semibold text-foreground">Add campus</h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="cn">Campus name</Label>
            <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="cl">Chapter leader</Label>
            <Input id="cl" value={leader} onChange={(e) => setLeader(e.target.value)} className="mt-1.5" maxLength={80} />
          </div>
          <Button onClick={submit} className="w-full bg-gradient-brand text-brand-foreground">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Start onboarding
          </Button>
        </div>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        {items.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No campuses in onboarding.</Card>
        ) : (
          items.map((c) => {
            const done = CAMPUS_STEPS.filter((s) => c.checked[s]).length;
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{c.name}</div>
                    {c.leader && <div className="text-xs text-muted-foreground">Lead · {c.leader}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{done}/{CAMPUS_STEPS.length}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {CAMPUS_STEPS.map((step) => {
                    const isDone = !!c.checked[step];
                    return (
                      <li key={step}>
                        <button
                          onClick={() => update(c.id, { checked: { ...c.checked, [step]: !isDone } })}
                          className="flex w-full items-center gap-2 rounded-md border border-border p-2 text-left text-xs transition-colors hover:bg-secondary/50"
                        >
                          {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-brand" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={isDone ? "text-muted-foreground line-through" : "text-foreground"}>{step}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

/* -------------------- Support queue -------------------- */

type RawEntry = { rating?: number; type?: string; text?: string; at?: number; reason?: string; name?: string; email?: string; subject?: string; message?: string };

function SupportQueue() {
  const feedback = useMemo(() => safeRead<RawEntry[]>("scope_feedback", []), []);
  const reports = useMemo(() => safeRead<RawEntry[]>("scope_support_reports", []), []);
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("scope_ops_support_status") || "{}");
    } catch {
      return {};
    }
  });
  const setStatus = (key: string, status: string) => {
    const next = { ...statuses, [key]: status };
    setStatuses(next);
    try {
      localStorage.setItem("scope_ops_support_status", JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <QueueCard title={`Feedback (${feedback.length})`} items={feedback} statuses={statuses} setStatus={setStatus} kind="feedback" />
      <QueueCard title={`Reports (${reports.length})`} items={reports} statuses={statuses} setStatus={setStatus} kind="reports" />
    </div>
  );
}

function QueueCard({
  title,
  items,
  statuses,
  setStatus,
  kind,
}: {
  title: string;
  items: RawEntry[];
  statuses: Record<string, string>;
  setStatus: (k: string, v: string) => void;
  kind: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-secondary/30 p-4 text-sm font-semibold text-foreground">{title}</div>
      {items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 12).map((it, idx) => {
            const key = `${kind}_${it.at || idx}`;
            return (
              <li key={key} className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{it.type || it.subject || it.reason || "Note"}</Badge>
                  <span className="text-xs text-muted-foreground">{it.at ? new Date(it.at).toLocaleString() : "—"}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-foreground">{it.text || it.message || "(no content)"}</p>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={statuses[key] || "Open"}
                    onChange={(e) => setStatus(key, e.target.value)}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option>Open</option>
                    <option>In progress</option>
                    <option>Resolved</option>
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* -------------------- Feature requests -------------------- */

type Feat = { title: string; detail: string; status: "Idea" | "Planned" | "Shipped"; votes: number };

function FeatureRequests() {
  const { items, add, update, remove } = useLocalList<Feat>("scope_ops_features");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  const submit = () => {
    if (title.trim().length < 3) {
      toast.error("Title is too short.");
      return;
    }
    add({ title: title.trim(), detail: detail.trim(), status: "Idea", votes: 0 });
    setTitle("");
    setDetail("");
    toast.success("Idea logged");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1">
        <h3 className="font-semibold text-foreground">Capture an idea</h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="ft">Title</Label>
            <Input id="ft" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="fd">Detail</Label>
            <Textarea id="fd" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} className="mt-1.5" maxLength={500} />
          </div>
          <Button onClick={submit} className="w-full bg-gradient-brand text-brand-foreground">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add request
          </Button>
        </div>
      </Card>

      <div className="space-y-3 lg:col-span-2">
        {items.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No requests yet.</Card>
        ) : (
          items
            .slice()
            .sort((a, b) => b.votes - a.votes)
            .map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          f.status === "Shipped" ? "border-cyan/40 text-cyan" : f.status === "Planned" ? "border-brand/40 text-brand" : ""
                        }`}
                      >
                        {f.status}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">{f.title}</span>
                    </div>
                    {f.detail && <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => update(f.id, { votes: f.votes + 1 })}>
                      ▲ {f.votes}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={f.status}
                    onChange={(e) => update(f.id, { status: e.target.value as Feat["status"] })}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option>Idea</option>
                    <option>Planned</option>
                    <option>Shipped</option>
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => remove(f.id)} aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

/* -------------------- Soft launch panel -------------------- */

function SoftLaunchPanel() {
  const snap = analytics.snapshot();
  const funnel = analytics.funnel();
  const nps = analytics.npsSummary();
  const top = analytics.topRoutes(8);
  const active7 = analytics.activeLast7();
  const rage = analytics.rageClickCount();
  const tester = analytics.testerId();
  const source = analytics.testerSource();
  const recentFeedback = useMemo(() => safeRead<RawEntry[]>("scope_feedback", []).slice(0, 6), []);

  const launchReady =
    funnel.completed >= 5 &&
    funnel.activation >= 40 &&
    nps.score >= 0 &&
    rage < 10;

  return (
    <div className="space-y-6">
      <ExportResultsCard />

      <Card className={`border-l-4 p-5 ${launchReady ? "border-l-success bg-success/5" : "border-l-brand bg-brand/5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge className={launchReady ? "bg-success/15 text-success" : "bg-brand/15 text-brand"}>
              <Rocket className="mr-1 h-3 w-3" /> {launchReady ? "Launch gate: GREEN" : "Launch gate: VALIDATING"}
            </Badge>
            <h3 className="mt-2 text-lg font-bold text-foreground">
              {launchReady ? "Soft-launch signals look healthy." : "Collecting soft-launch signals."}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Targets: 20+ testers · 5+ signups · ≥40% activation · NPS ≥ 0 · &lt;10 rage clicks.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>This device · <code className="font-mono text-foreground">{tester || "—"}</code></div>
            <div>Source: <span className="text-foreground">{source}</span></div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <SLStat label="Landing visits" value={funnel.visits} />
        <SLStat label="Signups started" value={funnel.started} sub={`${funnel.signupCompletion}% completed`} />
        <SLStat label="Signups completed" value={funnel.completed} sub={`${funnel.visitToSignup}% of visits`} />
        <SLStat label="First action" value={funnel.firstAction} sub={`${funnel.activation}% activation`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Acquisition → Activation funnel</h3>
            <TrendingUp className="h-4 w-4 text-cyan" />
          </div>
          <ul className="mt-4 space-y-2.5">
            {[
              { label: "Visited landing", n: funnel.visits, pct: 100 },
              { label: "Started signup", n: funnel.started, pct: funnel.visits ? Math.round((funnel.started / funnel.visits) * 100) : 0 },
              { label: "Completed signup", n: funnel.completed, pct: funnel.visits ? Math.round((funnel.completed / funnel.visits) * 100) : 0 },
              { label: "Took first action", n: funnel.firstAction, pct: funnel.visits ? Math.round((funnel.firstAction / funnel.visits) * 100) : 0 },
              { label: "Returned to dashboard", n: funnel.dashReturns, pct: funnel.completed ? Math.round((funnel.dashReturns / funnel.completed) * 100) : 0 },
            ].map((row) => (
              <li key={row.label}>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{row.label}</span>
                  <span><b className="text-foreground">{row.n}</b> · {row.pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-gradient-brand transition-all" style={{ width: `${Math.min(100, row.pct)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-foreground">NPS pulse</h3>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${nps.score > 30 ? "text-success" : nps.score < 0 ? "text-destructive" : "text-foreground"}`}>{nps.score}</span>
            <span className="text-xs text-muted-foreground">from {nps.count} response{nps.count === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-success/10 p-2"><div className="font-bold text-success">{nps.promoters}</div><div className="text-muted-foreground">Promoters</div></div>
            <div className="rounded-md bg-secondary p-2"><div className="font-bold text-foreground">{nps.passives}</div><div className="text-muted-foreground">Passives</div></div>
            <div className="rounded-md bg-destructive/10 p-2"><div className="font-bold text-destructive">{nps.detractors}</div><div className="text-muted-foreground">Detractors</div></div>
          </div>
          {nps.recent.length > 0 && (
            <ul className="mt-4 space-y-2 max-h-44 overflow-y-auto">
              {nps.recent.map((r, i) => (
                <li key={i} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{r.score}/10</Badge>
                    <span className="text-muted-foreground">{new Date(r.at).toLocaleDateString()}</span>
                  </div>
                  {r.reason && <p className="mt-1 line-clamp-2 text-foreground">{r.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-semibold text-foreground">Retention signals</h3>
          <div className="mt-3 space-y-2 text-sm">
            <SLRow label="Active days (last 7)" value={active7} />
            <SLRow label="Repeat sessions" value={snap.events["session_repeat_visit"] || 0} />
            <SLRow label="Dashboard returns" value={funnel.dashReturns} />
            <SLRow label="Sessions total" value={snap.sessions} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Friction proxy</h3>
            <AlertTriangle className={`h-4 w-4 ${rage >= 10 ? "text-destructive" : "text-muted-foreground"}`} />
          </div>
          <div className="mt-3 text-3xl font-bold text-foreground">{rage}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Rage-click clusters detected. {rage >= 10 ? "Investigate hot spots." : "Within healthy range."}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Rage = 3+ clicks within 600ms in a 40px radius — proxy for frustration / unresponsive UI.
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-foreground">Most-visited routes</h3>
          {top.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No traffic recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {top.map((r) => (
                <li key={r.route} className="flex items-center justify-between">
                  <code className="truncate font-mono text-xs text-foreground">{r.route}</code>
                  <span className="text-xs text-muted-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Recent qualitative feedback</h3>
          <Badge variant="outline" className="text-xs">{recentFeedback.length}</Badge>
        </div>
        {recentFeedback.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No feedback yet — share a tester invite link.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {recentFeedback.map((f, i) => (
              <li key={i} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{f.type || "note"}</Badge>
                  <span className="text-xs text-muted-foreground">{f.at ? new Date(f.at).toLocaleDateString() : "—"}</span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-foreground">{f.text || "(no content)"}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SLStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function SLRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
