import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIsLoggedIn } from "@/hooks/use-scope";
import { useUserSession } from "@/hooks/use-session";
import { auth, streak, notifications } from "@/lib/scope-store";

/** Wrap any page that requires auth — redirects guests to /auth.
 *  Defers all auth-driven rendering until after client mount to avoid SSR/CSR mismatch. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const isAuthed = useIsLoggedIn();
  const session = useUserSession();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isAuthed) return;
    auth.restoreSession().catch(() => {
      /* api client clears invalid sessions */
    });
  }, [isAuthed, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthed) {
      navigate({ to: "/auth" });
    } else {
      streak.tick();
      // Seed role-aware notifications. Re-seeds automatically if the active
      // role has changed since last pass (e.g. a role override flip in admin).
      notifications.ensureSeeded(session.role);
    }
  }, [isAuthed, navigate, mounted, session.role]);

  if (!mounted || !isAuthed) {
    // Lightweight shell so route transitions don't flash blank — feels instant.
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="h-14 border-b border-border/40 bg-background/80" />
        <div className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-4 py-10 sm:px-6 lg:px-8">
          <div className="h-24 animate-pulse rounded-2xl bg-secondary/40" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-32 animate-pulse rounded-xl bg-secondary/40" />
            <div className="h-32 animate-pulse rounded-xl bg-secondary/40" />
            <div className="h-32 animate-pulse rounded-xl bg-secondary/40" />
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
