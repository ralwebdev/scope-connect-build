import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Lock, Crown, Mail, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { useUser } from "@/hooks/use-scope";
import { auth, meta } from "@/lib/scope-store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Scope Connect" },
      { name: "description", content: "Manage your Scope Connect account & preferences." },
    ],
  }),
  component: () => <AuthGate><SettingsPage /></AuthGate>,
});

const PREMIUM = [
  { icon: Crown, title: "Verified Builder Badge", desc: "Stand out with a verified-on-Scope checkmark." },
  { icon: Mail, title: "Recruiter Visibility", desc: "Get surfaced to founders & recruiters first." },
  { icon: Lock, title: "Premium Portfolio", desc: "Custom domain, analytics & advanced theming." },
  { icon: Bell, title: "Founder Circle Access", desc: "Private invites, mentor office hours, drops." },
];

function SettingsPage() {
  const user = useUser();
  const [email, setEmail] = useState(user?.email ?? "");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [weekly, setWeekly] = useState(true);
  // Sync email when user resolves on mount
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  if (!user) return null;

  const saveAccount = () => {
    if (!email.includes("@")) { toast.error("Enter a valid email."); return; }
    auth.updateProfile({ email });
    toast.success("Account updated.");
  };

  const exportProfile = () => {
    try {
      const data = JSON.stringify(user, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scope-profile-${user.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Profile exported.");
    } catch {
      toast.error("Export failed.");
    }
  };

  const wipe = () => {
    if (confirm("This will wipe ALL your local Scope Connect data. Continue?")) {
      meta.resetAll();
      toast("Data cleared. Reload to start fresh.");
      setTimeout(() => window.location.assign("/"), 600);
    }
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-secondary/40 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account, notifications & premium access.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground">Account</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="acc-email">Email</Label>
              <Input id="acc-email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button onClick={exportProfile} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export profile JSON
            </Button>
            <Button onClick={saveAccount} className="bg-gradient-brand text-brand-foreground">Save</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
          <div className="mt-4 space-y-4">
            {[
              { label: "Email digests", desc: "Weekly recap of your XP, rank & opportunities.", value: notifEmail, set: setNotifEmail },
              { label: "Push notifications", desc: "Real-time pings for likes, RSVPs & matches.", value: notifPush, set: setNotifPush },
              { label: "Weekly chapter wars", desc: "Get notified when your chapter is ranked.", value: weekly, set: setWeekly },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{row.label}</div>
                  <div className="text-xs text-muted-foreground">{row.desc}</div>
                </div>
                <Switch checked={row.value} onCheckedChange={(v) => { row.set(v); toast(v ? "Enabled." : "Disabled."); }} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-hero p-6 text-primary-foreground">
            <div>
              <Badge className="bg-cyan/20 text-cyan-foreground">Coming soon</Badge>
              <h3 className="mt-2 text-xl font-bold">Scope Premium</h3>
              <p className="text-sm text-primary-foreground/70">Unlock recruiter reach, custom portfolio & founder circle.</p>
            </div>
            <Button onClick={() => toast.success("You're on the waitlist. We'll be in touch.")} className="bg-gradient-brand text-brand-foreground shadow-brand">Join Waitlist</Button>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {PREMIUM.map((p) => (
              <div key={p.title} className="rounded-xl border border-border p-4 hover-lift">
                <p.icon className="h-5 w-5 text-brand" />
                <div className="mt-3 text-sm font-semibold text-foreground">{p.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{p.desc}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-destructive/30 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Danger zone</h3>
              <p className="mt-1 text-sm text-muted-foreground">Reset your local Scope Connect data. This is a frontend MVP — your data lives in your browser.</p>
            </div>
            <Button variant="outline" onClick={wipe} className="border-destructive text-destructive hover:bg-destructive/10">Reset data</Button>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
