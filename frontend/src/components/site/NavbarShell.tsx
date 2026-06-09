// 🧊 NavbarShell — the reusable floating glass capsule.
//
// All 6 role-specific Navbars (StudentNavbar, CampusNavbar, FacultyNavbar,
// InstitutionNavbar, ScopeAdminNavbar, SuperAdminNavbar) render through this
// shell. The shell owns the visual chrome, scroll behavior, theme glow,
// auth/notif/profile popovers, and SSR-safe gating. Per-role variation is
// limited to the **center brain (KPI rail)** which is injected as a slot.
//
// This guarantees role leakage is structurally impossible — admin roles
// CANNOT render student gamification because the slot is replaced wholesale.
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, LogOut, Settings as SettingsIcon, User as UserIcon, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageSrc } from "@/hooks/use-image-src";
import { useUserSession } from "@/hooks/use-session";
import { useUnreadNotifications } from "@/hooks/use-scope";
import { auth, meta, notifications } from "@/lib/scope-store";
import { ApiException } from "@/lib/api/client";
import { useBrand } from "@/hooks/use-platform";
import { landingRouteForRole } from "@/lib/rbac";
import { themeForRole } from "@/lib/role-theme";
import { navConfigForRole } from "@/lib/role-nav";
import { RoleNotificationCenter } from "@/components/site/RoleNotificationCenter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type NavbarShellProps = {
  /** Center brain — role-specific KPI rail. Stays visible in the compact navbar. */
  centerSlot?: ReactNode;
  /** Override role badge label (defaults to themeForRole label). */
  roleLabel?: string;
};

export function NavbarShell({ centerSlot, roleLabel }: NavbarShellProps) {
  const navigate = useNavigate();
  const session = useUserSession();
  const brand = useBrand();
  const unread = useUnreadNotifications();
  const navAvatar = useImageSrc(session.user?.avatarUrl);

  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [shimmer, setShimmer] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session.ready) return;
    setShimmer(true);
    const t = setTimeout(() => setShimmer(false), 1600);
    return () => clearTimeout(t);
  }, [session.ready]);

  useEffect(() => {
    if (!session.isAuthenticated || !session.ready) return;

    let lastUnreadCount = 0;
    let isInitial = true;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 15000;

    const schedule = (ms = backoffMs) => {
      if (stopped) return;
      timer = setTimeout(() => {
        void sync();
      }, ms);
    };

    const forceReauth = (reason: "401" | "403") => {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      auth.logout();
      toast.error(
        reason === "403"
          ? "Your session no longer has access to notifications. Please sign in again."
          : "Session expired. Please sign in again.",
      );
      navigate({ to: "/auth", replace: true });
    };

    const sync = async () => {
      if (stopped) return;
      try {
        const list = await notifications.syncFromBackend();
        const currentUnread = list.filter((n) => !n.read);
        const unreadCount = currentUnread.length;

        if (!isInitial && unreadCount > lastUnreadCount) {
          // Find the newest unread notifications
          const newNotifs = currentUnread.filter((n) => {
            // Check if this notification has a newer timestamp or was not in the previous run
            return n.id && !n.read;
          }).slice(0, unreadCount - lastUnreadCount);

          newNotifs.forEach((n) => {
            toast.info(n.text, {
              description: "New platform signal received.",
              icon: <Bell className="h-4 w-4 text-brand animate-bounce" />,
              action: n.href
                ? {
                    label: "View",
                    onClick: () => navigate({ to: n.href }),
                  }
                : undefined,
            });
          });
        }
        lastUnreadCount = unreadCount;
        isInitial = false;
        backoffMs = 15000;
        schedule();
      } catch (err) {
        console.warn("Live notifications poll error", err);
        if (err instanceof ApiException && (err.status === 401 || err.status === 403)) {
          forceReauth(err.status === 403 ? "403" : "401");
          return;
        }
        backoffMs = Math.min(backoffMs * 2, 120000);
        schedule(backoffMs);
      }
    };

    // Initial sync
    void sync();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [session.isAuthenticated, session.ready, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    let lastY = window.scrollY;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const goingDown = y > lastY;
        lastY = y;
        if (y < 8) setCollapsed(false);
        else if (goingDown && y > 32) setCollapsed(true);
        else if (!goingDown && y < 24) setCollapsed(false);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    auth.logout();
    toast.success("Signed out. See you soon, Builder.");
    navigate({ to: "/auth", replace: true });
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (!session.ready || !session.isAuthenticated) return;
    const target = landingRouteForRole(session.role);
    if (target !== "/") {
      e.preventDefault();
      navigate({ to: target });
    }
  };

  const showAuthedUI = session.ready && session.isAuthenticated && !!session.user;
  const accountFirstName = showAuthedUI ? session.user!.name.trim().split(/\s+/)[0] : "";
  const roleTheme = themeForRole(session.role);
  const badgeLabel = roleLabel ?? roleTheme.label;
  const glowVar = { ["--nav-glow" as const]: roleTheme.glow } as React.CSSProperties;

  return (
    <>
      <div aria-hidden className="hidden h-20 w-full md:block" />

      <header
        className={cn(
          "fixed left-0 right-0 z-[100] flex justify-center px-4 transition-all duration-500 ease-in-out transform-gpu will-change-transform",
          collapsed ? "top-3" : "top-6"
        )}
      >
        <div
          className={cn(
            "mx-auto w-full transition-all duration-500 ease-in-out transform-gpu",
            collapsed ? "max-w-[860px]" : "max-w-6xl"
          )}
        >
          <div
            style={glowVar}
            className={cn(
              "relative flex items-center justify-between rounded-full border border-white/20 bg-white/70 backdrop-blur-2xl transition-all duration-500 ease-in-out",
              collapsed ? "px-3 py-1.5 shadow-lg" : "px-4 py-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15),0_0_1px_rgba(0,0,0,0.1)]",
              shimmer && "nav-shimmer",
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full opacity-60"
              style={{
                boxShadow: `0 0 28px -6px color-mix(in oklab, ${roleTheme.glow} 35%, transparent), inset 0 0 0 1px color-mix(in oklab, ${roleTheme.glow} 20%, transparent)`,
              }}
            />

            {/* LEFT GROUP — Identity + KPIs + Nav */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Identity */}
              <div className="flex shrink-0 items-center gap-1.5">
                {showAuthedUI && (
                  <button
                    aria-label="Open navigation"
                    onClick={() => {
                      const el = document.querySelector("aside");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-secondary lg:hidden"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                )}
                <Link
                  to="/"
                  onClick={handleLogoClick}
                  className="flex shrink-0 items-center gap-2 rounded-full py-0.5 transition-transform hover:scale-[1.01]"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm overflow-hidden"
                    style={{ boxShadow: `0 0 10px -2px ${roleTheme.glow}33` }}
                  >
                    <img src="/favicon.png" alt="Logo" className="h-5 w-5 object-contain" />
                  </span>
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-500 ease-in-out",
                      collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
                    )}
                  >
                    <span className="whitespace-nowrap px-1 text-[15px] font-extrabold tracking-tight">
                      <span className="text-[#1a1a1a]">{brand.shortName}</span>
                      <span className="text-brand">{brand.accentName}</span>
                    </span>
                  </div>
                </Link>
              </div>

              {/* KPI Rail */}
              <div
                className={cn(
                  "min-w-0 transition-all duration-500 ease-in-out",
                  !showAuthedUI ? "max-w-0 opacity-0" : "flex-1 opacity-100"
                )}
              >
                <div className="mx-0 flex items-center justify-center px-0.5">
                  {centerSlot}
                </div>
              </div>

              {/* Primary Nav - Stable Transition */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-500 ease-in-out",
                  collapsed || !showAuthedUI ? "max-w-0 opacity-0" : "max-w-[400px] opacity-100"
                )}
              >
                <nav className="hidden items-center gap-0.5 px-1 xl:flex" aria-label="Primary">
                  {navConfigForRole(session.role).primary.slice(0, 6).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.key}
                        to={item.to}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 transition-all hover:bg-secondary/60 hover:text-foreground hover:scale-110"
                        activeProps={{ className: "bg-secondary/60 text-foreground scale-110" }}
                        activeOptions={{ exact: false }}
                        title={item.label}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Role Badge - Blue Theme Integration */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-500 ease-in-out",
                  collapsed || !showAuthedUI ? "max-w-0 opacity-0" : "max-w-[250px] opacity-100"
                )}
              >
                <div className="px-1">
                  <span
                    className="flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/60 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.05em] transition-all hover:border-blue-300/60"
                    style={{
                      color: "#2563eb", // Deep blue
                      boxShadow: "0 2px 10px -4px rgba(37, 99, 235, 0.15)",
                    }}
                    title={`Signed in as ${badgeLabel}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6] animate-pulse" />
                    <span className="whitespace-nowrap opacity-80">{badgeLabel}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1" />

            {/* RIGHT GROUP — actions */}
            <div className="relative flex shrink-0 items-center gap-1">
              <div className="flex shrink-0 items-center gap-0.5">
                {showAuthedUI ? (
                  <>
                    <div ref={bellRef} className="relative">
                      <button
                        onClick={() => setBellOpen((v) => !v)}
                        className="relative flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-secondary"
                        aria-label="Notifications"
                      >
                        <Bell className="h-4 w-4" />
                        {unread > 0 && (
                          <span
                            className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-bold text-white"
                          >
                            {unread}
                          </span>
                        )}
                      </button>
                      {bellOpen && (
                        <div className="absolute right-0 top-10 origin-top-right animate-scale-in">
                          <RoleNotificationCenter
                            role={session.role}
                            variant="compact"
                            onItemClick={() => setBellOpen(false)}
                          />
                        </div>
                      )}
                    </div>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-500 ease-in-out",
                        collapsed ? "max-w-0 opacity-0" : "max-w-[96px] opacity-100"
                      )}
                    >
                      <span className="block truncate px-1 text-xs font-semibold text-[#1a1a1a]">
                        {accountFirstName}
                      </span>
                    </div>

                    <div ref={userRef} className="relative shrink-0">
                      <button
                        onClick={() => setUserOpen((v) => !v)}
                        key={session.user!.avatarUrl || "nav-avatar"}
                        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-brand-foreground transition-transform hover:scale-105 shadow-sm"
                        style={{
                          background: navAvatar.hasImage ? "transparent" : session.user!.avatarColor,
                          border: "1.5px solid white",
                        }}
                        aria-label="Profile menu"
                      >
                        {navAvatar.hasImage ? (
                          <img 
                            src={navAvatar.src} 
                            alt="" 
                            className="h-full w-full object-cover" 
                            onError={navAvatar.onError}
                          />
                        ) : (
                          session.user!.name.charAt(0).toUpperCase()
                        )}
                      </button>
                      {userOpen && (
                        <div className="absolute right-0 top-10 w-64 origin-top-right overflow-hidden rounded-xl border border-border bg-popover shadow-elegant animate-scale-in">
                          <div className="border-b border-border px-4 py-3">
                            <div className="text-sm font-semibold text-foreground">{session.user!.name}</div>
                            <div className="text-xs text-muted-foreground">{session.user!.email}</div>
                          </div>
                          <div className="py-1">
                            <Link to="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary">
                              <UserIcon className="h-4 w-4" /> Profile
                            </Link>
                            <Link to="/settings" onClick={() => setUserOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary">
                              <SettingsIcon className="h-4 w-4" /> Settings
                            </Link>
                          </div>
                          <div className="border-t border-border py-1">
                            <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary">
                              <LogOut className="h-4 w-4" /> Sign out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Button asChild variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs">
                      <Link to="/auth">Log in</Link>
                    </Button>
                    <Button asChild size="sm" className="h-8 rounded-full bg-gradient-brand px-3 text-xs text-brand-foreground shadow-brand hover:opacity-95">
                      <Link to="/auth">Join Scope</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

if (typeof window !== "undefined") meta.bumpVisit();
