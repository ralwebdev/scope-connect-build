// React hooks bridging RBAC + scope-store reactivity.
import { useStoreValue, useUser } from "@/hooks/use-scope";
import { rbac, roleFromEmail, type PermissionKey, type RoleId } from "@/lib/rbac";

export function useRole(): RoleId {
  // Subscribes to store changes (auth + role-override events both bump
  // scope:store-change). Recomputes role on every change.
  // CRITICAL: respect the loggedIn flag — once a user signs out we must
  // collapse to "viewer" immediately, even if a stale profile blob is
  // mid-flight to being cleared. This prevents stale role/sidebar leakage.
  return useStoreValue(() => {
    if (typeof window === "undefined") return "viewer";
    try {
      const loggedIn = localStorage.getItem("scope_logged_in");
      if (loggedIn !== "true") return "viewer";
      const raw = localStorage.getItem("scope_user_profile");
      const u = raw ? (JSON.parse(raw) as { email?: string }) : null;
      return roleFromEmail(u?.email);
    } catch {
      return "viewer";
    }
  });
}

export function usePermission(permission: PermissionKey): boolean {
  const role = useRole();
  return useStoreValue(() => rbac.hasPermission(role, permission));
}

export function usePermissions(): PermissionKey[] {
  const role = useRole();
  return useStoreValue(() => rbac.permissionsFor(role));
}

export function useCurrentRoleAndUser() {
  const role = useRole();
  const user = useUser();
  return { role, user };
}
