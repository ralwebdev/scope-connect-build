import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/site/AppShell";
import { AuthGate } from "@/components/site/AuthGate";
import { RoleNotificationCenter } from "@/components/site/RoleNotificationCenter";
import { useUserSession } from "@/hooks/use-session";
import { useUnreadNotifications } from "@/hooks/use-scope";
import { analytics } from "@/lib/analytics";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Scope Connect" },
      { name: "description", content: "Role-aware alerts: approvals, rankings, milestones and system signals tailored to you." },
      { property: "og:title", content: "Notifications — Scope Connect" },
      { property: "og:description", content: "Role-aware alerts: approvals, rankings, milestones and system signals tailored to you." },
    ],
  }),
  component: () => <AuthGate><NotificationsPage /></AuthGate>,
});

function NotificationsPage() {
  const session = useUserSession();
  const unread = useUnreadNotifications(session.role);

  useEffect(() => {
    analytics.track("notification_opened");
  }, []);

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20">
              <Bell className="mr-1 h-3 w-3" /> Activity Center
            </Badge>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Notifications</h1>
            <p className="mt-2 text-primary-foreground/70">
              {unread > 0
                ? `${unread} fresh signal${unread === 1 ? "" : "s"} — tailored to your role.`
                : "You're all caught up."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <RoleNotificationCenter role={session.role} variant="full" />
      </section>
    </AppShell>
  );
}
