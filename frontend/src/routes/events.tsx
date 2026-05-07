import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Check, Share2, CalendarPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/site/AppShell";
import { useStoreValue, useIsLoggedIn } from "@/hooks/use-scope";
import { events } from "@/lib/scope-store";
import { FeatureGate } from "@/components/site/FeatureGate";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { backendEvents, type BackendEvent } from "@/lib/api/endpoints";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — Scope Connect" },
      { name: "description", content: "Hackathons, sprints, pitch battles & founder meetups across India." },
    ],
  }),
  component: () => <FeatureGate flag="events"><EventsPage /></FeatureGate>,
});

function fmtCountdown(ms: number) {
  if (ms <= 0) return "Starting soon";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h to go`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m to go`;
}

function EventsPage() {
  const isAuthed = useIsLoggedIn();
  const rsvps = useStoreValue(() => events.rsvps());
  const [all, setAll] = useState<Array<{ id: string; title: string; type: string; date: string; venue: string; seats: number; color: "brand" | "cyan" | "primary"; startsAt: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    const startsAtFromDate = (value: string) => {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
      return Date.now() + 7 * 86400000;
    };

    backendEvents.list()
      .then(({ items }) => {
        if (cancelled) return;
        setAll(items.map((item: BackendEvent) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          date: item.date,
          venue: item.venue,
          seats: item.seats,
          color: item.color,
          startsAt: startsAtFromDate(item.date),
        })));
      })
      .catch(() => {
        if (!cancelled) setAll([]);
      });

    return () => { cancelled = true; };
  }, []);

  const onRsvp = (id: string) => {
    if (!isAuthed) { toast.error("Sign in to RSVP."); return; }
    const next = events.toggleRsvp(id);
    if (next.includes(id)) analytics.track("event_rsvp");
    toast.success(next.includes(id) ? "Seat reserved. You're on the builders list." : "RSVP cancelled.");
  };

  const onShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    toast.success("Link copied. Bring a friend, earn bonus XP.");
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Calendar className="mr-1 h-3 w-3" /> Live calendar</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Events near you</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">Hackathons. Sprints. Pitch battles. Real momentum, every week.</p>
          <div className="mt-5 flex gap-4 text-sm text-primary-foreground/70">
            <span><b className="text-primary-foreground">{all.length}</b> upcoming</span>
            <span>·</span>
            <span><b className="text-primary-foreground">{rsvps.length}</b> on your calendar</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((e) => {
            const going = rsvps.includes(e.id);
            const ms = e.startsAt - Date.now();
            return (
              <Card key={e.id} className="overflow-hidden hover-lift animate-fade-in">
                <div className="flex h-2 bg-gradient-brand" />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <Badge className={
                      e.color === "brand" ? "bg-brand text-brand-foreground" :
                      e.color === "cyan" ? "bg-cyan/20 text-cyan-foreground" :
                      "bg-primary text-primary-foreground"
                    }>
                      {e.type}
                    </Badge>
                    <span className="text-xs font-semibold text-brand">{fmtCountdown(ms)}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{e.title}</h3>
                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {e.date}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {e.venue}</div>
                    <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {e.seats} seats</div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button onClick={() => onRsvp(e.id)} size="sm" className={`flex-1 ${going ? "bg-success text-primary-foreground hover:opacity-90" : "bg-gradient-brand text-brand-foreground"}`}>
                      {going ? (<><Check className="mr-1.5 h-4 w-4" /> Going</>) : "RSVP (+30 XP)"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast("Added to your calendar.")} title="Add to calendar"><CalendarPlus className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={onShare} title="Invite a friend"><Share2 className="h-4 w-4" /></Button>
                  </div>
                  {going && <p className="mt-3 text-xs text-success">Bring a friend and earn bonus XP.</p>}
                </div>
              </Card>
            );
          })}
          {all.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">No upcoming events yet.</Card>
          )}
        </div>
      </section>
    </AppShell>
  );
}
