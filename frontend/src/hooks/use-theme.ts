import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "scope_theme";

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolve(mode);
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function read(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }
  return "system";
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => read());

  useEffect(() => {
    applyTheme(mode);

    if (mode === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        applyTheme("system");
      };
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
  }, [mode]);

  const setTheme = useCallback((next: ThemeMode) => {
    setMode(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // noop
    }
  }, []);

  const toggle = useCallback(() => {
    const currentResolved = resolve(mode);
    const next: ThemeMode = currentResolved === "dark" ? "light" : "dark";
    setTheme(next);
  }, [mode, setTheme]);

  return { mode, resolved: resolve(mode), setTheme, toggle };
}
