import { api } from "@/lib/api/client";
import { toast } from "sonner";

// Backend-backed CRM store for Scope Admin + Super Admin portals.
// Keeps a small local cache so existing synchronous store hooks can render instantly.

export type PipelineStage =
  | "Prospect"
  | "Contacted"
  | "Meeting Scheduled"
  | "Meeting Completed"
  | "Proposal Sent"
  | "Negotiation"
  | "MoU Draft Shared"
  | "MoU Signed"
  | "Launch Pending"
  | "Live Chapter"
  | "Dormant";

export const PIPELINE_STAGES: PipelineStage[] = [
  "Prospect", "Contacted", "Meeting Scheduled", "Meeting Completed",
  "Proposal Sent", "Negotiation", "MoU Draft Shared", "MoU Signed",
  "Launch Pending", "Live Chapter", "Dormant",
];

export type Institution = {
  id: string;
  name: string;
  type: "University" | "Engineering College" | "School" | "Polytechnic" | "Other";
  board?: string;
  city: string;
  state: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  ownerId: string;
  priority: 1 | 2 | 3 | 4 | 5;
  potentialValue: number;
  stage: PipelineStage;
  notes: string;
  documents?: Array<{
    kind: "brochure" | "proposal" | "pricing" | "mou";
    file_id: string;
    file_name: string;
    file_url: string;
    sent_at: string;
  }>;
  updatedAt: number;
};

export type Visit = {
  id: string;
  institutionId: string;
  date: string;
  time: string;
  ownerId: string;
  status: "scheduled" | "checked_in" | "completed" | "cancelled";
  notes?: string;
};

export type LaunchChecklist = {
  institutionId: string;
  facultyAssigned: boolean;
  leaderShortlisted: boolean;
  launchScheduled: boolean;
  registrationsStarted: boolean;
  pageLive: boolean;
  challengeActivated: boolean;
};

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
  region: string;
  focus: string;
  meetings: number;
  closures: number;
  lastActive: number;
  status: "active" | "suspended";
  target: number;
};

// ─── Lifecycle additions (additive — does not change PipelineStage flow) ───
export type InstitutionCredential = {
  institutionId: string;
  email: string;
  tempPassword: string;
  generatedAt: number;
  generatedBy: string;       // actor email
  generatedByRole: string;   // RoleId
  passwordResetAt?: number;  // first-login reset timestamp
  termsAcceptedAt?: number;
  profileCompletedAt?: number;
};

export type AuditEntry = {
  id: string;
  at: number;
  actorEmail: string;
  actorRole: string;
  action:
    | "credential_generated"
    | "credential_revoked"
    | "first_login_password_reset"
    | "terms_accepted"
    | "profile_completed"
    | "student_approved"
    | "student_rejected"
    | "faculty_invited"
    | "campus_leader_invited";
  targetType: "institution" | "member" | "student";
  targetId: string;
  meta?: Record<string, string | number | boolean>;
};

type BackendInstitution = {
  id: string;
  name: string;
  type?: Institution["type"];
  board?: string;
  city?: string;
  state?: string;
  contact_person?: string;
  designation?: string;
  phone?: string;
  email?: string;
  owner_id?: string | null;
  priority?: number;
  potential_value?: number;
  pipeline_stage?: PipelineStage;
  notes?: string;
  documents?: Array<{
    kind: "brochure" | "proposal" | "pricing" | "mou";
    file_id: string;
    file_name: string;
    file_url: string;
    sent_at: string;
  }>;
  updated_at?: string;
  created_at?: string;
};

type BackendVisit = {
  id: string;
  institution_id: string;
  owner_id: string;
  date: string;
  time: string;
  status: Visit["status"];
  notes?: string;
};

type BackendLaunch = {
  institution_id: string;
  faculty_assigned: boolean;
  leader_shortlisted: boolean;
  launch_scheduled: boolean;
  registrations_started: boolean;
  page_live: boolean;
  challenge_activated: boolean;
};

type BackendAdmin = {
  id: string;
  name: string;
  email: string;
  region?: string;
  focus?: string;
  meetings?: number;
  closures?: number;
  last_active?: string;
  status?: AdminProfile["status"];
  target?: number;
};

type BackendCrmData = {
  institutions: BackendInstitution[];
  visits: BackendVisit[];
  launches: BackendLaunch[];
  admins: BackendAdmin[];
};

const KEY = "sc_crm_v1";

type CrmData = {
  institutions: Institution[];
  visits: Visit[];
  launches: Record<string, LaunchChecklist>;
  admins: AdminProfile[];
  credentials?: Record<string, InstitutionCredential>;
  audit?: AuditEntry[];
};

const emptyData = (): CrmData => ({ institutions: [], visits: [], launches: {}, admins: [], credentials: {}, audit: [] });

function notify() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: [KEY] } }));
  } catch { /* noop */ }
}

function toMillis(value?: string) {
  return value ? new Date(value).getTime() : Date.now();
}

function clampPriority(value?: number): Institution["priority"] {
  const n = Number(value);
  if (n >= 1 && n <= 5) return n as Institution["priority"];
  return 3;
}

function mapInstitution(item: BackendInstitution): Institution {
  return {
    id: item.id,
    name: item.name,
    type: item.type ?? "Other",
    board: item.board,
    city: item.city ?? "",
    state: item.state ?? "",
    contactPerson: item.contact_person ?? "",
    designation: item.designation ?? "",
    phone: item.phone ?? "",
    email: item.email ?? "",
    ownerId: item.owner_id ?? "",
    priority: clampPriority(item.priority),
    potentialValue: item.potential_value ?? 0,
    stage: item.pipeline_stage ?? "Prospect",
    notes: item.notes ?? "",
    documents: item.documents,
    updatedAt: toMillis(item.updated_at ?? item.created_at),
  };
}

function mapVisit(item: BackendVisit): Visit {
  return {
    id: item.id,
    institutionId: item.institution_id,
    ownerId: item.owner_id,
    date: item.date,
    time: item.time,
    status: item.status,
    notes: item.notes,
  };
}

function mapLaunch(item: BackendLaunch): LaunchChecklist {
  return {
    institutionId: item.institution_id,
    facultyAssigned: item.faculty_assigned,
    leaderShortlisted: item.leader_shortlisted,
    launchScheduled: item.launch_scheduled,
    registrationsStarted: item.registrations_started,
    pageLive: item.page_live,
    challengeActivated: item.challenge_activated,
  };
}

function mapAdmin(item: BackendAdmin): AdminProfile {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    region: item.region ?? "Assigned Territory",
    focus: item.focus ?? "Partnerships",
    meetings: item.meetings ?? 0,
    closures: item.closures ?? 0,
    lastActive: toMillis(item.last_active),
    status: item.status ?? "active",
    target: item.target ?? 6,
  };
}

function fromBackend(data: BackendCrmData): CrmData {
  const launches = Object.fromEntries(data.launches.map((launch) => [launch.institution_id, mapLaunch(launch)]));
  return {
    institutions: data.institutions.map(mapInstitution),
    visits: data.visits.map(mapVisit),
    launches,
    admins: data.admins.map(mapAdmin),
  };
}

function institutionBody(inst: Partial<Institution>) {
  return {
    ...(inst.name !== undefined && { name: inst.name }),
    ...(inst.type !== undefined && { type: inst.type }),
    ...(inst.board !== undefined && { board: inst.board }),
    ...(inst.city !== undefined && { city: inst.city }),
    ...(inst.state !== undefined && { state: inst.state }),
    ...(inst.contactPerson !== undefined && { contact_person: inst.contactPerson }),
    ...(inst.designation !== undefined && { designation: inst.designation }),
    ...(inst.phone !== undefined && { phone: inst.phone }),
    ...(inst.email !== undefined && { email: inst.email }),
    ...(inst.ownerId ? { owner_id: inst.ownerId } : {}),
    ...(inst.priority !== undefined && { priority: inst.priority }),
    ...(inst.potentialValue !== undefined && { potential_value: inst.potentialValue }),
    ...(inst.stage !== undefined && { pipeline_stage: inst.stage }),
    ...(inst.notes !== undefined && { notes: inst.notes }),
  };
}

function read(): CrmData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as CrmData : emptyData();
  } catch {
    return emptyData();
  }
}

function write(d: CrmData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    notify();
  } catch { /* noop */ }
}

export const crm = {
  KEY,
  all(): CrmData { return read(); },
  institutions(): Institution[] { return read().institutions; },
  visits(): Visit[] { return read().visits; },
  admins(): AdminProfile[] { return read().admins; },
  async syncFromBackend() {
    const raw = await api<BackendCrmData>("/api/v1/institutions/crm");
    const data = fromBackend(raw);
    const current = read();

    // Preserve any leads that are "new" (i-prefixed) and haven't been confirmed by the backend yet.
    // This prevents "disappearing lead" syndrome if a refresh happens before the POST finishes or fails.
    const localOnly = current.institutions.filter((i) => i.id.startsWith("i") && /^\d+$/.test(i.id.slice(1)));
    if (localOnly.length > 0) {
      // De-duplicate: if an item in localOnly has the same name as one from backend,
      // it might have just synced but the ID rename hasn't hit this client yet.
      const backendNames = new Set(data.institutions.map((i) => i.name.toLowerCase()));
      const uniqueLocal = localOnly.filter((i) => !backendNames.has(i.name.toLowerCase()));
      data.institutions = [...uniqueLocal, ...data.institutions];
    }

    write(data);
    return data;
  },
  launch(id: string): LaunchChecklist {
    const d = read();
    return d.launches[id] ?? { institutionId: id, facultyAssigned: false, leaderShortlisted: false, launchScheduled: false, registrationsStarted: false, pageLive: false, challengeActivated: false };
  },
  upsertInstitution(inst: Institution) {
    const d = read();
    const idx = d.institutions.findIndex((i) => i.id === inst.id);
    if (idx >= 0) d.institutions[idx] = { ...inst, updatedAt: Date.now() };
    else d.institutions.unshift({ ...inst, updatedAt: Date.now() });
    write(d);

    const isNew = inst.id.startsWith("i") && /^\d+$/.test(inst.id.slice(1));
    const request = isNew
      ? api<{ institution: BackendInstitution }>("/api/v1/institutions/crm/institutions", {
          method: "POST",
          body: JSON.stringify(institutionBody(inst)),
        })
      : api<{ institution: BackendInstitution }>(`/api/v1/institutions/crm/institutions/${inst.id}`, {
          method: "PATCH",
          body: JSON.stringify(institutionBody(inst)),
        });

    void request.then(({ institution }) => {
      const next = read();
      const mapped = mapInstitution(institution);
      const localIndex = next.institutions.findIndex((i) => i.id === inst.id || i.id === mapped.id);
      if (localIndex >= 0) next.institutions[localIndex] = mapped;
      else next.institutions.unshift(mapped);
      write(next);
    }).catch((error) => {
      console.warn("CRM institution sync failed", error);
      toast.error(error instanceof Error ? error.message : "Could not sync lead to server.");
    });
  },
  moveStage(id: string, stage: PipelineStage) {
    const d = read();
    const i = d.institutions.find((x) => x.id === id);
    if (!i) return;
    i.stage = stage;
    i.updatedAt = Date.now();
    write(d);
    void api<{ institution: BackendInstitution }>(`/api/v1/institutions/crm/institutions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ pipeline_stage: stage }),
    }).catch((error) => console.warn("CRM stage sync failed", error));
  },
  addNote(id: string, note: string) {
    const d = read();
    const i = d.institutions.find((x) => x.id === id);
    if (!i) return;
    i.notes = note ? `${note}\n${i.notes ?? ""}`.trim() : i.notes;
    i.updatedAt = Date.now();
    write(d);
    void api<{ institution: BackendInstitution }>(`/api/v1/institutions/crm/institutions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ notes: i.notes }),
    }).catch((error) => console.warn("CRM note sync failed", error));
  },
  scheduleVisit(v: Omit<Visit, "id" | "status">) {
    const d = read();
    const temp = { ...v, id: `v${Date.now()}`, status: "scheduled" as const };
    d.visits.unshift(temp);
    write(d);
    void api<{ visit: BackendVisit }>("/api/v1/institutions/crm/visits", {
      method: "POST",
      body: JSON.stringify({
        institution_id: v.institutionId,
        owner_id: v.ownerId,
        date: v.date,
        time: v.time,
        notes: v.notes,
      }),
    }).then(({ visit }) => {
      const next = read();
      const idx = next.visits.findIndex((item) => item.id === temp.id);
      if (idx >= 0) next.visits[idx] = mapVisit(visit);
      else next.visits.unshift(mapVisit(visit));
      write(next);
    }).catch((error) => console.warn("CRM visit sync failed", error));
  },
  setVisitStatus(id: string, status: Visit["status"], notes?: string) {
    const d = read();
    const v = d.visits.find((x) => x.id === id);
    if (!v) return;
    v.status = status;
    if (notes !== undefined) v.notes = notes;
    write(d);
    void api<{ visit: BackendVisit }>(`/api/v1/institutions/crm/visits/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...(notes !== undefined && { notes }) }),
    }).catch((error) => console.warn("CRM visit status sync failed", error));
  },
  deleteVisit(id: string) {
    const d = read();
    d.visits = d.visits.filter((x) => x.id !== id);
    write(d);
    void api( `/api/v1/institutions/crm/visits/${id}`, {
      method: "DELETE",
    }).catch((error) => console.warn("CRM visit delete sync failed", error));
  },
  toggleLaunchStep(id: string, key: keyof Omit<LaunchChecklist, "institutionId">) {
    const d = read();
    const cur = d.launches[id] ?? { institutionId: id, facultyAssigned: false, leaderShortlisted: false, launchScheduled: false, registrationsStarted: false, pageLive: false, challengeActivated: false };
    cur[key] = !cur[key];
    d.launches[id] = cur;
    write(d);
    void api<{ launch: BackendLaunch }>(`/api/v1/institutions/crm/launches/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ key, value: cur[key] }),
    }).catch((error) => console.warn("CRM launch sync failed", error));
  },
  upsertAdmin(a: AdminProfile) {
    const d = read();
    const idx = d.admins.findIndex((x) => x.id === a.id);
    if (idx >= 0) d.admins[idx] = a;
    else d.admins.unshift(a);
    write(d);
  },
  setAdminStatus(id: string, status: AdminProfile["status"]) {
    const d = read();
    const a = d.admins.find((x) => x.id === id);
    if (!a) return;
    a.status = status;
    write(d);
  },
  reset() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(KEY);
      notify();
      void crm.syncFromBackend().catch((error) => console.warn("CRM reset sync failed", error));
    }
  },

  // ─── Credentials ──────────────────────────────────────────
  credential(institutionId: string): InstitutionCredential | null {
    return read().credentials?.[institutionId] ?? null;
  },
  generateCredential(args: {
    institutionId: string;
    email: string;
    actorEmail: string;
    actorRole: string;
  }): InstitutionCredential {
    const d = read();
    const inst = d.institutions.find(i => i.id === args.institutionId);
    if (!inst) throw new Error("Institution not found");
    if (inst.stage !== "Launch Pending") {
      throw new Error("Credentials can only be generated at Launch Pending stage.");
    }
    if (!["scope_admin", "scope_super_admin", "super_admin"].includes(args.actorRole)) {
      throw new Error("Only Scope Admin or Super Admin can generate credentials.");
    }
    d.credentials = d.credentials ?? {};
    if (d.credentials[args.institutionId]) {
      throw new Error("An institutional admin credential already exists. Only one initial admin is allowed.");
    }
    const tempPassword = `Scope@${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;
    const cred: InstitutionCredential = {
      institutionId: args.institutionId,
      email: args.email.toLowerCase(),
      tempPassword,
      generatedAt: Date.now(),
      generatedBy: args.actorEmail,
      generatedByRole: args.actorRole,
    };
    d.credentials[args.institutionId] = cred;
    d.audit = d.audit ?? [];
    d.audit.unshift({
      id: `au_${Date.now()}`, at: Date.now(),
      actorEmail: args.actorEmail, actorRole: args.actorRole,
      action: "credential_generated", targetType: "institution", targetId: args.institutionId,
      meta: { email: cred.email, institution: inst.name },
    });
    write(d);
    return cred;
  },
  markFirstLoginStep(
    institutionId: string,
    step: "passwordResetAt" | "termsAcceptedAt" | "profileCompletedAt",
    actorEmail: string,
  ) {
    const d = read();
    if (!d.credentials?.[institutionId]) return;
    d.credentials[institutionId][step] = Date.now();
    d.audit = d.audit ?? [];
    const map = {
      passwordResetAt: "first_login_password_reset",
      termsAcceptedAt: "terms_accepted",
      profileCompletedAt: "profile_completed",
    } as const;
    d.audit.unshift({
      id: `au_${Date.now()}`, at: Date.now(),
      actorEmail, actorRole: "institutional_admin",
      action: map[step], targetType: "institution", targetId: institutionId,
    });
    write(d);
  },

  // ─── Audit ────────────────────────────────────────────────
  audit(): AuditEntry[] { return read().audit ?? []; },
  logAudit(entry: Omit<AuditEntry, "id" | "at">) {
    const d = read();
    d.audit = d.audit ?? [];
    d.audit.unshift({ ...entry, id: `au_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, at: Date.now() });
    if (d.audit.length > 500) d.audit = d.audit.slice(0, 500);
    write(d);
  },
};

/**
 * Stage → system flag mapping. Layered on top of the existing PipelineStage
 * flow without modifying it. Used by guards to gate credential generation,
 * login access, full module access, and dormant restrictions.
 */
export type StageAccess = {
  loginAccess: "none" | "institutional_admin_only" | "full";
  credentialGeneration: boolean;
  fullModuleAccess: boolean;
  restricted: boolean;
  description: string;
};

export function stageAccess(stage: PipelineStage): StageAccess {
  switch (stage) {
    case "MoU Signed":
      return { loginAccess: "none", credentialGeneration: false, fullModuleAccess: false, restricted: false,
        description: "Contractually onboarded. Platform access locked until launch." };
    case "Launch Pending":
      return { loginAccess: "institutional_admin_only", credentialGeneration: true, fullModuleAccess: false, restricted: false,
        description: "Activation stage. Generate institutional admin credentials." };
    case "Live Chapter" as any: // Handle legacy or casing mismatches if needed
    case "Live Chapter":
      return { loginAccess: "full", credentialGeneration: false, fullModuleAccess: true, restricted: false,
        description: "Fully operational. All modules enabled." };
    case "Dormant":
      return { loginAccess: "full", credentialGeneration: false, fullModuleAccess: false, restricted: true,
        description: "Inactive. Read-only access; new approvals disabled." };
    default:
      return { loginAccess: "none", credentialGeneration: false, fullModuleAccess: false, restricted: false,
        description: "Pre-MoU stage. No platform provisioning." };
  }
}
