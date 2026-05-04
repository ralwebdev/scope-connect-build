// Reusable Trust FAQ block — searchable accordion answering common trust
// concerns (curation, moderation, data, rewards, participation).
// Mounted on /about and /projects per launch readiness brief.
import { useMemo, useState } from "react";
import { Search, ChevronDown, ShieldCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Category =
  | "Curation Integrity"
  | "Moderation Rules"
  | "Data Safety"
  | "Rewards & Opportunities"
  | "Participation Rules";

type FAQ = { q: string; a: string; cat: Category };

const FAQS: FAQ[] = [
  {
    cat: "Curation Integrity",
    q: "Who can post projects on Scope Connect?",
    a: "Only Scope-approved and curated projects are published publicly. Third-party users cannot post public listings.",
  },
  {
    cat: "Curation Integrity",
    q: "Can students submit ideas privately?",
    a: "Yes. Members can privately suggest project ideas for future review and possible activation. Private submissions stay private to the Scope team.",
  },
  {
    cat: "Curation Integrity",
    q: "How are projects verified?",
    a: "Projects are reviewed for relevance, feasibility, student value, and platform integrity before going live. Each carries a Scope Verified badge.",
  },
  {
    cat: "Moderation Rules",
    q: "How does moderation work?",
    a: "Spam, abuse, impersonation, and misleading behavior may be restricted or removed under platform rules. Repeated violations lead to account action.",
  },
  {
    cat: "Data Safety",
    q: "Is my data safe?",
    a: "Scope Connect uses minimal required user data and does not publicly expose private information without consent. We never sell user data.",
  },
  {
    cat: "Rewards & Opportunities",
    q: "Do all projects pay money?",
    a: "No. Most rewards are growth-based — recognition, certificates, workshops, mentor access, and priority for future opportunities. Only a small number of premium projects offer a stipend or honorarium.",
  },
  {
    cat: "Rewards & Opportunities",
    q: "What does 'Honorarium Opportunity' mean?",
    a: "A small subset (1–2%) of premium curated projects include a token honorarium or stipend. They are clearly tagged. Everything else is structured around long-term growth rewards.",
  },
  {
    cat: "Participation Rules",
    q: "Who can apply to opportunities?",
    a: "Any verified student builder. Some campus-exclusive projects are limited to a specific institution; the project card states this clearly.",
  },
];

const CATEGORIES: Category[] = [
  "Curation Integrity",
  "Moderation Rules",
  "Data Safety",
  "Rewards & Opportunities",
  "Participation Rules",
];

export function TrustFAQ({
  heading = "Built on trust, clarity, and fairness.",
  subheading = "Answers to the questions builders, campuses, and partners ask most.",
  defaultCategory,
}: {
  heading?: string;
  subheading?: string;
  defaultCategory?: Category;
}) {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<Category>(defaultCategory ?? CATEGORIES[0]);

  const trimmed = query.trim().toLowerCase();
  const isSearching = trimmed.length > 0;

  const matches = useMemo(() => {
    if (!isSearching) return [] as FAQ[];
    return FAQS.filter(
      (f) => f.q.toLowerCase().includes(trimmed) || f.a.toLowerCase().includes(trimmed),
    );
  }, [trimmed, isSearching]);

  const grouped = useMemo(() => {
    const m: Record<Category, FAQ[]> = {} as Record<Category, FAQ[]>;
    CATEGORIES.forEach((c) => (m[c] = []));
    FAQS.forEach((f) => m[f.cat].push(f));
    return m;
  }, []);

  const visible = isSearching ? matches : grouped[activeCat];

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">
          <ShieldCheck className="mr-1 h-3 w-3" /> Trust FAQ
        </Badge>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search trust questions — e.g. 'rewards', 'data', 'moderation'"
          className="bg-background pl-9 pr-9"
          aria-label="Search trust FAQ"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isSearching && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => {
            const active = activeCat === c;
            return (
              <button
                key={c}
                onClick={() => { setActiveCat(c); setOpenKey(null); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-background text-foreground hover:border-brand/40"
                }`}
              >
                {c} <span className="ml-1 opacity-70">{grouped[c].length}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 space-y-2">
        {visible.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No matches. Try a different keyword, or contact support.
          </Card>
        ) : (
          visible.map((f) => {
            const open = openKey === f.q;
            return (
              <Card key={f.q} className="overflow-hidden">
                <button
                  onClick={() => setOpenKey(open ? null : f.q)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground">{f.q}</span>
                    {isSearching && (
                      <Badge variant="outline" className="ml-2 text-[10px]">{f.cat}</Badge>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">{f.a}</div>}
              </Card>
            );
          })
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Still have questions? <a href="/support" className="font-semibold text-brand hover:underline">Contact support</a>.
      </p>
    </section>
  );
}
