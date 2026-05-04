import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/**
 * Compact appearance switcher used in the navbar.
 * Renders a placeholder until mounted to avoid SSR/CSR mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && resolved === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch appearance"
      title="Switch appearance"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Sun className={cn("h-4.5 w-4.5 absolute transition-all duration-250", isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100")} />
      <Moon className={cn("h-4.5 w-4.5 absolute transition-all duration-250", isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0")} />
    </button>
  );
}
