// Convenience hooks for plug-and-play config consumers.
// Config is static at load time, so these are just typed accessors —
// no subscriptions needed. Keeps component code clean & swappable.
import { brand, isFeatureEnabled, listCampuses, platformConfig, type FeatureFlags } from "@/lib/platform-config";

export function useBrand() {
  return brand();
}

export function useFeature(flag: keyof FeatureFlags): boolean {
  return isFeatureEnabled(flag);
}

export function useCampuses() {
  return listCampuses();
}

export function usePlatform() {
  return platformConfig;
}
