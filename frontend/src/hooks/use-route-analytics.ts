import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { analytics } from "@/lib/analytics";

/**
 * Tracks every pathname change as a `route_visit` event.
 * Mounted once at the app root.
 */
export function useRouteAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    analytics.track("route_visit", { route: pathname });
  }, [pathname]);
}
