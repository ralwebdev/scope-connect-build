import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Users, Rocket, Flag, ArrowRight, Lock, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { TrustFAQ } from "@/components/site/TrustFAQ";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Scope Connect — India's Campus Innovation Network" },
      { name: "description", content: "Why Scope exists, how curated projects work, and our national vision for student builders." },
      { property: "og:title", content: "About Scope Connect" },
      { property: "og:description", content: "A trusted, curated opportunity network for India's campus builders." },
    ],
  }),
  component: AboutPage,
});

const SECTIONS = [
  {
    icon: Flag,
    title: "Our Mission",
    body: "Make every Indian campus a launchpad. Scope Connect gives student builders a single, trusted home for opportunities, portfolios, and recognition that actually moves careers forward.",
  },
  {
    icon: Sparkles,
    title: "Why Scope Exists",
    body: "Internships are gated. Hackathons are scattered. Talent gets buried. Scope is the curated layer that surfaces real opportunities and the builders who deserve them — without spam, gatekeeping, or fake listings.",
  },
  {
    icon: ShieldCheck,
    title: "How Projects Work",
    body: "Every public project is curated and verified by the Scope team. Students apply, get reviewed, and ship real work with stipends, mentorship, and recognition. Your private ideas can be pitched directly — and stay private.",
  },
  {
    icon: Users,
    title: "Leadership Opportunity",
    body: "Chapter leaders, founding designers, editors, ops leads — Scope opens roles that build real-world authority on your resume, not just badges.",
  },
  {
    icon: Rocket,
    title: "National Vision",
    body: "150+ campuses by 2026. A national publication. A founder track. A live opportunity board for every Indian student who wants to build. We're just getting started.",
  },
];

function AboutPage() {
  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-16 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><BadgeCheck className="mr-1 h-3 w-3" /> About Scope</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">India's curated campus innovation network.</h1>
          <p className="mt-4 text-lg text-primary-foreground/75">
            Not an open project board. A trusted opportunity layer where every challenge is real, verified, and worth your time.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Ownership / operator clarity */}
        <Card className="mb-10 border-cyan/30 bg-gradient-to-br from-cyan/5 to-transparent p-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><ShieldCheck className="mr-1 h-3 w-3" /> Operated by Scope Innovation Lab</Badge>
          <h2 className="mt-3 text-2xl font-bold text-foreground">Who runs Scope Connect?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Scope Connect is the digital operating system built and operated by <strong className="text-foreground">Scope Innovation Lab</strong> — an India-based team focused on giving student builders proof of work, leadership, and real opportunities. We curate every public challenge, vet every partner brief, and ship the platform itself. No anonymous moderators. No outsourced support.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-3 py-1">📍 Bengaluru, India</span>
            <span className="rounded-full bg-secondary px-3 py-1">✉️ scopemagazines@gmail.com</span>
            <span className="rounded-full bg-secondary px-3 py-1">🤝 partners@scope.in</span>
          </div>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Card key={s.title} className="p-6 hover-lift">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-brand">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>

        {/* Leadership intro placeholder */}
        <Card className="mt-10 p-8">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            <h3 className="text-lg font-semibold text-foreground">The team behind Scope</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            A small, India-based core team of operators, designers, and engineers — backed by chapter leaders across 50+ campuses. Full team page launching with our public funding announcement.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { role: "Founding Team", sub: "Product · Operations · Growth" },
              { role: "Chapter Network", sub: "50+ campus leaders across India" },
              { role: "Curation Council", sub: "Vets every public opportunity" },
            ].map((m) => (
              <div key={m.role} className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="text-sm font-semibold text-foreground">{m.role}</div>
                <div className="mt-1 text-xs text-muted-foreground">{m.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-10 border-brand/30 bg-gradient-to-br from-brand/5 to-cyan/5 p-8">
          <div className="flex items-start gap-4">
            <Lock className="mt-1 h-6 w-6 shrink-0 text-brand" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Trust, by design.</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every live challenge carries a <strong className="text-foreground">Scope Official</strong> badge. We don't allow public posting because we believe one verified opportunity is worth a hundred fake ones. Your ideas, when submitted privately, never appear publicly.
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-12 grid gap-4 text-center sm:grid-cols-2">
          <Card className="p-8">
            <h3 className="text-xl font-bold text-foreground">For students</h3>
            <p className="mt-2 text-sm text-muted-foreground">Free forever. Curated opportunities. Real proof of work.</p>
            <Button asChild size="lg" className="mt-5 bg-gradient-brand text-brand-foreground shadow-brand">
              <Link to="/auth">Join Scope <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </Card>
          <Card className="p-8">
            <h3 className="text-xl font-bold text-foreground">For institutions & sponsors</h3>
            <p className="mt-2 text-sm text-muted-foreground">Custom campus solutions, analytics, and curated talent pools.</p>
            <Button asChild size="lg" variant="outline" className="mt-5">
              <Link to="/contact">Talk to partnerships <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </Card>
        </div>
      </section>

      <TrustFAQ />
    </AppShell>
  );
}
