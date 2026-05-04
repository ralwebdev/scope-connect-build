import { createFileRoute } from "@tanstack/react-router";
import { Route as Parent } from "./institution-admin";

const ParentComponent = Parent.options.component!;

export const Route = createFileRoute("/institution-admin/members")({
  head: () => ({ meta: [{ title: "Institution Members · Scope Connect" }, { name: "robots", content: "noindex" }] }),
  component: MembersRoute,
});

function MembersRoute() {
  return <ParentComponent />;
}
