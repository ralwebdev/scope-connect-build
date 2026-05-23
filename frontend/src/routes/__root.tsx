import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { analytics } from "@/lib/analytics";
import { hydration } from "@/lib/scope-store";
import { useRouteAnalytics } from "@/hooks/use-route-analytics";
import { useRageClickDetector } from "@/hooks/use-rage-click";
import { FeedbackWidget } from "@/components/site/FeedbackWidget";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Scope Connect — India's Curated Campus Opportunity Platform" },
      { name: "description", content: "Verified challenges, campus growth programs, and real opportunities for ambitious student builders." },
      { name: "author", content: "Scope Connect" },
      { property: "og:title", content: "Scope Connect" },
      { property: "og:description", content: "Where campuses build real opportunities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/scopeConnect.png",
        type: "image/x-icon",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    try {
      localStorage.removeItem("scope_theme");
      document.documentElement.classList.remove("dark");
    } catch { /* noop */ }
    // Boot hydration: validates schema, repairs corrupt slices, never throws.
    const result = hydration.boot();
    if (result.status === "recovered" && result.recoveredKeys.length > 0) {
      toast(hydration.microcopy.recovered, {
        description: `${result.recoveredKeys.length} slice${result.recoveredKeys.length === 1 ? "" : "s"} repaired.`,
      });
    }
    
    // Sync platform config and store items from backend on boot
    import("@/lib/config-store").then(({ configStore }) => {
      void configStore.syncFromBackend();
    });
    import("@/lib/scope-store").then(({ events, opportunities, curated, projects, portfolio, applications }) => {
      Promise.allSettled([
        events.syncFromBackend(),
        opportunities.syncFromBackend(),
        curated.syncFromBackend(),
        projects.syncFromBackend(),
        portfolio.syncFromBackend(),
        applications.syncFromBackend(),
      ]).catch((err) => console.warn("Global hydration errors:", err));
    });

    // Soft-launch instrumentation: anonymous tester id + invite-source capture.
    analytics.init();
    // One session_start per app load (frontend-only analytics).
    analytics.track("session_start");
  }, []);

  // Tracks every pathname change as route_visit.
  useRouteAnalytics();
  // Detects clusters of repeated clicks → soft-launch confusion proxy.
  useRageClickDetector();

  return (
    <>
      <Outlet />
      <FeedbackWidget />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
