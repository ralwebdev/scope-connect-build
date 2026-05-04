import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Tasteful, theme-aware dummy ad placeholders.
 * Always clearly labeled. No autoplay, no popups, no form-blocking.
 */

export type AdVariant = "banner" | "card" | "rail" | "slim" | "two-grid";

type Creative = { title: string; copy: string; cta?: string; emoji?: string };

const POOLS: Record<string, Creative[]> = {
  partner: [
    { title: "Red Apple Learning Workshops", copy: "Free design & product sprints — open to all campus chapters.", cta: "Explore", emoji: "🎨" },
    { title: "Startup Bootcamp · April Cohort", copy: "Six weekends. Real founders. Build something investable.", cta: "Apply", emoji: "🚀" },
    { title: "Campus Hiring Week", copy: "Top startups recruiting Scope-verified builders this week.", cta: "View roles", emoji: "💼" },
  ],
  sponsored: [
    { title: "Design Masterclass", copy: "Free 90-min crash course on shipping product UI.", cta: "Reserve seat", emoji: "✏️" },
    { title: "Sponsored Challenge", copy: "Solve a real fintech bug — winners get cash + interviews.", cta: "Join", emoji: "🏆" },
  ],
  recommended: [
    { title: "Resume Builder", copy: "Auto-generate a recruiter-ready resume from your portfolio.", cta: "Try it", emoji: "📄" },
    { title: "Workshop Access", copy: "Unlock this week's live builder workshops.", cta: "Open", emoji: "🎟️" },
  ],
  update: [
    { title: "Platform Update", copy: "Leaderboards now refresh hourly. Climb faster.", cta: "What's new", emoji: "✨" },
  ],
};

// Day-stable rotation index (changes ~daily, deterministic per slot).
function dailyIndex(slotId: string, len: number) {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  let h = 0;
  const seed = `${slotId}:${day}`;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % Math.max(1, len);
}

function pick(slotId: string, label: AdLabel): Creative {
  const pool =
    label === "Featured Partner" ? POOLS.partner :
    label === "Recommended for Builders" || label === "Recommended" ? POOLS.recommended :
    label === "Platform Update" ? POOLS.update :
    POOLS.sponsored;
  return pool[dailyIndex(slotId, pool.length)];
}

export type AdLabel =
  | "Sponsored"
  | "Featured Partner"
  | "Recommended"
  | "Recommended for Builders"
  | "Partner Spotlight"
  | "Platform Update";

interface AdSlotProps {
  slotId: string;
  variant: AdVariant;
  label: AdLabel;
  className?: string;
}

export function AdSlot({ slotId, variant, label, className }: AdSlotProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const creative = useMemo(() => pick(slotId, label), [slotId, label]);
  if (!mounted) return <div aria-hidden className={cn("min-h-[64px]", className)} />;

  if (variant === "slim") {
    return (
      <aside
        role="complementary"
        aria-label={`${label}: ${creative.title}`}
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="text-foreground">{creative.title}</span>
          <span className="hidden sm:inline">— {creative.copy}</span>
        </div>
        {creative.cta && (
          <button className="text-xs font-semibold text-brand hover:underline">{creative.cta} →</button>
        )}
      </aside>
    );
  }

  if (variant === "rail") {
    return (
      <aside
        role="complementary"
        aria-label={`${label}: ${creative.title}`}
        className={cn(
          "sticky top-20 hidden w-full rounded-2xl border border-border bg-card p-5 shadow-soft lg:block",
          className,
        )}
      >
        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="mt-3 text-3xl">{creative.emoji ?? "✨"}</div>
        <h4 className="mt-2 text-sm font-semibold text-foreground">{creative.title}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{creative.copy}</p>
        {creative.cta && (
          <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
            {creative.cta} <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </aside>
    );
  }

  if (variant === "card") {
    return (
      <Card
        role="complementary"
        aria-label={`${label}: ${creative.title}`}
        className={cn("flex items-start gap-3 p-4", className)}
      >
        <div className="text-2xl" aria-hidden>{creative.emoji ?? "✨"}</div>
        <div className="min-w-0 flex-1">
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <div className="mt-1.5 text-sm font-semibold text-foreground">{creative.title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{creative.copy}</p>
          {creative.cta && (
            <button className="mt-2 text-xs font-semibold text-brand hover:underline">{creative.cta} →</button>
          )}
        </div>
      </Card>
    );
  }

  if (variant === "two-grid") {
    const a = pick(`${slotId}:a`, label);
    const b = pick(`${slotId}:b`, label);
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
        {[a, b].map((c, i) => (
          <Card key={i} className="flex items-start gap-3 p-5">
            <div className="text-3xl" aria-hidden>{c.emoji ?? "✨"}</div>
            <div className="min-w-0 flex-1">
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
              <div className="mt-1.5 text-base font-semibold text-foreground">{c.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{c.copy}</p>
              {c.cta && (
                <button className="mt-2 text-xs font-semibold text-brand hover:underline">{c.cta} →</button>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // banner (wide)
  return (
    <Card
      role="complementary"
      aria-label={`${label}: ${creative.title}`}
      className={cn(
        "flex flex-col items-start justify-between gap-4 overflow-hidden p-6 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-2xl text-brand-foreground shadow-brand" aria-hidden>
          {creative.emoji ?? "✨"}
        </div>
        <div>
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <h4 className="mt-1.5 text-base font-semibold text-foreground sm:text-lg">{creative.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{creative.copy}</p>
        </div>
      </div>
      {creative.cta && (
        <button className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent">
          {creative.cta} <ExternalLink className="h-3 w-3" />
        </button>
      )}
    </Card>
  );
}
