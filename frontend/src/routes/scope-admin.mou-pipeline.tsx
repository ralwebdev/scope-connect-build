import { createFileRoute } from "@tanstack/react-router";
import { ScopeAdminMouPipelinePage } from "@/components/scope-admin/ScopeAdminPages";

export const Route = createFileRoute("/scope-admin/mou-pipeline")({
  head: () => ({ meta: [{ title: "Scope Admin MoU Pipeline · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: ScopeAdminMouPipelinePage,
});
