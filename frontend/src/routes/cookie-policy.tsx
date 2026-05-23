import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { LegalShell } from "@/components/site/LegalShell";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Scope Connect" },
      { name: "description", content: "How Scope Connect uses cookies and local storage, and how you can control them." },
      { property: "og:title", content: "Cookie Policy — Scope Connect" },
      { property: "og:description", content: "Cookie categories, analytics usage, preference controls, and opt-out options." },
    ],
    links: [{ rel: "canonical", href: "/cookie-policy" }],
  }),
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  return (
    <AppShell>
      <LegalShell title="Cookie Policy" updated="May 2026">
        <Section heading="Summary">
          Scope Connect uses a minimal set of cookies and browser localStorage to keep you signed in, remember preferences, and measure aggregate, anonymous platform usage. We do not run third-party advertising trackers.
        </Section>
        <Section heading="Categories of cookies">
          <strong>Essential</strong> — session, authentication, CSRF protection. Cannot be disabled without breaking the platform.<br />
          <strong>Preference</strong> — language, sidebar collapse state, and similar interface choices.<br />
          <strong>Analytics</strong> — anonymous, aggregated route visits and feature usage so we can prioritize fixes. No PII.<br />
        </Section>
        <Section heading="Analytics usage">
          We record route visits, soft-launch events, and rage-click clusters to find broken UX. Your name, email, and content are never sent to analytics.
        </Section>
        <Section heading="Preference controls">
          Preferences live in your browser. Clear them any time from Settings → Reset local data, or from your browser's site-data tools.
        </Section>
        <Section heading="Opt-out">
          To opt out of analytics, enable your browser's Do Not Track signal or use private browsing. For deletion requests email privacy@scope.in.
        </Section>
      </LegalShell>
    </AppShell>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
