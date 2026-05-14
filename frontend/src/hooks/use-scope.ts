import { useSyncExternalStore, useRef, useCallback } from "react";
import { subscribe, auth, xp, streak, notifications, profileStrength, type ScopeUser } from "@/lib/scope-store";

/**
 * useStore — caches the snapshot value and only recomputes after a store-change event.
 * Returning fresh object/array refs from getSnapshot on every render causes
 * "Maximum update depth exceeded" with useSyncExternalStore. We solve that by
 * memoizing the value and a version counter that bumps on subscribe callbacks.
 */
function useStore<T>(getSnap: () => T): T {
  const cacheRef = useRef<{ value: T; hasValue: boolean }>({ value: undefined as unknown as T, hasValue: false });
  const versionRef = useRef(0);

  const subscribeFn = useCallback((cb: () => void) => {
    return subscribe(() => {
      // Invalidate cache and notify React
      cacheRef.current.hasValue = false;
      versionRef.current++;
      cb();
    });
  }, []);

  const getSnapshot = useCallback(() => {
    if (!cacheRef.current.hasValue) {
      cacheRef.current.value = getSnap();
      cacheRef.current.hasValue = true;
    }
    return cacheRef.current.value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useSyncExternalStore(subscribeFn, getSnapshot, () => null as unknown as T);
}

export function useUser(): ScopeUser | null {
  return useStore(() => auth.getUser());
}
export function useIsLoggedIn(): boolean {
  return useStore(() => auth.isLoggedIn());
}
export function useXP(): number {
  return useStore(() => xp.get());
}
export function useLevel() {
  return useStore(() => xp.level());
}
export function useLevelProgress(): number {
  return useStore(() => xp.levelProgress());
}
export function useStreak(): number {
  return useStore(() => streak.count());
}
export function useUnreadNotifications(role?: string): number {
  return useStore(() => notifications.unread(role));
}
export function useNotifications(role?: string) {
  return useStore(() => (role ? notifications.forRole(role) : notifications.all()));
}
export function useProfileStrength(): number {
  return useStore(() => profileStrength(auth.getUser()));
}

export function useStoreValue<T>(getter: () => T): T {
  return useStore(getter);
}
