import { createFileRoute } from "@tanstack/react-router";
import { ScopeAdminReportsPage } from "@/components/scope-admin/ScopeAdminPages";

export const Route = createFileRoute("/scope-admin/reports")({
  head: () => ({ meta: [{ title: "Scope Admin Reports · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: ScopeAdminReportsPage,
});
