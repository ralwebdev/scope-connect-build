import { createFileRoute } from "@tanstack/react-router";
import { ScopeAdminInstitutionsPage } from "@/components/scope-admin/ScopeAdminPages";

export const Route = createFileRoute("/scope-admin/institutions")({
  head: () => ({ meta: [{ title: "Scope Admin Institutions · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: ScopeAdminInstitutionsPage,
});
