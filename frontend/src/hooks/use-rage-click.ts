// Rage-click proxy: 3+ clicks within 600ms in a ~40px radius.
// Lightweight signal of UI confusion / unresponsive elements.
// No PII captured — only the count, surfaced in /ops.
import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export function useRageClickDetector() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let recent: { x: number; y: number; t: number }[] = [];
    const onClick = (e: MouseEvent) => {
      const now = Date.now();
      recent = recent.filter((c) => now - c.t < 600);
      recent.push({ x: e.clientX, y: e.clientY, t: now });
      if (recent.length >= 3) {
        const close = recent.every((c) => Math.abs(c.x - e.clientX) < 40 && Math.abs(c.y - e.clientY) < 40);
        if (close) {
          analytics.track("rage_click_detected");
          recent = [];
        }
      }
    };
    window.addEventListener("click", onClick, { passive: true });
    return () => window.removeEventListener("click", onClick);
  }, []);
}
