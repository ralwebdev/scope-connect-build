import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Sparkles, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeatureGate } from "@/components/site/FeatureGate";
import { toast } from "sonner";

export const Route = createFileRoute("/ambassador")({
  head: () => ({
    meta: [
      { title: "Become a Scope Campus Ambassador" },
      { name: "description", content: "Lead Scope at your institution. Real authority, real impact, real network." },
      { property: "og:title", content: "Scope Campus Ambassador Program" },
      { property: "og:description", content: "Lead India's campus innovation network from your institution." },
    ],
  }),
  component: () => <FeatureGate flag="ambassadors"><AmbassadorPage /></FeatureGate>,
});

const BENEFITS = [
  { icon: Crown, title: "Founding Ambassador title", body: "First 100 ambassadors get a permanent Founding tag on their profile." },
  { icon: Trophy, title: "Direct access to Scope leadership", body: "Monthly 1:1s with the core team. Shape product and policy." },
  { icon: Users, title: "Run your chapter", body: "Host events, pick mission themes, recognize top builders." },
  { icon: Sparkles, title: "Stipend + equity-style perks", body: "Quarterly honorarium, exclusive merch, recommendation letters." },
];

function AmbassadorPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [campus, setCampus] = useState("");
  const [why, setWhy] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes("@") || !campus.trim() || why.trim().length < 30) {
      toast.error("Fill all fields. 'Why you' needs at least 30 characters.");
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem("scope_ambassador_apps") || "[]");
      list.unshift({ name: name.trim(), email, campus: campus.trim(), why: why.trim(), at: Date.now() });
      localStorage.setItem("scope_ambassador_apps", JSON.stringify(list.slice(0, 200)));
    } catch { /* noop */ }
    toast.success("Application received. Decisions in 5–7 days.");
    setName(""); setEmail(""); setCampus(""); setWhy("");
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-16 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Crown className="mr-1 h-3 w-3" /> Ambassador Program</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Lead Scope on your campus.</h1>
          <p className="mt-3 text-primary-foreground/75">Real authority. Real network. Real founding-team energy. Limited to 1 ambassador per campus.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="p-5 hover-lift">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-brand"><b.icon className="h-5 w-5" /></div>
              <h3 className="mt-3 font-semibold text-foreground">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-6">
          <h2 className="text-xl font-bold text-foreground">Apply now</h2>
          <p className="mt-1 text-sm text-muted-foreground">Takes 2 minutes. Decisions in 5–7 days.</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="an">Full name</Label>
                <Input id="an" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="ae">Email</Label>
                <Input id="ae" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label htmlFor="ac">Campus</Label>
              <Input id="ac" value={campus} onChange={(e) => setCampus(e.target.value)} maxLength={120} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="aw">Why you?</Label>
              <Textarea id="aw" value={why} onChange={(e) => setWhy(e.target.value)} rows={4} className="mt-1.5" maxLength={1000} placeholder="What have you built? What do you want to build with Scope at your campus?" />
              <p className="mt-1 text-xs text-muted-foreground">{why.length}/1000 · min 30 chars</p>
            </div>
            <Button type="submit" size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand">Submit application</Button>
          </form>
        </Card>
      </section>
    </AppShell>
  );
}
