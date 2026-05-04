import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, MessageSquare, Sparkles, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { useStoreValue } from "@/hooks/use-scope";
import { opportunities } from "@/lib/scope-store";
import { toast } from "sonner";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities — Scope Connect" },
      { name: "description", content: "Find collaborations, co-founders, internships and gigs across India's campus network." },
    ],
  }),
  component: () => <AuthGate><OpportunitiesPage /></AuthGate>,
});

function OpportunitiesPage() {
  const all = useStoreValue(() => opportunities.all());
  const saved = useStoreValue(() => opportunities.saved());
  const interested = useStoreValue(() => opportunities.interested());

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Sparkles className="mr-1 h-3 w-3" /> Curated for you</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Opportunities</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">Co-founders, collaborators, internships — matched to your interests.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((o) => {
            const isSaved = saved.includes(o.id);
            const isInterested = interested.includes(o.id);
            return (
              <Card key={o.id} className="flex flex-col p-5 hover-lift animate-fade-in">
                <div className="flex items-center justify-between">
                  <Badge className="bg-gradient-brand text-brand-foreground">{o.match}% match</Badge>
                  <Badge variant="outline">{o.category}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{o.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{o.description}</p>
                <div className="mt-4 text-xs text-muted-foreground">by <b className="text-foreground">{o.by}</b> · {o.campus}</div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => { opportunities.markInterested(o.id); }}
                    disabled={isInterested}
                    size="sm"
                    className={`flex-1 ${isInterested ? "bg-success text-primary-foreground" : "bg-gradient-brand text-brand-foreground"}`}
                  >
                    {isInterested ? (<><Check className="mr-1.5 h-4 w-4" /> Interested</>) : "I'm interested"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { opportunities.toggleSave(o.id); toast(isSaved ? "Removed from saved" : "Saved for later"); }}>
                    {isSaved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Message sent to " + o.by)}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
