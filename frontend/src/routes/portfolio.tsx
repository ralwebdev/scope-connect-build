import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, X, Pencil, Trash2, ExternalLink, Trophy, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { FeatureGate } from "@/components/site/FeatureGate";
import { useStoreValue, useUser } from "@/hooks/use-scope";
import { portfolio, type PortfolioItem } from "@/lib/scope-store";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Scope Connect" },
      { name: "description", content: "Showcase your projects, designs, research and achievements." },
    ],
  }),
  component: () => (
    <FeatureGate flag="portfolio">
      <AuthGate><PortfolioPage /></AuthGate>
    </FeatureGate>
  ),
});

const TYPES: PortfolioItem["type"][] = ["Project", "Design", "Research", "Startup Idea", "Campaign", "Certificate"];
const COVERS = ["🚀", "🎨", "🧠", "💡", "📣", "🏅", "🛠️", "📊", "🌍"];

function PortfolioPage() {
  const user = useUser();
  const items = useStoreValue(() => (user ? portfolio.forUser(user.id) : []));
  const strength = useStoreValue(() => (user ? portfolio.strength(user.id) : 0));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, PortfolioItem[]> = {};
    items.forEach((it) => {
      if (!map[it.type]) map[it.type] = [];
      map[it.type].push(it);
    });
    return map;
  }, [items]);

  if (!user) return null;

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Trophy className="mr-1 h-3 w-3" /> Your Work</Badge>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Portfolio</h1>
              <p className="mt-2 max-w-xl text-primary-foreground/70">
                Proof of work that opens doors. A strong portfolio raises your match score on every Scope challenge.
              </p>
            </div>
            <Button onClick={() => { setEditing(null); setOpen(true); }} size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
              <Plus className="mr-2 h-4 w-4" /> Add Work Item
            </Button>
          </div>

          <div className="mt-8 max-w-md rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Portfolio strength</span>
              <span className="font-bold">{strength}%</span>
            </div>
            <Progress value={strength} className="mt-2" />
            <p className="mt-2 text-xs text-primary-foreground/70">
              {strength === 0 ? "Add your first work item to start building proof." :
               strength < 100 ? "Add more items to reach 100% — diversity counts." :
               "Maxed out. Your portfolio is showcase-ready."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-3xl">🧩</div>
            <h3 className="mt-3 text-lg font-semibold text-foreground">Your portfolio is waiting for proof of work</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add a project, design, research piece or campaign to start.</p>
            <Button onClick={() => setOpen(true)} className="mt-5 bg-gradient-brand text-brand-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add First Item
            </Button>
          </Card>
        ) : (
          <div className="space-y-10">
            {TYPES.filter((t) => grouped[t]?.length).map((type) => (
              <div key={type}>
                <h2 className="mb-4 text-lg font-semibold text-foreground">{type} <span className="text-sm font-normal text-muted-foreground">· {grouped[type].length}</span></h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[type].map((item) => (
                    <PortfolioCard key={item.id} item={item} onEdit={() => { setEditing(item); setOpen(true); }} onDelete={() => {
                      portfolio.remove(item.id);
                      toast("Item removed");
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {open && (
        <ItemModal
          existing={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
        />
      )}
    </AppShell>
  );
}

function PortfolioCard({ item, onEdit, onDelete }: { item: PortfolioItem; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="group flex flex-col overflow-hidden hover-lift animate-fade-in">
      <div className="flex h-28 items-center justify-center bg-gradient-hero text-4xl">
        <span className="transition-transform group-hover:scale-110">{item.cover}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <Badge variant="outline" className="self-start text-xs">{item.type}</Badge>
        <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
        <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">{item.description}</p>
        {item.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.skills.slice(0, 4).map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          {item.link ? (
            <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
              View <ExternalLink className="h-3 w-3" />
            </a>
          ) : <span className="text-xs text-muted-foreground">No link</span>}
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ItemModal({ existing, onClose }: { existing: PortfolioItem | null; onClose: () => void }) {
  const [type, setType] = useState<PortfolioItem["type"]>(existing?.type ?? "Project");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [skillsText, setSkillsText] = useState((existing?.skills ?? []).join(", "));
  const [link, setLink] = useState(existing?.link ?? "");
  const [cover, setCover] = useState(existing?.cover ?? COVERS[0]);

  const save = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
    if (existing) {
      portfolio.update(existing.id, { type, title: title.trim(), description: description.trim(), skills, link: link.trim() || undefined, cover });
      toast.success("Portfolio updated.");
    } else {
      portfolio.create({ type, title: title.trim(), description: description.trim(), skills, link: link.trim() || undefined, cover });
      analytics.track("portfolio_item_added");
      toast.success("Portfolio upgraded. +30 XP");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{existing ? "Edit work item" : "Add work item"}</h3>
            <p className="text-xs text-muted-foreground">{existing ? "Update your showcase." : "Earn +30 XP per item."}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="pType">Type</Label>
            <select id="pType" value={type} onChange={(e) => setType(e.target.value as PortfolioItem["type"])} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="pTitle">Title</Label>
            <Input id="pTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project / piece name" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="pDesc">Description</Label>
            <Textarea id="pDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you build / contribute?" className="mt-1.5" rows={3} />
          </div>
          <div>
            <Label htmlFor="pSkills">Skills (comma-separated)</Label>
            <Input id="pSkills" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="React, Figma, Research" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="pLink">Link (optional)</Label>
            <Input id="pLink" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="mt-1.5" />
          </div>
          <div>
            <Label>Cover</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COVERS.map((c) => (
                <button key={c} onClick={() => setCover(c)} className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all ${cover === c ? "border-brand bg-brand/10" : "border-border hover:border-brand/40"}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} className="bg-gradient-brand text-brand-foreground">
            <Sparkles className="mr-1.5 h-4 w-4" /> {existing ? "Save changes" : "Add (+30 XP)"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
