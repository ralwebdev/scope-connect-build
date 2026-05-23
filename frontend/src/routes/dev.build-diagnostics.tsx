// Developer-only build diagnostics panel.
// Inspects the static route inventory for the failure modes we've actually
// hit (e.g. component: Parent.options.component → MemberExpression which
// the TanStack code-splitter rejects). Surfaces root cause + suggested fix
// inline so we never have to dig through the build log again.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wrench, FileWarning, FileCheck2, Code2, Search, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRole } from "@/hooks/use-rbac";
import { ROUTE_INVENTORY, type RouteEntry } from "@/lib/route-inventory";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/build-diagnostics")({
  head: () => ({ meta: [{ title: "Build Diagnostics · Dev" }, { name: "robots", content: "noindex" }] }),
  component: BuildDiagnosticsPage,
});

type Diagnostic = {
  route: RouteEntry;
  severity: "ok" | "info" | "warn" | "error";
  rootCause: string;
  suspectedComponent: string;
  errorBoundary: string;
  patchSummary: string;
  exampleFix: string;
};

function analyze(route: RouteEntry): Diagnostic {
  if (route.componentExpression === "MemberExpression") {
    return {
      route,
      severity: "error",
      rootCause: "Route `component` is a MemberExpression (e.g. `Parent.options.component`). TanStack's code-splitter cannot serialize this — build fails with `Unexpected splitNode type ☝️: MemberExpression`.",
      suspectedComponent: "component: <imported>.options.component",
      errorBoundary: "tanstack-router:code-splitter:compile-virtual-file",
      patchSummary: "Wrap the borrowed component in a local function and pass that function as `component`.",
      exampleFix: `const ParentComponent = Parent.options.component!;\n\nexport const Route = createFileRoute("${route.path}")({\n  component: ChildRoute,\n});\n\nfunction ChildRoute() {\n  return <ParentComponent />;\n}`,
    };
  }
  if (route.componentExpression === "ArrowFunction") {
    return {
      route,
      severity: "warn",
      rootCause: "Inline arrow function as `component` is bundled into the critical chunk and bypasses code-splitting.",
      suspectedComponent: "component: () => <Page />",
      errorBoundary: "n/a (perf, not build)",
      patchSummary: "Move the arrow into a named function declaration above the route.",
      exampleFix: `function ${route.path.replaceAll("/", "_") || "Index"}Page() { return <Page />; }\n\nexport const Route = createFileRoute("${route.path}")({\n  component: ${route.path.replaceAll("/", "_") || "Index"}Page,\n});`,
    };
  }
  if (route.componentExpression === "WrapperFunction") {
    return {
      route,
      severity: "ok",
      rootCause: "Wrapper function pattern — splitter-safe and preferred for child routes that reuse a parent component.",
      suspectedComponent: "component: WrapperFn",
      errorBoundary: "n/a",
      patchSummary: "No change needed.",
      exampleFix: "// already conformant",
    };
  }
  return {
    route,
    severity: "ok",
    rootCause: "Direct function declaration as `component`. Splitter-safe, type-safe.",
    suspectedComponent: "component: NamedFn",
    errorBoundary: "n/a",
    patchSummary: "No change needed.",
    exampleFix: "// already conformant",
  };
}

function BuildDiagnosticsPage() {
  const role = useRole();
  const allowed = role === "scope_super_admin" || role === "super_admin";

  const diagnostics = useMemo(() => ROUTE_INVENTORY.map(analyze), []);
  const [filter, setFilter] = useState<"all" | "error" | "warn" | "ok">("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = diagnostics.filter((d) => {
    if (filter !== "all" && d.severity !== filter) return false;
    if (search && !`${d.route.path} ${d.route.file} ${d.rootCause}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = useMemo(() => ({
    total: diagnostics.length,
    errors: diagnostics.filter((d) => d.severity === "error").length,
    warns: diagnostics.filter((d) => d.severity === "warn").length,
    ok: diagnostics.filter((d) => d.severity === "ok").length,
  }), [diagnostics]);

  if (!allowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="full_system_access"
          title="Developer panel"
          message="Build diagnostics is restricted to developers (Super Admin role)."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RbacSidebar title="Build Diagnostics">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="mb-2"><Wrench className="mr-1 h-3 w-3" /> Developer · Diagnostics</Badge>
              <h1 className="text-3xl font-bold tracking-tight">Build Diagnostics</h1>
              <p className="mt-1 text-sm text-muted-foreground">Static route inspection — root cause, suspected component, suggested fix.</p>
            </div>
            <Button asChild variant="outline"><Link to="/scope-super-admin">Back to HQ</Link></Button>
          </header>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Routes scanned" value={counts.total} icon={FileCheck2} />
            <Stat label="Hard errors" value={counts.errors} icon={FileWarning} tone="red" />
            <Stat label="Warnings" value={counts.warns} icon={AlertTriangle} tone="yellow" />
            <Stat label="Conformant" value={counts.ok} icon={FileCheck2} tone="green" />
          </div>

          <Tabs defaultValue="inspector" className="mt-6">
            <TabsList>
              <TabsTrigger value="inspector">Route Inspector</TabsTrigger>
              <TabsTrigger value="pipeline">Build Pipeline</TabsTrigger>
            </TabsList>

            <TabsContent value="inspector" className="mt-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search route or file…" className="h-8 max-w-xs text-xs" />
                  <div className="ml-auto flex gap-1.5">
                    {(["all", "error", "warn", "ok"] as const).map((f) => (
                      <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 divide-y divide-border">
                  {filtered.map((d) => {
                    const id = d.route.path;
                    const open = openId === id;
                    return (
                      <div key={id} className="py-2.5">
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : id)}
                          className="flex w-full items-center justify-between gap-2 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={d.severity === "error" ? "destructive" : d.severity === "warn" ? "outline" : "secondary"}
                                className={cn(
                                  "text-[10px] capitalize",
                                  d.severity === "warn" && "border-yellow-500/50 text-yellow-700",
                                  d.severity === "ok" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                                )}
                              >
                                {d.severity}
                              </Badge>
                              <span className="font-mono text-xs text-foreground">{d.route.path}</span>
                              <span className="truncate text-[10px] text-muted-foreground">{d.route.file}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{d.rootCause}</p>
                          </div>
                          <Code2 className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
                        </button>
                        {open && (
                          <div className="mt-2 grid gap-3 rounded-lg border border-border bg-secondary/30 p-3 text-xs sm:grid-cols-2">
                            <Field label="Root cause">{d.rootCause}</Field>
                            <Field label="Suspected component">{d.suspectedComponent}</Field>
                            <Field label="Error boundary">{d.errorBoundary}</Field>
                            <Field label="Patch summary">{d.patchSummary}</Field>
                            <div className="sm:col-span-2">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Example fix</div>
                              <pre className="mt-1 overflow-x-auto rounded-md bg-background/80 p-3 text-[11px] leading-relaxed">
                                <code>{d.exampleFix}</code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No diagnostics for current filter.</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="pipeline" className="mt-4">
              <Card className="p-5">
                <h3 className="text-sm font-bold">Build pipeline</h3>
                <ol className="mt-3 space-y-2 text-xs">
                  {[
                    { name: "route_scan", desc: "Scan all TanStack route definitions" },
                    { name: "expression_validation", desc: "Ensure no unsupported component expressions exist" },
                    { name: "export_contract_check", desc: "Verify every route exports a direct wrapper component" },
                    { name: "lint_and_fail_fast", desc: "Block build on validation failure" },
                  ].map((step, i) => (
                    <li key={step.name} className="flex items-start gap-3 rounded-lg border border-border bg-card/40 p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-bold text-brand-foreground">{i + 1}</span>
                      <div>
                        <div className="font-mono text-xs text-foreground">{step.name}</div>
                        <div className="text-muted-foreground">{step.desc}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                  <RuleCard label="No inline anonymous routes" />
                  <RuleCard label="No dynamic component resolution without wrapper" />
                  <RuleCard label="Require explicit route export" />
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </RbacSidebar>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-foreground">{children}</div>
    </div>
  );
}

function RuleCard({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="text-foreground">{label}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">Enforced · fail fast</div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone = "default" }: { label: string; value: number; icon: typeof FileCheck2; tone?: "default" | "red" | "yellow" | "green" }) {
  const toneCls = tone === "red" ? "border-destructive/40 text-destructive"
    : tone === "yellow" ? "border-yellow-500/40 text-yellow-700"
    : tone === "green" ? "border-emerald-500/40 text-emerald-700"
    : "";
  return (
    <Card className={cn("p-4", toneCls)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </Card>
  );
}
