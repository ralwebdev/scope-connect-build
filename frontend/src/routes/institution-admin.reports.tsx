import { createFileRoute } from "@tanstack/react-router";
import { Route as Parent } from "./institution-admin";

const ParentComponent = Parent.options.component!;

export const Route = createFileRoute("/institution-admin/reports")({
  head: () => ({ meta: [{ title: "Scope Connect | Institution Reports" }, { name: "robots", content: "noindex" }] }),
  component: ReportsRoute,
});

function ReportsRoute() {
  return <ParentComponent />;
}
