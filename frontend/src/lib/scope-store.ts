// Scope Connect — central client-side state engine.
// Persists everything in localStorage. Single source of truth for the fake-MVP.

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

/* ----------------------------- Types ----------------------------- */

export type ScopeUser = {
  id: string;
  name: string;
  email: string;
  campus: string;
  bio: string;
  skills: string[];
  interests: string[];
  links: { website?: string; github?: string; twitter?: string };
  availability: "Open to collab" | "Building solo" | "Hiring teammates" | "Looking for internship";
  avatarColor: string;
  joinedAt: number;
  // --- Dynamic portfolio extension (optional, backward compatible) ---
  linkedinUrl?: string;
  portfolioWebsite?: string;
  resumeUrl?: string;
  portfolioPdfUrl?: string;
  instagramUrl?: string;
  primaryDomain?: string;
  specialization?: string;
  portfolioLinks?: Record<string, string>;
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
  userVoted?: boolean;
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
  campus: string;
  category: "Design" | "Engineering" | "Founder" | "Marketing" | "Pitch";
  description: string;
  match: number;
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

/* --------------------------- Auth flow --------------------------- */

const AVATAR_COLORS = ["#E63946", "#00D1FF", "#FB923C", "#A78BFA", "#34D399", "#F472B6"];

function newUserFromSignup(input: {
  name: string;
  email: string;
  campus: string;
  interests: string[];
}): ScopeUser {
  return {
    id: `u_${Date.now().toString(36)}`,
    name: input.name || input.email.split("@")[0] || "Builder",
    email: input.email,
    campus: input.campus || "IIT Bombay",
    bio: "",
    skills: [],
    interests: input.interests,
    links: {},
    availability: "Open to collab",
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    joinedAt: Date.now(),
  };
}

export const auth = {
  isLoggedIn(): boolean {
    return read<boolean>(KEYS.loggedIn, false);
  },
  getUser(): ScopeUser | null {
    return read<ScopeUser | null>(KEYS.user, null);
  },
  signup(input: { name: string; email: string; campus: string; interests: string[] }) {
    const user = newUserFromSignup(input);
    write(KEYS.user, user);
    write(KEYS.loggedIn, true);
    write(KEYS.points, 120); // welcome bonus
    write(KEYS.streak, 1);
    write(KEYS.streakDate, todayStamp());
    write(KEYS.visits, 1);
    notifications.push({ icon: "spark", text: "Welcome to Scope Connect! +120 XP signup bonus.", dedupKey: `welcome_bonus:${user.id}` });
    notifications.push({ icon: "trophy", text: "You're ranked #142 nationally. Climb today.", dedupKey: `welcome_rank:${user.id}` });
    return user;
  },
  login(email: string) {
    const existing = auth.getUser();
    if (existing) {
      write(KEYS.loggedIn, true);
      streak.tick();
      return existing;
    }
    // Auto-create a profile for any login attempt (fake auth).
    return auth.signup({
      name: email.split("@")[0].replace(/[._-]/g, " "),
      email,
      campus: "IIT Bombay",
      interests: ["AI", "Startup"],
    });
  },
  logout() {
    // 🧨 Hard Sign Out — sweep ALL scope_* keys so no role/permission/sidebar
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
  updateProfile(patch: Partial<ScopeUser>) {
    const u = auth.getUser();
    if (!u) return null;
    const next = { ...u, ...patch };
    write(KEYS.user, next);
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
    if (reason) notifications.push({ icon: "zap", text: `${reason} · +${amount} XP` });
    // Level-up alert — fired exactly once per tier per user via dedup registry.
    const newLevel = xp.level().name;
    if (newLevel !== prevLevel) {
      const u = auth.getUser();
      const uid = u?.id ?? "anon";
      notifications.push({
        icon: "trophy",
        text: `🎉 Level up! You're now ${newLevel}-tier.`,
        dedupKey: `level_up:${uid}:${newLevel}`,
      });
      write(KEYS.highestLevelSeen, newLevel);
    }
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
    if (next > 1) {
      xp.add(50, `Day ${next} login streak`);
    }
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
  /** Raw list (all notifications across roles). Avoid in UI; prefer forRole(). */
  all(): Notification[] {
    return read<Notification[]>(KEYS.notifications, []);
  },
  /** Role-filtered, priority-sorted list. Pinned items always come first. */
  forRole(role: string): Notification[] {
    const list = notifications.all().filter((n) => {
      // No `roles` field → legacy/global; show everywhere.
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
  },
};

/* --------------------------- Feed --------------------------- */

// Stable seed — built once at module load, never mutates.
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
      cover: input.cover || "🚀",
      createdAt: Date.now(),
      userVoted: true,
    };
    write(KEYS.projects, [p, ...projects.all()]);
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
  { id: "o_1", title: "Need UI Designer for HealthTech MVP", by: "MediMatch AI", campus: "IIT Bombay", category: "Design", description: "Design 8 mobile screens. 2-week sprint. Equity available.", match: 92 },
  { id: "o_2", title: "React Developer — Campus Marketplace", by: "CampusDAO", campus: "BITS Pilani", category: "Engineering", description: "Build storefront + cart with Tailwind & Supabase.", match: 88 },
  { id: "o_3", title: "Co-founder wanted — EdTech for Tier-3", by: "Diya Sharma", campus: "BITS Pilani", category: "Founder", description: "Looking for a technical co-founder, 50/50 equity.", match: 81 },
  { id: "o_4", title: "Pitch Deck Expert — YC application", by: "Layerly", campus: "Recruiter", category: "Pitch", description: "Polish a 10-slide deck for YC W26 application.", match: 76 },
  { id: "o_5", title: "Marketing Lead for hackathon launch", by: "Sprintly", campus: "ContentCo Hyderabad", category: "Marketing", description: "Drive registrations for Scope Hack '26.", match: 71 },
  { id: "o_6", title: "Python ML engineer for swarm sim", by: "RoboTrichy", campus: "NIT Trichy", category: "Engineering", description: "Help train swarm RL models on a 2-week timeline.", match: 68 },
];

export const opportunities = {
  all(): Opportunity[] {
    return SEED_OPPS;
  },
  saved(): string[] {
    return read<string[]>(KEYS.savedOpps, []);
  },
  interested(): string[] {
    return read<string[]>(KEYS.interestedOpps, []);
  },
  toggleSave(id: string) {
    const cur = opportunities.saved();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    write(KEYS.savedOpps, next);
    return next;
  },
  markInterested(id: string) {
    const cur = opportunities.interested();
    if (cur.includes(id)) return cur;
    const next = [...cur, id];
    write(KEYS.interestedOpps, next);
    xp.add(15, "Interest sent");
    notifications.push({ icon: "users", text: "Request sent. Strong match detected." });
    return next;
  },
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
  let score = 20; // base for account
  if (u.bio.length > 20) score += 15;
  if (u.skills.length >= 3) score += 15;
  if (u.interests.length >= 3) score += 10;
  if (u.links.website || u.links.github) score += 10;
  if (u.linkedinUrl) score += 5;
  if (u.primaryDomain) score += 5;
  if (u.portfolioLinks && Object.keys(u.portfolioLinks).length > 0) score += 5;
  if (u.availability) score += 10;
  if (projects.all().some((p) => p.authorId === u.id)) score += 15;
  return Math.min(100, score);
}

/* --------------------------- Leaderboard --------------------------- */

export type LeaderRow = { id: string; name: string; sub: string; value: number; isMe?: boolean };

export function memberLeaderboard(): LeaderRow[] {
  const seeded: LeaderRow[] = topBuilders.map((b) => ({
    id: b.name,
    name: b.name,
    sub: `${b.campus} · ${b.level}`,
    value: b.points,
  }));
  const u = auth.getUser();
  if (u) {
    seeded.push({
      id: u.id,
      name: u.name,
      sub: `${u.campus} · ${xp.level().name}`,
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
/* CURATED OPPORTUNITY MODEL — Phase 2                                    */
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
  { id: "sc_1", scope: "scope", title: "Build an AI Study Planner for Students", category: "AI", difficulty: "Advanced", seatsTotal: 8, seatsFilled: 5, timeline: "6 weeks", skills: ["React", "LLM APIs", "Product Design"], description: "Ship a Gen-Z AI assistant that builds personalized study plans, tracks progress and nudges weekly. Selected builders get featured nationally.", rewards: "Brand Lab credit · 300 XP · Mentor access", status: "live", cover: "🧠", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 2 },
  { id: "sc_2", scope: "scope", title: "Launch the Chapter Growth Campaign", category: "Marketing", difficulty: "Intermediate", seatsTotal: 12, seatsFilled: 9, timeline: "4 weeks", skills: ["Content", "Community", "Design"], description: "Drive 10,000 new builder signups across 50 campuses. Real campaign, real metrics, real impact.", rewards: "Cohort Lead credit · 420 XP · Discounted Red Apple Learning access", status: "live", cover: "📣", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 4 },
  { id: "sc_3", scope: "scope", title: "Create the National Innovation Magazine", category: "Media", difficulty: "Intermediate", seatsTotal: 10, seatsFilled: 3, timeline: "8 weeks", skills: ["Writing", "Editorial", "Design"], description: "Curate India's first student-led innovation publication. Print + digital, distributed to 100+ campuses.", rewards: "Certificate · 350 XP · Mentor access", status: "live", cover: "📰", postedBy: "Scope Official", postedAt: Date.now() - 86400000 },
  { id: "sc_4", scope: "scope", title: "Design Scope Connect Mobile UI Pack", category: "Design", difficulty: "Advanced", seatsTotal: 5, seatsFilled: 4, timeline: "5 weeks", skills: ["Figma", "Mobile UX", "Prototyping"], description: "Lead the visual system for Scope Connect's iOS + Android app. Your work ships to 50,000+ builders.", rewards: "Spotlight feature · 400 XP · Workshop access", status: "closing-soon", cover: "🎨", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 6 },
  { id: "sc_5", scope: "scope", title: "Create Student Resume Analyzer", category: "AI", difficulty: "Intermediate", seatsTotal: 6, seatsFilled: 2, timeline: "5 weeks", skills: ["Python", "NLP", "Next.js"], description: "Build an open-source resume analyzer trained on real anonymized student CVs. Free tool for the entire ecosystem.", rewards: "Founding Builder credit · 450 XP · Webinar invite", status: "live", cover: "📄", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 3 },
  { id: "sc_6", scope: "scope", title: "Build Founder Pitch Deck Templates", category: "Startup", difficulty: "Beginner", seatsTotal: 8, seatsFilled: 6, timeline: "3 weeks", skills: ["Design", "Storytelling"], description: "Ship 12 founder pitch deck templates used by every Scope founder track applicant.", rewards: "Portfolio feature · 380 XP · Discounted Red Apple Learning access", status: "live", cover: "📊", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 5 },
  { id: "sc_7", scope: "scope", title: "Research Youth Startup Trends in India", category: "Research", difficulty: "Intermediate", seatsTotal: 15, seatsFilled: 7, timeline: "6 weeks", skills: ["Research", "Survey Design", "Writing"], description: "Co-author the 2026 Indian Student Startup Trends Report. Distributed to investors, accelerators, and 200+ campuses.", rewards: "Verified Builder badge · 320 XP · Priority future opportunities", status: "live", cover: "📈", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 7 },
  { id: "sc_8", scope: "scope", title: "Build Scope Connect Browser Extension", category: "Web/App", difficulty: "Advanced", seatsTotal: 4, seatsFilled: 3, timeline: "5 weeks", skills: ["TypeScript", "Chrome APIs"], description: "Ship a browser extension that surfaces matching opportunities while builders browse the web.", rewards: "Leadership eligibility · 400 XP · Mentor calls", status: "closing-soon", cover: "🧩", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 6 },
  { id: "sc_9", scope: "scope", title: "Launch Scope Weekly Newsletter", category: "Media", difficulty: "Beginner", seatsTotal: 6, seatsFilled: 4, timeline: "Ongoing", skills: ["Writing", "Editorial"], description: "Curate the weekly Scope newsletter — 8 essential stories per week. Reach 50k+ builders.", rewards: "Editor credit · 300 XP · Webinar invite", status: "live", cover: "✉️", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 4 },
  { id: "sc_10", scope: "scope", title: "Build Campus Discovery Engine", category: "Web/App", difficulty: "Intermediate", seatsTotal: 5, seatsFilled: 1, timeline: "6 weeks", skills: ["React", "Search", "Data"], description: "Ship the search engine that helps every Indian student find their ideal campus chapter in 30 seconds.", rewards: "Brand Lab credit · 300 XP · Mentor access", status: "live", cover: "🔎", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 2 },
  { id: "sc_11", scope: "scope", title: "Direct India's First Builder Documentary", category: "Media", difficulty: "Advanced", seatsTotal: 4, seatsFilled: 2, timeline: "10 weeks", skills: ["Video", "Storytelling", "Editing"], description: "Document the lives of 5 student founders across 5 cities. Premieres at Scope Demo Day.", rewards: "Cohort Lead credit · 420 XP · Discounted Red Apple Learning access", status: "live", cover: "🎬", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 8 },
  { id: "sc_12", scope: "scope", title: "Design Scope Brand Identity v2", category: "Design", difficulty: "Advanced", seatsTotal: 3, seatsFilled: 1, timeline: "4 weeks", skills: ["Brand", "Typography", "Visual"], description: "Refresh Scope Connect's brand system. Logos, type, color, motion — the whole stack.", rewards: "Certificate · 350 XP · Mentor access", status: "live", cover: "🎯", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 1 },
  { id: "sc_13", scope: "scope", title: "Launch Scope Builder Podcast", category: "Media", difficulty: "Intermediate", seatsTotal: 3, seatsFilled: 2, timeline: "Ongoing", skills: ["Audio", "Interviewing", "Production"], description: "Host a weekly podcast featuring student founders, designers, and researchers shipping in India.", rewards: "Spotlight feature · 400 XP · Workshop access", status: "live", cover: "🎙", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 5 },
  { id: "sc_14", scope: "scope", title: "Build Scope Mentor Match Platform", category: "Web/App", difficulty: "Advanced", seatsTotal: 5, seatsFilled: 0, timeline: "7 weeks", skills: ["React", "Algorithms", "Product"], description: "Match 5,000+ student builders with industry mentors. Algorithmic, opt-in, weekly office hours.", rewards: "Founding Builder credit · 450 XP · Webinar invite", status: "live", cover: "🤝", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 1 },
  { id: "sc_15", scope: "scope", title: "Launch Scope Climate Action Cohort", category: "Community Growth", difficulty: "Intermediate", seatsTotal: 20, seatsFilled: 11, timeline: "8 weeks", skills: ["Community", "Climate", "Operations"], description: "Run India's largest student climate action cohort. 200 builders, 20 campuses, real on-ground projects.", rewards: "Portfolio feature · 380 XP · Discounted Red Apple Learning access", status: "live", cover: "🌍", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 9 },
  { id: "sc_16", scope: "scope", title: "Design the Scope Hack '26 Brand Kit", category: "Design", difficulty: "Intermediate", seatsTotal: 4, seatsFilled: 3, timeline: "3 weeks", skills: ["Brand", "Print", "Motion"], description: "Lead visual identity for India's largest student hackathon. 2,400 participants, 50 cities.", rewards: "Verified Builder badge · 320 XP · Priority future opportunities", status: "closing-soon", cover: "🪩", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 4 },
  { id: "sc_17", scope: "scope", title: "Build Scope Connect API for Recruiters", category: "Web/App", difficulty: "Advanced", seatsTotal: 3, seatsFilled: 1, timeline: "6 weeks", skills: ["Node.js", "API Design"], description: "Ship the recruiter-facing API so companies can discover Scope builders by skill, campus and momentum.", rewards: "Leadership eligibility · 400 XP · Mentor calls", status: "live", cover: "🛰", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 2 },
  { id: "sc_18", scope: "scope", title: "Run a National Student Design Sprint", category: "Design", difficulty: "Intermediate", seatsTotal: 50, seatsFilled: 28, timeline: "1 weekend", skills: ["Design", "Prototyping"], description: "48-hour design sprint solving a real public-sector brief. Top 5 entries get fellowships.", rewards: "Editor credit · 300 XP · Webinar invite", status: "live", cover: "✏️", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 3 },
  { id: "sc_19", scope: "scope", title: "Build Scope Onboarding Game", category: "Web/App", difficulty: "Intermediate", seatsTotal: 4, seatsFilled: 2, timeline: "4 weeks", skills: ["React", "Game Design"], description: "Turn first-time onboarding into a 60-second game. Test it on 1,000+ new builders.", rewards: "Research credit · 350 XP · Published byline", status: "live", cover: "🕹", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 6 },
  { id: "sc_20", scope: "scope", title: "Compose the Scope Anthem", category: "Media", difficulty: "Beginner", seatsTotal: 2, seatsFilled: 0, timeline: "3 weeks", skills: ["Music", "Production"], description: "Write and produce the official anthem for Scope Hack '26. Premieres at the opening keynote.", rewards: "Cohort Lead credit · 420 XP · Discounted Red Apple Learning access", status: "live", cover: "🎵", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 1 },
  { id: "sc_21", scope: "scope", title: "Build Scope Builder Wallet (XP redemption)", category: "Web/App", difficulty: "Advanced", seatsTotal: 4, seatsFilled: 1, timeline: "7 weeks", skills: ["React", "Payments"], description: "Ship the XP redemption layer — convert XP into perks, courses, and partner credits.", rewards: "Certificate · 350 XP · Mentor access", status: "live", cover: "👛", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 5 },
  { id: "sc_22", scope: "scope", title: "Lead the Scope Ambassador Program", category: "Community Growth", difficulty: "Intermediate", seatsTotal: 25, seatsFilled: 14, timeline: "12 weeks", skills: ["Community", "Leadership"], description: "Onboard, train, and support 500+ campus ambassadors across India.", rewards: "Spotlight feature · 400 XP · Workshop access", status: "live", cover: "🌟", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 6 },
  { id: "sc_23", scope: "scope", title: "Build Scope Connect Notion OS", category: "Startup", difficulty: "Beginner", seatsTotal: 5, seatsFilled: 2, timeline: "3 weeks", skills: ["Notion", "Templates"], description: "Ship the Notion OS that every campus chapter can clone for ops, planning and growth.", rewards: "Founding Builder credit · 450 XP · Webinar invite", status: "live", cover: "🗂", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 2 },
  { id: "sc_24", scope: "scope", title: "Translate Scope into 6 Indian Languages", category: "Community Growth", difficulty: "Intermediate", seatsTotal: 12, seatsFilled: 4, timeline: "5 weeks", skills: ["Translation", "Localization"], description: "Make Scope Connect accessible in Bengali, Hindi, Tamil, Telugu, Marathi, Kannada.", rewards: "Portfolio feature · 380 XP · Discounted Red Apple Learning access", status: "live", cover: "🌐", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 4 },
  { id: "sc_25", scope: "scope", title: "Direct the Scope Demo Day Showcase", category: "Media", difficulty: "Advanced", seatsTotal: 3, seatsFilled: 1, timeline: "6 weeks", skills: ["Production", "Stage Design", "Direction"], description: "Direct the live showcase where 25 student founders pitch to a national audience.", rewards: "Verified Builder badge · 320 XP · Priority future opportunities", status: "live", cover: "🎭", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 7 },
];

const SEED_CAMPUS: CuratedProject[] = [
  { id: "cp_1", scope: "campus", title: "IIT Bombay Hackathon Ops Team", category: "Operations", difficulty: "Beginner", seatsTotal: 15, seatsFilled: 8, timeline: "3 weeks", skills: ["Coordination", "Logistics"], description: "Run the campus-wide hackathon. Manage logistics, sponsors, and judging panels.", rewards: "Chapter Priority badge · 300 XP · Certificate", status: "live", campus: "IIT Bombay", cover: "🏫", postedBy: "Scope · IIT Bombay Chapter", postedAt: Date.now() - 86400000 * 3 },
  { id: "cp_2", scope: "campus", title: "BITS Pilani Startup Cell — Founding Member", category: "Startup", difficulty: "Intermediate", seatsTotal: 6, seatsFilled: 2, timeline: "Ongoing", skills: ["Strategy", "Outreach"], description: "Help build the BITS Pilani founding startup cell from scratch with Scope's playbook.", rewards: "Founding Member title · Mentor access · 400 XP", status: "live", campus: "BITS Pilani", cover: "🚀", postedBy: "Scope · BITS Pilani Chapter", postedAt: Date.now() - 86400000 * 2 },
  { id: "cp_3", scope: "campus", title: "NIT Trichy Robotics Sprint", category: "Robotics", difficulty: "Advanced", seatsTotal: 8, seatsFilled: 6, timeline: "4 weeks", skills: ["ROS", "Python", "Hardware"], description: "Build a swarm of 5 autonomous bots for the national Robotics Showcase.", rewards: "Open-source credit · 380 XP · GitHub spotlight", status: "live", campus: "NIT Trichy", cover: "🤖", postedBy: "Scope · NIT Trichy Chapter", postedAt: Date.now() - 86400000 * 5 },
  { id: "cp_4", scope: "campus", title: "Jadavpur University Campus Media Squad", category: "Media", difficulty: "Beginner", seatsTotal: 10, seatsFilled: 4, timeline: "Ongoing", skills: ["Writing", "Photography", "Social"], description: "Document everything that ships from JU. Reels, photo essays, weekly recaps.", rewards: "Media Squad badge · 250 XP · Portfolio feature", status: "live", campus: "Jadavpur University", cover: "📸", postedBy: "Scope · Jadavpur Chapter", postedAt: Date.now() - 86400000 * 1 },
  { id: "cp_5", scope: "campus", title: "St. Xavier's Student Startup Showcase", category: "Startup", difficulty: "Intermediate", seatsTotal: 8, seatsFilled: 3, timeline: "5 weeks", skills: ["Curation", "Operations"], description: "Curate 12 student startups for the St. Xavier's annual showcase. Real demo day with investors.", rewards: "Showcase Lead credit · 350 XP · Mentor intros", status: "live", campus: "St. Xavier's", cover: "🚀", postedBy: "Scope · St. Xavier's Chapter", postedAt: Date.now() - 86400000 * 3 },
  { id: "cp_6", scope: "campus", title: "Heritage Institute Admissions Awareness Campaign", category: "Marketing", difficulty: "Beginner", seatsTotal: 12, seatsFilled: 6, timeline: "4 weeks", skills: ["Content", "Outreach"], description: "Build a campus-led awareness campaign for the next admissions cycle. Reach 30+ schools.", rewards: "Certificate · 350 XP · Mentor access", status: "live", campus: "Heritage Institute", cover: "📣", postedBy: "Scope · Heritage Chapter", postedAt: Date.now() - 86400000 * 2 },
  { id: "cp_7", scope: "campus", title: "Amity Kolkata Innovation Fest Execution Team", category: "Operations", difficulty: "Intermediate", seatsTotal: 14, seatsFilled: 9, timeline: "6 weeks", skills: ["Operations", "Sponsorship"], description: "Run Amity Kolkata's flagship innovation fest end-to-end. 1,500+ attendees expected.", rewards: "Fest Lead credit · 400 XP · Certificate", status: "closing-soon", campus: "Amity Kolkata", cover: "🎪", postedBy: "Scope · Amity Kolkata Chapter", postedAt: Date.now() - 86400000 * 5 },
  { id: "cp_8", scope: "campus", title: "Techno India Campus Podcast Launch", category: "Media", difficulty: "Beginner", seatsTotal: 4, seatsFilled: 1, timeline: "5 weeks", skills: ["Audio", "Interviewing"], description: "Launch Techno India's first student podcast. Interview alumni founders, monthly drops.", rewards: "Founding Builder credit · 450 XP · Webinar invite", status: "live", campus: "Techno India", cover: "🎙", postedBy: "Scope · Techno India Chapter", postedAt: Date.now() - 86400000 * 2 },
  { id: "cp_9", scope: "campus", title: "EIILM Kolkata Builder Community Buildout", category: "Community Growth", difficulty: "Beginner", seatsTotal: 6, seatsFilled: 2, timeline: "Ongoing", skills: ["Community", "Events"], description: "Grow EIILM's builder community from 0 to 100 active members in 8 weeks.", rewards: "Founding Lead title · 350 XP · Mentor access", status: "live", campus: "EIILM Kolkata", cover: "🌱", postedBy: "Scope · EIILM Chapter", postedAt: Date.now() - 86400000 * 1 },
  { id: "cp_10", scope: "campus", title: "VIT Vellore Design Jam", category: "Design", difficulty: "Intermediate", seatsTotal: 20, seatsFilled: 14, timeline: "1 weekend", skills: ["Figma", "UX"], description: "Run VIT Vellore's flagship 48-hour design jam. Real briefs from 4 partner startups.", rewards: "Jam Lead credit · 300 XP · Top 3 prize pool", status: "closing-soon", campus: "VIT Vellore", cover: "🎨", postedBy: "Scope · VIT Vellore Chapter", postedAt: Date.now() - 86400000 * 4 },
  { id: "cp_11", scope: "campus", title: "DTU Delhi Open Source Cohort", category: "Engineering", difficulty: "Intermediate", seatsTotal: 12, seatsFilled: 5, timeline: "6 weeks", skills: ["Git", "Open Source"], description: "Mentor 30+ DTU students through their first open-source contribution.", rewards: "OSS Mentor credit · 350 XP · GitHub spotlight", status: "live", campus: "DTU Delhi", cover: "🛠", postedBy: "Scope · DTU Delhi Chapter", postedAt: Date.now() - 86400000 * 3 },
  { id: "cp_12", scope: "campus", title: "IIIT Hyderabad AI Research Reading Group", category: "Research", difficulty: "Advanced", seatsTotal: 10, seatsFilled: 7, timeline: "Ongoing", skills: ["Research", "ML"], description: "Run IIIT Hyderabad's weekly AI research reading group. Curate papers, lead discussions.", rewards: "Research credit · 280 XP/month · Mentor access", status: "live", campus: "IIIT Hyderabad", cover: "🧪", postedBy: "Scope · IIIT Hyderabad Chapter", postedAt: Date.now() - 86400000 * 6 },
  { id: "cp_13", scope: "campus", title: "Manipal Founders Forum Demo Night", category: "Startup", difficulty: "Intermediate", seatsTotal: 8, seatsFilled: 4, timeline: "4 weeks", skills: ["Operations", "Curation"], description: "Curate Manipal's quarterly founder demo night. 8 student startups, 200+ attendees.", rewards: "Curator credit · 320 XP · Demo Night badge", status: "live", campus: "Manipal University", cover: "🌃", postedBy: "Scope · Manipal Chapter", postedAt: Date.now() - 86400000 * 2 },
  { id: "cp_14", scope: "campus", title: "SRM Campus Brand Lab", category: "Marketing", difficulty: "Beginner", seatsTotal: 10, seatsFilled: 3, timeline: "5 weeks", skills: ["Brand", "Content"], description: "Help 5 SRM student startups craft their first brand kit. Real briefs, real shipping.", rewards: "Brand Lab credit · 280 XP · Portfolio feature", status: "live", campus: "SRM University", cover: "🎯", postedBy: "Scope · SRM Chapter", postedAt: Date.now() - 86400000 * 4 },
  { id: "cp_15", scope: "campus", title: "Kolkata Inter-Campus Hack League", category: "Engineering", difficulty: "Advanced", seatsTotal: 16, seatsFilled: 11, timeline: "8 weeks", skills: ["Operations", "Engineering"], description: "Coordinate the first inter-campus hack league across 6 Kolkata institutions. 400+ builders expected.", rewards: "Certificate · 350 XP · Mentor access", status: "closing-soon", campus: "Jadavpur University", cover: "🏆", postedBy: "Scope · Kolkata Zone", postedAt: Date.now() - 86400000 * 7 },
];

const SEED_OPEN: CuratedProject[] = [
  { id: "op_1", scope: "open", title: "Open Research: Mental Health on Indian Campuses", category: "Research", difficulty: "Intermediate", seatsTotal: 20, seatsFilled: 11, timeline: "6 weeks", skills: ["Research", "Survey Design", "Writing"], description: "Co-author India's largest student mental health report. Open to any verified builder.", rewards: "Research credit · 350 XP · Published report", status: "live", cover: "🧠", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 7 },
  { id: "op_2", scope: "open", title: "Open Build: Climate Action Dashboard", category: "Engineering", difficulty: "Intermediate", seatsTotal: 10, seatsFilled: 4, timeline: "5 weeks", skills: ["Next.js", "Data Viz", "APIs"], description: "Build an open-source dashboard tracking campus climate initiatives across India.", rewards: "Open-source credit · 400 XP · GitHub spotlight", status: "live", cover: "🌍", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 4 },
  { id: "op_3", scope: "open", title: "Scope Founder Track 2026", category: "Founder", difficulty: "Advanced", seatsTotal: 25, seatsFilled: 18, timeline: "12 weeks", skills: ["Vision", "Execution"], description: "Pitch your startup idea. Top 5 get incubation support, mentor access and demo day.", rewards: "₹2L incubation pool · Mentor network · Demo Day", status: "closing-soon", cover: "💡", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 10 },
  { id: "op_4", scope: "open", title: "National Student Design Sprint", category: "Design", difficulty: "Intermediate", seatsTotal: 60, seatsFilled: 34, timeline: "1 weekend", skills: ["Figma", "UX"], description: "48-hour national design sprint solving a real public-sector brief. Open to any campus.", rewards: "Brand Lab credit · 300 XP · Mentor access", status: "live", cover: "✏️", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 3 },
  { id: "op_5", scope: "open", title: "Open Source Builder Cohort", category: "Engineering", difficulty: "Intermediate", seatsTotal: 30, seatsFilled: 17, timeline: "8 weeks", skills: ["Git", "Open Source"], description: "Ship your first 5 merged PRs to real open-source projects. Weekly mentor office hours.", rewards: "OSS Builder credit · 400 XP · GitHub spotlight", status: "live", cover: "🛠", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 5 },
  { id: "op_6", scope: "open", title: "Youth Creator Fellowship", category: "Media", difficulty: "Beginner", seatsTotal: 20, seatsFilled: 12, timeline: "10 weeks", skills: ["Video", "Writing", "Audio"], description: "Build your first 1,000 followers with weekly mentor reviews and a guaranteed brand collab at the end.", rewards: "Creator Fellow credit · 350 XP · Brand deal", status: "live", cover: "🎬", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 6 },
  { id: "op_7", scope: "open", title: "Student Research Squad — Q2", category: "Research", difficulty: "Intermediate", seatsTotal: 18, seatsFilled: 9, timeline: "7 weeks", skills: ["Research", "Writing"], description: "Join the cross-campus research squad publishing quarterly reports on Indian student behavior.", rewards: "Research credit · 380 XP · Published byline", status: "live", cover: "🧬", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 4 },
  { id: "op_8", scope: "open", title: "India Campus Brand Challenge", category: "Marketing", difficulty: "Intermediate", seatsTotal: 40, seatsFilled: 22, timeline: "5 weeks", skills: ["Brand", "Strategy"], description: "Pitch a brand strategy to revive a struggling Indian D2C brand. Top 3 win mentor sessions + ₹15k.", rewards: "Founding Builder credit · 450 XP · Webinar invite", status: "live", cover: "🪩", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 3 },
  { id: "op_9", scope: "open", title: "Open Build: Scope Connect Plugin Library", category: "Engineering", difficulty: "Advanced", seatsTotal: 12, seatsFilled: 4, timeline: "6 weeks", skills: ["TypeScript", "API Design"], description: "Ship 10 community plugins extending Scope Connect. Used by 50k+ builders.", rewards: "Open-source credit · 450 XP · Founding Plugin Author", status: "live", cover: "🔌", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 5 },
  { id: "op_10", scope: "open", title: "Open Pitch: AI for Public Good", category: "AI", difficulty: "Advanced", seatsTotal: 15, seatsFilled: 6, timeline: "9 weeks", skills: ["AI", "Research", "Pitch"], description: "Pitch an AI-for-public-good idea solving a real Indian problem. Top 3 get prototype funding.", rewards: "Research credit · 350 XP · Published byline", status: "live", cover: "🤖", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 8 },
  { id: "op_11", scope: "open", title: "Scope Builder Buddy Program", category: "Community Growth", difficulty: "Beginner", seatsTotal: 50, seatsFilled: 29, timeline: "Ongoing", skills: ["Community", "Mentoring"], description: "Pair with a fresh builder weekly. 1:1 calls, accountability, shipping check-ins.", rewards: "Buddy credit · 250 XP/month · Community badge", status: "live", cover: "🤝", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 2 },
  { id: "op_12", scope: "open", title: "Open Curation: Scope Library", category: "Media", difficulty: "Beginner", seatsTotal: 15, seatsFilled: 7, timeline: "Ongoing", skills: ["Writing", "Curation"], description: "Curate the best resources for student builders — playbooks, courses, communities.", rewards: "Curator credit · 220 XP/month · Library badge", status: "live", cover: "📚", postedBy: "Scope Official", postedAt: Date.now() - 86400000 * 1 },
];

const ALL_CURATED = [...SEED_CURATED, ...SEED_CAMPUS, ...SEED_OPEN];

export const curated = {
  scopeChallenges(): CuratedProject[] { return SEED_CURATED; },
  campusFor(campus: string | null): CuratedProject[] {
    if (!campus) return SEED_CAMPUS;
    return SEED_CAMPUS.filter((p) => p.campus === campus);
  },
  openProjects(): CuratedProject[] { return SEED_OPEN; },
  byId(id: string): CuratedProject | undefined { return ALL_CURATED.find((p) => p.id === id); },
  all(): CuratedProject[] { return ALL_CURATED; },
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
    xp.add(20, "Application sent");
    notifications.push({ icon: "spark", text: `Application received for "${project?.title ?? "project"}". Review within 48h.` });
    if (isFirst) {
      notifications.push({ icon: "trophy", text: "🎯 First application sent — your builder journey is live.", dedupKey: `first_application:${u.id}` });
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
  create(input: Omit<PortfolioItem, "id" | "userId" | "createdAt">) {
    const u = auth.getUser();
    if (!u) return null;
    const isFirst = portfolio.forUser(u.id).length === 0;
    const item: PortfolioItem = { ...input, id: `pf_${Date.now()}`, userId: u.id, createdAt: Date.now() };
    write(KEYS.portfolio, [item, ...portfolio.all()]);
    xp.add(30, "Portfolio item added");
    notifications.push({ icon: "trophy", text: `"${item.title}" added to your portfolio.` });
    if (isFirst) {
      notifications.push({ icon: "spark", text: "🌟 First portfolio item — proof of work activated.", dedupKey: `first_portfolio:${u.id}` });
    }
    return item;
  },
  update(id: string, patch: Partial<Omit<PortfolioItem, "id" | "userId" | "createdAt">>) {
    write(KEYS.portfolio, portfolio.all().map((p) => (p.id === id ? { ...p, ...patch } : p)));
  },
  remove(id: string) {
    write(KEYS.portfolio, portfolio.all().filter((p) => p.id !== id));
  },
  strength(userId: string): number {
    const count = portfolio.forUser(userId).length;
    if (count === 0) return 0;
    if (count >= 6) return 100;
    return Math.min(100, 25 + count * 15);
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
/* RETENTION LAYER — rank movement, return tracking, smart nudges          */
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

  /** Three rotating fresh items "this week" — derived from curated newest. */
  weeklyFresh(): CuratedProject[] {
    const all = curated.scopeChallenges();
    return all.slice(0, 3);
  },

  /** Smart nudge picker — returns the single most-relevant nudge or null. */
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
      return { id: "profile", text: "Profiles above 60% get 3× more matches. You're at " + strength + "%.", cta: "Finish profile", to: "/profile" };
    }
    if (apps.length === 0 && active("apply")) {
      return { id: "apply", text: "Apply to your first Scope challenge — fastest path to recognition.", cta: "Browse challenges", to: "/projects" };
    }
    if (port.length === 0 && active("portfolio")) {
      return { id: "portfolio", text: "Add a portfolio item — proof-of-work opens doors.", cta: "Add portfolio", to: "/portfolio" };
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
/* HYDRATION — schema versioning + safe boot recovery                     */
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
        // Future migration hook — for now, only reset notification list
        // (dedup registry survives so one-shot alerts don't replay).
        try { localStorage.removeItem(KEYS.notifications); recovered.push(KEYS.notifications); } catch { /* noop */ }
      }
      // Validate every persisted JSON key — corrupt slices get reset
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
    } catch { /* noop — hydration must never throw */ }
    return { status: recovered.length > 0 ? "recovered" : "ready", recoveredKeys: recovered };
  },
  microcopy: MICROCOPY,
};
