import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
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
    <section className="border-t border-border/40 py-16 sm:py-20">
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
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
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
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand/30 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-cyan/20 blur-3xl animate-pulse-glow" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-6 border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/15">
            <Sparkles className="mr-1.5 h-3 w-3" /> India's Curated Campus Opportunity Platform
          </Badge>
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Where campuses build
            <br />
            <span className="bg-gradient-to-r from-cyan via-cyan to-brand bg-clip-text text-transparent">
              real opportunities.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-primary-foreground/80 sm:text-xl">
            Verified challenges, campus growth programs, and real opportunities for ambitious students. Join 12,000+ builders across 142 campuses.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
              <Link to="/auth" onClick={trackPrimary}>
                Join Scope Connect <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/projects" onClick={trackSecondary}>Explore live projects</Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-primary-foreground/70">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-cyan" /> 10+ campuses live</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-cyan" /> Curated challenges only</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-cyan" /> Student-first network</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-cyan" /> Privacy safe</span>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
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

function Partners() {
  return (
    <section className="border-b border-border/40 bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Trusted by builders at
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {campusPartners.map((p) => (
            <div key={p.name} className="text-sm font-semibold text-muted-foreground/80">
              {p.name}
            </div>
          ))}
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
    <section className="py-20 sm:py-28">
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
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Top chapters this month</h2>
            <p className="mt-2 text-muted-foreground">The campus chapters setting the pace.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/leaderboards">See full leaderboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <Card className="mt-8 divide-y divide-border overflow-hidden">
          {topChapters.map((c) => (
            <div key={c.name} className="flex items-center gap-4 p-5 transition-colors hover:bg-secondary/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero text-sm font-bold text-primary-foreground">
                #{c.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.campus}</div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-foreground">{c.members} members</div>
                <div className="text-xs text-success">{c.growth} this month</div>
              </div>
              <Badge className="bg-cyan/15 text-cyan-foreground hover:bg-cyan/20">{c.growth}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </section>
  );
}

function TopBuildersSection() {
  return (
    <section className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Top builders</h2>
            <p className="mt-2 text-muted-foreground">Members earning serious Scope Points this month.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topBuilders.map((b, i) => (
            <Card key={b.name} className="flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-elegant">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-lg font-bold text-brand-foreground shadow-brand">
                {b.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-foreground">{b.name}</span>
                  <span aria-hidden>{b.badge}</span>
                </div>
                <div className="text-xs text-muted-foreground">{b.campus} · {b.level}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-foreground">{b.points.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pts</div>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">#{i + 1}</Badge>
            </Card>
          ))}
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
              <h3 className="mt-4 text-lg font-semibold text-foreground">{e.title}</h3>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {e.date}</div>
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {e.venue}</div>
                <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {e.seats} seats</div>
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
  if (isLoggedIn) return null;
  return (
    <section className="bg-secondary/40 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <Badge variant="outline" className="mb-3">Not ready yet?</Badge>
          <h3 className="text-2xl font-bold text-foreground">Stay in the loop</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Join the waitlist for launch updates, browse projects in read-only mode, or refer your campus.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground" onClick={() => analytics.track("waitlist_joined")}>
              <Link to="/waitlist">Join waitlist</Link>
            </Button>
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
