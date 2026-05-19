import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Building2, Handshake } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { backendPublic } from "@/lib/api/endpoints";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Scope Connect" },
      { name: "description", content: "Get in touch with the Scope team - partnerships, press, support." },
    ],
  }),
  component: ContactPage,
});

const REASONS = ["General inquiry", "Campus partnership", "Press / media", "Hiring / recruiter", "Investor"] as const;

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || msg.trim().length < 10) {
      toast.error("Add a valid email and a real message.");
      return;
    }

    setSubmitting(true);
    try {
      await backendPublic.submitContact({
        source: "contact_page",
        name: name.trim() || undefined,
        email,
        reason,
        message: msg.trim(),
      });
      toast.success("Message received. The Scope team replies within 24 hours.");
      setName("");
      setEmail("");
      setMsg("");
      setReason(REASONS[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send your message.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Mail className="mr-1 h-3 w-3" /> Contact</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Talk to Scope.</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">Partnership ideas, press, hiring, or just curious - pick a reason and we'll route it to the right human.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <Info icon={Mail} title="Direct email" body="scopemagazines@gmail.com" />
            <Info icon={Building2} title="HQ" body="Bengaluru, India" />
            <Info icon={Handshake} title="Partnerships" body="partners@scope.in · Replies in 48h" />
          </div>
          <Card className="p-6 lg:col-span-2">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cn">Your name</Label>
                  <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="ce">Email</Label>
                  <Input id="ce" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" maxLength={255} />
                </div>
              </div>
              <div>
                <Label htmlFor="cr">Reason</Label>
                <select id="cr" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {REASONS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="cm">Message</Label>
                <Textarea id="cm" value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} className="mt-1.5" maxLength={1500} />
              </div>
              <Button type="submit" size="lg" disabled={submitting} className="bg-gradient-brand text-brand-foreground shadow-brand">Send message</Button>
              <p className="text-xs text-muted-foreground">We respond within 24 hours, weekdays.</p>
            </form>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}

function Info({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <Card className="p-5">
      <Icon className="h-5 w-5 text-brand" />
      <div className="mt-3 text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </Card>
  );
}
