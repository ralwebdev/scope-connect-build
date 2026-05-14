// Interactive metric card for Super Admin dashboards.
// Rule: every card is an entry point, never a dead end. Every card supports:
//   1) View Details   -> opens a right-side Sheet drawer with breakdown
//   2) Deep Dive      -> navigates to a related detail page
//   3) Inline expand  -> toggles a small chart/breakdown below the card
import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DrilldownLevel = {
  /** Label like "Institution-wise breakdown". */
  label: string;
  /** Rendered inside the drawer. Should be small/medium content. */
  content: ReactNode;
};

export type DrilldownCardProps = {
  title: string;
  value: string | number;
  delta?: string;
  icon: ComponentType<{ className?: string }>;
  accent?: boolean;
  /** Right-side drawer drilldown levels (progressive disclosure). */
  levels: DrilldownLevel[];
  /** Optional inline chart/breakdown rendered below the card. */
  inline?: ReactNode;
  /** Optional deep-dive route to navigate to. */
  deepDiveTo?: "/scope-super-admin" | "/scope-admin" | "/institution-admin" | "/institution-admin/analytics" | "/scope-super-admin/rbac-audit" | "/admin";
  deepDiveLabel?: string;
};

export function DrilldownCard({
  title,
  value,
  delta,
  icon: Icon,
  accent = false,
  levels,
  inline,
  deepDiveTo,
  deepDiveLabel = "Deep dive",
}: DrilldownCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeLevel, setActiveLevel] = useState(0);
  const [inlineOpen, setInlineOpen] = useState(false);

  return (
    <>
      <Card
        className={cn(
          "group p-4 transition-all hover:border-brand/40 hover:shadow-elegant",
          accent && "border-brand/30 bg-gradient-to-br from-brand/5 to-transparent",
        )}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="block w-full text-left"
          aria-label={`Open ${title} details`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{title}</span>
            <Icon className={cn("h-4 w-4", accent ? "text-brand" : "text-muted-foreground")} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-xl font-bold">{value}</div>
            {delta && (
              <Badge variant="outline" className="text-[10px]">
                {delta}
              </Badge>
            )}
          </div>
        </button>

        <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-2 opacity-70 transition-opacity group-hover:opacity-100">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => setDrawerOpen(true)}
          >
            <Eye className="mr-1 h-3 w-3" /> Details
          </Button>
          {inline && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => setInlineOpen((v) => !v)}
              aria-expanded={inlineOpen}
            >
              {inlineOpen ? (
                <ChevronUp className="mr-1 h-3 w-3" />
              ) : (
                <ChevronDown className="mr-1 h-3 w-3" />
              )}
              Chart
            </Button>
          )}
          {deepDiveTo && (
            <Button asChild size="sm" variant="ghost" className="ml-auto h-7 px-2 text-[11px]">
              <Link to={deepDiveTo}>
                {deepDiveLabel} <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>

        {inline && inlineOpen && (
          <div className="mt-3 rounded-lg border border-dashed border-border/60 p-3">
            {inline}
          </div>
        )}
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-brand" /> {title}
            </SheetTitle>
            <SheetDescription>
              Progressive disclosure — step down from summary to detail.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex items-baseline gap-2">
            <div className="text-3xl font-bold">{value}</div>
            {delta && <Badge variant="outline">{delta}</Badge>}
          </div>

          {/* Level breadcrumb */}
          <div className="mt-4 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            {levels.map((lvl, idx) => (
              <button
                key={lvl.label}
                type="button"
                onClick={() => setActiveLevel(idx)}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono",
                  idx === activeLevel
                    ? "bg-secondary text-foreground"
                    : "hover:bg-secondary/60",
                )}
              >
                L{idx + 1}: {lvl.label}
              </button>
            ))}
          </div>

          <div className="mt-4">{levels[activeLevel]?.content}</div>

          <div className="mt-6 flex flex-wrap gap-2">
            {activeLevel < levels.length - 1 && (
              <Button
                size="sm"
                onClick={() => setActiveLevel((i) => Math.min(levels.length - 1, i + 1))}
              >
                Step down →
              </Button>
            )}
            {activeLevel > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveLevel((i) => Math.max(0, i - 1))}
              >
                ← Step up
              </Button>
            )}
            {deepDiveTo && (
              <Button asChild size="sm" variant="outline" className="ml-auto">
                <Link to={deepDiveTo} onClick={() => setDrawerOpen(false)}>
                  {deepDiveLabel} <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
