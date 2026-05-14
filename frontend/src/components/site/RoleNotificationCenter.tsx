// 🔔 Role-aware Notification Center.
// Shared between the navbar bell dropdown and the /notifications page.
//
// Behavior contract:
//   • Always lists notifications.forRole(activeRole) — never the raw list,
//     so cross-role leakage is structurally impossible.
//   • Tabs: All · Action Required · Milestones · System.
//   • Pin, Mark read, Mark all read, deep-link via item.href.
//   • Priority order: pinned → critical → high → normal → low → newest.
//
// Variants:
//   • compact (popover inside navbar)  — fixed height, narrow.
//   • full    (page surface)           — wider, taller, more affordances.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell, Trophy, Sparkles, Zap, Users, Heart, Check, Pin, PinOff,
  AlertTriangle, ExternalLink, CheckCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-scope";
import { notifications as notifStore, type Notification } from "@/lib/scope-store";
import { themeForRole } from "@/lib/role-theme";
import type { RoleId } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy, spark: Sparkles, zap: Zap, users: Users, heart: Heart,
};

type TabId = "all" | "action" | "milestones" | "system";

const TABS: { id: TabId; label: string; match: (n: Notification) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "action", label: "Action Required", match: (n) => n.category === "action" || n.priority === "critical" },
  { id: "milestones", label: "Milestones", match: (n) => n.category === "milestone" },
  { id: "system", label: "System", match: (n) => n.category === "system" || n.category === "info" },
];

function timeAgo(at: number) {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function priorityChip(p?: Notification["priority"]) {
  switch (p) {
    case "critical":
      return { label: "Critical", className: "bg-destructive/15 text-destructive border-destructive/30" };
    case "high":
      return { label: "High", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
    case "low":
      return { label: "Low", className: "bg-muted text-muted-foreground border-border" };
    default:
      return null;
  }
}

export function RoleNotificationCenter({
  role,
  variant = "full",
  onItemClick,
}: {
  role: RoleId;
  variant?: "compact" | "full";
  onItemClick?: () => void;
}) {
  const list = useNotifications(role);
  const [tab, setTab] = useState<TabId>("all");
  const theme = themeForRole(role);

  const filtered = useMemo(() => {
    const matcher = TABS.find((t) => t.id === tab)!.match;
    return list.filter(matcher);
  }, [list, tab]);

  const counts = useMemo(() => {
    const map: Record<TabId, number> = { all: 0, action: 0, milestones: 0, system: 0 };
    for (const n of list) {
      if (n.read) continue;
      for (const t of TABS) if (t.match(n)) map[t.id]++;
    }
    return map;
  }, [list]);

  const unread = list.filter((n) => !n.read).length;
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-popover",
        isCompact ? "w-[22rem] shadow-elegant" : "w-full",
      )}
      style={{ ["--nav-glow" as string]: theme.glow } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4" style={{ color: theme.glow }} />
            Notifications
            <span
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: `color-mix(in oklab, ${theme.glow} 18%, transparent)`,
                color: theme.glow,
              }}
            >
              {theme.label}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {unread > 0 ? `${unread} fresh signal${unread === 1 ? "" : "s"}` : "You're all caught up"}
          </div>
        </div>
        {unread > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => notifStore.markAllRead(role)}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
        {TABS.map((t) => {
          const active = tab === t.id;
          const c = counts[t.id];
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              style={
                active
                  ? {
                      background: `color-mix(in oklab, ${theme.glow} 18%, transparent)`,
                      color: theme.glow,
                    }
                  : undefined
              }
            >
              {t.label}
              {c > 0 && (
                <span
                  className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                  style={{ background: theme.glow, color: theme.fg }}
                >
                  {c}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div
        className={cn(
          "divide-y divide-border overflow-y-auto",
          isCompact ? "max-h-[26rem]" : "max-h-[calc(100vh-22rem)] min-h-[18rem]",
        )}
      >
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Nothing here yet for this view.
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = ICONS[n.icon] ?? Sparkles;
            const chip = priorityChip(n.priority);
            const body = (
              <div
                className={cn(
                  "group relative flex gap-3 px-4 py-3 transition-colors",
                  !n.read ? "bg-secondary/30" : "",
                  "hover:bg-secondary/60",
                )}
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `color-mix(in oklab, ${theme.glow} 18%, transparent)`,
                    color: theme.glow,
                  }}
                >
                  {n.priority === "critical" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className={cn("flex-1 text-sm", n.read ? "text-muted-foreground" : "text-foreground")}>
                      {n.text}
                    </p>
                    {n.pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: theme.glow }} />}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{timeAgo(n.at)} ago</span>
                    {chip && (
                      <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px]", chip.className)}>
                        {chip.label}
                      </Badge>
                    )}
                    {n.href && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] opacity-70">
                        <ExternalLink className="h-2.5 w-2.5" /> Open
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      notifStore.togglePin(n.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label={n.pinned ? "Unpin" : "Pin"}
                    title={n.pinned ? "Unpin" : "Pin"}
                  >
                    {n.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                  </button>
                  {!n.read && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        notifStore.markRead(n.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {!n.read && (
                  <span
                    className="absolute right-2 top-3 h-1.5 w-1.5 rounded-full"
                    style={{ background: theme.glow }}
                  />
                )}
              </div>
            );

            if (n.href) {
              return (
                <Link
                  key={n.id}
                  to={n.href}
                  onClick={() => {
                    notifStore.markRead(n.id);
                    onItemClick?.();
                  }}
                  className="block"
                >
                  {body}
                </Link>
              );
            }
            return (
              <div
                key={n.id}
                onClick={() => notifStore.markRead(n.id)}
                className="cursor-pointer"
              >
                {body}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
