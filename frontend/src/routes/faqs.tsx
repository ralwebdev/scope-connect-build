import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/badge";
import { FAQSection, type FAQItem } from "@/components/site/FAQSection";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "FAQs — Scope Connect" },
      { name: "description", content: "Answers for students, institutions, and recruiters about projects, challenges, opportunities, and verification on Scope Connect." },
      { property: "og:title", content: "Scope Connect FAQs" },
      { property: "og:description", content: "Trust, verification, projects, challenges, and opportunities — answered." },
    ],
    links: [{ rel: "canonical", href: "/faqs" }],
  }),
  component: FAQsPage,
});

const STUDENT: FAQItem[] = [
  { q: "Is Scope Connect free for students?", a: "Yes. Profiles, applications, daily reporting, and portfolios are free forever for verified student builders." },
  { q: "How do I get verified?", a: "Sign up with your campus email or get added by your institution admin or chapter leader. Verified students get a Scope-checked badge on their profile." },
  { q: "What counts as proof of work?", a: "Daily updates with links to commits, Figma files, drafts, deploys, or videos — uploaded inside your active project or internship." },
];
const INSTITUTION: FAQItem[] = [
  { q: "How does an institution join?", a: "Reach out via /contact or your assigned Scope partner. We set up an institution admin account, a chapter, and onboarding for faculty coordinators." },
  { q: "Who moderates content posted by our students?", a: "Every public challenge and project passes through draft → review → approved → published. Faculty coordinators and Scope admins moderate." },
  { q: "Can we get analytics on our chapter?", a: "Yes. Institution admins see member growth, project completion, trust scores, and engagement on the institution-admin dashboard." },
];
const RECRUITER: FAQItem[] = [
  { q: "How do I find verified builders?", a: "Recruiter access surfaces students by domain, trust score, and proof-of-work portfolio. Contact partnerships to request access." },
  { q: "Are profiles real?", a: "Every public profile is institution-verified and tied to live daily reports. We actively remove fake or AI-generated portfolios." },
];
const PROJECTS: FAQItem[] = [
  { q: "What is the difference between a challenge, project, and opportunity?", a: "Challenges are short, scoped tasks. Projects are multi-week builds with teams. Opportunities are internships, ambassador roles, and paid gigs." },
  { q: "What happens if I miss daily reports?", a: "A penalty ladder applies: warning → trust deduction → mentor review → automatic removal review. Recovery requests can be filed via the reporting portal." },
];
const OPPORTUNITIES: FAQItem[] = [
  { q: "Are opportunities curated?", a: "Yes. Every listed opportunity is reviewed by the Scope curation council before going live." },
  { q: "Can I post my own opportunity?", a: "Institutions and verified partners can submit drafts that go through moderation before being published." },
];

function FAQsPage() {
  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">Help center</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Frequently asked questions</h1>
          <p className="mt-3 text-primary-foreground/75">Trust, verification, projects, challenges, and opportunities — answered.</p>
        </div>
      </section>
      <FAQSection title="For students" items={STUDENT} />
      <FAQSection title="For institutions" items={INSTITUTION} jsonLd={false} />
      <FAQSection title="For recruiters" items={RECRUITER} jsonLd={false} />
      <FAQSection title="Projects & challenges" items={PROJECTS} jsonLd={false} />
      <FAQSection title="Opportunities" items={OPPORTUNITIES} jsonLd={false} />
    </AppShell>
  );
}
