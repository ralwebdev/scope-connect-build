// Global forms dropdown — the ONLY way to launch a form.
// Searchable, grouped by domain, permission-filtered. Anything not in the
// registry simply cannot be launched, eliminating typo'd / stale form links.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, Search, Lock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/use-rbac";
import { rbac } from "@/lib/rbac";
import { FORM_GROUPS, FORM_REGISTRY, type FormDefinition } from "@/lib/forms-registry";

export function FormsLauncher({ compact = false }: { compact?: boolean }) {
  const role = useRole();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allowed = useMemo(
    () => FORM_REGISTRY.filter((f) => rbac.hasPermission(role, f.permission)),
    [role],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allowed;
    return allowed.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.formId.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q) ||
        f.group.toLowerCase().includes(q),
    );
  }, [allowed, query]);

  const grouped: Record<string, FormDefinition[]> = useMemo(() => {
    const out: Record<string, FormDefinition[]> = {};
    for (const g of FORM_GROUPS) out[g] = [];
    for (const f of filtered) out[f.group].push(f);
    return out;
  }, [filtered]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          aria-label="Open forms launcher"
        >
          <ClipboardList className="h-4 w-4" />
          {!compact && <span>Forms</span>}
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            {allowed.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] p-0"
        sideOffset={8}
      >
        <div className="border-b border-border p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">Forms registry</div>
            <Badge variant="outline" className="text-[10px]">
              <Lock className="mr-1 h-3 w-3" /> whitelist
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Strict whitelist — every form lives here.
          </p>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search forms…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-1">
          {allowed.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No forms available for your role.
            </div>
          )}

          {allowed.length > 0 && filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matches for “{query}”.
            </div>
          )}

          {FORM_GROUPS.map((g) => {
            const items = grouped[g];
            if (!items || items.length === 0) return null;
            return (
              <div key={g} className="mt-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g}
                </div>
                {items.map((f) => (
                  <Link
                    key={f.formId}
                    to="/forms/$formSlug"
                    params={{ formSlug: f.route.replace(/^\/forms\//, "") }}
                    onClick={() => setOpen(false)}
                    className="group block rounded-md px-2 py-2 hover:bg-secondary"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {f.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {f.formId}
                      </span>
                    </div>
                    {f.description && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {f.description}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
