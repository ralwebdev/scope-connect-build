import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";
const KEY = "scope_theme";

function resolve(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolve(mode) === "dark");
}

function read(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(KEY) as ThemeMode | null;
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch { /* noop */ }
  return "system";
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => read());

  // React to system preference changes when mode === "system".
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode]);

  // React to changes from other tabs / settings page.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setMode(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setMode(next);
    try { localStorage.setItem(KEY, next); } catch { /* noop */ }
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    const current = resolve(mode);
    setTheme(current === "dark" ? "light" : "dark");
  }, [mode, setTheme]);

  return { mode, resolved: resolve(mode), setTheme, toggle };
}
