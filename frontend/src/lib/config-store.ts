// Runtime, operator-editable config overlay on top of platformConfig.
// The static `platform-config.ts` defines defaults per edition; this module
// stores operator overrides in localStorage so changes apply without rebuild.
//
// Used by Navbar, Footer, Hero, Admin Config Center, Feature Guards, and
// the export/import pipeline.

import { platformConfig, type FeatureFlags, type CampusEntry, type BrandConfig } from "@/lib/platform-config";

const KEY = "sc_config_v1";
const BACKUP_KEY = "sc_backup_config";

export type ContactConfig = {
  supportEmail: string;
  partnershipEmail: string;
  phone?: string;
  address?: string;
};

export type RuntimeConfig = {
  edition: { id: string; name: string; environment: "production" | "staging" | "preview" };
  brand: BrandConfig & { logoText?: string; heroHeadline?: string; primaryColor?: string; accentColor?: string };
  contact: ContactConfig;
  features: FeatureFlags;
  campuses: CampusEntry[];
  meta: { updatedAt: number };
};

function defaults(): RuntimeConfig {
  return {
    edition: {
      id: platformConfig.edition,
      name: platformConfig.brand.name,
      environment: "production",
    },
    brand: { ...platformConfig.brand },
    contact: {
      supportEmail: platformConfig.brand.contactEmail,
      partnershipEmail: "partners@scope.in",
    },
    features: { ...platformConfig.features },
    campuses: [...platformConfig.campuses],
    meta: { updatedAt: Date.now() },
  };
}

function safeRead(): RuntimeConfig {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
    const base = defaults();
    return {
      edition: { ...base.edition, ...(parsed.edition ?? {}) },
      brand: { ...base.brand, ...(parsed.brand ?? {}) },
      contact: { ...base.contact, ...(parsed.contact ?? {}) },
      features: { ...base.features, ...(parsed.features ?? {}) },
      campuses: parsed.campuses ?? base.campuses,
      meta: { updatedAt: parsed.meta?.updatedAt ?? Date.now() },
    };
  } catch {
    return defaults();
  }
}

function notify() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: [KEY] } }));
  } catch {
    /* noop */
  }
}

export const configStore = {
  KEY,
  BACKUP_KEY,
  get(): RuntimeConfig {
    return safeRead();
  },
  set(next: RuntimeConfig) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...next, meta: { updatedAt: Date.now() } }));
      notify();
    } catch {
      /* noop */
    }
  },
  patch(patch: Partial<RuntimeConfig>) {
    const cur = configStore.get();
    configStore.set({
      ...cur,
      ...patch,
      brand: { ...cur.brand, ...(patch.brand ?? {}) },
      contact: { ...cur.contact, ...(patch.contact ?? {}) },
      features: { ...cur.features, ...(patch.features ?? {}) },
    });
  },
  reset() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(KEY);
      notify();
    } catch {
      /* noop */
    }
  },
  backup() {
    if (typeof window === "undefined") return;
    try {
      const cur = localStorage.getItem(KEY);
      if (cur) localStorage.setItem(BACKUP_KEY, cur);
    } catch {
      /* noop */
    }
  },
  restoreBackup(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const b = localStorage.getItem(BACKUP_KEY);
      if (!b) return false;
      localStorage.setItem(KEY, b);
      notify();
      return true;
    } catch {
      return false;
    }
  },
  /** Validate raw object is a usable RuntimeConfig. Returns errors[]. */
  validate(raw: unknown): { ok: boolean; errors: string[]; data?: RuntimeConfig } {
    const errors: string[] = [];
    if (!raw || typeof raw !== "object") {
      return { ok: false, errors: ["Payload must be a JSON object."] };
    }
    const r = raw as Record<string, unknown>;
    const requiredKeys = ["edition", "brand", "contact", "features", "campuses"];
    for (const k of requiredKeys) {
      if (!(k in r)) errors.push(`Missing key: ${k}`);
    }
    if (r.brand && typeof r.brand === "object") {
      const b = r.brand as Record<string, unknown>;
      if (typeof b.name !== "string") errors.push("brand.name must be a string");
    }
    if (r.features && typeof r.features !== "object") errors.push("features must be an object");
    if (r.campuses && !Array.isArray(r.campuses)) errors.push("campuses must be an array");
    if (errors.length) return { ok: false, errors };
    // Merge with defaults to ensure full schema
    const base = defaults();
    const data: RuntimeConfig = {
      edition: { ...base.edition, ...(r.edition as RuntimeConfig["edition"]) },
      brand: { ...base.brand, ...(r.brand as RuntimeConfig["brand"]) },
      contact: { ...base.contact, ...(r.contact as RuntimeConfig["contact"]) },
      features: { ...base.features, ...(r.features as RuntimeConfig["features"]) },
      campuses: r.campuses as CampusEntry[],
      meta: { updatedAt: Date.now() },
    };
    return { ok: true, errors: [], data };
  },
};

// Reactive hook lives in src/hooks/use-config.ts to avoid a top-level cycle
// with use-scope (which depends on scope-store). Import it from there.
