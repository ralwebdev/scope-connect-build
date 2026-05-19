import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Check, Share2, CalendarPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/site/AppShell";
import { useStoreValue, useIsLoggedIn, useUser } from "@/hooks/use-scope";
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

function getGoogleCalendarUrl(e: { title: string; date: string; venue: string; startsAt: number }) {
  const start = new Date(e.startsAt);
  const end = new Date(e.startsAt + 2 * 3600000); // 2 hours by default

  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours()
    )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

  const title = encodeURIComponent(e.title);
  const details = encodeURIComponent(
    `Join us for ${e.title}!\nVenue: ${e.venue}\nEvent date: ${e.date}\n\nSeat reserved via Scope Connect.`
  );
  const location = encodeURIComponent(e.venue);
  const dates = `${fmt(start)}/${fmt(end)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

function EventsPage() {
  const user = useUser();
  const isAuthed = useIsLoggedIn();
  const [all, setAll] = useState<
    Array<{
      id: string;
      title: string;
      type: string;
      date: string;
      venue: string;
      seats: number;
      color: "brand" | "cyan" | "primary";
      startsAt: number;
      rsvps: string[];
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const startsAtFromDate = (value: string) => {
      let parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
      
      const currentYear = new Date().getFullYear();
      parsed = Date.parse(`${value}, ${currentYear}`);
      if (!Number.isNaN(parsed)) return parsed;
      
      const cleaned = value.replace(/\s*,\s*/g, ", ");
      parsed = Date.parse(`${cleaned}, ${currentYear}`);
      if (!Number.isNaN(parsed)) return parsed;

      return Date.now() + 7 * 86400000;
    };

    backendEvents
      .list(user?.institution?.id)
      .then(({ items }) => {
        if (cancelled) return;
        const now = Date.now();
        const mapped = items.map((item: BackendEvent) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          date: item.date,
          venue: item.venue,
          seats: item.seats,
          color: item.color as any,
          startsAt: startsAtFromDate(item.date),
          rsvps: item.rsvps || [],
        }));
        
        // Filter out events that have passed current date
        const activeEvents = mapped.filter((item) => item.startsAt >= now);
        setAll(activeEvents);
      })
      .catch(() => {
        if (!cancelled) setAll([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.institution?.id]);

  useEffect(() => {
    if (all.length === 0) return;
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-brand");
          setTimeout(() => el.classList.remove("ring-2", "ring-brand"), 3000);
        }
      }, 500);
    }
  }, [all]);

  const onRsvp = async (id: string) => {
    if (!isAuthed) {
      toast.error("Sign in to RSVP.");
      return;
    }
    try {
      const response = await backendEvents.rsvp(id);

      setAll((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const nextRsvps = response.going
            ? [...(e.rsvps || []), user?.id ?? ""]
            : (e.rsvps || []).filter((x) => x !== user?.id);
          return { ...e, rsvps: nextRsvps };
        })
      );

      if (response.going) {
        analytics.track("event_rsvp");
        toast.success("Seat reserved. You're on the builders list.");
      } else {
        toast.success("RSVP cancelled.");
      }
    } catch (error: any) {
      toast.error(error?.message || "Could not reserve seat.");
    }
  };

  const onAddToCalendar = (e: any) => {
    const url = getGoogleCalendarUrl(e);
    window.open(url, "_blank");
    toast.success("Opening Google Calendar...");
  };

  const onShare = async (e: any) => {
    const shareUrl = `${window.location.origin}/events#${e.id}`;
    const shareData = {
      title: e.title,
      text: `Join me at ${e.title}!`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied! Bring a friend to earn bonus XP.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied! Bring a friend to earn bonus XP.");
      }
    }
  };

  const myRsvpsCount = all.filter((e) => e.rsvps?.includes(user?.id ?? "")).length;

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">
            <Calendar className="mr-1 h-3 w-3" /> Live calendar
          </Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Events near you</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">
            Hackathons. Sprints. Pitch battles. Real momentum, every week.
          </p>
          <div className="mt-5 flex gap-4 text-sm text-primary-foreground/70">
            <span>
              <b className="text-primary-foreground">{all.length}</b> upcoming
            </span>
            <span>·</span>
            <span>
              <b className="text-primary-foreground">{myRsvpsCount}</b> on your calendar
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && (
            <>
              {[1, 2, 3].map((n) => (
                <Card key={n} className="overflow-hidden border border-border bg-card p-5 animate-pulse">
                  <div className="flex h-1.5 w-full bg-muted rounded-t animate-pulse" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="mt-4 h-6 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="mt-6 space-y-2">
                    <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="mt-6 flex gap-2">
                    <div className="h-9 flex-1 rounded bg-muted animate-pulse" />
                    <div className="h-9 w-9 rounded bg-muted animate-pulse" />
                    <div className="h-9 w-9 rounded bg-muted animate-pulse" />
                  </div>
                </Card>
              ))}
            </>
          )}
          {!loading && all.map((e) => {
            const going = e.rsvps?.includes(user?.id ?? "");
            const ms = e.startsAt - Date.now();
            const seatsRemaining = Math.max(0, e.seats - (e.rsvps?.length || 0));

            return (
              <Card
                key={e.id}
                id={e.id}
                className="overflow-hidden hover-lift animate-fade-in transition-all duration-300"
              >
                <div className="flex h-2 bg-gradient-brand" />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge
                      className={`max-w-[150px] truncate ${
                        e.color === "brand"
                          ? "bg-brand text-brand-foreground"
                          : e.color === "cyan"
                          ? "bg-cyan/20 text-cyan-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                      title={e.type}
                    >
                      {e.type}
                    </Badge>
                    <span className="text-xs font-semibold text-brand shrink-0">
                      {fmtCountdown(ms)}
                    </span>
                  </div>
                  <h3
                    className="mt-4 text-lg font-semibold text-foreground line-clamp-2 break-words h-14"
                    title={e.title}
                  >
                    {e.title}
                  </h3>
                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate flex-1">{e.date}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0" title={e.venue}>
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate flex-1">{e.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate flex-1">
                        {seatsRemaining} of {e.seats} seats left
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button
                      onClick={() => onRsvp(e.id)}
                      size="sm"
                      className={`flex-1 ${
                        going
                          ? "bg-success text-primary-foreground hover:opacity-90"
                          : "bg-gradient-brand text-brand-foreground"
                      }`}
                    >
                      {going ? (
                        <>
                          <Check className="mr-1.5 h-4 w-4" /> Going
                        </>
                      ) : (
                        "RSVP (+30 XP)"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddToCalendar(e)}
                      title="Add to Google Calendar"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onShare(e)}
                      title="Share Event"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {going && <p className="mt-3 text-xs text-success">Bring a friend and earn bonus XP.</p>}
                </div>
              </Card>
            );
          })}
          {!loading && all.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground col-span-full">No upcoming events yet.</Card>
          )}
        </div>
      </section>
    </AppShell>
  );
}
