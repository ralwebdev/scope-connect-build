import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Check, MessageSquare, Sparkles, Upload, Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { useStoreValue, useUser } from "@/hooks/use-scope";
import { auth, opportunities, portfolio, subscribe, type Opportunity } from "@/lib/scope-store";
import { backendOpportunityApplications, backendUpload, backendOpportunities, type BackendOpportunityApplication } from "@/lib/api/endpoints";
import { calculateOpportunityMatch } from "@/lib/skill-matching";
import { toast } from "sonner";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities - Scope Connect" },
      { name: "description", content: "Find collaborations, co-founders, internships and gigs across India's campus network." },
    ],
  }),
  component: () => <AuthGate><OpportunitiesPage /></AuthGate>,
});

function OpportunitiesPage() {
  const user = useUser();
  const all = useStoreValue(() => opportunities.all());
  const saved = useStoreValue(() => opportunities.saved());
  const portfolioItems = useStoreValue(() => (user ? portfolio.forUser(user.id) : []));
  const [applications, setApplications] = useState<BackendOpportunityApplication[]>([]);
  const [selected, setSelected] = useState<Opportunity | null>(null);

  useEffect(() => {
    void opportunities.syncFromBackend();
    void portfolio.syncFromBackend();
    void backendOpportunityApplications.list()
      .then(({ items }) => setApplications(items))
      .catch(() => setApplications([]));
  }, []);

  const appliedMap = useMemo(
    () => new Map(applications.map((application) => [application.opportunity_id, application])),
    [applications],
  );
  const currentXp = user?.stats?.xp ?? 0;
  
  const handleUnlock = async (id: string) => {
    try {
      await backendOpportunities.unlock(id);
      toast.success("Opportunity unlocked!");
      await opportunities.syncFromBackend();
      await auth.refreshCurrentUser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlock.");
    }
  };

  const isVerified = user?.opportunitiesVerified || user?.role === "super_admin" || user?.role === "scope_admin";

  if (!isVerified) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-brand shadow-lg shadow-brand/10">
            <Lock className="h-10 w-10" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Gated Opportunities</h1>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            This high-value board is restricted to verified builders. 
            Send your portfolio links for review in your profile to unlock exclusive gigs, internships, and startup roles.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="bg-gradient-brand text-brand-foreground shadow-elegant" asChild>
              <Link to="/profile">
                <ShieldCheck className="mr-2 h-5 w-5" /> Get Verified
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/projects">
                Browse Public Challenges <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Sparkles className="mr-1 h-3 w-3" /> Curated for you</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Opportunities</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">Apply with proof of work. Scope Admin can now review every applicant by institute and portfolio quality.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((opportunity) => {
            const isSaved = saved.includes(opportunity.id);
            const application = appliedMap.get(opportunity.id);
            const match = calculateOpportunityMatch(opportunity, user, portfolioItems);
            const minXpRequired = opportunity.minXpRequired ?? 0;
            const isLocked = minXpRequired > currentXp;
            const xpShortfall = Math.max(0, minXpRequired - currentXp);

            return (
              <Card key={opportunity.id} className="flex flex-col p-5 hover-lift animate-fade-in">
                <div className="flex items-center justify-between">
                  <Badge className="bg-gradient-brand text-brand-foreground">{match.score}% match</Badge>
                  <Badge variant="outline">{opportunity.category}</Badge>
                </div>
                {minXpRequired > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={isLocked ? "secondary" : "outline"}>{minXpRequired} XP unlock</Badge>
                    {isLocked && <span className="text-xs text-muted-foreground">{xpShortfall} XP to go</span>}
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold text-foreground">{opportunity.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{opportunity.description}</p>
                {!!opportunity.requiredSkills.length && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {opportunity.requiredSkills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground">by <b className="text-foreground">{opportunity.by}</b> · {opportunity.company}</div>
                {match.missingSkills.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add {match.missingSkills.slice(0, 2).join(", ")} to your profile or portfolio to improve this match.
                  </p>
                )}
                {isLocked && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Build more XP before this opportunity unlocks for you.
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  {isLocked ? (
                    <Button
                      onClick={() => handleUnlock(opportunity.id)}
                      disabled={currentXp < minXpRequired}
                      size="sm"
                      className="flex-1 bg-brand text-brand-foreground shadow-lg shadow-brand/20"
                    >
                      Unlock for {minXpRequired} XP
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setSelected(opportunity)}
                      disabled={Boolean(application)}
                      size="sm"
                      className={`flex-1 ${application ? "bg-success text-primary-foreground" : "bg-gradient-brand text-brand-foreground"}`}
                    >
                      {application ? (<><Check className="mr-1.5 h-4 w-4" /> {application.status}</>) : "Apply now"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { opportunities.toggleSave(opportunity.id); toast(isSaved ? "Removed from saved" : "Saved for later"); }}>
                    {isSaved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <ApplyOpportunityDialog
        opportunity={selected}
        user={user}
        onClose={() => setSelected(null)}
        onApplied={(application) => setApplications((current) => [application, ...current])}
      />
    </AppShell>
  );
}

function ApplyOpportunityDialog({
  opportunity,
  user,
  onClose,
  onApplied,
}: {
  opportunity: Opportunity | null;
  user: ReturnType<typeof useUser>;
  onClose: () => void;
  onApplied: (application: BackendOpportunityApplication) => void;
}) {
  const [fitNote, setFitNote] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [dribbbleUrl, setDribbbleUrl] = useState("");
  const [otherUrl, setOtherUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!opportunity || !user) return;
    setFitNote("");
    setPortfolioUrl(user.portfolioWebsite || user.links.portfolio_website || "");
    setGithubUrl(user.links.github || user.links.github_url || "");
    setDribbbleUrl(user.portfolioLinks?.dribbble || user.portfolioLinks?.behance || "");
    setOtherUrl(user.linkedinUrl || "");
    setResumeUrl(user.resumeUrl || user.links.resume_url || user.portfolioPdfUrl || user.links.portfolio_pdf_url || "");
    setResumeFile(null);
  }, [opportunity, user]);

  const profileType = opportunity?.category === "Engineering"
    ? "developer"
    : opportunity?.category === "Design"
      ? "designer"
      : "general";

  const submit = async () => {
    if (!opportunity) return;
    setSubmitting(true);
    try {
      let uploadedResumeUrl = resumeUrl.trim();
      let uploadedResumeFileId: string | null = null;
      if (resumeFile) {
        setUploading(true);
        const { file } = await backendUpload.upload(resumeFile, "resume");
        uploadedResumeFileId = file.id;
        uploadedResumeUrl = file.url;
        setUploading(false);
      }

      if (profileType === "developer" && !githubUrl.trim()) {
        toast.error("GitHub is required for engineering roles.");
        setSubmitting(false);
        return;
      }
      if (profileType === "designer" && !portfolioUrl.trim() && !dribbbleUrl.trim() && !otherUrl.trim()) {
        toast.error("Add a portfolio, Dribbble, Behance, Figma, or another design link.");
        setSubmitting(false);
        return;
      }
      if (profileType === "general" && !uploadedResumeUrl && !uploadedResumeFileId) {
        toast.error("Upload your CV or add a resume link.");
        setSubmitting(false);
        return;
      }

      const response = await backendOpportunityApplications.apply(opportunity.id, {
        fit_note: fitNote.trim(),
        portfolio_url: portfolioUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        dribbble_url: dribbbleUrl.trim() || null,
        other_url: otherUrl.trim() || null,
        resume_file_id: uploadedResumeFileId,
        resume_url: uploadedResumeUrl || null,
      });
      await auth.refreshCurrentUser().catch(() => null);
      onApplied(response.application);
      toast.success("Application submitted.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit application.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(opportunity)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply to {opportunity?.title}</DialogTitle>
          <DialogDescription>
            {profileType === "developer" && "Engineering roles require a GitHub profile or repository proof."}
            {profileType === "designer" && "Design roles require a portfolio link like Dribbble, Behance, Figma, or your website."}
            {profileType === "general" && "General roles require a CV upload or resume link for fast shortlisting."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Why are you a fit?</Label>
            <Textarea value={fitNote} onChange={(e) => setFitNote(e.target.value)} rows={4} className="mt-1.5" placeholder="Share relevant skills, past work, and availability." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Portfolio link</Label>
              <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="mt-1.5" placeholder="https://your-portfolio.com" />
            </div>
            <div>
              <Label>Other proof link</Label>
              <Input value={otherUrl} onChange={(e) => setOtherUrl(e.target.value)} className="mt-1.5" placeholder="LinkedIn, Figma, Notion, case study, etc." />
            </div>
          </div>

          {profileType === "developer" && (
            <div>
              <Label>GitHub URL</Label>
              <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="mt-1.5" placeholder="https://github.com/you" />
            </div>
          )}

          {profileType === "designer" && (
            <div>
              <Label>Dribbble / Behance / Figma link</Label>
              <Input value={dribbbleUrl} onChange={(e) => setDribbbleUrl(e.target.value)} className="mt-1.5" placeholder="https://dribbble.com/you" />
            </div>
          )}

          {profileType === "general" && (
            <div className="space-y-3 rounded-lg border border-border/60 p-4">
              <div>
                <Label>Resume URL</Label>
                <Input value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} className="mt-1.5" placeholder="https://drive.google.com/your-cv.pdf" />
              </div>
              <div>
                <Label>Or upload CV (PDF)</Label>
                <Input type="file" accept="application/pdf" className="mt-1.5" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
                <p className="mt-1 text-xs text-muted-foreground">Upload a PDF CV if you do not want to rely on a profile resume link.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || uploading} className="bg-gradient-brand text-brand-foreground">
            {uploading ? <><Upload className="mr-2 h-4 w-4" /> Uploading CV...</> : submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
