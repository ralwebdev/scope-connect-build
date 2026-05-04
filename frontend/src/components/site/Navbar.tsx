// Backwards-compat shim. The Navbar is now a per-role dispatcher — see
// RoleNavbar.tsx. AppShell imports `Navbar` from here so existing route
// files don't need to change.
export { RoleNavbar as Navbar } from "@/components/site/RoleNavbar";
