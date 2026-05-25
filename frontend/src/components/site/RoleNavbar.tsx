// 🧭 RoleNavbar — top-level dispatcher.
//
// Per Section H of the Role-Based OS spec, each role gets a STRUCTURALLY
// distinct Navbar component (StudentNavbar, CampusNavbar, ...). Each variant
// renders the shared NavbarShell with its own KPI rail, so:
//   • role leakage is impossible (the wrong KPI rail simply isn't mounted),
//   • each navbar can evolve independently without touching the others,
//   • the visual chrome stays consistent across roles.
import type * as React from "react";
import { useUserSession } from "@/hooks/use-session";
import { NavbarShell } from "@/components/site/NavbarShell";
import {
  StudentKpis, CampusLeaderKpis, FacultyKpis, InstitutionKpis,
  ScopeAdminKpis, SuperAdminKpis, GenericAdminKpis,
} from "@/components/site/RoleKpiBar";
import { ROLE_LABELS, type RoleId } from "@/lib/rbac";

export function StudentNavbar() {
  const session = useUserSession();
  const isVerifiedBuilder = session.user?.student_status === "active";
  return <NavbarShell centerSlot={<StudentKpis />} roleLabel={isVerifiedBuilder ? "Verified Builder" : ROLE_LABELS.student} />;
}

export function CampusNavbar() {
  return <NavbarShell centerSlot={<CampusLeaderKpis />} roleLabel={ROLE_LABELS.campus_leader} />;
}

export function FacultyNavbar() {
  return <NavbarShell centerSlot={<FacultyKpis />} roleLabel={ROLE_LABELS.faculty_coordinator} />;
}

export function InstitutionNavbar() {
  return <NavbarShell centerSlot={<InstitutionKpis />} roleLabel={ROLE_LABELS.institutional_admin} />;
}

export function ScopeAdminNavbar() {
  return <NavbarShell centerSlot={<ScopeAdminKpis />} roleLabel={ROLE_LABELS.scope_admin} />;
}

export function SuperAdminNavbar() {
  return <NavbarShell centerSlot={<SuperAdminKpis />} roleLabel={ROLE_LABELS.scope_super_admin} />;
}

export function GenericAdminNavbar() {
  return <NavbarShell centerSlot={<GenericAdminKpis />} />;
}

export function ViewerNavbar() {
  return <NavbarShell />;
}

const REGISTRY: Record<RoleId, () => React.ReactElement> = {
  student: StudentNavbar,
  viewer: ViewerNavbar,
  campus_leader: CampusNavbar,
  faculty_coordinator: FacultyNavbar,
  institutional_admin: InstitutionNavbar,
  scope_admin: ScopeAdminNavbar,
  scope_super_admin: SuperAdminNavbar,
  super_admin: SuperAdminNavbar,
  regional_admin: GenericAdminNavbar,
  campus_admin: GenericAdminNavbar,
  content_admin: GenericAdminNavbar,
  growth_admin: GenericAdminNavbar,
  support_admin: GenericAdminNavbar,
};

/**
 * Top-level dispatcher used by AppShell. Picks the role-specific Navbar
 * component based on the current session. Until session hydrates we render
 * the ViewerNavbar shell so SSR + first client paint stay identical.
 */
export function RoleNavbar() {
  const session = useUserSession();
  if (!session.ready || !session.isAuthenticated) {
    return <ViewerNavbar />;
  }
  const Component = REGISTRY[session.role] ?? ViewerNavbar;
  return <Component />;
}
