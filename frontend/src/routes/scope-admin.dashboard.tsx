import { createFileRoute } from "@tanstack/react-router";
import { ScopeAdminDashboardPage } from "@/components/scope-admin/ScopeAdminPages";

export const Route = createFileRoute("/scope-admin/dashboard")({
  head: () => ({ meta: [{ title: "Scope Admin Dashboard · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: ScopeAdminDashboardPage,
});
