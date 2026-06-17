import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Check,
  Share2,
  CalendarPlus,
  Clock,
  Zap,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/site/AppShell";
import { useIsLoggedIn, useUser } from "@/hooks/use-scope";
import { auth } from "@/lib/scope-store";
import { FeatureGate } from "@/components/site/FeatureGate";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { backendEvents, type BackendEvent } from "@/lib/api/endpoints";
import { useImageSrc } from "@/hooks/use-image-src";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function fmtCountdown(ms: number) {
  if (ms <= 0) return "Live now";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function formatEventDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

function formatEventTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

function getGoogleCalendarUrl(e: { title: string; date: string; venue: string; startsAt: number }) {
  const start = new Date(e.startsAt);
  const end = new Date(e.startsAt + 2 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`Join us for ${e.title}!\nVenue: ${e.venue}`)}&location=${encodeURIComponent(e.venue)}`;
}

/** Deterministic banner gradient per color+index */
function bannerGradient(color: "brand" | "cyan" | "primary", idx: number): string {
  const sets: Record<string, string[]> = {
    brand: [
      "135deg, #0f1729 0%, #1a0a0a 40%, #3d1212 70%, #6b1818 100%",
      "135deg, #12100e 0%, #2c1810 40%, #5c2d0f 100%",
    ],
    cyan: [
      "135deg, #050d1a 0%, #071a2e 40%, #0a2d4a 70%, #0d4066 100%",
      "135deg, #050f1a 0%, #083050 50%, #0a4a6e 100%",
    ],
    primary: [
      "135deg, #0b1020 0%, #121a38 40%, #1a2550 100%",
      "135deg, #080c1a 0%, #0e1530 50%, #1a2248 100%",
    ],
  };
  const list = sets[color] ?? sets.primary;
  return `linear-gradient(${list[idx % list.length]})`;
}

/** Accent color for the bottom border & badge per event color */
function accentColor(color: "brand" | "cyan" | "primary") {
  if (color === "brand") return "oklch(0.62 0.21 25)";
  if (color === "cyan") return "oklch(0.68 0.18 220)";
  return "oklch(0.55 0.16 268)";
}

type EventItem = {
  id: string; title: string; type: string; subtype?: string;
  date: string; venue: string; seats: number;
  color: "brand" | "cyan" | "primary";
  startsAt: number; rsvps: string[];
  aboutEvent?: string; speakerName?: string; speakerImage?: string;
  speakerDesignation?: string; speakerCompany?: string; speakerQualification?: string;
};

/* ─── Speaker avatar ──────────────────────────────────────────────────────── */
function SpeakerAvatar({ src, alt, size = 36 }: { src?: string; alt?: string; size?: number }) {
  const img = useImageSrc(src);
  if (!img.hasImage) return null;
  return (
    <img
      src={img.src}
      alt={alt ?? "Speaker"}
      onError={img.onError}
      style={{
        width: size, height: size,
        borderRadius: "50%",
        objectFit: "cover",
        objectPosition: "center top",
        border: "2px solid oklch(1 0 0 / 0.15)",
        flexShrink: 0,
      }}
    />
  );
}

/* ─── Banner ──────────────────────────────────────────────────────────────── */
function EventBanner({
  speakerImage, speakerName, color, idx, ms, typeLabel,
}: {
  speakerImage?: string; speakerName?: string;
  color: "brand" | "cyan" | "primary"; idx: number;
  ms: number; typeLabel: string;
}) {
  const img = useImageSrc(speakerImage);
  const accent = accentColor(color);
  const isUrgent = ms > 0 && ms < 24 * 3_600_000;
  const isLive = ms <= 0;

  return (
    <div style={{ position: "relative", height: "196px", overflow: "hidden", background: bannerGradient(color, idx) }}>
      {/* Decorative orbs */}
      <div style={{
        position: "absolute", top: "-50px", right: "-50px",
        width: "200px", height: "200px", borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-60px", left: "-30px",
        width: "160px", height: "160px", borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Speaker image overlay */}
      {img.hasImage && (
        <img
          src={img.src}
          alt={speakerName ?? ""}
          onError={img.onError}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center 20%",
            opacity: 0.45,
          }}
        />
      )}

      {/* Bottom fade so content reads cleanly */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(10,12,24,0.92) 0%, rgba(10,12,24,0.3) 55%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Type label — top left, truncated */}
      <div style={{ position: "absolute", top: 14, left: 14, maxWidth: "calc(100% - 100px)" }}>
        <span style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "oklch(1 0 0 / 0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "rgba(255,255,255,0.9)",
          border: "1px solid oklch(1 0 0 / 0.2)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}>
          {typeLabel}
        </span>
      </div>

      {/* Countdown — top right */}
      <div style={{ position: "absolute", top: 14, right: 14 }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: 700,
          background: isLive
            ? "oklch(0.7 0.16 155 / 0.9)"
            : isUrgent
            ? `${accent}cc`
            : "oklch(0.1 0.03 268 / 0.75)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#fff",
          border: `1px solid ${isLive ? "oklch(0.7 0.16 155 / 0.4)" : isUrgent ? `${accent}55` : "oklch(1 0 0 / 0.15)"}`,
          letterSpacing: "0.02em",
        }}>
          <Clock size={10} strokeWidth={2.5} />
          {fmtCountdown(ms)}
        </span>
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: "3px",
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
      }} />
    </div>
  );
}

/* ─── Icon button ─────────────────────────────────────────────────────────── */
function IconBtn({ onClick, title, children }: {
  onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 40, height: 40,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "12px",
        border: "1.5px solid var(--color-border)",
        background: "var(--color-card)",
        cursor: "pointer",
        color: "var(--color-muted-foreground)",
        flexShrink: 0,
        transition: "all 0.18s ease",
      }}
      onMouseEnter={e => {
        const b = e.currentTarget;
        b.style.background = "var(--color-accent)";
        b.style.color = "var(--color-foreground)";
        b.style.borderColor = "var(--color-border)";
        b.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        const b = e.currentTarget;
        b.style.background = "var(--color-card)";
        b.style.color = "var(--color-muted-foreground)";
        b.style.borderColor = "var(--color-border)";
        b.style.transform = "none";
      }}
    >
      {children}
    </button>
  );
}

/* ─── Event Card ──────────────────────────────────────────────────────────── */
function EventCard({
  e, idx, going, ms, seatsRemaining, onRsvp, onAddToCalendar, onShare,
}: {
  e: EventItem; idx: number; going: boolean; ms: number; seatsRemaining: number;
  onRsvp: (id: string) => void;
  onAddToCalendar: (e: EventItem) => void;
  onShare: (e: EventItem) => void;
}) {
  const accent = accentColor(e.color);
  const typeLabel = e.subtype ? `${e.type} · ${e.subtype}` : e.type;
  const isFull = seatsRemaining === 0 && !going;
  const isLow = seatsRemaining > 0 && seatsRemaining <= 5;
  const eventTime = formatEventTime(e.date);

  return (
    <article
      id={e.id}
      style={{
        borderRadius: "20px",
        overflow: "hidden",
        background: "var(--color-card)",
        border: "1.5px solid var(--color-border)",
        boxShadow: "0 2px 8px oklch(0.1 0.03 268 / 0.06), 0 8px 32px oklch(0.1 0.03 268 / 0.08)",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.22s cubic-bezier(.22,1,.36,1), box-shadow 0.22s ease",
        cursor: "default",
      }}
      onMouseEnter={e_ => {
        const el = e_.currentTarget;
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = "0 4px 16px oklch(0.1 0.03 268 / 0.1), 0 16px 48px oklch(0.1 0.03 268 / 0.14)";
      }}
      onMouseLeave={e_ => {
        const el = e_.currentTarget;
        el.style.transform = "";
        el.style.boxShadow = "0 2px 8px oklch(0.1 0.03 268 / 0.06), 0 8px 32px oklch(0.1 0.03 268 / 0.08)";
      }}
    >
      {/* Banner */}
      <EventBanner
        speakerImage={e.speakerImage}
        speakerName={e.speakerName}
        color={e.color}
        idx={idx}
        ms={ms}
        typeLabel={typeLabel}
      />

      {/* Body */}
      <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column", gap: "0" }}>

        {/* Title */}
        <h3
          title={e.title}
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: 700,
            lineHeight: 1.3,
            color: "var(--color-foreground)",
            letterSpacing: "-0.01em",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {e.title}
        </h3>

        {/* Speaker row */}
        {e.subtype !== "Virtual Campfire" && e.speakerName && (
          <div style={{
            marginTop: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "12px",
            background: "var(--color-accent)",
            border: "1px solid var(--color-border)",
          }}>
            <SpeakerAvatar src={e.speakerImage} alt={e.speakerName} size={36} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: "13px", fontWeight: 600,
                color: accent,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {e.speakerName}
              </div>
              {(e.speakerDesignation || e.speakerCompany) && (
                <div style={{
                  fontSize: "11.5px",
                  color: "var(--color-muted-foreground)",
                  marginTop: "1px",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {[e.speakerDesignation, e.speakerCompany].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* About */}
        {e.aboutEvent && (
          <p
            title={e.aboutEvent}
            style={{
              marginTop: "12px",
              fontSize: "13px",
              color: "var(--color-muted-foreground)",
              lineHeight: 1.6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              margin: "12px 0 0",
            }}
          >
            {e.aboutEvent}
          </p>
        )}

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: "14px" }} />

        {/* Meta grid */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "7px",
          padding: "14px 0",
          borderTop: "1px solid var(--color-border)",
        }}>
          {/* Date + Time */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "8px",
              background: `${accent}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Calendar size={13} color={accent} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: "12.5px", color: "var(--color-foreground)", fontWeight: 500 }}>
                {formatEventDate(e.date)}
              </span>
              {eventTime && (
                <span style={{ fontSize: "12px", color: "var(--color-muted-foreground)", marginLeft: "6px" }}>
                  · {eventTime}
                </span>
              )}
            </div>
          </div>

          {/* Venue */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "8px",
              background: `${accent}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <MapPin size={13} color={accent} strokeWidth={2} />
            </div>
            <span
              title={e.venue}
              style={{
                fontSize: "12.5px", color: "var(--color-foreground)", fontWeight: 500,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                flex: 1,
              }}
            >
              {e.venue}
            </span>
          </div>

          {/* Seats */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "8px",
              background: isFull
                ? "oklch(0.6 0.23 27 / 0.12)"
                : isLow
                ? "oklch(0.78 0.16 80 / 0.15)"
                : `${accent}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Users
                size={13}
                color={isFull ? "oklch(0.6 0.23 27)" : isLow ? "oklch(0.78 0.16 80)" : accent}
                strokeWidth={2}
              />
            </div>
            <span style={{
              fontSize: "12.5px", fontWeight: 500,
              color: isFull
                ? "oklch(0.6 0.23 27)"
                : isLow
                ? "oklch(0.65 0.16 60)"
                : "var(--color-foreground)",
            }}>
              {seatsRemaining === 0
                ? "Fully booked"
                : isLow
                ? `Only ${seatsRemaining} seats left!`
                : `${seatsRemaining} of ${e.seats} seats left`}
            </span>
            {going && (
              <span style={{
                marginLeft: "auto",
                display: "inline-flex", alignItems: "center", gap: "3px",
                padding: "2px 8px", borderRadius: "999px",
                fontSize: "11px", fontWeight: 600,
                background: "oklch(0.7 0.16 155 / 0.15)",
                color: "oklch(0.55 0.16 155)",
                border: "1px solid oklch(0.7 0.16 155 / 0.3)",
                flexShrink: 0,
              }}>
                <Check size={10} strokeWidth={2.5} /> Going
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => onRsvp(e.id)}
            disabled={isFull}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "7px",
              height: "42px",
              borderRadius: "12px",
              border: "none",
              cursor: isFull ? "not-allowed" : "pointer",
              fontSize: "13.5px",
              fontWeight: 700,
              letterSpacing: "0.01em",
              transition: "opacity 0.18s ease, transform 0.15s ease",
              background: going
                ? "oklch(0.7 0.16 155)"
                : isFull
                ? "var(--color-muted)"
                : `linear-gradient(135deg, ${accent} 0%, oklch(0.72 0.18 35) 100%)`,
              color: isFull && !going ? "var(--color-muted-foreground)" : "#fff",
              boxShadow: going || isFull ? "none" : `0 4px 16px ${accent}44`,
              opacity: isFull ? 0.55 : 1,
            }}
            onMouseEnter={ev => {
              if (!isFull) {
                ev.currentTarget.style.opacity = "0.88";
                ev.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={ev => {
              ev.currentTarget.style.opacity = isFull ? "0.55" : "1";
              ev.currentTarget.style.transform = "";
            }}
          >
            {going ? (
              <><Check size={15} strokeWidth={2.5} /> You're going</>
            ) : isFull ? (
              "Fully booked"
            ) : (
              <><Zap size={14} strokeWidth={2.5} /> RSVP · −30 XP</>
            )}
          </button>

          <IconBtn onClick={() => onAddToCalendar(e)} title="Add to Google Calendar">
            <CalendarPlus size={16} strokeWidth={1.8} />
          </IconBtn>

          <IconBtn onClick={() => onShare(e)} title="Share event">
            <Share2 size={15} strokeWidth={1.8} />
          </IconBtn>
        </div>

        {going && (
          <p style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "oklch(0.55 0.16 155)",
            textAlign: "center",
            fontWeight: 500,
          }}>
            🎉 Bring a friend and earn bonus XP!
          </p>
        )}
      </div>
    </article>
  );
}

/* ─── Skeleton Card ───────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: "20px", overflow: "hidden",
      background: "var(--color-card)",
      border: "1.5px solid var(--color-border)",
      boxShadow: "0 2px 8px oklch(0.1 0.03 268 / 0.05)",
    }}>
      <div className="animate-pulse" style={{ height: "196px", background: "var(--color-muted)" }} />
      <div style={{ padding: "20px 22px 22px" }}>
        <div className="animate-pulse" style={{ height: "24px", width: "65%", borderRadius: "8px", background: "var(--color-muted)", marginBottom: "16px" }} />
        <div className="animate-pulse" style={{ height: "54px", borderRadius: "12px", background: "var(--color-muted)", marginBottom: "14px" }} />
        <div className="animate-pulse" style={{ height: "13px", width: "85%", borderRadius: "6px", background: "var(--color-muted)", marginBottom: "6px" }} />
        <div className="animate-pulse" style={{ height: "13px", width: "55%", borderRadius: "6px", background: "var(--color-muted)", marginBottom: "20px" }} />
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="animate-pulse" style={{ flex: 1, height: "42px", borderRadius: "12px", background: "var(--color-muted)" }} />
          <div className="animate-pulse" style={{ width: "40px", height: "42px", borderRadius: "12px", background: "var(--color-muted)" }} />
          <div className="animate-pulse" style={{ width: "40px", height: "42px", borderRadius: "12px", background: "var(--color-muted)" }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Route ───────────────────────────────────────────────────────────────── */
export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — Scope Connect" },
      { name: "description", content: "Hackathons, sprints, pitch battles & founder meetups across India." },
    ],
  }),
  component: () => <FeatureGate flag="events"><EventsPage /></FeatureGate>,
});

/* ─── Page ────────────────────────────────────────────────────────────────── */
function EventsPage() {
  const user = useUser();
  const isAuthed = useIsLoggedIn();
  const [all, setAll] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const startsAtFromDate = (value: string) => {
      let parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
      const yr = new Date().getFullYear();
      parsed = Date.parse(`${value}, ${yr}`);
      if (!Number.isNaN(parsed)) return parsed;
      parsed = Date.parse(`${value.replace(/\s*,\s*/g, ", ")}, ${yr}`);
      if (!Number.isNaN(parsed)) return parsed;
      return Date.now() + 7 * 86_400_000;
    };

    backendEvents.list(user?.institution?.id)
      .then(({ items }) => {
        if (cancelled) return;
        const now = Date.now();
        const mapped: EventItem[] = items.map((item: BackendEvent) => ({
          id: item.id, title: item.title, type: item.type,
          subtype: item.subtype ?? "",
          date: item.date, venue: item.venue, seats: item.seats,
          color: item.color as any,
          startsAt: startsAtFromDate(item.date),
          rsvps: item.rsvps ?? [],
          aboutEvent: item.aboutEvent ?? "",
          speakerName: item.speakerName ?? "",
          speakerImage: item.speakerImage ?? "",
          speakerDesignation: item.speakerDesignation ?? "",
          speakerCompany: item.speakerCompany ?? "",
          speakerQualification: item.speakerQualification ?? "",
        }));
        setAll(mapped.filter(m => m.startsAt >= now));
      })
      .catch(() => { if (!cancelled) setAll([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user?.institution?.id]);

  useEffect(() => {
    if (!all.length) return;
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "2.5px solid var(--color-brand)";
      el.style.outlineOffset = "3px";
      setTimeout(() => { el.style.outline = ""; el.style.outlineOffset = ""; }, 3000);
    }, 500);
  }, [all]);

  const onRsvp = async (id: string) => {
    if (!isAuthed) { toast.error("Sign in to RSVP."); return; }
    try {
      const response = await backendEvents.rsvp(id);
      if (typeof response.xp === "number") {
        try {
          localStorage.setItem("scope_points", JSON.stringify(response.xp));
          window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: ["scope_points"] } }));
        } catch { /* ignore */ }
      }
      void auth.refreshCurrentUser().catch(() => null);
      setAll(prev => prev.map(e => {
        if (e.id !== id) return e;
        const nextRsvps = response.going
          ? [...(e.rsvps ?? []), user?.id ?? ""]
          : (e.rsvps ?? []).filter(x => x !== user?.id);
        return { ...e, rsvps: nextRsvps };
      }));
      if (response.going) {
        analytics.track("event_rsvp");
        toast.success("Seat reserved. You're on the builders list.");
      } else {
        toast.success("RSVP cancelled.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Could not reserve seat.");
    }
  };

  const onAddToCalendar = (e: EventItem) => {
    window.open(getGoogleCalendarUrl(e), "_blank");
    toast.success("Opening Google Calendar…");
  };

  const onShare = async (e: EventItem) => {
    const shareUrl = `${window.location.origin}/events#${e.id}`;
    const shareData = { title: e.title, text: `Join me at ${e.title}!`, url: shareUrl };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        toast.success("Shared!");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied! Bring a friend to earn bonus XP.");
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      }
    }
  };

  const myRsvpsCount = all.filter(e => e.rsvps?.includes(user?.id ?? "")).length;

  return (
    <AppShell>
      {/* ── Hero ── */}
      <section className="bg-gradient-hero border-b border-border/40 py-14 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
            <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20 px-3 py-1 text-xs font-semibold tracking-wide">
              <Sparkles className="mr-1.5 h-3 w-3" /> Live calendar
            </Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
            Events near you
          </h1>
          <p className="mt-3 max-w-lg text-primary-foreground/65 text-base leading-relaxed">
            Hackathons. Sprints. Pitch battles. Real momentum, every week.
          </p>
          <div style={{ marginTop: "20px", display: "flex", gap: "20px" }}>
            {[
              { value: all.length, label: "upcoming" },
              { value: myRsvpsCount, label: "on your calendar" },
            ].map(({ value, label }) => (
              <div key={label} style={{
                display: "flex", alignItems: "baseline", gap: "6px",
                padding: "8px 16px",
                borderRadius: "12px",
                background: "oklch(1 0 0 / 0.06)",
                border: "1px solid oklch(1 0 0 / 0.12)",
              }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{value}</span>
                <span style={{ fontSize: "13px", color: "oklch(1 0 0 / 0.6)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cards ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div style={{
          display: "grid",
          gap: "24px",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
        }}>
          {loading && [1, 2, 3].map(n => <SkeletonCard key={n} />)}

          {!loading && all.map((e, idx) => {
            const going = !!(e.rsvps?.includes(user?.id ?? ""));
            const ms = e.startsAt - Date.now();
            const seatsRemaining = Math.max(0, e.seats - (e.rsvps?.length ?? 0));
            return (
              <EventCard
                key={e.id}
                e={e} idx={idx}
                going={going} ms={ms} seatsRemaining={seatsRemaining}
                onRsvp={onRsvp}
                onAddToCalendar={onAddToCalendar}
                onShare={onShare}
              />
            );
          })}

          {!loading && all.length === 0 && (
            <div style={{
              gridColumn: "1 / -1",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "64px 24px",
              borderRadius: "20px",
              border: "2px dashed var(--color-border)",
              color: "var(--color-muted-foreground)",
              textAlign: "center",
            }}>
              <Calendar size={36} style={{ opacity: 0.3, marginBottom: "14px" }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-foreground)", marginBottom: "4px" }}>
                No upcoming events
              </p>
              <p style={{ fontSize: "13px" }}>
                Check back soon — new events are added every week.
              </p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
