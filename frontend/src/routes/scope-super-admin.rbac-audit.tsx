// Super Admin RBAC audit dashboard — enumerates every (role × route) pair,
// computes access status against the live permission map, and flags
// problems: missing permissions, conflicts (route requires no permission
// but role lacks dashboard view), and over-privileged roles.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Brain, ShieldAlert, AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { RbacSidebar } from "@/components/site/RbacSidebar";
import { AccessDenied } from "@/components/site/AccessDenied";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRole } from "@/hooks/use-rbac";
import { rbac, ALL_ROLES, ALL_PERMISSIONS, ROLE_LABELS, type RoleId, type PermissionKey } from "@/lib/rbac";
import { ROUTE_INVENTORY } from "@/lib/route-inventory";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scope-super-admin/rbac-audit")({
  head: () => ({ meta: [{ title: "RBAC Audit · Scope Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: RbacAuditPage,
});

type AuditRow = {
  role: RoleId;
  path: string;
  file: string;
  action: string;
  permission: PermissionKey | null;
  status: "granted" | "denied" | "open";
  flag: "ok" | "missing_permission" | "conflicting_permission" | "overprivileged_role";
};

function RbacAuditPage() {
  const role = useRole();
  const allowed = role === "scope_super_admin" || role === "super_admin";

  const rows = useMemo<AuditRow[]>(() => {
    const out: AuditRow[] = [];
    for (const r of ALL_ROLES) {
      for (const route of ROUTE_INVENTORY) {
        const perm = route.permission ?? null;
        let status: AuditRow["status"];
        if (!perm) status = "open";
        else status = rbac.hasPermission(r, perm) ? "granted" : "denied";

        let flag: AuditRow["flag"] = "ok";
        // Over-privileged: low-tier role granted on a super-only route.
        if (status === "granted" && route.group === "super" && r === "viewer") flag = "overprivileged_role";
        // Conflicting: route is open but the role lacks even view_dashboard.
        if (status === "open" && route.group !== "public" && route.group !== "auth" && route.group !== "legal" && !rbac.hasPermission(r, "view_dashboard")) flag = "conflicting_permission";
        // Missing: a workspace route role expected to use is denied.
        if (status === "denied" && route.group === "workspace" && (r === "student" || r === "campus_leader")) flag = "missing_permission";
        out.push({
          role: r,
          path: route.path,
          file: route.file,
          action: route.description,
          permission: perm,
          status,
          flag,
        });
      }
    }
    return out;
  }, []);

  const [filterRole, setFilterRole] = useState<"all" | RoleId>("all");
  const [filterFlag, setFilterFlag] = useState<"all" | AuditRow["flag"]>("all");
  const [search, setSearch] = useState("");

  const filtered = rows.filter((r) => {
    if (filterRole !== "all" && r.role !== filterRole) return false;
    if (filterFlag !== "all" && r.flag !== filterFlag) return false;
    if (search && !`${r.path} ${r.action} ${r.permission ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = useMemo(() => ({
    total: rows.length,
    flagged: rows.filter((r) => r.flag !== "ok").length,
    missing: rows.filter((r) => r.flag === "missing_permission").length,
    conflicting: rows.filter((r) => r.flag === "conflicting_permission").length,
    over: rows.filter((r) => r.flag === "overprivileged_role").length,
  }), [rows]);

  if (!allowed) {
    return (
      <AppShell>
        <AccessDenied
          role={role}
          required="manage_roles"
          title="RBAC audit restricted"
          message="Only Scope Super Admins can review the RBAC audit matrix."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RbacSidebar title="RBAC Audit">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="mb-2"><Brain className="mr-1 h-3 w-3" /> Super Admin · Audit</Badge>
              <h1 className="text-3xl font-bold tracking-tight">RBAC Audit Matrix</h1>
              <p className="mt-1 text-sm text-muted-foreground">Every role × every route. Conflicts surfaced automatically.</p>
            </div>
            <Button asChild variant="outline"><Link to="/scope-super-admin">Back to Command Center</Link></Button>
          </header>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Pairs evaluated" value={counts.total} icon={CheckCircle2} />
            <StatCard label="Missing permissions" value={counts.missing} icon={ShieldAlert} tone="red" />
            <StatCard label="Conflicting" value={counts.conflicting} icon={AlertTriangle} tone="yellow" />
            <StatCard label="Over-privileged" value={counts.over} icon={AlertTriangle} tone="orange" />
          </div>

          <Tabs defaultValue="table" className="mt-6">
            <TabsList>
              <TabsTrigger value="table">Audit Table</TabsTrigger>
              <TabsTrigger value="matrix">Role Matrix</TabsTrigger>
              <TabsTrigger value="heatmap">Coverage Heatmap</TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as "all" | RoleId)} className="rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                    <option value="all">All roles</option>
                    {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <select value={filterFlag} onChange={(e) => setFilterFlag(e.target.value as "all" | AuditRow["flag"])} className="rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                    <option value="all">All flags</option>
                    <option value="ok">OK</option>
                    <option value="missing_permission">Missing</option>
                    <option value="conflicting_permission">Conflicting</option>
                    <option value="overprivileged_role">Over-privileged</option>
                  </select>
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search route, action, permission…" className="ml-auto h-8 max-w-xs text-xs" />
                </div>
                <div className="mt-3 max-h-[60vh] overflow-auto">
                  <table className="w-full min-w-[900px] text-xs table-fixed">
                    <colgroup>
                      <col className="w-[140px]" />
                      <col className="w-[200px]" />
                      <col />
                      <col className="w-[160px]" />
                      <col className="w-[110px]" />
                      <col className="w-[160px]" />
                    </colgroup>
                    <thead className="sticky top-0 bg-card text-[10px] uppercase text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="py-2 pr-3 text-left">Role</th>
                        <th className="py-2 pr-3 text-left">Route</th>
                        <th className="py-2 pr-3 text-left">Action</th>
                        <th className="py-2 pr-3 text-left">Permission</th>
                        <th className="py-2 pr-3 text-left">Status</th>
                        <th className="py-2 pr-3 text-left">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 600).map((r, i) => (
                        <tr key={i} className={cn(
                          "border-b border-border/40 align-top",
                          r.flag === "missing_permission" && "bg-destructive/10",
                          r.flag === "conflicting_permission" && "bg-yellow-500/10",
                          r.flag === "overprivileged_role" && "bg-orange-500/10",
                        )}>
                          <td className="py-1.5 pr-3 font-semibold truncate">{ROLE_LABELS[r.role]}</td>
                          <td className="py-1.5 pr-3 font-mono text-muted-foreground truncate" title={r.path}>{r.path}</td>
                          <td className="py-1.5 pr-3 break-words">{r.action}</td>
                          <td className="py-1.5 pr-3 font-mono text-[10px] text-muted-foreground truncate" title={r.permission ?? "—"}>{r.permission ?? "—"}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">
                            <Badge variant={r.status === "granted" ? "default" : r.status === "denied" ? "destructive" : "outline"} className="text-[10px]">{r.status}</Badge>
                          </td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] capitalize">{r.flag.replace(/_/g, " ")}</Badge>
                          </td>
                        </tr>
                      ))}
                      {filtered.length > 600 && (
                        <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">Showing first 600 of {filtered.length} rows. Add a filter to narrow.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="matrix" className="mt-4">
              <Card className="p-4 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky left-0 bg-card py-2 pr-2 text-left text-[10px] uppercase text-muted-foreground">Role</th>
                      {ROUTE_INVENTORY.filter(r => r.permission).map((r) => (
                        <th key={r.path} className="py-2 px-1 text-left text-[10px] font-mono text-muted-foreground" title={r.description}>
                          {r.path.replace("/scope-super-admin/", "/sa/").replace("/institution-admin/", "/i/")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_ROLES.map((r) => (
                      <tr key={r} className="border-b border-border/40">
                        <td className="sticky left-0 bg-card py-1.5 pr-2 font-semibold">{ROLE_LABELS[r]}</td>
                        {ROUTE_INVENTORY.filter(rt => rt.permission).map((rt) => {
                          const ok = rbac.hasPermission(r, rt.permission!);
                          return (
                            <td key={rt.path} className="px-1 py-1.5 text-center">
                              <span className={cn("inline-block h-3 w-3 rounded-sm", ok ? "bg-emerald-500" : "bg-destructive/40")} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </TabsContent>

            <TabsContent value="heatmap" className="mt-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Permission coverage per role (granted permissions / total).</p>
                <div className="mt-3 space-y-2">
                  {ALL_ROLES.map((r) => {
                    const granted = ALL_PERMISSIONS.filter((p) => rbac.hasPermission(r, p)).length;
                    const pct = Math.round((granted / ALL_PERMISSIONS.length) * 100);
                    return (
                      <div key={r}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{ROLE_LABELS[r]}</span>
                          <span className="text-muted-foreground">{granted}/{ALL_PERMISSIONS.length} · {pct}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </RbacSidebar>
    </AppShell>
  );
}

function StatCard({ label, value, icon: Icon, tone = "default" }: { label: string; value: number; icon: typeof CheckCircle2; tone?: "default" | "red" | "yellow" | "orange" }) {
  const toneCls = tone === "red" ? "border-destructive/40 text-destructive"
    : tone === "yellow" ? "border-yellow-500/40 text-yellow-700 dark:text-yellow-300"
    : tone === "orange" ? "border-orange-500/40 text-orange-700 dark:text-orange-300"
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
