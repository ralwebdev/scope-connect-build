import { createFileRoute } from "@tanstack/react-router";
import { Route as Parent } from "./institution-admin";

const ParentComponent = Parent.options.component!;

export const Route = createFileRoute("/institution-admin/analytics")({
  head: () => ({ meta: [{ title: "Institution Analytics · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: AnalyticsRoute,
});

function AnalyticsRoute() {
  return <ParentComponent />;
}
