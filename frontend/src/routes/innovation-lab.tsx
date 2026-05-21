import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Users, ShieldCheck, Rocket, ArrowRight, FlaskConical, GitBranch } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FAQSection, type FAQItem } from "@/components/site/FAQSection";

export const Route = createFileRoute("/innovation-lab")({
  head: () => ({
    meta: [
      { title: "Scope Innovation Lab — Campus Ecosystem for Student Builders" },
      { name: "description", content: "Scope Innovation Lab runs the chapter network, project ecosystem, and challenge layer that powers Scope Connect across Indian campuses." },
      { property: "og:title", content: "Scope Innovation Lab" },
      { property: "og:description", content: "Chapters, challenges, projects, and proof-of-work — the campus innovation engine behind Scope Connect." },
    ],
    links: [{ rel: "canonical", href: "/innovation-lab" }],
  }),
  component: InnovationLabPage,
});

const PILLARS = [
  { icon: Users, title: "Chapter model", body: "A verified leadership team on every campus running events, projects, and member onboarding with Scope governance." },
  { icon: Rocket, title: "Project ecosystem", body: "Multi-week team builds with moderation, daily reporting, and proof-based completion — no fake certificates." },
  { icon: Sparkles, title: "Challenge ecosystem", body: "Short, scoped, curated tasks across coding, design, content, and video. Every challenge is reviewed before publishing." },
  { icon: GitBranch, title: "Collaboration model", body: "Cross-campus teams, mentor reviews, and viva rounds keep work honest and skill growth visible." },
  { icon: ShieldCheck, title: "Proof of work", body: "Commits, design files, drafts, deploys, and recorded vivas — your portfolio is the receipt, not the certificate." },
];

const FAQ: FAQItem[] = [
  { q: "Is Scope Innovation Lab the same as Scope Connect?", a: "Scope Connect is the digital platform. Scope Innovation Lab is the team and chapter network that operates it." },
  { q: "How do I start a chapter on my campus?", a: "Apply via /contact or the chapter launch form. We verify your institution, assign a coordinator, and onboard your founding team." },
  { q: "Who owns the work students produce?", a: "Students own their work. Scope holds a limited license to display approved work on profiles, leaderboards, and chapter pages." },
];

function InnovationLabPage() {
  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-16 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><FlaskConical className="mr-1 h-3 w-3" /> Scope Innovation Lab</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">The campus innovation engine behind Scope Connect.</h1>
          <p className="mt-4 text-lg text-primary-foreground/75">Chapters, challenges, projects, and proof of work — built on accountability, not hype.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand">
              <Link to="/auth">Join the network <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
              <Link to="/contact">Launch a chapter</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Card key={p.title} className="p-6 hover-lift">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-brand">
                <p.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <FAQSection title="About the Lab" items={FAQ} />
    </AppShell>
  );
}
