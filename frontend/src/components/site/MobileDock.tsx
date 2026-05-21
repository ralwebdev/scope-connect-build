// 📱 Mobile Bottom Dock — thumb-first navigation surface for small screens.
// Pairs with the floating Navbar (which collapses to identity-only on mobile).
// RBAC-safe: every item is filtered through the user's permissions; logged-out
// users see a minimal explore + auth dock. Hides on scroll-down, returns on
// scroll-up. Tap "+" expands a quick-actions panel (role-aware).
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Plus, Bell, LogIn, LogOut, X,
} from "lucide-react";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-session";
import { useUnreadNotifications } from "@/hooks/use-scope";
import { themeForRole } from "@/lib/role-theme";
import { type PermissionKey } from "@/lib/rbac";
import { navConfigForRole, type NavItem } from "@/lib/role-nav";
import { auth } from "@/lib/scope-store";
import { cn } from "@/lib/utils";

type DockItem = NavItem & { badge?: number };

export function MobileDock() {
  const session = useUserSession();
  const navigate = useNavigate();
  const router = useRouterState();
  const unread = useUnreadNotifications();
  const currentPath = router.location.pathname;

  const [hidden, setHidden] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const lastY = useRef(0);
  const touchStartY = useRef<number | null>(null);

  // Scroll-aware hide/reveal
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const goingDown = y > lastY.current + 4;
        const goingUp = y < lastY.current - 4;
        if (goingDown && y > 64) setHidden(true);
        else if (goingUp || y < 24) setHidden(false);
        lastY.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -32) setQuickOpen(true);
    else if (dy > 32) setQuickOpen(false);
    touchStartY.current = null;
  };

  if (!session.ready) return null;
  const roleTheme = themeForRole(session.role);
  const nav = navConfigForRole(session.role);

  // Role-specific primary nav (max 4) + center "+" trigger that opens
  // the quick-actions panel (= secondary nav). Unauth viewers see their
  // 5-item primary nav directly with no "+".
  const primarySlice = nav.primary.slice(0, 4);
  const dockItems: DockItem[] = session.isAuthenticated
    ? [
      ...primarySlice.slice(0, 2),
      { key: "primary", label: "More", icon: Plus, to: "", action: "logout" /* sentinel; handled below */ } as unknown as DockItem,
      ...primarySlice.slice(2, 4),
    ]
    : nav.primary.slice(0, 5);

  // Mark the center button as the quick-actions trigger using key === "primary".
  // Inject inbox badge if notifications appear in primary nav.
  for (const item of dockItems) {
    if (item.key === "notifications" || item.to === "/notifications") {
      item.badge = unread;
    }
  }

  const quickActions: NavItem[] = session.isAuthenticated
    ? nav.secondary.filter((a) => a.action !== "logout")
    : [];

  return (
    <>
      {/* Quick actions panel */}
      {quickOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm md:hidden"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="absolute inset-x-3 bottom-24 rounded-2xl border border-border/60 bg-popover/95 p-3 shadow-elegant backdrop-blur-xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: `0 0 32px -8px color-mix(in oklab, ${roleTheme.glow} 35%, transparent)` }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <div className="text-sm font-semibold text-foreground">Quick Actions</div>
                <div className="text-[11px] text-muted-foreground">{roleTheme.dot} {roleTheme.label}</div>
              </div>
              <button
                aria-label="Close quick actions"
                onClick={() => setQuickOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.key}
                    onClick={() => {
                      setQuickOpen(false);
                      navigate({ to: a.to });
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-background/60 p-3 text-foreground transition-all hover:scale-[1.02] hover:border-border"
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        background: `color-mix(in oklab, ${roleTheme.glow} 18%, transparent)`,
                        color: roleTheme.glow,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium leading-tight">{a.label}</span>
                  </button>
                );
              })}
              {quickActions.length === 0 && (
                <div className="col-span-3 px-2 py-6 text-center text-xs text-muted-foreground">
                  No quick actions available for your role.
                </div>
              )}
            </div>
            {session.isAuthenticated && (
              <div className="mt-3 border-t border-border/50 pt-3">
                <button
                  onClick={() => {
                    setQuickOpen(false);
                    auth.logout();
                    toast.success("Signed out (secure reset). See you soon, Builder.");
                    navigate({ to: "/auth", replace: true });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* The dock */}
      <nav
        aria-label="Primary mobile navigation"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn(
          "fixed z-[9999] transition-[transform,opacity] duration-300 md:hidden",
          hidden ? "opacity-0" : "opacity-100",
        )}
        style={{
          left: "50%",
          transform: hidden ? "translate(-50%, 160%)" : "translate(-50%, 0)",
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          width: "calc(100vw - 20px)",
          maxWidth: "420px",
          boxSizing: "border-box",
        }}
      >
        <div
          className="relative grid items-center gap-1.5 overflow-hidden rounded-[20px] border border-border/60 bg-background/70 px-3 py-2 backdrop-blur-xl"
          style={{
            gridTemplateColumns: `repeat(${dockItems.length}, minmax(0, 1fr))`,
            justifyItems: "center",
            boxShadow: `0 12px 36px -12px rgba(0,0,0,0.35), 0 0 24px -8px color-mix(in oklab, ${roleTheme.glow} 30%, transparent)`,
          }}
        >
          {dockItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.to ? currentPath === item.to : false;
            const isPrimary = item.key === "primary";

            if (isPrimary) {
              return (
                <button
                  key={item.key}
                  onClick={() => setQuickOpen((v) => !v)}
                  aria-label="Open quick actions"
                  className="relative -mt-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-brand-foreground shadow-brand transition-transform hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${roleTheme.glow}, color-mix(in oklab, ${roleTheme.glow} 60%, white))`,
                    boxShadow: `0 8px 24px -6px ${roleTheme.glow}`,
                  }}
                >
                  <Plus className={cn("h-5 w-5 transition-transform", quickOpen && "rotate-45")} />
                </button>
              );
            }

            const inner = (
              <span className="relative flex flex-col items-center justify-center gap-0.5">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    isActive ? "" : "text-foreground/70",
                  )}
                  style={
                    isActive
                      ? {
                        background: `color-mix(in oklab, ${roleTheme.glow} 18%, transparent)`,
                        color: roleTheme.glow,
                      }
                      : undefined
                  }
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.badge && item.badge > 0 ? (
                    <span
                      className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                      style={{ background: roleTheme.glow, color: roleTheme.fg }}
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-medium leading-none",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </span>
            );

            return item.to ? (
              <Link
                key={item.key}
                to={item.to}
                className="flex w-full items-center justify-center py-1"
                aria-label={item.label}
              >
                {inner}
              </Link>
            ) : null;
          })}
        </div>
      </nav>

      {/* Spacer so page content isn't covered by the dock */}
      <div aria-hidden className="h-20 w-full md:hidden" />
    </>
  );
}
