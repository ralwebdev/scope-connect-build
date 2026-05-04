// Role-first + permission-driven sidebar.
// 1) Sidebar STRUCTURE comes from the role's blueprint (different per role).
// 2) Permissions act as a second-layer filter to hide individual items.
// 3) Empty groups are removed. If everything is filtered out, falls back to
//    a Dashboard-only view so users are never stranded.
import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useUserSession } from "@/hooks/use-session";
import { rbac, ROLE_LABELS } from "@/lib/rbac";
import { blueprintForRole, FALLBACK_BLUEPRINT, type SidebarGroup } from "@/lib/sidebar-blueprints";

export function RbacSidebar({ children, title }: { children: ReactNode; title?: string }) {
  const session = useUserSession();
  const location = useLocation();

  // Render-gate: don't draw any role-scoped nav until session has hydrated.
  // Combined with Navbar gating, this guarantees zero role leakage on first
  // paint, on refresh, and immediately after sign-out.
  if (!session.ready || !session.isAuthenticated) {
    return <div className="min-h-[calc(100vh-4rem)] w-full">{children}</div>;
  }

  const role = session.role;
  const blueprint = blueprintForRole(role);

  // Permission filter (layer 2) + dedupe by `to` within each group.
  const filteredGroups: SidebarGroup[] = blueprint.groups
    .map((g) => {
      const seen = new Set<string>();
      const items = g.items
        .filter((i) => rbac.hasPermission(role, i.permission))
        .filter((i) => (seen.has(i.to) ? false : (seen.add(i.to), true)));
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);

  const groups = filteredGroups.length > 0 ? filteredGroups : FALLBACK_BLUEPRINT.groups;
  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card/50 lg:block">
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-5">
          <div className="px-2 pb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signed in as</div>
            <div className="mt-1 text-sm font-bold text-foreground">{ROLE_LABELS[role]}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[10px]">{totalItems} routes</Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">{blueprint.layout}</Badge>
            </div>
          </div>
          {groups.map((g) => (
            <div key={g.id} className="mt-4">
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </div>
              <nav className="space-y-0.5">
                {g.items.map((it) => {
                  const active =
                    location.pathname === it.to ||
                    (it.to !== "/dashboard" && location.pathname.startsWith(it.to));
                  return (
                    <Link
                      key={`${g.id}-${it.to}-${it.label}`}
                      to={it.to}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <it.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{it.label}</span>
                      {it.badge && (
                        <Badge variant="outline" className="ml-auto text-[9px]">
                          {it.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        {title && (
          <div className="border-b border-border bg-card/30 px-4 py-3 lg:hidden">
            <span className="text-sm font-semibold">{title}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
