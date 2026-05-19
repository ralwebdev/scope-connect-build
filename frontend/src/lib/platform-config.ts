// Scope Connect — Plug-and-Play Platform Config
// ----------------------------------------------
// Single source of truth for white-label deployments. Change ONE file to ship
// a new edition (campus, city, university, accelerator, corporate). No code
// edits required for branding, copy, supported campuses, or feature toggles.
//
// Editions are pre-baked config bundles. Pick one with `EDITION` below, or
// override individual fields in `OVERRIDES` for one-off tweaks.

/* ----------------------------- Types ----------------------------- */

export type EditionId =
  | "scope-india"
  | "campus-pro"
  | "university-network"
  | "corporate-challenge"
  | "community-lite";

export type PlanTier = "community" | "campus-pro" | "institution" | "enterprise";

export type FeatureFlags = {
  feed: boolean;
  projects: boolean;
  openProjects: boolean;
  events: boolean;
  leaderboards: boolean;
  campus: boolean;
  portfolio: boolean;
  ambassadors: boolean;
  ads: boolean;
  recruiterZone: boolean;
  mentorZone: boolean;
  campusCompetition: boolean;
  waitlist: boolean;
  partnerships: boolean;
  platformUpdates: boolean;
};

export type BrandConfig = {
  name: string;            // "Scope Connect"
  shortName: string;       // "Scope" (logo split)
  accentName: string;      // "Connect" (red half of logo)
  tagline: string;         // footer / hero subline
  operator: string;        // "Operated by Scope Innovation Lab"
  contactEmail: string;
  supportUrl: string;      // internal route
  primaryColor?: string;   // optional CSS oklch override
  accentColor?: string;
};

export type CampusEntry = {
  id: string;
  name: string;
  city: string;
  region?: string;
  topSkills?: string[];
  starterScore?: number;
  logo?: string;          // optional emoji/URL
};

export type RoleId =
  | "super_admin"
  | "regional_admin"
  | "campus_admin"
  | "content_admin"
  | "growth_admin"
  | "support_admin";

export type RolePermissions = Record<RoleId, string[]>;

export type LocaleConfig = {
  locale: string;          // "en-IN"
  currency: string;        // "INR"
  dateFormat: string;      // human-readable hint
  timezone: string;        // IANA tz
};

export type PlatformConfig = {
  edition: EditionId;
  plan: PlanTier;
  brand: BrandConfig;
  features: FeatureFlags;
  campuses: CampusEntry[];
  roles: RolePermissions;
  locale: LocaleConfig;
};

/* ----------------------------- Edition Packs ----------------------------- */

const ROLES: RolePermissions = {
  super_admin: ["*"],
  regional_admin: ["campus.manage", "analytics.view", "announcements.publish"],
  campus_admin: ["campus.manage.local", "analytics.view.local", "announcements.publish.local"],
  content_admin: ["challenges.manage", "homepage.edit", "feed.moderate"],
  growth_admin: ["referrals.manage", "ambassadors.manage", "waitlist.manage"],
  support_admin: ["tickets.manage", "feedback.view"],
};

const FEATURES_FULL: FeatureFlags = {
  feed: true,
  projects: true,
  openProjects: true,
  events: true,
  leaderboards: true,
  campus: true,
  portfolio: true,
  ambassadors: true,
  ads: true,
  recruiterZone: true,
  mentorZone: true,
  campusCompetition: true,
  waitlist: true,
  partnerships: true,
  platformUpdates: true,
};

const SCOPE_INDIA_CAMPUSES: CampusEntry[] = [
  { id: "iitb", name: "IIT Bombay", city: "Mumbai", region: "West", starterScore: 0, topSkills: ["Engineering", "AI", "Robotics"] },
  { id: "iitd", name: "IIT Delhi", city: "Delhi", region: "North", starterScore: 0, topSkills: ["Engineering", "Founder"] },
  { id: "iitm", name: "IIT Madras", city: "Chennai", region: "South", starterScore: 0, topSkills: ["Engineering", "Research"] },
  { id: "bits-pilani", name: "BITS Pilani", city: "Pilani", region: "North", starterScore: 0, topSkills: ["Engineering", "Founder"] },
  { id: "iimb", name: "IIM Bangalore", city: "Bangalore", region: "South", starterScore: 0, topSkills: ["Strategy", "Founder"] },
  { id: "nid-ahd", name: "NID Ahmedabad", city: "Ahmedabad", region: "West", starterScore: 0, topSkills: ["Design", "Product"] },
  { id: "srcc-du", name: "SRCC Delhi", city: "Delhi", region: "North", starterScore: 0, topSkills: ["Marketing", "Strategy"] },
  { id: "vit-vellore", name: "VIT Vellore", city: "Vellore", region: "South", starterScore: 0, topSkills: ["Engineering"] },
];

const EDITIONS: Record<EditionId, PlatformConfig> = {
  "scope-india": {
    edition: "scope-india",
    plan: "institution",
    brand: {
      name: "Scope Connect",
      shortName: "Scope",
      accentName: "Connect",
      tagline: "India's curated campus innovation network. Every challenge verified. No spam, no fake listings.",
      operator: "Operated by Scope Innovation Lab",
      contactEmail: "hello@scope.in",
      supportUrl: "/support",
    },
    features: FEATURES_FULL,
    campuses: SCOPE_INDIA_CAMPUSES,
    roles: ROLES,
    locale: { locale: "en-IN", currency: "INR", dateFormat: "DD MMM YYYY", timezone: "Asia/Kolkata" },
  },

  "campus-pro": {
    edition: "campus-pro",
    plan: "campus-pro",
    brand: {
      name: "Campus Builder Network",
      shortName: "Campus",
      accentName: "Builders",
      tagline: "The operating system for ambitious students at your campus.",
      operator: "Powered by Scope Innovation Lab",
      contactEmail: "hello@scope.in",
      supportUrl: "/support",
    },
    features: { ...FEATURES_FULL, recruiterZone: false, ads: false },
    campuses: SCOPE_INDIA_CAMPUSES.slice(0, 1),
    roles: ROLES,
    locale: { locale: "en-IN", currency: "INR", dateFormat: "DD MMM YYYY", timezone: "Asia/Kolkata" },
  },

  "university-network": {
    edition: "university-network",
    plan: "institution",
    brand: {
      name: "University Innovation Hub",
      shortName: "UI",
      accentName: "Hub",
      tagline: "A connected innovation network across your university system.",
      operator: "Powered by Scope Innovation Lab",
      contactEmail: "hello@scope.in",
      supportUrl: "/support",
    },
    features: { ...FEATURES_FULL, ads: false },
    campuses: SCOPE_INDIA_CAMPUSES,
    roles: ROLES,
    locale: { locale: "en-IN", currency: "INR", dateFormat: "DD MMM YYYY", timezone: "Asia/Kolkata" },
  },

  "corporate-challenge": {
    edition: "corporate-challenge",
    plan: "enterprise",
    brand: {
      name: "Innovation Challenge Hub",
      shortName: "Challenge",
      accentName: "Hub",
      tagline: "Run high-signal innovation challenges with verified student talent.",
      operator: "Powered by Scope Innovation Lab",
      contactEmail: "partners@scope.in",
      supportUrl: "/support",
    },
    // Corporate edition disables open feed, ambassadors, public campus competition.
    features: { ...FEATURES_FULL, feed: false, ambassadors: false, campusCompetition: false, ads: false },
    campuses: SCOPE_INDIA_CAMPUSES,
    roles: ROLES,
    locale: { locale: "en-IN", currency: "INR", dateFormat: "DD MMM YYYY", timezone: "Asia/Kolkata" },
  },

  "community-lite": {
    edition: "community-lite",
    plan: "community",
    brand: {
      name: "Builder Community",
      shortName: "Builder",
      accentName: "Community",
      tagline: "A free space for student builders to connect and grow.",
      operator: "Powered by Scope Innovation Lab",
      contactEmail: "hello@scope.in",
      supportUrl: "/support",
    },
    // Community edition: only the essentials.
    features: {
      feed: true, projects: true, openProjects: true, events: false, leaderboards: true, campus: true,
      portfolio: true, ambassadors: false, ads: false, recruiterZone: false,
      mentorZone: false, campusCompetition: false, waitlist: true,
      partnerships: false, platformUpdates: false,
    },
    campuses: SCOPE_INDIA_CAMPUSES.slice(0, 4),
    roles: ROLES,
    locale: { locale: "en-IN", currency: "INR", dateFormat: "DD MMM YYYY", timezone: "Asia/Kolkata" },
  },
};

/* ----------------------------- Active Config ----------------------------- */

// 🔧 To launch a new edition: change ONE line below.
const EDITION: EditionId = "scope-india";

// 🔧 Fine-tune any field per deployment without forking the edition pack.
const OVERRIDES: Partial<PlatformConfig> = {
  brand: {
    ...EDITIONS["scope-india"].brand,
    contactEmail: "scopemagazines@gmail.com",
  },
  features: {
    ...EDITIONS["scope-india"].features,
    ambassadors: false,
    waitlist: false,
    partnerships: false,
    platformUpdates: false,
    openProjects: false,
  },
};

function resolveConfig(): PlatformConfig {
  const base = EDITIONS[EDITION];
  return {
    ...base,
    ...OVERRIDES,
    brand: { ...base.brand, ...(OVERRIDES.brand ?? {}) },
    features: { ...base.features, ...(OVERRIDES.features ?? {}) },
    locale: { ...base.locale, ...(OVERRIDES.locale ?? {}) },
    roles: { ...base.roles, ...(OVERRIDES.roles ?? {}) },
    campuses: OVERRIDES.campuses ?? base.campuses,
  };
}

export const platformConfig: PlatformConfig = resolveConfig();

/* ----------------------------- Helpers ----------------------------- */

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return platformConfig.features[flag] === true;
}

export function brand() {
  return platformConfig.brand;
}

export function listCampuses(): CampusEntry[] {
  return platformConfig.campuses;
}

export function hasPermission(role: RoleId, permission: string): boolean {
  const perms = platformConfig.roles[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}
