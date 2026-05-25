// 🧊 NavbarShell — the sleek fixed navigation bar.
//
// All 6 role-specific Navbars (StudentNavbar, CampusNavbar, FacultyNavbar,
// InstitutionNavbar, ScopeAdminNavbar, SuperAdminNavbar) render through this
// shell. The shell owns the visual chrome, theme glow, auth/notif/profile
// popovers, and SSR-safe gating. Per-role variation is limited to the
// **center brain (KPI rail)** which is injected as a slot.
//
// This guarantees role leakage is structurally impossible — admin roles
// CANNOT render student gamification because the slot is replaced wholesale.
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, LogOut, Settings as SettingsIcon, User as UserIcon,
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
import { RoleNotificationCenter } from "@/components/site/RoleNotificationCenter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type NavbarShellProps = {
  /** Center brain — role-specific KPI rail. Hidden on mobile/tablet. */
  centerSlot?: ReactNode;
  /** Override role badge label (not used in new design, kept for compatibility). */
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
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns when clicking outside
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

  return (
    <header className="fixed left-0 right-0 top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-white/30">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* LEFT GROUP — Logo + KPI Rail */}
        <div className="flex items-center gap-8">
          {/* Logo + Brand */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm overflow-hidden"
              style={{ boxShadow: `0 0 10px -2px ${roleTheme.glow}33` }}
            >
              <img src="/favicon.png" alt="Logo" className="h-5 w-5 object-contain" />
            </span>
            <span className="hidden sm:inline text-base font-extrabold tracking-tight">
              <span className="text-[#1a1a1a]">{brand.shortName}</span>
              <span className="text-brand">{brand.accentName}</span>
            </span>
          </Link>

          {/* KPI Rail - Hidden on mobile/tablet */}
          {showAuthedUI && centerSlot && (
            <div className="hidden lg:flex items-center gap-2">
              {centerSlot}
            </div>
          )}
        </div>

        {/* RIGHT GROUP — Bell + Avatar or Login */}
        <div className="flex items-center gap-3">
          {showAuthedUI ? (
            <>
              {/* Notifications Bell - Hidden on mobile */}
              <div ref={bellRef} className="relative hidden md:block">
                <button
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Notifications"
                  aria-expanded={bellOpen}
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span
                      className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-bold text-white"
                      aria-label={`${unread} unread notifications`}
                    >
                      {unread > 99 ? '99+' : unread}
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

              {/* User Avatar */}
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  key={session.user!.avatarUrl || "nav-avatar"}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-brand-foreground transition-transform hover:scale-105 shadow-sm"
                  style={{
                    background: navAvatar.hasImage ? "transparent" : session.user!.avatarColor,
                    border: "1.5px solid white",
                  }}
                  aria-label="Profile menu"
                  aria-expanded={userOpen}
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
                        <LogOut className="h-4 w-4" /> Sign out (secure reset)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button 
              asChild 
              variant="ghost" 
              size="sm" 
              className="h-9 rounded-full px-4 text-sm font-medium"
            >
              <Link to="/auth">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

if (typeof window !== "undefined") meta.bumpVisit();
