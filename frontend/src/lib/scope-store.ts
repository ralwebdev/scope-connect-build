// Scope Connect — central client-side state engine.
// Keeps the existing localStorage-backed UI contract, while syncing core data
// with the MERN backend through src/lib/api.

import {
  campusPartners,
  topBuilders,
  topChapters,
  feedPosts as seedFeed,
  featuredProjects,
  upcomingEvents,
  interestTags,
} from "./mock-data";
import { seedsForRole, type NotificationSeed } from "./notifications-seed";
import {
  backendAuth,
  backendNotifications,
  backendPortfolio,
  backendProjects,
  backendUsers,
  backendOpportunities,
  backendOpportunityApplications,
  type BackendOpportunityApplication,
  mapBackendNotification,
  mapBackendProject,
} from "./api/endpoints";
import { tokenStore, BASE } from "./api/client";

/* ----------------------------- Types ----------------------------- */

export type ScopeUser = {
  id: string;
  name: string;
  email: string;
  campus: string;
  bio: string;
  skills: string[];
  interests: string[];
  links: {
    website?: string | null;
    github?: string | null;
    twitter?: string | null;
    github_url?: string | null;
    twitter_url?: string | null;
    linkedin_url?: string | null;
    instagram_url?: string | null;
    portfolio_website?: string | null;
    resume_url?: string | null;
    portfolio_pdf_url?: string | null;
  };
  availability: "Open to collab" | "Building solo" | "Hiring teammates" | "Looking for internship";
  avatarColor: string;
  avatarUrl?: string;
  avatar_url?: string;
  joinedAt: number;
  // --- Dynamic portfolio extension (optional, backward compatible) ---
  linkedinUrl?: string;
  portfolioWebsite?: string;
  resumeUrl?: string;
  portfolioPdfUrl?: string;
  instagramUrl?: string;
  primaryDomain?: string;
  primary_domain?: string;
  specialization?: string;
  portfolioLinks?: Record<string, string>;
  institution?: { id: string; name: string } | null;
  role?: string;
  role_variant?: string;
  student_status?: "pending_verification" | "active" | "rejected";
  founder?: boolean;
  stats?: { xp: number; level: number; streak_days: number };
  verification?: { email_verified: boolean; institution_verified: boolean; trust_score: number };
  portfolio_links?: { id: string; key: string; label: string; url: string; category?: string }[];
  department_name?: string | null;
};

export type FeedPost = {
  id: string;
  authorId: string;
  author: string;
  campus: string;
  time: string;
  createdAt: number;
  type: string;
  content: string;
  likes: number;
  comments: number;
  celebrates: number;
  userLiked?: boolean;
  userCelebrated?: boolean;
  commentList?: { id: string; author: string; text: string; at: number }[];
};

export type Project = {
  id: string;
  authorId: string;
  author: string;
  campus: string;
  title: string;
  description: string;
  problem: string;
  team: string;
  category: string;
  demoUrl?: string;
  votes: number;
  cover: string;
  createdAt: number;
  endsAt?: number;
  userVoted?: boolean;
  teams_allowed?: number;
  team_members_limit?: number;
};

export type PortfolioItem = {
  id: string;
  userId: string;
  type: "Project" | "Design" | "Research" | "Startup Idea" | "Campaign" | "Certificate";
  title: string;
  description: string;
  skills: string[];
  link?: string;
  cover: string;
  createdAt: number;
  endsAt?: number;
};

export type EventItem = {
  id: string;
  title: string;
  type: string;
  date: string;
  venue: string;
  seats: number;
  color: string;
  startsAt: number;
};

export type Opportunity = {
  id: string;
  title: string;
  by: string;
  company: string;
  category: "Design" | "Engineering" | "Founder" | "Marketing" | "Pitch";
  description: string;
  requiredSkills: string[];
};

export type Notification = {
  id: string;
  text: string;
  at: number;
  read: boolean;
  icon: "trophy" | "spark" | "zap" | "users" | "heart";
  /** Optional dedup key — if present, push() will skip if any existing
   *  notification (or registry entry) has the same key. Used for one-time
   *  events (welcome bonus, level-up, first portfolio, etc). */
  dedupKey?: string;
  /** Role-aware metadata. Optional so legacy notifications still render. */
  category?: "action" | "milestone" | "system" | "info";
  priority?: "critical" | "high" | "normal" | "low";
  /** Restrict visibility to these role IDs. Empty/undefined = visible to all. */
  roles?: string[];
  /** Optional deep-link route. */
  href?: string;
  /** User-pinned (kept at top regardless of priority). */
  pinned?: boolean;
};

/* --------------------------- LS helpers --------------------------- */

const KEYS = {
  loggedIn: "scope_logged_in",
  user: "scope_user_profile",
  points: "scope_points",
  streak: "scope_streak",
  streakDate: "scope_streak_date",
  joinedChapter: "scope_joined_chapter",
  notifications: "scope_notifications",
  projects: "scope_projects",
  feed: "scope_feed_posts",
  rsvps: "scope_event_rsvps",
  savedOpps: "scope_saved_opps",
  interestedOpps: "scope_interested_opps",
  lastSeen: "scope_last_seen",
  visits: "scope_visit_count",
  liked: "scope_liked_posts",
  votedProjects: "scope_voted_projects",
  applications: "scope_applications",
  savedProjects: "scope_saved_projects",
  portfolio: "scope_portfolio_items",
  ideaSubmissions: "scope_idea_submissions",
  rankSnapshot: "scope_rank_snapshot",
  lastVisitAt: "scope_last_visit_at",
  nudgeSnoozedUntil: "scope_nudge_snoozed_until",
  // Persistent registry of one-time notification dedup hashes — survives
  // notification list trimming so a refresh never replays a one-shot alert.
  notifDedupRegistry: "scope_notif_dedup_v1",
  // Tracks the highest level a level-up alert has been issued for.
  highestLevelSeen: "scope_highest_level_seen",
  // Tracks which role the notification list was last seeded for, so that
  // when the active role changes we can re-seed without leaking alerts.
  notifSeededRole: "scope_notif_seeded_role",
  // Schema version — bump to invalidate incompatible persisted state.
  schemaVersion: "scope_schema_version",
} as const;

const SCHEMA_VERSION = 2;

const isBrowser = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Self-heal: corrupt JSON gets purged so the app doesn't keep failing on it.
    try { localStorage.removeItem(key); } catch { /* noop */ }
    return fallback;
  }
}

// Batched write queue — coalesces rapid writes to the same key into one
// localStorage.setItem + one change event per microtask. Cuts sync I/O during
// burst actions (likes, comments, XP awards) without changing observable state.
const pendingWrites = new Map<string, unknown>();
let flushScheduled = false;

function flushWrites() {
  flushScheduled = false;
  const entries = Array.from(pendingWrites.entries());
  pendingWrites.clear();
  for (const [key, value] of entries) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }
  // Single change event covers all keys flushed this tick.
  try {
    window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: entries.map(([k]) => k) } }));
  } catch { /* noop */ }
}

function write<T>(key: string, value: T) {
  if (!isBrowser) return;
  pendingWrites.set(key, value);
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flushWrites);
  }
}

function writeNow<T>(key: string, value: T) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: [key] } }));
  } catch {
    /* noop */
  }
}

/* --------------------------- Auth flow --------------------------- */

function toClientAssetUrl(value?: string | null) {
  if (!value) return undefined;
  if (BASE && value.startsWith(BASE)) {
    return value.slice(BASE.length) || "/";
  }
  return value;
}

function normalizeApiUser(user: ScopeUser): ScopeUser {
  const links = user.links ?? {};
  const portfolioLinks = user.portfolioLinks ?? Object.fromEntries(
    (user.portfolio_links ?? []).map((link) => [link.key, link.url]),
  );

  const normalizedUser = {
    ...user,
    role: user.role === "institution_admin" ? ("institutional_admin" as any) : user.role,
    bio: user.bio ?? "",
    campus: user.campus || user.institution?.name || "",
    skills: user.skills ?? [],
    interests: user.interests ?? [],
    links: {
      website: links.website ?? undefined,
      github: links.github ?? links.github_url ?? undefined,
      twitter: links.twitter ?? links.twitter_url ?? undefined,
    },
    availability: user.availability ?? "Open to collab",
    avatarColor: user.avatarColor ?? "#00D1FF",
    avatarUrl: toClientAssetUrl(user.avatarUrl || user.avatar_url),
    joinedAt: user.joinedAt ?? Date.now(),
    linkedinUrl: user.linkedinUrl ?? links.linkedin_url ?? undefined,
    portfolioWebsite: user.portfolioWebsite ?? links.portfolio_website ?? undefined,
    resumeUrl: user.resumeUrl ?? links.resume_url ?? undefined,
    portfolioPdfUrl: user.portfolioPdfUrl ?? links.portfolio_pdf_url ?? undefined,
    instagramUrl: user.instagramUrl ?? links.instagram_url ?? undefined,
    primaryDomain: user.primaryDomain ?? user.primary_domain ?? undefined,
    portfolioLinks,
  };

  console.debug("[scope] normalizeApiUser", {
    email: user.email,
    rawAvatarUrl: user.avatarUrl || user.avatar_url || null,
    normalizedAvatarUrl: normalizedUser.avatarUrl || null,
  });

  return normalizedUser;
}

function persistApiSession(payload: {
  user: ScopeUser;
  access_token: string;
  refresh_token: string;
}) {
  const user = normalizeApiUser(payload.user);
  console.debug("[scope] persistApiSession", {
    email: user.email,
    avatarUrl: user.avatarUrl || null,
  });
  tokenStore.set(payload.access_token, payload.refresh_token);
  writeNow(KEYS.user, user);
  writeNow(KEYS.loggedIn, true);
  writeNow(KEYS.points, user.stats?.xp ?? read<number>(KEYS.points, 0));
  writeNow(KEYS.streak, user.stats?.streak_days ?? read<number>(KEYS.streak, 0));
  return user;
}

function persistApiUserSnapshot(user: ScopeUser) {
  const normalized = normalizeApiUser(user);
  writeNow(KEYS.user, normalized);
  writeNow(KEYS.loggedIn, true);
  writeNow(KEYS.points, normalized.stats?.xp ?? read<number>(KEYS.points, 0));
  writeNow(KEYS.streak, normalized.stats?.streak_days ?? read<number>(KEYS.streak, 0));
  return normalized;
}

function profilePatchForApi(patch: Partial<ScopeUser>) {
  const normalizeText = (value: string | null | undefined) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  const normalizeApiUrl = (value: string | null | undefined) => {
    const normalized = normalizeText(value);
    if (!normalized) return normalized;
    return normalized.startsWith("http") ? normalized : `${BASE}${normalized}`;
  };

  const normalizedLinks = {
    website: normalizeText(patch.links?.website),
    github_url: normalizeText(patch.links?.github),
    twitter_url: normalizeText(patch.links?.twitter),
    linkedin_url: normalizeText(patch.linkedinUrl),
    portfolio_website: normalizeText(patch.portfolioWebsite),
    resume_url: normalizeText(patch.resumeUrl),
    portfolio_pdf_url: normalizeText(patch.portfolioPdfUrl),
    instagram_url: normalizeText(patch.instagramUrl),
  };

  const hasLinkUpdates = Object.values(normalizedLinks).some((value) => value !== undefined);

  return {
    ...(patch.email !== undefined && { email: patch.email }),
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.campus !== undefined && { campus: patch.campus }),
    ...(patch.bio !== undefined && { bio: patch.bio }),
    ...(patch.skills !== undefined && { skills: patch.skills }),
    ...(patch.interests !== undefined && { interests: patch.interests }),
    ...(patch.availability !== undefined && { availability: patch.availability }),
    ...(patch.avatarColor !== undefined && { avatar_color: patch.avatarColor }),
    ...(patch.avatarUrl !== undefined && { avatar_url: normalizeApiUrl(patch.avatarUrl) }),
    ...(patch.primaryDomain !== undefined && { primary_domain: patch.primaryDomain }),
    ...(patch.specialization !== undefined && { specialization: patch.specialization }),
    ...((patch.links !== undefined || patch.linkedinUrl !== undefined || patch.portfolioWebsite !== undefined ||
      patch.resumeUrl !== undefined || patch.portfolioPdfUrl !== undefined || patch.instagramUrl !== undefined) && hasLinkUpdates
      ? {
          links: Object.fromEntries(
            Object.entries(normalizedLinks).filter(([, value]) => value !== undefined),
          ),
        }
      : {}),
  };
}

export const auth = {
  isLoggedIn(): boolean {
    return read<boolean>(KEYS.loggedIn, false);
  },
  getUser(): ScopeUser | null {
    return read<ScopeUser | null>(KEYS.user, null);
  },
  async signup(input: { name: string; email: string; campus: string; interests: string[]; password: string; institutionId?: string }) {
    const payload = await backendAuth.signup({
      email: input.email,
      password: input.password,
      name: input.name,
      institution_id: input.institutionId,
    });
    const user = persistApiSession(payload);
    const nextUser = { ...user, campus: input.campus, interests: input.interests };
    writeNow(KEYS.user, nextUser);
    writeNow(KEYS.visits, 1);
    notifications.push({ icon: "spark", text: "Welcome to Scope Connect! +120 XP signup bonus.", dedupKey: `welcome_bonus:${user.id}` });
    notifications.push({ icon: "trophy", text: "You're ranked #142 nationally. Climb today.", dedupKey: `welcome_rank:${user.id}` });
    return nextUser;
  },
  async login(email: string, password: string) {
    const payload = await backendAuth.login({ email, password });
    const user = persistApiSession(payload);
    streak.tick();
    void notifications.syncFromBackend();
    void projects.syncFromBackend();
    void portfolio.syncFromBackend();
    void opportunities.syncFromBackend();
    return user;
  },
  async restoreSession() {
    if (!isBrowser || !localStorage.getItem("scope_access_token")) return null;
    const { user } = await backendAuth.me();
    const normalized = persistApiUserSnapshot(user);
    console.debug("[scope] restoreSession", {
      email: normalized.email,
      avatarUrl: normalized.avatarUrl || null,
    });
    streak.tick();
    void notifications.syncFromBackend();
    void projects.syncFromBackend();
    void portfolio.syncFromBackend();
    void opportunities.syncFromBackend();
    return normalized;
  },
  async refreshCurrentUser() {
    const { user } = await backendAuth.me();
    const normalized = persistApiUserSnapshot(user);
    console.debug("[scope] refreshCurrentUser", {
      email: normalized.email,
      avatarUrl: normalized.avatarUrl || null,
    });
    return normalized;
  },
  syncApiUser(user: ScopeUser) {
    return persistApiUserSnapshot(user);
  },
  logout() {
    const refreshToken = isBrowser ? tokenStore.refreshToken() : null;
    if (refreshToken) void backendAuth.logout(refreshToken).catch(() => {});
    // \ud83e\udde8 Hard Sign Out \u2014 sweep ALL scope_* keys so no role/permission/sidebar
    // state survives. Only the schema version is preserved (cheap to recompute,
    // avoids unnecessary re-seeding loops on next login).
    if (isBrowser) {
      try {
        const preserve = new Set<string>([KEYS.schemaVersion]);
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith("scope_") && !preserve.has(k)) toRemove.push(k);
        }
        toRemove.forEach((k) => {
          try { localStorage.removeItem(k); } catch { /* noop */ }
        });
      } catch { /* noop */ }
      // Notify subscribers immediately so the UI rebuilds in the same tick.
      try {
        window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: ["*"] } }));
      } catch { /* noop */ }
    }
  },
  async updateProfile(patch: Partial<ScopeUser>) {
    const u = auth.getUser();
    if (!u) return null;
    const normalizedPatch = { ...patch };
    normalizedPatch.avatarUrl = toClientAssetUrl(normalizedPatch.avatarUrl);
    const next = { ...u, ...normalizedPatch };
    // Force immediate local update so UI reflects change instantly
    writeNow(KEYS.user, next);
    
    const apiPatch = profilePatchForApi(patch);
    const requests: Promise<unknown>[] = [];
    if (Object.keys(apiPatch).length > 0) requests.push(backendUsers.update(u.id, apiPatch));
    if (patch.portfolioLinks) requests.push(backendUsers.setPortfolioLinks(patch.portfolioLinks));
    
    if (requests.length > 0) {
      try {
        const responses = await Promise.all(requests);
        const responseWithUser = responses.find((response): response is { user: ScopeUser } =>
          Boolean(response && typeof response === "object" && "user" in response),
        );
        if (responseWithUser?.user) {
          writeNow(KEYS.user, normalizeApiUser(responseWithUser.user));
        }
      } catch (error) {
        writeNow(KEYS.user, u);
        console.warn("Profile sync failed", error);
        throw error;
      }
    }
    return next;
  },
};

/* --------------------------- XP / Streak --------------------------- */

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const xp = {
  get(): number {
    return read<number>(KEYS.points, 0);
  },
  add(amount: number, reason?: string) {
    const prevLevel = xp.level().name;
    const next = xp.get() + amount;
    write(KEYS.points, next);
    if (reason) notifications.push({ icon: "zap", text: `${reason} \u00b7 +${amount} XP` });
    // Level-up alert \u2014 fired exactly once per tier per user via dedup registry.
    const newLevel = xp.level().name;
    if (newLevel !== prevLevel) {
      const u = auth.getUser();
      const uid = u?.id ?? "anon";
      notifications.push({
        icon: "trophy",
        text: `\ud83c\udf89 Level up! You're now ${newLevel}-tier.`,
        dedupKey: `level_up:${uid}:${newLevel}`,
      });
      write(KEYS.highestLevelSeen, newLevel);
    }

    // Sync to backend \u2014 fire and forget (don't block UI)
    import("./api/endpoints").then(({ backendUsers }) => {
      void backendUsers.addXP(amount, reason).catch(() => null);
    });

    return next;
  },
  level(): { name: string; min: number; max: number; next: string } {
    const p = xp.get();
    if (p < 500) return { name: "Explorer", min: 0, max: 500, next: "Builder" };
    if (p < 1500) return { name: "Builder", min: 500, max: 1500, next: "Innovator" };
    if (p < 3500) return { name: "Innovator", min: 1500, max: 3500, next: "Leader" };
    if (p < 6500) return { name: "Leader", min: 3500, max: 6500, next: "Ambassador" };
    return { name: "Ambassador", min: 6500, max: 10000, next: "Legend" };
  },
  levelProgress(): number {
    const { min, max } = xp.level();
    const p = xp.get();
    return Math.min(100, Math.round(((p - min) / (max - min)) * 100));
  },
};

export const streak = {
  count(): number {
    return read<number>(KEYS.streak, 0);
  },
  tick() {
    const today = todayStamp();
    const last = read<string>(KEYS.streakDate, "");
    if (last === today) return streak.count();
    const c = streak.count();
    const yesterday = new Date(Date.now() - 86400000);
    const ystamp = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
    const next = last === ystamp ? c + 1 : 1;
    write(KEYS.streak, next);
    write(KEYS.streakDate, today);

    // Sync to backend
    import("./api/endpoints").then(({ backendUsers }) => {
      backendUsers.tickStreak().then(({ streak: serverStreak, xp: serverXP }) => {
        write(KEYS.streak, serverStreak);
        write(KEYS.points, serverXP);
      }).catch(() => null);
    });

    return next;
  },
};

/* --------------------------- Notifications --------------------------- */
//
// Role-aware notification engine. Seeds, lists, and filters notifications
// by the active role. A super_admin will never see student streak alerts;
// a student will never see CRM lead reminders. Cross-role leakage is
// structurally impossible because the active list is filtered through the
// `roles` field on every read, AND we re-seed when the active role changes.

function loadSeedsForRole(role: string): NotificationSeed[] {
  return seedsForRole(role as Parameters<typeof seedsForRole>[0]);
}

function priorityRank(p?: Notification["priority"]): number {
  switch (p) { case "critical": return 4; case "high": return 3; case "normal": return 2; case "low": return 1; default: return 2; }
}

export const notifications = {
  async syncFromBackend() {
    if (!auth.isLoggedIn()) return notifications.all();
    try {
      const { items } = await backendNotifications.list();
      const mapped = items.map(mapBackendNotification);
      const localOnly = notifications.all().filter((n) => !n.dedupKey?.startsWith("backend:"));
      const next = [...mapped, ...localOnly].slice(0, 100);
      writeNow(KEYS.notifications, next);
      return next;
    } catch (error) {
      console.warn("Notification sync failed", error);
      return notifications.all();
    }
  },
  /** Raw list (all notifications across roles). Avoid in UI; prefer forRole(). */
  all(): Notification[] {
    return read<Notification[]>(KEYS.notifications, []);
  },
  /** Role-filtered, priority-sorted list. Pinned items always come first. */
  forRole(role: string): Notification[] {
    const list = notifications.all().filter((n) => {
      // No `roles` field \u2192 legacy/global; show everywhere.
      if (!n.roles || n.roles.length === 0) return true;
      return n.roles.includes(role);
    });
    return list.slice().sort((a, b) => {
      const pa = a.pinned ? 1 : 0;
      const pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const pri = priorityRank(b.priority) - priorityRank(a.priority);
      if (pri !== 0) return pri;
      return b.at - a.at;
    });
  },
  /** Re-seed if the active role has changed since the last seed pass.
   *  Removes prior role-tagged seeds for the OLD role to prevent leakage. */
  ensureSeeded(role?: string) {
    if (!isBrowser) return;
    if (!auth.isLoggedIn()) return;
    const targetRole = role ?? "viewer";
    const lastRole = read<string | null>(KEYS.notifSeededRole, null);
    if (lastRole === targetRole) return; // already seeded for this role

    // Drop any seed-* notifications from the previous role pass; keep
    // user-generated alerts (no `roles` field) and items not seeded by us.
    const existing = notifications.all().filter((n) => !n.id.startsWith("seed_"));
    const seeds = loadSeedsForRole(targetRole);
    const seeded: Notification[] = seeds.map((s, i) => ({
      id: `seed_${targetRole}_${s.kind}`,
      text: s.text,
      icon: s.icon,
      category: s.category,
      priority: s.priority,
      href: s.href,
      roles: [targetRole],
      at: Date.now() - s.ago * 60 * 1000,
      read: false,
      dedupKey: `seed:${targetRole}:${s.kind}`,
      pinned: false,
      // i is unused but kept for stable insertion order if needed later
      ...(i < 0 ? {} : {}),
    }));
    write(KEYS.notifications, [...seeded, ...existing].slice(0, 60));
    write(KEYS.notifSeededRole, targetRole);
  },
  /** Unread count, role-scoped. */
  unread(role?: string): number {
    if (role) return notifications.forRole(role).filter((n) => !n.read).length;
    return notifications.all().filter((n) => !n.read).length;
  },
  /** Has a one-time notification with this dedup key ever been pushed? */
  hasDedup(dedupKey: string): boolean {
    const reg = read<Record<string, number>>(KEYS.notifDedupRegistry, {});
    return !!reg[dedupKey];
  },
  push(n: Omit<Notification, "id" | "at" | "read">) {
    // Dedup guard: skip if this one-time alert has already fired (registry
    // survives even if the notification was trimmed/cleared from the list).
    if (n.dedupKey) {
      const reg = read<Record<string, number>>(KEYS.notifDedupRegistry, {});
      if (reg[n.dedupKey]) return;
      reg[n.dedupKey] = Date.now();
      write(KEYS.notifDedupRegistry, reg);
    }
    const list = notifications.all();
    const next: Notification = { ...n, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), read: false };
    write(KEYS.notifications, [next, ...list].slice(0, 60));
  },
  markRead(id: string) {
    const list = notifications.all().map((n) => (n.id === id ? { ...n, read: true } : n));
    write(KEYS.notifications, list);
    void backendNotifications.markRead(id).catch(() => {});
  },
  togglePin(id: string) {
    const list = notifications.all().map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    write(KEYS.notifications, list);
  },
  markAllRead(role?: string) {
    const list = notifications.all().map((n) => {
      if (!role) return { ...n, read: true };
      const inScope = !n.roles || n.roles.length === 0 || n.roles.includes(role);
      return inScope ? { ...n, read: true } : n;
    });
    write(KEYS.notifications, list);
    void backendNotifications.markAllRead().catch(() => {});
  },
};

/* --------------------------- Feed --------------------------- */

// Stable seed \u2014 built once at module load, never mutates.
const SEED_FEED: FeedPost[] = seedFeed.map((p, i) => ({
  id: p.id,
  authorId: `seed_${p.id}`,
  author: p.author,
  campus: p.campus,
  time: p.time,
  createdAt: 1700000000000 - i * 1000 * 60 * 30,
  type: p.type,
  content: p.content,
  likes: p.likes,
  comments: p.comments,
  celebrates: p.celebrates,
  commentList: [],
}));

export const feed = {
  all(): FeedPost[] {
    const stored = read<FeedPost[]>(KEYS.feed, []);
    return stored.length > 0 ? stored : SEED_FEED;
  },
  create(content: string, type = "Update") {
    const u = auth.getUser();
    if (!u) return;
    const post: FeedPost = {
      id: `p_${Date.now()}`,
      authorId: u.id,
      author: u.name,
      campus: u.campus,
      time: "now",
      createdAt: Date.now(),
      type,
      content,
      likes: 0,
      comments: 0,
      celebrates: 0,
      commentList: [],
    };
    write(KEYS.feed, [post, ...feed.all()]);
    xp.add(25, "Posted to feed");
    return post;
  },
  toggleLike(id: string) {
    const list = feed.all().map((p) => {
      if (p.id !== id) return p;
      const liked = !p.userLiked;
      return { ...p, userLiked: liked, likes: p.likes + (liked ? 1 : -1) };
    });
    write(KEYS.feed, list);
  },
  toggleCelebrate(id: string) {
    const list = feed.all().map((p) => {
      if (p.id !== id) return p;
      const c = !p.userCelebrated;
      return { ...p, userCelebrated: c, celebrates: p.celebrates + (c ? 1 : -1) };
    });
    write(KEYS.feed, list);
  },
  comment(id: string, text: string) {
    const u = auth.getUser();
    const list = feed.all().map((p) => {
      if (p.id !== id) return p;
      const cm = { id: `c_${Date.now()}`, author: u?.name ?? "You", text, at: Date.now() };
      return { ...p, comments: p.comments + 1, commentList: [...(p.commentList ?? []), cm] };
    });
    write(KEYS.feed, list);
  },
};

/* --------------------------- Projects --------------------------- */

const SEED_PROJECTS: Project[] = featuredProjects.map((p, i) => ({
  id: `seed_p_${i}`,
  authorId: `seed_${i}`,
  author: p.team,
  campus: p.team,
  title: p.title,
  description: p.description,
  problem: "Solving a real campus / industry pain.",
  team: p.team,
  category: p.category,
  votes: p.votes,
  cover: p.cover,
  createdAt: 1700000000000 - (i + 1) * 86400000,
}));

export const projects = {
  async syncFromBackend() {
    if (!auth.isLoggedIn()) return projects.all();
    try {
      const { items } = await backendProjects.list();
      const mapped = items.map(mapBackendProject);
      if (mapped.length > 0) writeNow(KEYS.projects, mapped);
      return mapped.length > 0 ? mapped : projects.all();
    } catch (error) {
      console.warn("Project sync failed", error);
      return projects.all();
    }
  },
  all(): Project[] {
    const stored = read<Project[]>(KEYS.projects, []);
    return stored.length > 0 ? stored : SEED_PROJECTS;
  },
  create(input: Omit<Project, "id" | "authorId" | "author" | "campus" | "votes" | "createdAt" | "cover"> & { cover?: string }) {
    const u = auth.getUser();
    if (!u) return;
    const p: Project = {
      ...input,
      id: `p_${Date.now()}`,
      authorId: u.id,
      author: u.name,
      campus: u.campus,
      votes: 1,
      cover: input.cover || "\ud83d\ude80",
      createdAt: Date.now(),
      userVoted: true,
    };
    write(KEYS.projects, [p, ...projects.all()]);
    void backendProjects.create(p)
      .then(({ project }) => {
        const saved = mapBackendProject(project);
        const list = projects.all().map((item) => (item.id === p.id ? saved : item));
        writeNow(KEYS.projects, list);
      })
      .catch((error) => console.warn("Project create sync failed", error));
    xp.add(50, "Project launched");
    notifications.push({ icon: "spark", text: `Builders are viewing "${p.title}".` });
    return p;
  },
  vote(id: string) {
    const list = projects.all().map((p) => {
      if (p.id !== id) return p;
      const v = !p.userVoted;
      return { ...p, userVoted: v, votes: p.votes + (v ? 1 : -1) };
    });
    write(KEYS.projects, list);
  },
};

/* --------------------------- Events --------------------------- */

const SEED_EVENTS: EventItem[] = upcomingEvents.map((e, i) => ({
  id: `evt_${i}`,
  title: e.title,
  type: e.type,
  date: e.date,
  venue: e.venue,
  seats: e.seats,
  color: e.color,
  startsAt: Date.now() + (i + 1) * 86400000 * (3 + i * 2),
}));

export const events = {
  all(): EventItem[] {
    return SEED_EVENTS;
  },
  rsvps(): string[] {
    return read<string[]>(KEYS.rsvps, []);
  },
  toggleRsvp(id: string) {
    const cur = events.rsvps();
    const has = cur.includes(id);
    const next = has ? cur.filter((x) => x !== id) : [...cur, id];
    write(KEYS.rsvps, next);
    if (!has) {
      xp.add(30, "Event RSVP confirmed");
      notifications.push({ icon: "trophy", text: "Seat reserved. You're on the builders list." });
    }
    return next;
  },
};

/* --------------------------- Opportunities --------------------------- */

const SEED_OPPS: Opportunity[] = [
  { id: "o_1", title: "Need UI Designer for HealthTech MVP", by: "Scope Admin", company: "MediMatch AI", category: "Design", description: "Design 8 mobile screens. 2-week sprint. Equity available.", requiredSkills: ["Figma", "UI/UX", "Prototyping"] },
  { id: "o_2", title: "React Developer - Campus Marketplace", by: "Scope Admin", company: "CampusDAO", category: "Engineering", description: "Build storefront + cart with Tailwind and the Scope API.", requiredSkills: ["React", "Tailwind CSS", "APIs"] },
  { id: "o_3", title: "Co-founder wanted - EdTech for Tier-3", by: "Scope Admin", company: "Diya Sharma Ventures", category: "Founder", description: "Looking for a technical co-founder, 50/50 equity.", requiredSkills: ["Strategy", "Product", "React"] },
  { id: "o_4", title: "Pitch Deck Expert - YC application", by: "Scope Admin", company: "Layerly", category: "Pitch", description: "Polish a 10-slide deck for YC W26 application.", requiredSkills: ["Pitch Deck", "Storytelling", "Design"] },
  { id: "o_5", title: "Marketing Lead for hackathon launch", by: "Scope Admin", company: "Sprintly", category: "Marketing", description: "Drive registrations for Scope Hack '26.", requiredSkills: ["Marketing", "Content", "Community"] },
  { id: "o_6", title: "Python ML engineer for swarm sim", by: "Scope Admin", company: "RoboTrichy", category: "Engineering", description: "Help train swarm RL models on a 2-week timeline.", requiredSkills: ["Python", "Machine Learning", "APIs"] },
];

export const opportunities = {
  async syncFromBackend() {
    if (!auth.isLoggedIn()) return opportunities.all();
    try {
      const { items } = await backendOpportunities.list();
      const mapped: Opportunity[] = items.map((item) => ({
        id: item.id,
        title: item.title,
        by: item.by,
        company: (item as any).company ?? (item as any).campus ?? "Unknown Company",
        category: item.category as any,
        description: item.description,
        requiredSkills: (item as any).requiredSkills ?? [],
      }));
      writeNow("scope_opportunities_backend", mapped);
      return [...mapped, ...SEED_OPPS];
    } catch (error) {
      console.warn("Opportunities sync failed", error);
      return opportunities.all();
    }
  },
  all(): Opportunity[] {
    const backendItems = read<Opportunity[]>("scope_opportunities_backend", []);
    return [...backendItems, ...SEED_OPPS];
  },
  saved(): string[] {
    return read<string[]>(KEYS.savedOpps, []);
  },
  toggleSave(id: string) {
    const cur = opportunities.saved();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    write(KEYS.savedOpps, next);
    return next;
  },
  async create(input: Omit<Opportunity, "id">) {
    try {
      const { opportunity: backendOpp } = await backendOpportunities.create(input);
      const mapped: Opportunity = {
        id: backendOpp.id,
        title: backendOpp.title,
        by: backendOpp.by,
        company: (backendOpp as any).company ?? (backendOpp as any).campus ?? "Unknown Company",
        category: backendOpp.category as any,
        description: backendOpp.description,
        requiredSkills: (backendOpp as any).requiredSkills ?? [],
      };
      const cur = read<Opportunity[]>("scope_opportunities_backend", []);
      write("scope_opportunities_backend", [mapped, ...cur]);
      return mapped;
    } catch (error) {
      console.error("Failed to create opportunity", error);
      throw error;
    }
  }
};

/* --------------------------- Chapter --------------------------- */

export const chapter = {
  joined(): string | null {
    return read<string | null>(KEYS.joinedChapter, null);
  },
  join(name: string) {
    write(KEYS.joinedChapter, name);
    xp.add(40, `Joined ${name}`);
    const u = auth.getUser();
    notifications.push({ icon: "users", text: `Welcome to ${name}. Say hi to your chapter.`, dedupKey: `chapter_joined:${u?.id ?? "anon"}:${name}` });
  },
};

/* --------------------------- Profile strength --------------------------- */

export function profileStrength(u: ScopeUser | null): number {
  if (!u) return 0;
  const bio = u.bio ?? "";
  const skills = Array.isArray(u.skills) ? u.skills : [];
  const interests = Array.isArray(u.interests) ? u.interests : [];
  const links = u.links ?? {};
  
  let score = 20; // Base for account creation
  
  // 1. Bio Strength (Up to 15 points)
  // 1 point per 10 characters, max 15
  score += Math.min(15, Math.floor(bio.length / 10));
  
  // 2. Skills Strength (Up to 15 points)
  // 3 points per skill, max 15
  score += Math.min(15, skills.length * 3);
  
  // 3. Interests (Up to 10 points)
  // 2 points per interest, max 10
  score += Math.min(10, interests.length * 2);
  
  // 4. Primary Socials (Up to 10 points)
  if (links.website) score += 5;
  if (links.github || links.github_url) score += 5;
  
  // 5. Professional Socials (Up to 15 points)
  if (u.linkedinUrl || links.linkedin_url) score += 5;
  if (u.portfolioWebsite || links.portfolio_website) score += 5;
  if (u.resumeUrl || links.resume_url) score += 5;
  
  // 6. Portfolio & Domain (Up to 10 points)
  if (u.primaryDomain) score += 5;
  const pLinks = u.portfolioLinks ? Object.keys(u.portfolioLinks).length : 0;
  score += Math.min(5, pLinks * 2);
  
  // 7. Activity (Up to 5 points)
  if (u.availability && u.availability !== "Open to collab") score += 5;

  // 8. Project Items (Up to 15 points)
  const items = portfolio.forUser(u.id);
  score += Math.min(15, items.length * 5);

  return Math.min(100, score);
}

/* --------------------------- Leaderboard --------------------------- */

export type LeaderRow = { id: string; name: string; sub: string; value: number; isMe?: boolean };

export function memberLeaderboard(): LeaderRow[] {
  const seeded: LeaderRow[] = topBuilders.map((b) => ({
    id: b.name,
    name: b.name,
    sub: `${b.campus} \u00b7 ${b.level}`,
    value: b.points,
  }));
  const u = auth.getUser();
  if (u) {
    seeded.push({
      id: u.id,
      name: u.name,
      sub: `${u.campus} \u00b7 ${xp.level().name}`,
      value: xp.get(),
      isMe: true,
    });
  }
  return seeded.sort((a, b) => b.value - a.value);
}

export function chapterLeaderboard(): LeaderRow[] {
  return topChapters
    .map((c) => ({ id: c.name, name: c.name, sub: c.campus, value: c.members }))
    .sort((a, b) => b.value - a.value);
}

export function campusLeaderboard(): LeaderRow[] {
  return campusPartners
    .map((c) => ({ id: c.name, name: c.name, sub: c.city, value: c.members }))
    .sort((a, b) => b.value - a.value);
}

/* --------------------------- Misc --------------------------- */

export const meta = {
  bumpVisit() {
    if (!isBrowser) return;
    const v = read<number>(KEYS.visits, 0) + 1;
    write(KEYS.visits, v);
    write(KEYS.lastSeen, Date.now());
  },
  visits() {
    return read<number>(KEYS.visits, 0);
  },
  resetAll() {
    if (!isBrowser) return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { key: "*" } }));
  },
};

export const seedInterests = interestTags;

/* --------------------------- React subscription --------------------------- */

export function subscribe(cb: () => void): () => void {
  if (!isBrowser) return () => {};
  const handler = () => cb();
  window.addEventListener("scope:store-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("scope:store-change", handler);
    window.removeEventListener("storage", handler);
  };
}

/* ===================================================================== */
/* CURATED OPPORTUNITY MODEL \u2014 Phase 2                                    */
/* ===================================================================== */

export type OpportunityScope = "scope" | "campus" | "open";
export type OpportunityStatus = "live" | "closing-soon" | "closed";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type CuratedProject = {
  id: string;
  scope: OpportunityScope;
  title: string;
  category: string;
  difficulty: Difficulty;
  seatsTotal: number;
  seatsFilled: number;
  timeline: string;
  skills: string[];
  description: string;
  rewards: string;
  status: OpportunityStatus;
  campus?: string;
  cover: string;
  postedBy: string;
  postedAt: number;
  endsAt?: number;
};

export type Application = {
  id: string;
  projectId: string;
  userId: string;
  fit: string;
  topSkill: string;
  availability: string;
  status: "Under Review" | "Shortlisted" | "Accepted" | "Waitlisted" | "Closed";
  at: number;
};

export type IdeaSubmission = {
  id: string;
  userId: string | null;
  title: string;
  problem: string;
  why: string;
  teamSkills: string;
  campusRelevance: string;
  anonymous: boolean;
  at: number;
};

const SEED_CURATED: CuratedProject[] = [
  { id: "sc_1", scope: "scope", title: "Build an AI Study Planner for Students", category: "AI", difficulty: "Advanced", seatsTotal: 8, seatsFilled: 5, timeline: "6 weeks", skills: ["React", "LLM APIs", "Product Design"], description: "Ship a Gen-Z AI assistant that builds personalized study plans, tracks progress and nudges weekly. Selected builders get featured nationally.", rewards: "Brand Lab credit \u00b7 300 XP \u00b7 Mentor access", status: "live", cover: "\ud83e\udde0", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 2 },
  { id: "sc_2", scope: "scope", title: "Launch the Chapter Growth Campaign", category: "Marketing", difficulty: "Intermediate", seatsTotal: 12, seatsFilled: 9, timeline: "4 weeks", skills: ["Content", "Community", "Design"], description: "Drive 10,000 new builder signups across 50 campuses. Real campaign, real metrics, real impact.", rewards: "Cohort Lead credit \u00b7 420 XP \u00b7 Discounted Red Apple Learning access", status: "live", cover: "\ud83d\udce3", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 4 },
  { id: "sc_3", scope: "scope", title: "Create the National Innovation Magazine", category: "Media", difficulty: "Intermediate", seatsTotal: 10, seatsFilled: 3, timeline: "8 weeks", skills: ["Writing", "Editorial", "Design"], description: "Curate India's first student-led innovation publication. Print + digital, distributed to 100+ campuses.", rewards: "Certificate \u00b7 350 XP \u00b7 Mentor access", status: "live", cover: "\ud83d\udcf0", postedBy: "Scope Official", postedAt: Date.now() - 86400000 },
  { id: "sc_4", scope: "scope", title: "Design Scope Connect Mobile UI Pack", category: "Design", difficulty: "Advanced", seatsTotal: 5, seatsFilled: 4, timeline: "5 weeks", skills: ["Figma", "Mobile UX", "Prototyping"], description: "Lead the visual system for Scope Connect's iOS + Android app. Your work ships to 50,000+ builders.", rewards: "Spotlight feature \u00b7 400 XP \u00b7 Workshop access", status: "closing-soon", cover: "\ud83c\udfa8", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 6 },
];

const SEED_CAMPUS: CuratedProject[] = [
  { id: "cp_1", scope: "campus", title: "IIT Bombay Hackathon Ops Team", category: "Operations", difficulty: "Beginner", seatsTotal: 15, seatsFilled: 8, timeline: "3 weeks", skills: ["Coordination", "Logistics"], description: "Run the campus-wide hackathon. Manage logistics, sponsors, and judging panels.", rewards: "Chapter Priority badge \u00b7 300 XP \u00b7 Certificate", status: "live", campus: "IIT Bombay", cover: "\ud83c\udfeb", postedBy: "Scope \u00b7 IIT Bombay Chapter", postedAt: Date.now() - 86400000 * 3 },
  { id: "cp_2", scope: "campus", title: "BITS Pilani Startup Cell \u2014 Founding Member", category: "Startup", difficulty: "Intermediate", seatsTotal: 6, seatsFilled: 2, timeline: "Ongoing", skills: ["Strategy", "Outreach"], description: "Help build the BITS Pilani founding startup cell from scratch with Scope's playbook.", rewards: "Founding Member title \u00b7 Mentor access \u00b7 400 XP", status: "live", campus: "BITS Pilani", cover: "\ud83d\ude80", postedBy: "Scope \u00b7 BITS Pilani Chapter", postedAt: Date.now() - 86400000 * 2 },
];

const SEED_OPEN: CuratedProject[] = [
  { id: "op_1", scope: "open", title: "Open Research: Mental Health on Indian Campuses", category: "Research", difficulty: "Intermediate", seatsTotal: 20, seatsFilled: 11, timeline: "6 weeks", skills: ["Research", "Survey Design", "Writing"], description: "Co-author India's largest student mental health report. Open to any verified builder.", rewards: "Research credit \u00b7 350 XP \u00b7 Published report", status: "live", cover: "\ud83e\udde0", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 7 },
  { id: "op_2", scope: "open", title: "Open Build: Climate Action Dashboard", category: "Engineering", difficulty: "Intermediate", seatsTotal: 10, seatsFilled: 4, timeline: "5 weeks", skills: ["Next.js", "Data Viz", "APIs"], description: "Build an open-source dashboard tracking campus climate initiatives across India.", rewards: "Open-source credit \u00b7 400 XP \u00b7 GitHub spotlight", status: "live", cover: "\ud83c\udf0d", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 4 },
];

const ALL_CURATED = [...SEED_CURATED, ...SEED_CAMPUS, ...SEED_OPEN];

function backendProjectsAsCurated(): CuratedProject[] {
  return projects.all()
    .filter((p) => !p.id.startsWith("seed_p_"))
    .map((p): CuratedProject => ({
      id: p.id,
      scope: "open",
      title: p.title,
      category: p.category,
      difficulty: "Intermediate",
      seatsTotal: 3,
      seatsFilled: 0,
      timeline: "Flexible",
      skills: [p.category].filter(Boolean),
      description: p.description,
      rewards: "Portfolio credit \u00b7 Mentor access",
      status: "live",
      campus: p.campus,
      cover: p.cover,
      postedBy: p.author,
      postedAt: p.createdAt,
    }));
}

export const curated = {
  scopeChallenges(): CuratedProject[] { return SEED_CURATED; },
  campusFor(campus: string | null): CuratedProject[] {
    if (!campus) return SEED_CAMPUS;
    return SEED_CAMPUS.filter((p) => p.campus === campus);
  },
  openProjects(): CuratedProject[] { return [...backendProjectsAsCurated(), ...SEED_OPEN]; },
  byId(id: string): CuratedProject | undefined { return [...backendProjectsAsCurated(), ...ALL_CURATED].find((p) => p.id === id); },
  all(): CuratedProject[] { return [...backendProjectsAsCurated(), ...ALL_CURATED]; },
};

export const applications = {
  all(): Application[] { return read<Application[]>(KEYS.applications, []); },
  forUser(userId: string): Application[] { return applications.all().filter((a) => a.userId === userId); },
  hasApplied(projectId: string, userId: string): boolean {
    return applications.all().some((a) => a.projectId === projectId && a.userId === userId);
  },
  apply(input: { projectId: string; fit: string; topSkill: string; availability: string }) {
    const u = auth.getUser();
    if (!u) return null;
    if (applications.hasApplied(input.projectId, u.id)) return null;
    const project = curated.byId(input.projectId);
    const app: Application = {
      id: `app_${Date.now()}`, projectId: input.projectId, userId: u.id,
      fit: input.fit, topSkill: input.topSkill, availability: input.availability,
      status: "Under Review", at: Date.now(),
    };
    const isFirst = applications.forUser(u.id).length === 0; // before insert
    write(KEYS.applications, [app, ...applications.all()]);
    if (!input.projectId.startsWith("op_") && !input.projectId.startsWith("cp_") && !input.projectId.startsWith("cur_")) {
      void backendProjects.apply(input.projectId, input.fit).catch((error) => console.warn("Application sync failed", error));
    }
    xp.add(20, "Application sent");
    notifications.push({ icon: "spark", text: `Application received for "${project?.title ?? "project"}". Review within 48h.` });
    if (isFirst) {
      notifications.push({ icon: "trophy", text: "\ud83c\udfaf First application sent \u2014 your builder journey is live.", dedupKey: `first_application:${u.id}` });
    }
    return app;
  },
};

export const savedProjects = {
  all(): string[] { return read<string[]>(KEYS.savedProjects, []); },
  toggle(id: string) {
    const cur = savedProjects.all();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    write(KEYS.savedProjects, next);
    return next;
  },
};

export const portfolio = {
  all(): PortfolioItem[] { return read<PortfolioItem[]>(KEYS.portfolio, []); },
  forUser(userId: string): PortfolioItem[] { return portfolio.all().filter((p) => p.userId === userId); },
  sync(items: PortfolioItem[]) {
    writeNow(KEYS.portfolio, items);
  },
  async create(input: Omit<PortfolioItem, "id" | "userId" | "createdAt">) {
    const u = auth.getUser();
    if (!u) return null;
    const isFirst = portfolio.forUser(u.id).length === 0;
    
    try {
      const { item: backendItem } = await backendPortfolio.create({
        type: input.type,
        title: input.title,
        description: input.description,
        skills: input.skills,
        link: input.link ?? "",
        cover: input.cover,
      });
      
      const item: PortfolioItem = { 
        ...input, 
        id: backendItem.id, 
        userId: u.id, 
        createdAt: new Date(backendItem.created_at).getTime() 
      };
      
      writeNow(KEYS.portfolio, [item, ...portfolio.all()]);
      xp.add(30, "Portfolio item added");
      notifications.push({ icon: "trophy", text: `"${item.title}" added to your portfolio.` });
      if (isFirst) {
        notifications.push({ icon: "spark", text: "\ud83c\udf1f First portfolio item \u2014 proof of work activated.", dedupKey: `first_portfolio:${u.id}` });
      }
      return item;
    } catch (error) {
      console.error("Failed to sync portfolio item", error);
      return null;
    }
  },
  async update(id: string, patch: Partial<Omit<PortfolioItem, "id" | "userId" | "createdAt">>) {
    try {
      const { item: backendItem } = await backendPortfolio.update(id, patch);
      writeNow(KEYS.portfolio, portfolio.all().map((p) => (p.id === id ? {
        ...p,
        ...patch,
        createdAt: new Date(backendItem.created_at).getTime()
      } : p)));
    } catch (error) {
      console.error("Failed to sync portfolio update", error);
    }
  },
  async remove(id: string) {
    try {
      await backendPortfolio.remove(id);
      writeNow(KEYS.portfolio, portfolio.all().filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to sync portfolio removal", error);
    }
  },
  strength(userId: string): number {
    const count = portfolio.forUser(userId).length;
    if (count === 0) return 0;
    if (count >= 6) return 100;
    return Math.min(100, 25 + count * 15);
  },
  async syncFromBackend() {
    try {
      const { items } = await backendPortfolio.listMe();
      const normalized = items.map(item => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        description: item.description,
        skills: item.skills,
        link: item.link,
        cover: item.cover,
        createdAt: new Date(item.created_at).getTime(),
      }));
      portfolio.sync(normalized);
    } catch (error) {
      console.error("Failed to sync portfolio from backend", error);
    }
  },
};

export const ideaSubmissions = {
  all(): IdeaSubmission[] { return read<IdeaSubmission[]>(KEYS.ideaSubmissions, []); },
  submit(input: Omit<IdeaSubmission, "id" | "userId" | "at">) {
    const u = auth.getUser();
    const item: IdeaSubmission = {
      ...input, id: `idea_${Date.now()}`,
      userId: input.anonymous ? null : (u?.id ?? null), at: Date.now(),
    };
    write(KEYS.ideaSubmissions, [item, ...ideaSubmissions.all()]);
    xp.add(15, "Idea submitted to Scope");
    notifications.push({ icon: "spark", text: "Your idea reached the Scope team. We review every submission." });
    return item;
  },
};

/* ===================================================================== */
/* RETENTION LAYER \u2014 rank movement, return tracking, smart nudges          */
/* ===================================================================== */

export type RankSnapshot = { rank: number; xp: number; at: number };

export const retention = {
  /** Capture current rank/xp snapshot. Called once per session. */
  snapshotRank(): RankSnapshot | null {
    const u = auth.getUser();
    if (!u) return null;
    const board = memberLeaderboard();
    const rank = board.findIndex((r) => r.isMe) + 1;
    if (rank === 0) return null;
    const prev = read<RankSnapshot | null>(KEYS.rankSnapshot, null);
    const cur: RankSnapshot = { rank, xp: xp.get(), at: Date.now() };
    // Only update snapshot once per day to keep movement meaningful
    if (!prev || Date.now() - prev.at > 86400000 * 0.9) {
      write(KEYS.rankSnapshot, cur);
    }
    return prev;
  },

  /** Returns delta vs last snapshot. Positive = climbed. */
  rankMovement(): { delta: number; current: number; xpToTop10: number } | null {
    const u = auth.getUser();
    if (!u) return null;
    const board = memberLeaderboard();
    const current = board.findIndex((r) => r.isMe) + 1;
    if (current === 0) return null;
    const prev = read<RankSnapshot | null>(KEYS.rankSnapshot, null);
    const tenth = board[9]?.value ?? 0;
    const myXp = xp.get();
    const xpToTop10 = current > 10 ? Math.max(1, tenth - myXp + 1) : 0;
    return {
      delta: prev ? prev.rank - current : 0, // positive = moved up
      current,
      xpToTop10,
    };
  },

  /** Days since user last visited (Infinity for first-ever visit). */
  daysAbsent(): number {
    const last = read<number>(KEYS.lastVisitAt, 0);
    if (!last) return 0;
    return Math.floor((Date.now() - last) / 86400000);
  },

  /** Mark a visit. Returns previous absence in days. */
  markVisit(): number {
    const absent = retention.daysAbsent();
    write(KEYS.lastVisitAt, Date.now());
    return absent;
  },

  /** Three rotating fresh items "this week" \u2014 derived from curated newest. */
  weeklyFresh(): CuratedProject[] {
    const all = curated.scopeChallenges();
    return all.slice(0, 3);
  },

  /** Smart nudge picker \u2014 returns the single most-relevant nudge or null. */
  nextNudge(): { id: string; text: string; cta: string; to: "/campus" | "/profile" | "/projects" | "/portfolio" } | null {
    const u = auth.getUser();
    if (!u) return null;
    const snoozed = read<Record<string, number>>(KEYS.nudgeSnoozedUntil, {});
    const now = Date.now();
    const active = (id: string) => !(snoozed[id] && snoozed[id] > now);

    const strength = profileStrength(u);
    const apps = applications.forUser(u.id);
    const port = portfolio.forUser(u.id);
    const lvl = xp.level();
    const toLevel = lvl.max - xp.get();

    if (!u.campus && active("campus")) {
      return { id: "campus", text: "Join your campus to unlock chapter-only opportunities.", cta: "Pick campus", to: "/campus" };
    }
    if (strength < 60 && active("profile")) {
      return { id: "profile", text: "Profiles above 60% get 3\u00d7 more matches. You're at " + strength + "%.", cta: "Finish profile", to: "/profile" };
    }
    if (apps.length === 0 && active("apply")) {
      return { id: "apply", text: "Apply to your first Scope challenge \u2014 fastest path to recognition.", cta: "Browse challenges", to: "/projects" };
    }
    if (port.length === 0 && active("portfolio")) {
      return { id: "portfolio", text: "Add a portfolio item \u2014 proof-of-work opens doors.", cta: "Add portfolio", to: "/portfolio" };
    }
    if (toLevel <= 100 && active("level")) {
      return { id: "level", text: `One more move to unlock ${lvl.next} tier perks.`, cta: "See challenges", to: "/projects" };
    }
    return null;
  },

  snoozeNudge(id: string, hours = 18) {
    const snoozed = read<Record<string, number>>(KEYS.nudgeSnoozedUntil, {});
    snoozed[id] = Date.now() + hours * 3600000;
    write(KEYS.nudgeSnoozedUntil, snoozed);
  },
};

/* ===================================================================== */
/* HYDRATION \u2014 schema versioning + safe boot recovery                     */
/* ===================================================================== */

export type HydrationStatus = "idle" | "hydrating" | "ready" | "recovered";

const MICROCOPY = {
  hydrating: "Restoring your workspace...",
  ready: "Sync complete.",
  recovered: "We restored a fresh copy of your data.",
};

export const hydration = {
  /** Run once on app boot. Validates schema version, repairs missing keys,
   *  and returns whether any slice was recovered. Never throws. */
  boot(): { status: HydrationStatus; recoveredKeys: string[] } {
    if (!isBrowser) return { status: "ready", recoveredKeys: [] };
    const recovered: string[] = [];
    try {
      const stored = Number(localStorage.getItem(KEYS.schemaVersion) ?? "0");
      if (stored && stored < SCHEMA_VERSION) {
        // Future migration hook \u2014 for now, only reset notification list
        // (dedup registry survives so one-shot alerts don't replay).
        try { localStorage.removeItem(KEYS.notifications); recovered.push(KEYS.notifications); } catch { /* noop */ }
      }
      // Validate every persisted JSON key \u2014 corrupt slices get reset
      // independently so one bad key never breaks the whole app.
      for (const k of Object.values(KEYS)) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try { JSON.parse(raw); } catch {
          try { localStorage.removeItem(k); } catch { /* noop */ }
          recovered.push(k);
        }
      }
      localStorage.setItem(KEYS.schemaVersion, String(SCHEMA_VERSION));
    } catch { /* noop \u2014 hydration must never throw */ }
    return { status: recovered.length > 0 ? "recovered" : "ready", recoveredKeys: recovered };
  },
  microcopy: MICROCOPY,
};
