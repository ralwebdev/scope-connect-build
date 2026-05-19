import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Link2Off, ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/broken-link")({
  head: () => ({
    meta: [
      { title: "Broken Link Detected — Scope Connect" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : "",
  }),
  component: BrokenLinkPage,
});

function BrokenLinkPage() {
  const { url } = Route.useSearch();
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell>
      <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive animate-pulse">
          <Link2Off className="h-8 w-8" />
        </div>
        
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
          Broken Link Detected
        </h1>
        
        <p className="mt-3 text-sm text-muted-foreground max-w-md">
          The link you tried to visit is incomplete, contains invalid formatting, or has failed our server-side reachability check.
        </p>

        <Card className="mt-8 w-full border border-border/80 bg-secondary/20 p-5 backdrop-blur-sm">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Destination URL</span>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm font-mono text-foreground break-all">
              <span className="select-all">{url || "No link provided"}</span>
              <button 
                onClick={handleCopy}
                disabled={!url}
                className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
                title="Copy URL"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col gap-2 text-left text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span>Make sure the link starts with <code className="text-foreground">https://</code> or <code className="text-foreground">http://</code>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span>Verify that the URL doesn't contain typos or missing trailing parameters.</span>
            </div>
          </div>
        </Card>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => router.history.back()} 
            variant="outline" 
            className="flex items-center gap-2 border-border/80 hover:bg-secondary/50"
          >
            <ArrowLeft className="h-4 w-4" /> Go back
          </Button>
          
          <Button asChild className="bg-gradient-brand text-brand-foreground shadow-brand">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
