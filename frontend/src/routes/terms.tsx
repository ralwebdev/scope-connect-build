import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { LegalShell } from "@/components/site/LegalShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Scope Connect" },
      { name: "description", content: "The rules that govern use of Scope Connect." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell>
      <LegalShell title="Terms of Use" updated="April 2026">
        <Section heading="1. Eligibility">
          Scope Connect is open to verified students, alumni, faculty, and
          collaborators of Indian campuses (and select global partners). You must
          be 16 years or older to create an account. Institutions may verify
          membership at any time.
        </Section>
        <Section heading="2. Acceptable Use">
          Use Scope Connect to build, learn, collaborate, and apply to genuine
          opportunities. Do not scrape, spam, harass, impersonate, or distribute
          unsolicited promotional material. Bots, multi-accounting, and inflated
          activity break the platform for everyone.
        </Section>
        <Section heading="3. Account Behavior">
          You are responsible for activity on your account. Keep credentials
          private. Notify us if you suspect unauthorized use. We may suspend
          accounts that violate these terms or community guidelines.
        </Section>
        <Section heading="4. Content Ownership">
          You retain ownership of content you publish — posts, portfolio items,
          submissions. You grant Scope a non-exclusive license to display this
          content within the platform and in promotional materials that credit
          you. Private idea submissions remain confidential.
        </Section>
        <Section heading="5. Platform Rights">
          Scope curates all public opportunities. We reserve the right to edit,
          remove, archive, or feature content as needed to maintain quality.
          Scope Connect, its branding, copy, and design are owned and operated
          by Scope Innovation Lab.
        </Section>
        <Section heading="6. Changes">
          We may update these terms. Material changes will be announced via
          in-product notification at least 7 days in advance.
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
