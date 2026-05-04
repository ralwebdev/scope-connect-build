import { useStoreValue } from "@/hooks/use-scope";
import { configStore, type RuntimeConfig } from "@/lib/config-store";

export function useConfig(): RuntimeConfig {
  return useStoreValue(() => configStore.get());
}

export function useFeatureFlag(flag: keyof RuntimeConfig["features"]): boolean {
  return useStoreValue(() => configStore.get().features[flag] === true);
}
