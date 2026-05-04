// Portfolio Spotlight — surfaces seeded builder work on the dashboard to
// inspire creator culture and give every visitor a "you could be here" moment.
// Cards rotate daily based on the date so everyone sees the same set on a
// given day, then a fresh batch tomorrow.
import { useMemo } from "react";
import { Sparkles, Trophy, TrendingUp, Award, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { topBuilders } from "@/lib/mock-data";

type SpotlightKind = {
  key: "builder" | "milestone" | "designer" | "rising" | "creator";
  label: string;
  icon: typeof Sparkles;
  accent: string;
  milestone: (name: string) => string;
};

const KINDS: SpotlightKind[] = [
  { key: "builder", label: "Builder of the Week", icon: Trophy, accent: "text-brand", milestone: () => "Completed 3 live challenges" },
  { key: "milestone", label: "Recent Milestone", icon: Award, accent: "text-cyan", milestone: () => "Reached Leader Level" },
  { key: "designer", label: "Top Designer", icon: Sparkles, accent: "text-brand", milestone: () => "Uploaded Behance portfolio" },
  { key: "rising", label: "Fastest Rising Developer", icon: TrendingUp, accent: "text-cyan", milestone: () => "Climbed 28 ranks this week" },
  { key: "creator", label: "Campus Creator Spotlight", icon: Star, accent: "text-brand", milestone: (name) => `${name.split(" ")[0]} won Campus Sprint` },
];

const ROLE_TAGS: Record<string, string[]> = {
  Designer: ["UI/UX", "Branding", "Figma"],
  Developer: ["React", "TypeScript", "AI"],
  Founder: ["Startup", "Pitch", "Growth"],
  Researcher: ["Research", "Writing", "Data"],
  Marketer: ["Growth Marketing", "Content", "Brand"],
  "Community Lead": ["Community", "Events", "Leadership"],
};

const LINK_TYPES = ["Behance", "GitHub", "Dribbble", "Notion", "LinkedIn"];

function dayIndex(): number {
  const d = new Date();
  // Days since epoch — same value for everyone on the same UTC date
  return Math.floor(d.getTime() / 86400000);
}

function pickBuilder(offset: number) {
  const idx = (dayIndex() + offset * 7) % topBuilders.length;
  return topBuilders[idx];
}

export function PortfolioSpotlight() {
  // Rotate two card slots, pinned per day so it doesn't flicker on rerenders.
  const slots = useMemo(() => {
    const today = dayIndex();
    return [0, 1].map((i) => {
      const builder = pickBuilder(i);
      const kind = KINDS[(today + i) % KINDS.length];
      const tags = (ROLE_TAGS[builder.role] ?? ["Builder", "Maker"]).slice(0, 3);
      const linkType = LINK_TYPES[(today + i) % LINK_TYPES.length];
      return { builder, kind, tags, linkType };
    });
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ✨ Portfolio Spotlight
          </div>
          <h2 className="mt-1 text-xl font-bold text-foreground">Proof of work gets noticed.</h2>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">Your spotlight could be next.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {slots.map(({ builder, kind, tags, linkType }, i) => {
          // Only render the second card on sm+ screens for mobile economy.
          const Icon = kind.icon;
          return (
            <Card
              key={`${builder.name}-${i}`}
              className={`p-5 hover-lift animate-fade-in ${i === 1 ? "hidden sm:block" : ""}`}
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  <Icon className={`mr-1 h-3 w-3 ${kind.accent}`} /> {kind.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{builder.points.toLocaleString()} XP</span>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-base font-bold text-brand-foreground shadow-brand"
                  style={{ background: "var(--gradient-brand, linear-gradient(135deg, hsl(var(--brand)), hsl(var(--cyan))))" }}
                >
                  {builder.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {builder.name} <span className="ml-1 text-base">{builder.badge}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {builder.campus} · {builder.level}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-foreground/85">
                <span className="font-medium">{kind.milestone(builder.name)}</span>
                <span className="text-muted-foreground"> · linked via {linkType}</span>
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
