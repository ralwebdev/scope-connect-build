import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShieldCheck, Trophy, Sparkles, ExternalLink, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth, portfolio, xp as xpStore, type PortfolioItem, type ScopeUser } from "@/lib/scope-store";

type PublicProfileData = {
  name: string;
  campus: string;
  bio: string;
  skills: string[];
  interests: string[];
  avatarColor: string;
  links: ScopeUser["links"];
  level: string;
  points: number;
  items: PortfolioItem[];
  portfolioCount: number;
};

export const Route = createFileRoute("/u/$handle")({
  head: ({ loaderData }) => {
    const u = loaderData as PublicProfileData | null | undefined;
    const title = u ? `${u.name} — Scope Builder` : "Builder — Scope Connect";
    const desc = u
      ? `${u.campus} · ${u.level} · ${u.points.toLocaleString()} Scope Points · ${u.portfolioCount} portfolio items`
      : "Public builder profile on Scope Connect.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  loader: ({ params }): PublicProfileData | null => {
    if (typeof window === "undefined") return null;
    const u = auth.getUser();
    if (!u) throw notFound();
    const handle = u.email.split("@")[0].toLowerCase();
    if (params.handle.toLowerCase() !== handle && params.handle.toLowerCase() !== u.id.toLowerCase()) {
      throw notFound();
    }
    return {
      name: u.name,
      campus: u.campus,
      bio: u.bio,
      skills: u.skills,
      interests: u.interests,
      avatarColor: u.avatarColor,
      links: u.links,
      level: xpStore.level().name,
      points: xpStore.get(),
      items: portfolio.forUser(u.id),
      portfolioCount: portfolio.forUser(u.id).length,
    };
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-foreground">Builder not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This profile is private or does not exist on this device.</p>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </div>
    </AppShell>
  ),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const u = Route.useLoaderData() as PublicProfileData | null;
  if (!u) return null;

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold text-brand-foreground shadow-brand" style={{ background: u.avatarColor }}>
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{u.name}</h1>
              <Badge className="bg-cyan/15 text-cyan"><ShieldCheck className="mr-1 h-3 w-3" /> Verified Builder</Badge>
            </div>
            <p className="mt-1 text-primary-foreground/70">{u.campus} · {u.level}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-cyan" /> {u.points.toLocaleString()} XP</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-cyan" /> {u.portfolioCount} portfolio items</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {u.bio && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{u.bio}</p>
          </Card>
        )}

        {u.skills.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-foreground">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {u.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          </Card>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-bold text-foreground">Portfolio</h2>
          {u.items.length === 0 ? (
            <Card className="mt-3 p-8 text-center text-sm text-muted-foreground">No public portfolio items yet.</Card>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {u.items.map((it) => (
                <Card key={it.id} className="overflow-hidden hover-lift">
                  <div className="flex h-24 items-center justify-center bg-gradient-hero text-3xl">{it.cover}</div>
                  <div className="p-4">
                    <Badge variant="outline" className="text-xs">{it.type}</Badge>
                    <h3 className="mt-2 text-sm font-semibold text-foreground">{it.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.description}</p>
                    {it.link && (
                      <a href={it.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card className="mt-8 bg-gradient-to-br from-brand/5 to-cyan/5 p-6 text-center">
          <h3 className="text-lg font-semibold text-foreground">Build your own profile on Scope Connect</h3>
          <p className="mt-1 text-sm text-muted-foreground">Join 12,000+ verified campus builders.</p>
          <Button asChild className="mt-4 bg-gradient-brand text-brand-foreground"><Link to="/auth">Join Scope <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </Card>
      </section>
    </AppShell>
  );
}
