import { createFileRoute } from "@tanstack/react-router";
import { ScopeAdminVisitsPage } from "@/components/scope-admin/ScopeAdminPages";

export const Route = createFileRoute("/scope-admin/visits")({
  head: () => ({ meta: [{ title: "Scope Admin Visits · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: ScopeAdminVisitsPage,
});
