import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, Mail, AlertTriangle, ChevronDown, Search, X } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { backendPublic } from "@/lib/api/endpoints";
import { toast } from "sonner";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support - Scope Connect" },
      { name: "description", content: "FAQs, issue reporting, and direct contact with the Scope team." },
      { property: "og:title", content: "Scope Support" },
      { property: "og:description", content: "Find answers instantly." },
    ],
  }),
  component: SupportPage,
});

type FAQ = { q: string; a: string; cat: Category };
type Category =
  | "Getting Started"
  | "Projects & Applications"
  | "Campus Chapters"
  | "XP & Leaderboards"
  | "Portfolio"
  | "Account & Security"
  | "Support & Policies";

const CATEGORIES: Category[] = [
  "Getting Started",
  "Projects & Applications",
  "Campus Chapters",
  "XP & Leaderboards",
  "Portfolio",
  "Account & Security",
  "Support & Policies",
];

const FAQS: FAQ[] = [
  { cat: "Getting Started", q: "What is Scope Connect?", a: "Scope Connect is India's home for student builders - a single platform where you find real opportunities, ship real projects, build a verified portfolio, and grow alongside the most ambitious campuses in the country." },
  { cat: "Getting Started", q: "Who can join Scope Connect?", a: "Any student in an Indian college or university. Whether you're a designer, developer, marketer, researcher, founder or community lead - if you build, you belong." },
  { cat: "Getting Started", q: "Is Scope Connect free?", a: "Yes. Scope Connect is free for every student. We monetize through partner organizations and brand sponsorships, never by charging builders." },
  { cat: "Getting Started", q: "How do I sign up?", a: "Hit 'Sign up' on the homepage, pick your campus, choose your interests, and you're in. The whole flow takes under 60 seconds." },
  { cat: "Projects & Applications", q: "How do I apply to a project?", a: "Open any opportunity on /projects, hit 'Apply', and fill the short fit form. Most builders apply to their first project within 5 minutes of joining." },
  { cat: "Projects & Applications", q: "Are the projects on Scope real?", a: "Yes. Every Scope Challenge, Campus Project and Open Project is curated and posted by the Scope team or verified campus chapters. They come with real briefs, real timelines and real rewards." },
  { cat: "Projects & Applications", q: "Who creates the public projects on Scope?", a: "Every public challenge is curated and posted by the Scope team. Students and institutions cannot publicly post projects - this keeps quality high and listings trustworthy." },
  { cat: "Projects & Applications", q: "Why can't I post public projects?", a: "Public posting stays curated to keep the bar high. You can still submit your own idea privately - use 'Suggest an Idea' on /projects." },
  { cat: "Projects & Applications", q: "Can I submit my own idea?", a: "Yes. Use the 'Suggest an Idea' button on /projects or /dashboard. Your submission is private and reviewed by the Scope team." },
  { cat: "Projects & Applications", q: "How are applications reviewed?", a: "Scope reviews every application within 48 hours. You'll see status updates (Under Review, Shortlisted, Accepted, Waitlisted) directly on your dashboard." },
  { cat: "Projects & Applications", q: "How are opportunities selected?", a: "We curate based on quality, relevance, and impact. Every brief is vetted - no spam recruitment, no low-effort gigs. Just real shipping opportunities for student builders." },
  { cat: "Campus Chapters", q: "How do campus chapters work?", a: "Each campus has a Scope chapter. Joining unlocks campus-only projects, chapter events, and a path to becoming a chapter leader. You can switch chapters anytime from your profile." },
  { cat: "Campus Chapters", q: "How do I change my campus?", a: "Open your /profile, scroll to 'Campus', and pick the new one. Your XP and portfolio stay with you - only the chapter context changes." },
  { cat: "Campus Chapters", q: "What if my campus isn't on Scope yet?", a: "Pick the closest match for now and tell us via /support. New chapters launch every week - we'll get yours added within 7 days." },
  { cat: "Campus Chapters", q: "How do I become a chapter lead?", a: "Stay active, ship consistently, and the Scope team reaches out. Most leads emerge in their first 3 months on the platform." },
  { cat: "XP & Leaderboards", q: "How does XP work?", a: "Every meaningful action - applying to a project, posting an update, RSVP-ing to an event, completing your profile, maintaining a daily streak - earns XP. XP unlocks levels (Explorer -> Builder -> Innovator -> Leader -> Ambassador) and visibility across the platform." },
  { cat: "XP & Leaderboards", q: "How do I level up?", a: "Stack consistent actions. Most builders reach Builder tier within their first month and Innovator by month three. Your level appears on your profile, in the feed, and on every leaderboard." },
  { cat: "XP & Leaderboards", q: "Why didn't my XP update?", a: "XP appears instantly on the dashboard. If your number looks stale, hard-refresh once - Scope auto-repairs any out-of-sync slice on boot." },
  { cat: "XP & Leaderboards", q: "How are leaderboards ranked?", a: "Three boards run in parallel: national builders by XP, top chapters by active members, and campuses by total points. All update in real time." },
  { cat: "Portfolio", q: "Can I build a portfolio on Scope?", a: "Absolutely. Your portfolio is one of the most powerful trust signals on the platform. Add projects, designs, research, startup ideas, campaigns or certificates - public to recruiters and collaborators." },
  { cat: "Portfolio", q: "Can I add Behance or GitHub links?", a: "Yes - every portfolio item supports an external link. Behance, GitHub, Dribbble, Notion, YouTube, personal sites - they all work." },
  { cat: "Portfolio", q: "Who can see my portfolio?", a: "Your portfolio is public to other Scope builders, recruiters, and chapter leads. Private idea submissions stay private to the Scope team." },
  { cat: "Account & Security", q: "Is my data safe?", a: "All your activity, profile data, and submissions are stored securely. We never sell your data, and your private submissions stay private to the Scope team." },
  { cat: "Account & Security", q: "How do I delete my account?", a: "Email privacy@scope.in with your registered email. We process deletions within 7 days and send a confirmation when complete." },
  { cat: "Account & Security", q: "Can I have multiple accounts?", a: "One account per builder, please. Multiple accounts dilute your XP, portfolio, and chapter standing." },
  { cat: "Support & Policies", q: "How do I contact the Scope team?", a: "Use the contact form below - we reply to every message within 24 hours. For urgent issues, email hello@scope.in. Partnerships: partners@scope.in. Privacy requests: privacy@scope.in." },
  { cat: "Support & Policies", q: "What's the community code of conduct?", a: "Be useful, ship honestly, lift others. Full guidelines live at /community-guidelines." },
];

const RECENT_KEY = "scope_faq_recent_v1";
const LAST_CAT_KEY = "scope_faq_last_cat_v1";

function SupportPage() {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<Category>(CATEGORIES[0]);
  const [recent, setRecent] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [issue, setIssue] = useState("");
  const [sendingContact, setSendingContact] = useState(false);
  const [sendingIssue, setSendingIssue] = useState(false);

  useEffect(() => {
    try {
      const last = sessionStorage.getItem(LAST_CAT_KEY) as Category | null;
      if (last && CATEGORIES.includes(last)) setActiveCat(last);
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      if (Array.isArray(stored)) setRecent(stored.slice(0, 5));
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_CAT_KEY, activeCat);
    } catch {
      // noop
    }
  }, [activeCat]);

  const trimmed = query.trim().toLowerCase();
  const isSearching = trimmed.length > 0;

  const matches = useMemo(() => {
    if (!isSearching) return [] as FAQ[];
    return FAQS.filter((faq) => faq.q.toLowerCase().includes(trimmed) || faq.a.toLowerCase().includes(trimmed));
  }, [trimmed, isSearching]);

  useEffect(() => {
    if (isSearching && matches.length > 0) setOpenKey(matches[0].q);
  }, [isSearching, matches]);

  const grouped = useMemo(() => {
    const map: Record<Category, FAQ[]> = {} as Record<Category, FAQ[]>;
    CATEGORIES.forEach((category) => (map[category] = []));
    FAQS.forEach((faq) => map[faq.cat].push(faq));
    return map;
  }, []);

  const persistRecent = (term: string) => {
    if (!term.trim()) return;
    try {
      const next = [term.trim(), ...recent.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      setRecent(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // noop
    }
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && trimmed) persistRecent(query);
  };

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || !message.trim()) {
      toast.error("Add a valid email and a message.");
      return;
    }

    setSendingContact(true);
    try {
      await backendPublic.submitContact({
        source: "support_page",
        name: name.trim() || undefined,
        email,
        message: message.trim(),
      });
      toast.success("Got it. The Scope team replies within 24 hours.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send your message.";
      toast.error(message);
    } finally {
      setSendingContact(false);
    }
  };

  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) {
      toast.error("Tell us what went wrong.");
      return;
    }

    setSendingIssue(true);
    try {
      await backendPublic.submitSupportIssue({
        source: "support_page",
        message: issue.trim(),
      });
      toast.success("Issue logged. Thanks for helping us improve.");
      setIssue("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not log the issue.";
      toast.error(message);
    } finally {
      setSendingIssue(false);
    }
  };

  const visibleFaqs = isSearching ? matches : grouped[activeCat];

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><LifeBuoy className="mr-1 h-3 w-3" /> Support</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Find answers instantly.</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">Search the FAQ, browse by category, or message the team - pick whichever's fastest.</p>

          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Search FAQs - e.g. 'how do I apply' or 'XP'"
              className="bg-background pl-9 pr-9 text-foreground"
              aria-label="Search FAQs"
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

          {!isSearching && recent.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-primary-foreground/70">
              <span>Recent:</span>
              {recent.map((item) => (
                <button
                  key={item}
                  onClick={() => setQuery(item)}
                  className="rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-2.5 py-0.5 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {!isSearching && (
          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const count = grouped[category].length;
              const active = activeCat === category;
              return (
                <button
                  key={category}
                  onClick={() => { setActiveCat(category); setOpenKey(null); }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-background text-foreground hover:border-brand/40"
                  }`}
                >
                  {category} <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        <h2 className="text-xl font-bold text-foreground">
          {isSearching ? `${matches.length} result${matches.length === 1 ? "" : "s"} for "${query}"` : activeCat}
        </h2>

        {visibleFaqs.length === 0 ? (
          <Card className="mt-4 p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-semibold text-foreground">No matches</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try different keywords, or jump to a category below.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {CATEGORIES.slice(0, 4).map((category) => (
                <Button key={category} size="sm" variant="outline" onClick={() => { setQuery(""); setActiveCat(category); }}>
                  {category}
                </Button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Still stuck? Use the contact form below.</p>
          </Card>
        ) : (
          <div className="mt-4 space-y-2">
            {visibleFaqs.map((faq) => {
              const open = openKey === faq.q;
              return (
                <Card key={faq.q} className="overflow-hidden">
                  <button
                    onClick={() => setOpenKey(open ? null : faq.q)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                      {isSearching && (
                        <Badge variant="outline" className="ml-2 text-[10px]">{faq.cat}</Badge>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">{faq.a}</div>}
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-brand" />
              <h3 className="text-lg font-semibold text-foreground">Report an issue</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Bug, broken link, or anything off? Tell us.</p>
            <form onSubmit={submitIssue} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="issue">What happened?</Label>
                <Textarea id="issue" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe the issue..." rows={4} className="mt-1.5" />
              </div>
              <Button type="submit" disabled={sendingIssue} className="bg-gradient-brand text-brand-foreground">Send report</Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-brand" />
              <h3 className="text-lg font-semibold text-foreground">Contact the team</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Direct line to the humans behind Scope.</p>
            <form onSubmit={submitContact} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="cname">Your name</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cemail">Email</Label>
                <Input id="cemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cmsg">Message</Label>
                <Textarea id="cmsg" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-1.5" />
              </div>
              <Button type="submit" disabled={sendingContact} className="bg-gradient-brand text-brand-foreground">Send message</Button>
            </form>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
