import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { seedInterests } from "@/lib/scope-store";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Join the Scope Waitlist" },
      { name: "description", content: "Reserve your spot on India's curated campus innovation network." },
      { property: "og:title", content: "Join the Scope Waitlist" },
      { property: "og:description", content: "12,000+ verified builders. Reserve your spot." },
    ],
  }),
  component: WaitlistPage,
});

function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [campus, setCampus] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const toggle = (t: string) =>
    setInterests((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes("@") || !campus.trim()) {
      toast.error("Name, valid email, and campus are required.");
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem("scope_waitlist") || "[]");
      list.unshift({ name: name.trim(), email, campus: campus.trim(), interests, at: Date.now() });
      localStorage.setItem("scope_waitlist", JSON.stringify(list.slice(0, 500)));
    } catch { /* noop */ }
    toast.success("You're on the list. Welcome aboard.");
    setDone(true);
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Sparkles className="mr-1 h-3 w-3" /> Limited Access</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Reserve your Scope seat.</h1>
          <p className="mt-3 text-primary-foreground/70">Be among the first 10,000 verified campus builders. We onboard in cohorts.</p>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        {done ? (
          <Card className="p-8 text-center animate-scale-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-2xl text-brand-foreground shadow-brand">🎉</div>
            <h2 className="mt-4 text-xl font-bold text-foreground">You're #{Math.floor(Math.random() * 200) + 800} in line.</h2>
            <p className="mt-2 text-sm text-muted-foreground">We'll email you when your cohort opens. Want to skip the line?</p>
            <Button asChild className="mt-5 bg-gradient-brand text-brand-foreground"><a href="/refer">Invite 3 builders → instant access</a></Button>
          </Card>
        ) : (
          <Card className="p-6">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="wn">Full name</Label>
                <Input id="wn" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="we">Email</Label>
                <Input id="we" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="wc">Campus / Institution</Label>
                <Input id="wc" value={campus} onChange={(e) => setCampus(e.target.value)} maxLength={120} className="mt-1.5" />
              </div>
              <div>
                <Label>What pulls you in?</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {seedInterests.map((t) => {
                    const active = interests.includes(t);
                    return (
                      <button type="button" key={t} onClick={() => toggle(t)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${active ? "border-transparent bg-gradient-brand text-brand-foreground shadow-brand" : "border-border bg-background text-muted-foreground hover:border-brand/40"}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-brand">Join waitlist</Button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Users className="h-3 w-3" /> 12,400+ builders already in</div>
            </form>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
