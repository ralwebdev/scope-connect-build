// Unified Scope Verified badge — single source of truth for the platform's
// trust visual. Use everywhere a piece of content has been reviewed and
// approved by the Scope team (challenges, project cards, featured updates,
// notifications, profiles).
//
// Rules:
// - Same icon (ShieldCheck) everywhere
// - Same wording ("Scope Verified")
// - No alternative names ("Scope Official", "Verified by Scope" etc. should
//   migrate to this component over time)
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const SIZE: Record<Size, { wrapper: string; icon: string; label: string }> = {
  sm: {
    wrapper: "h-5 px-1.5 text-[10px] gap-0.5",
    icon: "h-3 w-3",
    label: "text-[10px]",
  },
  md: {
    wrapper: "h-6 px-2 text-xs gap-1",
    icon: "h-3.5 w-3.5",
    label: "text-xs",
  },
};

export function ScopeVerifiedBadge({
  size = "md",
  className,
  showLabel = true,
}: {
  size?: Size;
  className?: string;
  showLabel?: boolean;
}) {
  const s = SIZE[size];
  return (
    <span
      title="Reviewed and approved by Scope"
      aria-label="Scope Verified — Reviewed and approved by Scope"
      className={cn(
        "inline-flex items-center rounded-full border border-cyan/40 bg-primary text-primary-foreground font-semibold shadow-[0_0_0_2px_rgba(0,0,0,0)] ring-1 ring-cyan/20",
        s.wrapper,
        className,
      )}
    >
      <ShieldCheck className={cn("text-cyan", s.icon)} />
      {showLabel && <span className={cn(s.label, "tracking-tight")}>Scope Verified</span>}
    </span>
  );
}
