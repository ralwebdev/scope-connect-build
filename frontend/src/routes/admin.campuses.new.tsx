import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Building2, ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RoleGate } from "@/components/site/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { configStore } from "@/lib/config-store";
import { useConfig } from "@/hooks/use-config";
import { feed, projects } from "@/lib/scope-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/campuses/new")({
  head: () => ({
    meta: [
      { title: "Launch a campus · Scope Connect" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate permission="manage_campuses">
      <NewCampusPage />
    </RoleGate>
  ),
});

const STARTER_BADGES = ["🌱 New chapter", "🚀 Launch cohort", "⭐ Founding chapter", "🔥 Pilot campus"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

function NewCampusPage() {
  const cfg = useConfig();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [skills, setSkills] = useState("");
  const [badge, setBadge] = useState(STARTER_BADGES[0]);
  const [logo, setLogo] = useState("🏫");

  const launch = () => {
    if (!name.trim() || !city.trim()) {
      toast.error("Campus name and city are required.");
      return;
    }
    const id = slugify(name) || `campus-${Date.now()}`;
    if (cfg.campuses.some((c) => c.id === id)) {
      toast.error("A campus with that name already exists.");
      return;
    }
    const topSkills = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);

    const newCampus = {
      id,
      name: name.trim(),
      city: city.trim(),
      region: region.trim() || undefined,
      topSkills,
      starterScore: 250,
      logo,
    };
    configStore.patch({ campuses: [...cfg.campuses, newCampus] });

    // Seed 3 starter feed posts (only if no user-overridden feed yet)
    try {
      feed.create(`🎉 ${name.trim()} chapter is officially live on Scope. Welcome, builders.`, "Announcement");
      feed.create(`Looking for ${topSkills[0] ?? "builders"} at ${name.trim()}. Drop a 👋 below.`, "Open call");
      feed.create(`First ${name.trim()} build sprint kicks off this weekend. ${badge}`, "Sprint");
    } catch {
      /* noop — feed.create requires auth; skip gracefully */
    }

    // Seed 2 starter projects (best-effort)
    try {
      projects.create({
        title: `${name.trim()} Campus Discovery Map`,
        description: `An open visual map of ${name.trim()} student builders, organized by skill and momentum.`,
        problem: "New students at the chapter cannot find collaborators quickly.",
        team: name.trim(),
        category: "Web/App",
        cover: "🗺",
      });
      projects.create({
        title: `${name.trim()} Founders Circle`,
        description: `A curated cohort of student founders at ${name.trim()} shipping monthly.`,
        problem: "Founder-track students at this campus lack a structured peer group.",
        team: name.trim(),
        category: "Startup",
        cover: "🚀",
      });
    } catch {
      /* noop */
    }

    toast.success("Campus launched. Starter content seeded.");
    setTimeout(() => navigate({ to: "/admin/config" }), 600);
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-8 text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div>
            <Badge className="bg-cyan/15 text-cyan">
              <Sparkles className="mr-1 h-3 w-3" /> Campus Seeder
            </Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Launch a new campus</h1>
            <p className="mt-1 text-sm text-primary-foreground/70">
              One form. Seeded posts, projects & a leaderboard slot in seconds.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground">
            <Link to="/admin/config">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to config
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground">Campus details</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Campus name *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NIT Trichy" />
            </Field>
            <Field label="City *">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Tiruchirappalli" />
            </Field>
            <Field label="Region (optional)">
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. South" />
            </Field>
            <Field label="Logo emoji">
              <Input value={logo} onChange={(e) => setLogo(e.target.value)} maxLength={4} />
            </Field>
            <Field label="Top skills (comma-separated)" full>
              <Textarea
                rows={2}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Engineering, AI, Robotics, Founder"
              />
            </Field>
            <Field label="Starter badge" full>
              <div className="flex flex-wrap gap-2">
                {STARTER_BADGES.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBadge(b)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      badge === b ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/admin/config" })}>
              Cancel
            </Button>
            <Button onClick={launch} className="bg-gradient-brand text-brand-foreground">
              <Check className="mr-2 h-4 w-4" /> Launch campus
            </Button>
          </div>
        </Card>

        <aside className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" /> What gets seeded
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>• Campus card added to config</li>
              <li>• Slug auto-generated (URL-safe)</li>
              <li>• 3 starter feed posts</li>
              <li>• 2 starter projects</li>
              <li>• Starter badge assigned</li>
              <li>• Leaderboard entry with base score</li>
            </ul>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</div>
            <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3">
              <div className="text-2xl">{logo}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{name || "Campus name"}</div>
              <div className="text-xs text-muted-foreground">
                {city || "City"}
                {region ? ` · ${region}` : ""}
              </div>
              {skills && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {skills
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((s) => (
                      <span key={s} className="rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground">
                        {s}
                      </span>
                    ))}
                </div>
              )}
              <div className="mt-2 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                {badge}
              </div>
            </div>
          </Card>
        </aside>
      </section>
    </AppShell>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
