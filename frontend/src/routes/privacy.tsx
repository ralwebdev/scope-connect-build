import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { LegalShell } from "@/components/site/LegalShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Scope Connect" },
      { name: "description", content: "How Scope Connect handles your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell>
      <LegalShell title="Privacy Policy" updated="April 2026">
        <Section heading="Data we collect">
          Name, email, campus, interests, profile content, portfolio items,
          applications, and activity (XP, posts, RSVPs). For this MVP, all data
          is stored locally in your browser — nothing is uploaded to a server.
        </Section>
        <Section heading="Why we use it">
          To personalize opportunities, calculate XP and rank, and surface
          relevant chapters and events. Aggregate, anonymized data may inform
          product decisions (never sold to third parties).
        </Section>
        <Section heading="Storage">
          Local: browser localStorage and sessionStorage. No third-party
          analytics or tracking pixels are loaded on this preview build. When
          Scope Cloud goes live, data will move to encrypted, India-hosted
          infrastructure with regional compliance.
        </Section>
        <Section heading="Your rights">
          You can export your profile JSON from Settings, reset all local data
          at any time, or contact us at privacy@scope.in for any data request.
          We respond within 7 days.
        </Section>
        <Section heading="Children">
          Scope is not intended for users under 16. If we discover an underage
          account, it will be deleted.
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
