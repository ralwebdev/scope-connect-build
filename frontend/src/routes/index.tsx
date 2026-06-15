import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { backendInstitutions, backendReports, backendUsers } from "@/lib/api/endpoints";
import {
  ArrowRight,
  Sparkles,
  Trophy,
  Users,
  Rocket,
  Zap,
  TrendingUp,
  Calendar,
  MapPin,
  Star,
  Flame,
  Quote,
  ShieldCheck,
  Hammer,
  Compass,
  Crown,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/site/AppShell";
import { AdSlot } from "@/components/site/AdSlot";
import { analytics } from "@/lib/analytics";
import { useIsLoggedIn } from "@/hooks/use-scope";
import { useFeature } from "@/hooks/use-platform";
import {
  campusPartners,
  liveMetrics,
  topChapters,
  topBuilders,
  featuredProjects,
  upcomingEvents,
  testimonials,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scope Connect — India's Campus Innovation Network" },
      {
        name: "description",
        content:
          "Join 12,000+ Gen Z builders across 142 campuses. Ship projects, win hackathons, and lead India's most ambitious campus innovation network.",
      },
      { property: "og:title", content: "Scope Connect — India's Campus Innovation Network" },
      {
        property: "og:description",
        content:
          "Build, ship, and lead with the best Gen Z builders in India. Campus chapters, hackathons, projects, and a national leaderboard.",
      },
    ],
  }),
  component: LandingPage,
});

const PILLARS = [
  { icon: Hammer, title: "Build", copy: "Work on real curated projects from day one.", color: "brand" as const },
  { icon: TrendingUp, title: "Grow", copy: "Earn XP, rank up, strengthen your portfolio.", color: "cyan" as const },
  { icon: Crown, title: "Lead", copy: "Represent and grow your campus chapter.", color: "brand" as const },
  { icon: Compass, title: "Connect", copy: "Collaborate with India's most ambitious students.", color: "cyan" as const },
];

function WhatIsScope() {
  return (
    <section className="border-t border-border/40 py-8 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="mb-3 bg-brand/10 text-brand">In 10 seconds</Badge>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">What is Scope Connect?</h2>
          <p className="mt-3 text-base text-muted-foreground">India's curated network for student builders. Four things, done well.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <Card key={p.title} className="p-6 transition-all hover:-translate-y-1 hover:shadow-elegant">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${p.color === "brand" ? "bg-gradient-brand text-brand-foreground shadow-brand" : "bg-cyan/15 text-cyan"}`}>
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.copy}</p>
            </Card>
          ))}
        </div>
        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-brand" /> No spam, no fake listings</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-brand" /> Every challenge curated by Scope</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-brand" /> Your ideas remain private</span>
        </div>
      </div>
    </section>
  );
}

function LandingPage() {
  const isLoggedIn = useIsLoggedIn();
  useEffect(() => { analytics.track("homepage_visit"); }, []);

  return (
    <AppShell>
      <Hero />
      <Partners />
      <section className="px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AdSlot slotId="home_hero_below" variant="banner" label="Featured Partner" />
        </div>
      </section>
      <WhatIsScope />
      <WhyJoin />
      <LiveMetricsSection />
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AdSlot slotId="home_mid_metrics" variant="two-grid" label="Sponsored" />
        </div>
      </section>
      <TopChaptersSection />
      <TopBuildersSection />
      <TopInstitutionsSection />
      <ProjectsShowcase />
      <EventsSection />
      <Testimonials />
      <ExitCapture />
      <section className="px-4 pb-6 sm:px-6 lg:px-8">
        <AdSlot slotId="home_footer_strip" variant="slim" label="Platform Update" />
      </section>
      <FinalCTA />
      {!isLoggedIn && <StickyMobileCTA />}
    </AppShell>
  );
}

function Hero() {
  const trackPrimary = () => analytics.track("cta_click_primary");
  const trackSecondary = () => analytics.track("cta_click_secondary");

  return (
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand/30 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-cyan/20 blur-3xl animate-pulse-glow" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-6 border-cyan/35 bg-cyan/10 text-cyan hover:bg-cyan/15 px-3 py-1 text-xs font-semibold tracking-wide">
            <Sparkles className="mr-1.5 h-3 w-3" /> India's Curated Campus Opportunity Platform
          </Badge>
          <h1 className="text-balance text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.15] sm:leading-[1.1]">
            Where Campuses Build
            <br />
            <span className="bg-gradient-to-r from-cyan via-cyan to-brand bg-clip-text text-transparent">
              Real Opportunities.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base font-normal leading-relaxed tracking-wide text-primary-foreground/80 sm:text-lg sm:leading-loose">
            Verified Challenges, Campus Growth Programs, and Real Opportunities for Ambitious Students. Join 12,000+ Students across 142 Institutions.
          </p>

          {/* Standard CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-gradient-brand text-brand-foreground shadow-brand hover:shadow-brand/60 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 rounded-xl font-bold px-8 py-3.5"
            >
              <Link to="/auth" onClick={trackPrimary}>
                Join Scope Connect <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border border-primary-foreground/15 bg-transparent text-primary-foreground hover:border-primary-foreground/35 hover:bg-primary-foreground/5 active:scale-[0.98] transition-all duration-200 rounded-xl font-semibold px-8 py-3.5"
            >
              <Link to="/projects" onClick={trackSecondary}>
                Explore Live Projects
              </Link>
            </Button>
          </div>

          {/* Minimalist Trust Signal Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-primary-foreground/75">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-foreground/5 border border-primary-foreground/10 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan" /> 10+ Campuses Live
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-foreground/5 border border-primary-foreground/10 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan" /> Curated Challenges Only
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-foreground/5 border border-primary-foreground/10 font-medium">
              <Users className="h-3.5 w-3.5 text-cyan" /> Student-First Network
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-foreground/5 border border-primary-foreground/10 font-medium">
              <Lock className="h-3.5 w-3.5 text-cyan" /> Privacy Safe
            </span>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4 border-t border-primary-foreground/10 pt-8">
            {liveMetrics.map((m) => (
              <div key={m.label} className="text-center">
                <div className="text-3xl font-bold tracking-tight sm:text-4xl">{m.value}</div>
                <div className="mt-1 text-xs text-primary-foreground/60">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { motion } from "framer-motion";

type LeaderboardRow = {
  id: string;
  name: string;
  sub: string;
  value: number;
  icon?: string;
};

function asLeaderboardRows(items: Array<{ id: string; name: string; sub: string; value: number }>, fallback: Array<{ id: string; name: string; sub: string; value: number; icon?: string }>): LeaderboardRow[] {
  const source = items.length > 0 ? items : fallback;
  return source.slice(0, 6).map((item, index) => ({
    ...item,
    icon: item.icon ?? (index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⚡"),
  }));
}

function Partners() {
  const [dynamicPartners, setDynamicPartners] = useState<{ name: string; city: string; members: number; }[]>([]);

  useEffect(() => {
    let active = true;
    backendInstitutions
      .publicList({ stage: "Launch Pending,Live Chapter" })
      .then((res) => {
        if (active && res?.items) {
          const fetched = res.items.map((item) => ({
            name: item.name,
            city: item.city || "",
            members: 0,
          }));
          setDynamicPartners(fetched);
        }
      })
      .catch((err) => console.error("Failed to load dynamic partners:", err));
    return () => {
      active = false;
    };
  }, []);

  // Combine defaults with dynamically loaded partners (avoid duplicates by name)
  const combinedPartners = [...campusPartners];
  dynamicPartners.forEach((dp) => {
    if (!combinedPartners.some((p) => p.name.toLowerCase() === dp.name.toLowerCase())) {
      combinedPartners.push(dp);
    }
  });

  const half = Math.ceil(combinedPartners.length / 2);
  const row1 = combinedPartners.slice(0, half);
  const row2 = combinedPartners.slice(half);

  // Triple the rows for smooth infinite scrolling loop
  const tickerRow1 = [...row1, ...row1, ...row1];
  const tickerRow2 = [...row2, ...row2, ...row2];

  return (
    <section className="border-b border-border/40 bg-background py-14 overflow-hidden relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-8">
          Trusted by Students at
        </p>
      </div>

      <div className="relative flex flex-col gap-6 w-full">
        {/* Row 1: Left to Right */}
        <div className="relative flex overflow-hidden w-full [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
          <motion.div
            className="flex items-center gap-10 whitespace-nowrap shrink-0"
            animate={{ x: ["-33.33%", "0%"] }}
            transition={{
              ease: "linear",
              duration: 35,
              repeat: Infinity,
            }}
          >
            {tickerRow1.map((p, idx) => (
              <div
                key={`row1-${p.name}-${idx}`}
                className="text-base font-semibold text-muted-foreground/60 transition-colors hover:text-foreground/95 cursor-pointer shrink-0"
              >
                {p.name}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Row 2: Right to Left */}
        <div className="relative flex overflow-hidden w-full [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
          <motion.div
            className="flex items-center gap-10 whitespace-nowrap shrink-0"
            animate={{ x: ["0%", "-33.33%"] }}
            transition={{
              ease: "linear",
              duration: 35,
              repeat: Infinity,
            }}
          >
            {tickerRow2.map((p, idx) => (
              <div
                key={`row2-${p.name}-${idx}`}
                className="text-base font-semibold text-muted-foreground/60 transition-colors hover:text-foreground/95 cursor-pointer shrink-0"
              >
                {p.name}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const whyJoinItems = [
  {
    icon: Rocket,
    title: "Ship real projects",
    desc: "Co-build with India's top student engineers, designers, and founders. Showcase what you ship.",
  },
  {
    icon: Trophy,
    title: "Compete & win",
    desc: "Hackathons, pitch battles, sprints. Climb leaderboards. Earn badges that recruiters notice.",
  },
  {
    icon: Users,
    title: "Lead a chapter",
    desc: "Start or run an Innovation Chapter at your campus. Build your team, your brand, your legacy.",
  },
  {
    icon: Zap,
    title: "Get hired faster",
    desc: "Verified builder portfolios, recruiter reach-outs, and direct internship pipelines.",
  },
];

function WhyJoin() {
  return (
    <section className="py-1 sm:py-3">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Why join Scope Connect
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One unified ecosystem for builders, leaders, and the campuses behind them.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyJoinItems.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="group p-6 transition-all hover:-translate-y-1 hover:shadow-elegant">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-brand">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveMetricsSection() {
  return (
    <section className="bg-secondary/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-3 border-success/30 bg-success/10 text-success">
              <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Live
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              The network, in real time
            </h2>
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {liveMetrics.map((m) => (
            <Card key={m.label} className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{m.label}</span>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <div className="mt-3 text-4xl font-bold tracking-tight text-foreground">{m.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{m.change}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopChaptersSection() {
  const [chapters, setChapters] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    backendUsers.listChaptersByXp()
      .then((res) => {
        if (!active) return;
        setChapters(asLeaderboardRows(
          res.items.map((item) => ({
            id: item.id,
            name: item.name,
            sub: item.sub || "Live chapter",
            value: item.value || 0,
          })),
          topChapters.map((chapter, index) => ({
            id: chapter.name,
            name: chapter.name,
            sub: `${chapter.campus} · ${chapter.growth}`,
            value: chapter.members,
            icon: index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⚡",
          })),
        ));
      })
      .catch((err) => {
        console.error("Failed to load top chapters:", err);
        if (active) {
          setChapters(asLeaderboardRows(
            [],
            topChapters.map((chapter, index) => ({
              id: chapter.name,
              name: chapter.name,
              sub: `${chapter.campus} · ${chapter.growth}`,
              value: chapter.members,
              icon: index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⚡",
            })),
          ));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-cyan/20 bg-cyan/10 text-cyan">Live chapter rankings</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Top Chapters</h2>
          <p className="mt-3 text-sm text-muted-foreground">The campus chapters setting the pace by total builder XP.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-sm text-muted-foreground">Loading chapters...</div>
        ) : (
          <div className="mx-auto mt-12 grid gap-4 md:grid-cols-2">
            {chapters.map((c, i) => (
              <Card key={c.name} className="flex items-center gap-4 border-border/60 p-4 transition-all hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-brand-foreground shadow-brand">
                  {c.icon ?? "⚡"}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-muted-foreground">
                  #{i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.sub}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-foreground">{c.value.toLocaleString()}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">XP</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Button asChild variant="outline" size="sm" className="rounded-xl border border-border px-5 py-2 hover:bg-secondary/60">
            <Link to="/leaderboards">See Full Leaderboard →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function TopBuildersSection() {
  const [builders, setBuilders] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    backendUsers.listStudentsByXp()
      .then((res) => {
        if (!active) return;
        setBuilders(asLeaderboardRows(
          res.items.map((member) => ({
            id: member.id,
            name: member.name,
            sub: `${member.campus || "Scope Connect"} · Level ${member.stats?.level ?? 1}`,
            value: member.stats?.xp ?? 0,
          })),
          topBuilders.slice(0, 6).map((builder, index) => ({
            id: builder.name,
            name: builder.name,
            sub: `${builder.campus} · ${builder.level}`,
            value: builder.points,
            icon: builder.badge ?? (index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⚡"),
          })),
        ));
      })
      .catch((err) => {
        console.error("Failed to load top builders:", err);
        if (active) {
          setBuilders(asLeaderboardRows(
            [],
            topBuilders.slice(0, 6).map((builder, index) => ({
              id: builder.name,
              name: builder.name,
              sub: `${builder.campus} · ${builder.level}`,
              value: builder.points,
              icon: builder.badge ?? (index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⚡"),
            })),
          ));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-secondary/20 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-brand/20 bg-brand/10 text-brand">Live builder rankings</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Top Builders</h2>
          <p className="mt-3 text-sm text-muted-foreground">Gen Z builders shipping projects and earning Scope XP.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-sm text-muted-foreground">Loading builders...</div>
        ) : (
          <div className="mx-auto mt-12 grid gap-4 md:grid-cols-2">
            {builders.map((b, i) => {
              return (
                <Card key={b.name} className="flex items-center gap-4 border-border/60 p-4 transition-all hover:-translate-y-0.5 hover:shadow-elegant">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-brand-foreground shadow-brand">
                    {b.icon ?? "⚡"}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-muted-foreground">
                    #{i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{b.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{b.sub}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-foreground">{b.value.toLocaleString()}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">XP</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <Button asChild variant="outline" size="sm" className="rounded-xl border border-border px-5 py-2 hover:bg-secondary/60">
            <Link to="/leaderboards">See Full Leaderboard →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function TopInstitutionsSection() {
  const [institutes, setInstitutes] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    backendReports.globalLeaderboard()
      .then((res) => {
        if (!active) return;
        setInstitutes(asLeaderboardRows(
          res.items.map((institution) => ({
            id: institution.id,
            name: institution.name,
            sub: "Ranked by total campus XP",
            value: institution.xp,
          })),
          topChapters.slice(0, 6).map((chapter, index) => ({
            id: chapter.campus,
            name: chapter.campus,
            sub: `${chapter.name} · ${chapter.growth}`,
            value: chapter.members * 100,
            icon: index === 0 ? "🏛️" : index === 1 ? "🏫" : index === 2 ? "🎓" : "📍",
          })),
        ));
      })
      .catch((err) => {
        console.error("Failed to load top institutions:", err);
        if (active) {
          setInstitutes(asLeaderboardRows(
            [],
            topChapters.slice(0, 6).map((chapter, index) => ({
              id: chapter.campus,
              name: chapter.campus,
              sub: `${chapter.name} · ${chapter.growth}`,
              value: chapter.members * 100,
              icon: index === 0 ? "🏛️" : index === 1 ? "🏫" : index === 2 ? "🎓" : "📍",
            })),
          ));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-success/20 bg-success/10 text-success">Institute ranking</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Top Institutes</h2>
          <p className="mt-3 text-sm text-muted-foreground">Campuses ranked by total builder XP across their chapters.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-sm text-muted-foreground">Loading institutions...</div>
        ) : (
          <div className="mx-auto mt-12 grid gap-4 md:grid-cols-2">
            {institutes.map((c, i) => (
              <Card key={c.name} className="flex items-center gap-4 border-border/60 p-4 transition-all hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-success/90 to-cyan/90 text-sm font-bold text-white shadow-brand">
                  {c.icon ?? "🏛️"}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-muted-foreground">
                  #{i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.sub}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-foreground">{c.value.toLocaleString()}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">XP</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Button asChild variant="outline" size="sm" className="rounded-xl border border-border px-5 py-2 hover:bg-secondary/60">
            <Link to="/leaderboards">See Full Leaderboard →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ProjectsShowcase() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Projects shipping now</h2>
            <p className="mt-2 text-muted-foreground">Real builds from real students. Vote, fork, collaborate.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((p) => (
            <Card key={p.title} className="group flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-elegant">
              <div className="flex h-32 items-center justify-center bg-gradient-hero text-5xl">
                <span className="transition-transform group-hover:scale-110">{p.cover}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{p.category}</Badge>
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Flame className="h-3 w-3 text-brand" /> {p.votes}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-4 text-xs text-muted-foreground">by {p.team}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function EventsSection() {
  return (
    <section className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Upcoming events</h2>
            <p className="mt-2 text-muted-foreground">Hackathons, sprints, pitch battles & founder meetups.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {upcomingEvents.map((e) => (
            <Card key={e.title} className="overflow-hidden p-5 transition-all hover:-translate-y-1 hover:shadow-elegant">
              <Badge className={
                e.color === "brand" ? "bg-brand text-brand-foreground" :
                  e.color === "cyan" ? "bg-cyan/20 text-cyan-foreground" :
                    "bg-primary text-primary-foreground"
              }>
                {e.type}
              </Badge>
              <h3 className="mt-4 text-lg font-semibold text-foreground line-clamp-2 break-words h-14" title={e.title}>{e.title}</h3>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 min-w-0"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="truncate flex-1">{e.date}</span></div>
                <div className="flex items-center gap-2 min-w-0" title={e.venue}>
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{e.venue}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0"><Users className="h-3.5 w-3.5 shrink-0" /><span className="truncate flex-1">{e.seats} seats</span></div>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-5 w-full">
                <Link to="/events">Register</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Loved by builders. Trusted by founders.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="p-6">
              <Quote className="h-6 w-6 text-brand" />
              <p className="mt-4 text-base text-foreground">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-hero text-sm font-bold text-primary-foreground">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero px-8 py-16 text-center text-primary-foreground shadow-elegant sm:px-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
          <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-brand/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-cyan/30 blur-3xl" />
          <div className="relative">
            <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Your campus deserves a chapter.
              <br />
              <span className="text-cyan">Your work deserves a stage.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
              Join the network that's quietly building the next generation of Indian founders.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
                <Link to="/auth">Create your profile <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/campus">Browse campuses</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Exit Capture --------------------------- */

function ExitCapture() {
  const isLoggedIn = useIsLoggedIn();
  const waitlistOn = useFeature("waitlist");
  if (isLoggedIn) return null;
  return (
    <section className="bg-secondary/40 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <Badge variant="outline" className="mb-3">Not ready yet?</Badge>
          <h3 className="text-2xl font-bold text-foreground">Stay in the loop</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {waitlistOn
              ? "Join the waitlist for launch updates, browse projects in read-only mode, or refer your campus."
              : "Browse projects in read-only mode, or refer your campus."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {waitlistOn && (
              <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground" onClick={() => analytics.track("waitlist_joined")}>
                <Link to="/waitlist">Join waitlist</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/projects">Browse projects</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/refer">Refer your campus</Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* --------------------------- Sticky Mobile CTA --------------------------- */

function StickyMobileCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:hidden">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-xs">
          <div className="font-semibold text-foreground">Your next move starts here.</div>
          <div className="text-muted-foreground">Takes under 60 seconds.</div>
        </div>
        <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground shadow-brand" onClick={() => analytics.track("cta_click_primary")}>
          <Link to="/auth">Join now <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </div>
    </div>
  );
}
