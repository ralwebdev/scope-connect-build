import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light";
const KEY = "scope_theme";

function resolve(): "light" {
  return "light";
}

export function applyTheme(_mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("dark");
}

function read(): ThemeMode {
  return "light";
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => read());

  useEffect(() => {
    applyTheme("light");
  }, [mode]);

  const setTheme = useCallback((_next: ThemeMode) => {
    setMode("light");
    try { localStorage.setItem(KEY, "light"); } catch { /* noop */ }
    applyTheme("light");
  }, []);

  const toggle = useCallback(() => {
    setTheme("light");
  }, [mode, setTheme]);

  return { mode, resolved: resolve(), setTheme, toggle };
}
