import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">Legal · Last updated {updated}</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="prose prose-sm max-w-none">{children}</div>
        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm">
          <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
          <Link to="/community-guidelines" className="text-muted-foreground hover:text-foreground">Community Guidelines</Link>
          <Link to="/support" className="text-muted-foreground hover:text-foreground">Support</Link>
        </div>
      </section>
    </>
  );
}
