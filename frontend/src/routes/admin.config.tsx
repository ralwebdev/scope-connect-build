import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Palette,
  Mail,
  Building2,
  ToggleLeft,
  Shield,
  Download,
  Upload,
  Eye,
  Sparkles,
  Plus,
  Trash2,
  RotateCcw,
  Copy as CopyIcon,
  Check,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RoleGate } from "@/components/site/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { configStore, type RuntimeConfig } from "@/lib/config-store";
import { useConfig } from "@/hooks/use-config";
import { useRole } from "@/hooks/use-rbac";
import {
  ALL_PERMISSIONS,
  ALL_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  rbac,
  type PermissionKey,
  type RoleId,
} from "@/lib/rbac";
import { useStoreValue } from "@/hooks/use-scope";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/config")({
  head: () => ({
    meta: [
      { title: "Admin Config Center · Scope Connect" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate permission="view_admin">
      <ConfigCenter />
    </RoleGate>
  ),
});

type Tab = "brand" | "contact" | "campuses" | "features" | "permissions" | "io" | "preview";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "brand", label: "Brand", icon: Palette },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "campuses", label: "Campuses", icon: Building2 },
  { id: "features", label: "Features", icon: ToggleLeft },
  { id: "permissions", label: "Permissions", icon: Shield },
  { id: "io", label: "Import/Export", icon: Download },
  { id: "preview", label: "Preview", icon: Eye },
];

function ConfigCenter() {
  const role = useRole();
  const cfg = useConfig();
  const [tab, setTab] = useState<Tab>("brand");

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-8 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div>
            <Badge className="bg-cyan/15 text-cyan">
              <Sparkles className="mr-1 h-3 w-3" /> Operator Console
            </Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Config Center</h1>
            <p className="mt-1 text-sm text-primary-foreground/70">
              Edit deployment branding, features, campuses & permissions live.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
            <span className="rounded-full bg-primary-foreground/10 px-2 py-1">
              Role: <span className="font-semibold text-primary-foreground">{role}</span>
            </span>
            <Button asChild size="sm" variant="outline" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground">
              <Link to="/admin">Back to admin</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((t) => (
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {tab === "brand" && <BrandTab cfg={cfg} />}
            {tab === "contact" && <ContactTab cfg={cfg} />}
            {tab === "campuses" && <CampusesTab cfg={cfg} />}
            {tab === "features" && <FeaturesTab cfg={cfg} />}
            {tab === "permissions" && <PermissionsTab />}
            {tab === "io" && <IOTab cfg={cfg} />}
            {tab === "preview" && <PreviewTab cfg={cfg} />}
          </div>
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <LivePreviewPanel cfg={cfg} />
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

/* ---------------- Brand ---------------- */

function BrandTab({ cfg }: { cfg: RuntimeConfig }) {
  const [draft, setDraft] = useState(cfg.brand);
  useEffect(() => setDraft(cfg.brand), [cfg.brand]);

  const save = () => {
    configStore.patch({ brand: draft });
    toast.success("Brand updated.");
  };
  const reset = () => {
    configStore.reset();
    toast("Brand reverted to edition default.");
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-foreground">Brand identity</h3>
      <p className="mt-1 text-xs text-muted-foreground">Changes apply live across the platform.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Platform name">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Logo short">
          <Input value={draft.shortName} onChange={(e) => setDraft({ ...draft, shortName: e.target.value })} />
        </Field>
        <Field label="Logo accent (red half)">
          <Input value={draft.accentName} onChange={(e) => setDraft({ ...draft, accentName: e.target.value })} />
        </Field>
        <Field label="Operator">
          <Input value={draft.operator} onChange={(e) => setDraft({ ...draft, operator: e.target.value })} />
        </Field>
        <Field label="Tagline" full>
          <Textarea rows={2} value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
        </Field>
        <Field label="Hero headline (override)" full>
          <Input
            value={draft.heroHeadline ?? ""}
            placeholder="Optional — leave blank to use default"
            onChange={(e) => setDraft({ ...draft, heroHeadline: e.target.value })}
          />
        </Field>
        <Field label="Primary color (oklch)">
          <Input
            value={draft.primaryColor ?? ""}
            placeholder="e.g. oklch(0.6 0.2 25)"
            onChange={(e) => setDraft({ ...draft, primaryColor: e.target.value })}
          />
        </Field>
        <Field label="Accent color (oklch)">
          <Input
            value={draft.accentColor ?? ""}
            placeholder="e.g. oklch(0.7 0.15 220)"
            onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={save} className="bg-gradient-brand text-brand-foreground">
          <Check className="mr-2 h-4 w-4" /> Save changes
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Contact ---------------- */

function ContactTab({ cfg }: { cfg: RuntimeConfig }) {
  const [draft, setDraft] = useState(cfg.contact);
  useEffect(() => setDraft(cfg.contact), [cfg.contact]);

  const save = () => {
    configStore.patch({ contact: draft });
    toast.success("Contact info updated.");
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-foreground">Contact</h3>
      <p className="mt-1 text-xs text-muted-foreground">Used across footer, support pages, & emails.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Support email">
          <Input value={draft.supportEmail} onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })} />
        </Field>
        <Field label="Partnership email">
          <Input value={draft.partnershipEmail} onChange={(e) => setDraft({ ...draft, partnershipEmail: e.target.value })} />
        </Field>
        <Field label="Phone (optional)">
          <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </Field>
        <Field label="Address (optional)">
          <Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
        </Field>
      </div>
      <div className="mt-5">
        <Button onClick={save} className="bg-gradient-brand text-brand-foreground">
          <Check className="mr-2 h-4 w-4" /> Save changes
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Campuses ---------------- */

function CampusesTab({ cfg }: { cfg: RuntimeConfig }) {
  const remove = (id: string) => {
    const next = cfg.campuses.filter((c) => c.id !== id);
    configStore.patch({ campuses: next });
    toast("Campus removed.");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Campuses</h3>
            <p className="mt-1 text-xs text-muted-foreground">{cfg.campuses.length} campuses in this edition.</p>
          </div>
          <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground">
            <Link to="/admin/campuses/new">
              <Plus className="mr-1 h-4 w-4" /> Launch campus
            </Link>
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {cfg.campuses.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="text-2xl">{c.logo ?? "🏫"}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.city}
                  {c.region ? ` · ${c.region}` : ""}
                  {c.topSkills?.length ? ` · ${c.topSkills.slice(0, 3).join(", ")}` : ""}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Features ---------------- */

function FeaturesTab({ cfg }: { cfg: RuntimeConfig }) {
  const flags = cfg.features;
  const set = (key: keyof typeof flags, value: boolean) => {
    configStore.patch({ features: { ...flags, [key]: value } });
  };

  const items: { key: keyof typeof flags; label: string; desc: string }[] = [
    { key: "feed", label: "Feed", desc: "Public + authed activity stream." },
    { key: "events", label: "Events", desc: "Hackathons, sprints & meetups." },
    { key: "portfolio", label: "Portfolio", desc: "Per-builder portfolio pages." },
    { key: "ambassadors", label: "Ambassador program", desc: "Campus ambassador applications." },
    { key: "leaderboards", label: "Leaderboards", desc: "Builder + chapter rankings." },
    { key: "projects", label: "Projects", desc: "Curated challenges & opportunities." },
    { key: "campus", label: "Campus directory", desc: "Campus-by-campus exploration." },
    { key: "ads", label: "Ads / sponsored slots", desc: "Reserved slots in feed/cards." },
    { key: "recruiterZone", label: "Recruiter Zone", desc: "Recruiter-only views." },
    { key: "mentorZone", label: "Mentor Zone", desc: "Mentor matching & office hours." },
    { key: "campusCompetition", label: "Campus competition", desc: "Inter-campus rankings & wars." },
  ];

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-foreground">Feature toggles</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Disabled features are hidden from nav and blocked at the route level.
      </p>
      <div className="mt-4 divide-y divide-border">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-foreground">{it.label}</div>
              <div className="text-xs text-muted-foreground">{it.desc}</div>
            </div>
            <Switch checked={!!flags[it.key]} onCheckedChange={(v) => set(it.key, v)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Permissions ---------------- */

function PermissionsTab() {
  const map = useStoreValue(() => rbac.permissions());
  const [working, setWorking] = useState(map);
  useEffect(() => setWorking(map), [map]);

  const toggle = (role: RoleId, perm: PermissionKey) => {
    setWorking((prev) => {
      const cur = prev[role];
      if ((cur as string[]).includes("*")) return prev;
      const list = cur as PermissionKey[];
      const next = list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm];
      return { ...prev, [role]: next };
    });
  };

  const save = () => {
    rbac.setPermissions(working);
    toast.success("Permissions updated.");
  };
  const reset = () => {
    rbac.resetPermissions();
    toast("Reverted to defaults.");
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-foreground">Role permissions matrix</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Super admin always has every permission. Other roles can be customized below.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Permission</th>
              {ALL_ROLES.map((r) => (
                <th key={r} className="px-2 py-2 text-center font-medium">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSIONS.map((p) => (
              <tr key={p} className="border-b border-border/60">
                <td className="py-2 pr-3 font-mono text-[11px] text-foreground">{p}</td>
                {ALL_ROLES.map((r) => {
                  const cur = working[r];
                  const wildcard = (cur as string[]).includes("*");
                  const on = wildcard || (cur as string[]).includes(p);
                  return (
                    <td key={r} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={wildcard}
                        onChange={() => toggle(r, p)}
                        className="h-3.5 w-3.5 cursor-pointer accent-[var(--brand)]"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={save} className="bg-gradient-brand text-brand-foreground">
          <Check className="mr-2 h-4 w-4" /> Save matrix
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
        </Button>
      </div>
      <RoleOverrideEditor />
      <details className="mt-6 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">Default matrix (read-only)</summary>
        <pre className="mt-2 overflow-auto rounded-lg bg-secondary p-3 text-[11px]">{JSON.stringify(DEFAULT_ROLE_PERMISSIONS, null, 2)}</pre>
      </details>
    </Card>
  );
}

function RoleOverrideEditor() {
  const overrides = useStoreValue(() => rbac.roleOverrides());
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleId>("viewer");

  const add = () => {
    if (!email.includes("@")) {
      toast.error("Enter a valid email.");
      return;
    }
    rbac.setRoleOverride(email, role);
    setEmail("");
    toast.success(`${email} → ${role}`);
  };

  return (
    <div className="mt-6 border-t border-border pt-5">
      <h4 className="text-sm font-semibold text-foreground">Email-based role overrides</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Override the default email-pattern role detection for specific users.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleId)}
          className="rounded-md border border-input bg-background px-3 text-sm"
        >
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={add} className="bg-gradient-brand text-brand-foreground">
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
      {Object.keys(overrides).length > 0 && (
        <div className="mt-3 divide-y divide-border rounded-lg border border-border">
          {Object.entries(overrides).map(([em, r]) => (
            <div key={em} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="font-mono text-foreground">{em}</span>
              <span className="text-muted-foreground">→ {r}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  rbac.clearRoleOverride(em);
                  toast("Override removed.");
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Import / Export ---------------- */

function IOTab({ cfg }: { cfg: RuntimeConfig }) {
  const exportPayload = useMemo(() => {
    const { edition, brand, contact, features, campuses } = cfg;
    return { edition, brand, contact, features, campuses, permissions: rbac.permissions() };
  }, [cfg]);

  const exportJson = JSON.stringify(exportPayload, null, 2);
  const fileName = `scopeconnect-${cfg.edition.id}-${new Date().toISOString().slice(0, 10)}.json`;

  const download = () => {
    try {
      const blob = new Blob([exportJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Edition exported.");
    } catch {
      toast.error("Download failed.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Copy failed.");
    }
  };

  const [pasted, setPasted] = useState("");
  const [diff, setDiff] = useState<{ from: RuntimeConfig; to: RuntimeConfig } | null>(null);

  const previewImport = () => {
    try {
      const raw = JSON.parse(pasted);
      const result = configStore.validate(raw);
      if (!result.ok || !result.data) {
        toast.error(result.errors.join(" · "));
        return;
      }
      setDiff({ from: cfg, to: result.data });
      // Apply permissions if included
      if (raw.permissions && typeof raw.permissions === "object") {
        // stash for confirm
        (window as unknown as { __sc_pending_perms?: unknown }).__sc_pending_perms = raw.permissions;
      }
    } catch {
      toast.error("Invalid JSON.");
    }
  };

  const confirmImport = () => {
    if (!diff) return;
    configStore.backup();
    configStore.set(diff.to);
    const pending = (window as unknown as { __sc_pending_perms?: Record<RoleId, PermissionKey[] | ["*"]> }).__sc_pending_perms;
    if (pending) {
      try {
        rbac.setPermissions(pending);
      } catch {
        /* noop */
      }
    }
    toast.success("New edition imported successfully.");
    setDiff(null);
    setPasted("");
  };

  const restoreBackup = () => {
    const ok = configStore.restoreBackup();
    if (ok) toast.success("Restored previous edition from backup.");
    else toast.error("No backup found.");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setPasted(text);
    toast("File loaded. Click Preview to review changes.");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground">Export edition</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Download or copy the current deployment config to clone or restore later.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={download} className="bg-gradient-brand text-brand-foreground">
            <Download className="mr-2 h-4 w-4" /> Download {fileName}
          </Button>
          <Button variant="outline" onClick={copy}>
            <CopyIcon className="mr-2 h-4 w-4" /> Copy JSON
          </Button>
          <Button variant="outline" onClick={restoreBackup}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restore last backup
          </Button>
        </div>
        <Textarea readOnly value={exportJson} rows={10} className="mt-4 font-mono text-[11px]" />
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground">Import edition</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload a JSON file or paste the payload. We&apos;ll validate, show a diff, and back up the current config before applying.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="file" accept="application/json" onChange={onFile} className="text-xs" />
          <Button size="sm" variant="outline" onClick={previewImport}>
            <Upload className="mr-2 h-4 w-4" /> Preview changes
          </Button>
        </div>
        <Textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={8}
          placeholder="Paste edition JSON here…"
          className="mt-3 font-mono text-[11px]"
        />
        {diff && (
          <div className="mt-4 rounded-lg border border-cyan/30 bg-cyan/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-cyan" /> Diff preview
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {diff.from.brand.name !== diff.to.brand.name && (
                <li>Brand name: <s>{diff.from.brand.name}</s> → <b className="text-foreground">{diff.to.brand.name}</b></li>
              )}
              {diff.from.edition.id !== diff.to.edition.id && (
                <li>Edition: <s>{diff.from.edition.id}</s> → <b className="text-foreground">{diff.to.edition.id}</b></li>
              )}
              <li>
                Campuses: {diff.from.campuses.length} → <b className="text-foreground">{diff.to.campuses.length}</b>
              </li>
              <li>
                Features changed:{" "}
                {Object.keys(diff.to.features).filter(
                  (k) => diff.from.features[k as keyof typeof diff.from.features] !== diff.to.features[k as keyof typeof diff.to.features],
                ).length}
              </li>
            </ul>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={confirmImport} className="bg-gradient-brand text-brand-foreground">
                <Check className="mr-2 h-4 w-4" /> Confirm overwrite
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDiff(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Preview Tab + Sidebar Live Preview ---------------- */

function PreviewTab({ cfg }: { cfg: RuntimeConfig }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-foreground">Live edition snapshot</h3>
      <p className="mt-1 text-xs text-muted-foreground">Shape of the config currently powering this deployment.</p>
      <pre className="mt-4 max-h-[480px] overflow-auto rounded-lg bg-secondary p-3 text-[11px]">
        {JSON.stringify(cfg, null, 2)}
      </pre>
    </Card>
  );
}

function LivePreviewPanel({ cfg }: { cfg: RuntimeConfig }) {
  const enabledCount = Object.values(cfg.features).filter(Boolean).length;
  const totalCount = Object.values(cfg.features).length;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-secondary/40 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</div>
      </div>
      <div className="p-4">
        {/* Navbar mock */}
        <div className="rounded-xl border border-border bg-background p-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand text-xs text-brand-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span>
              {cfg.brand.shortName}
              <span className="text-brand">{cfg.brand.accentName}</span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
            {Object.entries(cfg.features)
              .filter(([, v]) => v)
              .slice(0, 6)
              .map(([k]) => (
                <span key={k} className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                  {k}
                </span>
              ))}
          </div>
        </div>

        {/* Hero mock */}
        <div className="mt-3 rounded-xl border border-border bg-gradient-hero p-4 text-primary-foreground">
          <div className="text-[10px] uppercase tracking-wider text-primary-foreground/70">{cfg.edition.name}</div>
          <div className="mt-1 text-base font-bold leading-tight">
            {cfg.brand.heroHeadline ?? cfg.brand.tagline.split(".")[0]}
          </div>
          <div className="mt-1 text-[11px] text-primary-foreground/70 line-clamp-2">{cfg.brand.tagline}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border p-2">
            <div className="text-lg font-bold text-foreground">{cfg.campuses.length}</div>
            <div className="text-[10px] text-muted-foreground">Campuses</div>
          </div>
          <div className="rounded-lg border border-border p-2">
            <div className="text-lg font-bold text-foreground">
              {enabledCount}/{totalCount}
            </div>
            <div className="text-[10px] text-muted-foreground">Features on</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Field helper ---------------- */

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
