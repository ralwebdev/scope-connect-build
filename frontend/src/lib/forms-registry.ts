// Centralized whitelist of every form in the system.
// Goal: prevent broken/typo'd form routes by forcing all access through this
// registry. The global FormsLauncher dropdown reads from here, and the
// catch-all /forms/$formSlug route validates against it.

import type { PermissionKey } from "@/lib/rbac";

export type FormDefinition = {
  /** Stable id, version-suffixed so old links can be detected. */
  formId: string;
  /** Human label shown in the dropdown. */
  label: string;
  /** Short description shown under the label in the launcher. */
  description?: string;
  /** Route path, must start with /forms/. */
  route: string;
  /** Domain group used for sectioning the dropdown. */
  group: FormGroup;
  /** Permission required to see/use the form. */
  permission: PermissionKey;
};

export type FormGroup = "Admissions" | "Institutions" | "Finance" | "Academics";

export const FORM_REGISTRY: FormDefinition[] = [
  // Admissions
  {
    formId: "admission_form_v1",
    label: "Student Admission Form",
    description: "Enroll a new student into a campus.",
    route: "/forms/admission",
    group: "Admissions",
    permission: "approve_students",
  },
  {
    formId: "counselling_form_v1",
    label: "Counselling Intake Form",
    description: "Capture counselling session intake.",
    route: "/forms/counselling",
    group: "Admissions",
    permission: "manage_members",
  },
  // Institutions
  {
    formId: "institution_onboarding_v1",
    label: "Institution Onboarding Form",
    description: "Bring a new institution into the network.",
    route: "/forms/institution-onboarding",
    group: "Institutions",
    permission: "manage_institution",
  },
  {
    formId: "campus_mapping_v1",
    label: "Campus Mapping Form",
    description: "Map campuses to an institution.",
    route: "/forms/campus-mapping",
    group: "Institutions",
    permission: "manage_campuses",
  },
  // Finance
  {
    formId: "revenue_form_v1",
    label: "Revenue Entry Form",
    description: "Log a new revenue line item.",
    route: "/forms/revenue",
    group: "Finance",
    permission: "view_finance",
  },
  {
    formId: "invoice_form_v1",
    label: "Invoice Generation Form",
    description: "Generate an invoice for an institution.",
    route: "/forms/invoice",
    group: "Finance",
    permission: "view_finance",
  },
  // Academics
  {
    formId: "course_form_v1",
    label: "Course Creation Form",
    description: "Create a new course or programme.",
    route: "/forms/course",
    group: "Academics",
    permission: "manage_projects",
  },
  {
    formId: "faculty_form_v1",
    label: "Faculty Allocation Form",
    description: "Allocate faculty to courses & classes.",
    route: "/forms/faculty",
    group: "Academics",
    permission: "approve_leaders",
  },
];

export const FORM_GROUPS: FormGroup[] = ["Admissions", "Institutions", "Finance", "Academics"];

/** Slug after /forms/ — used by the catch-all route. */
export function slugFromRoute(route: string): string {
  return route.replace(/^\/forms\//, "");
}

export function findFormBySlug(slug: string): FormDefinition | undefined {
  return FORM_REGISTRY.find((f) => slugFromRoute(f.route) === slug);
}
