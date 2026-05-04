import { createFileRoute } from "@tanstack/react-router";
import { Route as Parent } from "./institution-admin";

const ParentComponent = Parent.options.component!;

export const Route = createFileRoute("/institution-admin/communications")({
  head: () => ({ meta: [{ title: "Institution Communications · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: CommunicationsRoute,
});

function CommunicationsRoute() {
  return <ParentComponent />;
}
