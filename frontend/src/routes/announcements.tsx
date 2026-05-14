import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Sparkles } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Scope Connect" },
      { name: "description", content: "Latest product updates, missions and milestones from the Scope team." },
    ],
  }),
  component: AnnouncementsPage,
});

const ITEMS = [
  { tag: "Mission", date: "This week", title: "Apply to 1 Scope Challenge", body: "Earn +50 XP and unlock a national leaderboard boost." },
  { tag: "Launch", date: "Apr 18", title: "Portfolio system is live", body: "Showcase projects, designs, research and certificates. Build your proof of work." },
  { tag: "Milestone", date: "Apr 12", title: "12,000 active builders", body: "We just crossed 12k active members across 142 campuses. Onwards." },
  { tag: "Update", date: "Apr 08", title: "New: campus-exclusive challenges", body: "Chapter-only opportunities now appear under your campus tab." },
  { tag: "Mission", date: "Apr 01", title: "Scope Hack '26 registrations open", body: "Pan-India hybrid hackathon. 2,400 seats. Form your team early." },
];

function AnnouncementsPage() {
  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Megaphone className="mr-1 h-3 w-3" /> Announcements</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">What's new at Scope.</h1>
          <p className="mt-2 text-primary-foreground/70">Weekly updates, missions, milestones, and platform changes.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {ITEMS.map((it) => (
            <Card key={it.title} className="p-5 hover-lift">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{it.tag}</Badge>
                <span className="text-xs text-muted-foreground">{it.date}</span>
              </div>
              <h3 className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-brand" /> {it.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
