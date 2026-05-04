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
  Bell, LogOut, Settings as SettingsIcon, Sparkles, User as UserIcon, Menu,
  Sun, Moon, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserSession } from "@/hooks/use-session";
import { useUnreadNotifications } from "@/hooks/use-scope";
import { auth, meta } from "@/lib/scope-store";
import { useBrand } from "@/hooks/use-platform";
import { useTheme } from "@/hooks/use-theme";
import { landingRouteForRole } from "@/lib/rbac";
import { themeForRole } from "@/lib/role-theme";
import { navConfigForRole } from "@/lib/role-nav";
import { RoleNotificationCenter } from "@/components/site/RoleNotificationCenter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type NavbarShellProps = {
  /** Center brain — role-specific KPI rail. Hidden on collapse. */
  centerSlot?: ReactNode;
  /** Override role badge label (defaults to themeForRole label). */
  roleLabel?: string;
};

export function NavbarShell({ centerSlot, roleLabel }: NavbarShellProps) {
  const navigate = useNavigate();
  const session = useUserSession();
  const brand = useBrand();
  const unread = useUnreadNotifications();

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
    toast.success("Signed out (secure reset). See you soon, Builder.");
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
  const roleTheme = themeForRole(session.role);
  const badgeLabel = roleLabel ?? roleTheme.label;
  const glowVar = { ["--nav-glow" as const]: roleTheme.glow } as React.CSSProperties;

  return (
    <>
      <div aria-hidden className="hidden h-20 w-full md:block" />

      <header
        className={cn(
          "fixed z-[9999] hidden transition-[top,width,padding] duration-300 ease-out md:block",
          collapsed ? "top-2" : "top-4 animate-nav-float",
        )}
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          width: collapsed
            ? "min(720px, calc(100vw - 32px))"
            : "min(1100px, calc(100vw - 32px))",
          maxWidth: "1100px",
          minWidth: "320px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={glowVar}
          className={cn(
            "relative flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2 py-1.5 backdrop-blur-xl transition-all duration-300 sm:gap-3 sm:px-3",
            "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]",
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

          {/* LEFT BRAIN — Identity */}
          <div className="relative flex items-center gap-1.5">
            {showAuthedUI && (
              <button
                aria-label="Open navigation"
                onClick={() => {
                  const el = document.querySelector("aside");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="hidden h-8 w-8 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-secondary lg:inline-flex"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
            <Link
              to="/"
              onClick={handleLogoClick}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 font-bold text-foreground transition-transform hover:scale-[1.02]"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand shadow-brand"
                style={{ boxShadow: `0 0 14px -2px ${roleTheme.glow}` }}
              >
                <Sparkles className="h-4 w-4 text-brand-foreground" />
              </span>
              {!collapsed && (
                <span className="hidden text-base tracking-tight sm:inline">
                  {brand.shortName}
                  <span className="text-brand">{brand.accentName}</span>
                </span>
              )}
            </Link>
          </div>

          {/* CENTER BRAIN — role-injected KPI rail */}
          {showAuthedUI && !collapsed && centerSlot}

          {/* PRIMARY NAV — role-aware quick links (desktop only). Hidden on
              collapse and on smaller widths so the capsule stays compact. */}
          {showAuthedUI && !collapsed && (
            <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary">
              {navConfigForRole(session.role).primary.slice(0, 5).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    className="group flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
                    activeProps={{ className: "bg-secondary text-foreground" }}
                    activeOptions={{ exact: false }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden 2xl:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex-1" />

          {/* RIGHT BRAIN — actions */}
          <div className="relative flex items-center gap-1">
            <ThemeQuickToggle />

            {showAuthedUI ? (
              <>
                {!collapsed && (
                  <span
                    className="hidden items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:inline-flex animate-nav-glow"
                    style={{
                      background: `color-mix(in oklab, ${roleTheme.glow} 18%, transparent)`,
                      color: roleTheme.glow,
                      border: `1px solid color-mix(in oklab, ${roleTheme.glow} 40%, transparent)`,
                    }}
                    title={`Signed in as ${badgeLabel}`}
                  >
                    <span className="text-[10px] leading-none">{roleTheme.dot}</span>
                    {badgeLabel}
                  </span>
                )}

                <div ref={bellRef} className="relative">
                  <button
                    onClick={() => setBellOpen((v) => !v)}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unread > 0 && (
                      <span
                        className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                        style={{ background: roleTheme.glow, color: roleTheme.fg }}
                      >
                        {unread}
                      </span>
                    )}
                  </button>
                  {bellOpen && (
                    <div className="absolute right-0 top-12 origin-top-right animate-scale-in">
                      <RoleNotificationCenter
                        role={session.role}
                        variant="compact"
                        onItemClick={() => setBellOpen(false)}
                      />
                    </div>
                  )}
                </div>

                <div ref={userRef} className="relative">
                  <button
                    onClick={() => setUserOpen((v) => !v)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-brand-foreground transition-transform hover:scale-105"
                    style={{
                      background: session.user!.avatarColor,
                      boxShadow: `0 0 0 2px color-mix(in oklab, ${roleTheme.glow} 60%, transparent)`,
                    }}
                    aria-label="Profile menu"
                  >
                    {session.user!.name.charAt(0).toUpperCase()}
                  </button>
                  {userOpen && (
                    <div className="absolute right-0 top-12 w-64 origin-top-right rounded-xl border border-border bg-popover shadow-elegant animate-scale-in">
                      <div className="border-b border-border px-4 py-3">
                        <div className="text-sm font-semibold text-foreground">{session.user!.name}</div>
                        <div className="text-xs text-muted-foreground">{session.user!.email}</div>
                        <div
                          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: `color-mix(in oklab, ${roleTheme.glow} 18%, transparent)`,
                            color: roleTheme.glow,
                          }}
                        >
                          {roleTheme.dot} {badgeLabel}
                        </div>
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
                          <LogOut className="h-4 w-4" /> Sign out (secure reset)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link to="/auth">Log in</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
                  <Link to="/auth">Join Scope</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

function ThemeQuickToggle() {
  const { mode, setTheme } = useTheme();
  const next = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      aria-label={`Theme: ${mode}. Click to switch to ${next}.`}
      onClick={() => setTheme(next)}
      className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
      title={`Theme: ${mode}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

if (typeof window !== "undefined") meta.bumpVisit();
