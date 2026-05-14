// Unified RBAC session hook — single source of truth for nav/sidebar/guards.
// Returns { ready, isAuthenticated, role, permissions, user, canAccess }.
//
// `ready` is false during SSR and the very first client paint to keep markup
// identical between server and hydration (prevents React #418/#425). After
// mount it flips to true and downstream nav can render role-specific UI.
import { useEffect, useState } from "react";
import { useIsLoggedIn, useUser } from "@/hooks/use-scope";
import { useRole } from "@/hooks/use-rbac";
import { rbac, type PermissionKey, type RoleId } from "@/lib/rbac";
import type { ScopeUser } from "@/lib/scope-store";

export type UserSession = {
  ready: boolean;
  isAuthenticated: boolean;
  role: RoleId;
  permissions: PermissionKey[];
  user: ScopeUser | null;
  canAccess: (permission: PermissionKey) => boolean;
};

export function useUserSession(): UserSession {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isAuthedRaw = useIsLoggedIn();
  const user = useUser();
  const role = useRole();

  const ready = mounted;
  const isAuthenticated = mounted && isAuthedRaw;
  // Collapse to viewer until session has hydrated to avoid leakage.
  const safeRole: RoleId = isAuthenticated ? role : "viewer";
  const permissions = isAuthenticated ? rbac.permissionsFor(safeRole) : [];

  return {
    ready,
    isAuthenticated,
    role: safeRole,
    permissions,
    user: isAuthenticated ? user : null,
    canAccess: (permission) => rbac.hasPermission(safeRole, permission),
  };
}
