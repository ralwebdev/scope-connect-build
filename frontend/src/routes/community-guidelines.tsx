import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { LegalShell } from "@/components/site/LegalShell";

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({
    meta: [
      { title: "Scope Connect | Community Guidelines" },
      { name: "description", content: "How we keep the Scope Connect community trustworthy and welcoming." },
    ],
  }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  return (
    <AppShell>
      <LegalShell title="Community Guidelines" updated="April 2026">
        <Section heading="Respectful Conduct">
          Treat every builder like a teammate. Constructive criticism is
          encouraged. Personal attacks, slurs, or harassment are not.
        </Section>
        <Section heading="No Spam">
          Don't flood the feed, copy-paste promotional content, or use bots.
          Scope's value depends on signal-over-noise.
        </Section>
        <Section heading="No Impersonation">
          Use your real name, real campus, and real work. Misrepresenting
          identity, achievements, or affiliations is grounds for permanent
          removal.
        </Section>
        <Section heading="Reporting Misuse">
          See something off? <Link to="/support" className="font-semibold text-brand hover:underline">Report it</Link>.
          The Scope team reviews every report within 24 hours.
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
