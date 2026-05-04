import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Gift, Share2, Users } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-scope";
import { toast } from "sonner";

export const Route = createFileRoute("/refer")({
  head: () => ({
    meta: [
      { title: "Refer & Earn — Scope Connect" },
      { name: "description", content: "Bring builders from your campus. Earn XP for every invite." },
    ],
  }),
  component: () => <AuthGate><ReferPage /></AuthGate>,
});

function ReferPage() {
  const user = useUser();
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!user) return null;
  const code = `SCOPE-${user.id.slice(2, 8).toUpperCase()}`;
  const link = `${origin}/auth?ref=${code}`;

  const copy = (val: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => toast.success(`${label} copied`));
    } else {
      toast.error("Clipboard unavailable.");
    }
  };

  const share = () => {
    const text = `I'm building on Scope Connect — India's curated campus innovation network. Join with my code: ${code}`;
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      (navigator as Navigator & { share: (data: ShareData) => Promise<void> })
        .share({ title: "Join me on Scope", text, url: link })
        .catch(() => copy(link, "Link"));
    } else {
      copy(link, "Link");
    }
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Gift className="mr-1 h-3 w-3" /> Refer & Earn</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Bring builders from your campus.</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">Earn 100 XP for every accepted invite. Unlock the Campus Mobilizer badge at 5 invites.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your referral code</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="rounded-xl border-2 border-dashed border-brand/40 bg-brand/5 px-5 py-3 text-2xl font-bold tracking-wider text-foreground">{code}</div>
            <Button onClick={() => copy(code, "Code")} variant="outline" size="sm"><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy code</Button>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shareable link</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input value={link} readOnly className="flex-1 min-w-[240px] text-sm" />
              <Button onClick={() => copy(link, "Link")} variant="outline"><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button>
              <Button onClick={share} className="bg-gradient-brand text-brand-foreground"><Share2 className="mr-1.5 h-3.5 w-3.5" /> Share</Button>
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat icon={Gift} v="100 XP" l="per accepted invite" />
          <Stat icon={Users} v="5" l="invites unlocks Mobilizer badge" />
          <Stat icon={Share2} v="∞" l="campus reach potential" />
        </div>

        <Card className="mt-6 bg-gradient-to-br from-brand/5 to-cyan/5 p-5">
          <h3 className="text-sm font-semibold text-foreground">Lead Scope on your campus</h3>
          <p className="mt-1 text-sm text-muted-foreground">10+ verified invites? You qualify for the Campus Ambassador track.</p>
          <Button asChild variant="outline" size="sm" className="mt-3"><a href="/ambassador">Become an Ambassador</a></Button>
        </Card>
      </section>
    </AppShell>
  );
}

function Stat({ icon: Icon, v, l }: { icon: React.ComponentType<{ className?: string }>; v: string; l: string }) {
  return (
    <Card className="p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-brand" />
      <div className="mt-2 text-xl font-bold text-foreground">{v}</div>
      <div className="text-xs text-muted-foreground">{l}</div>
    </Card>
  );
}
