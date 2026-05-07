import { api } from "./client";
import type { Notification, Project, ScopeUser } from "@/lib/scope-store";

export type AuthPayload = {
  user: ScopeUser;
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
};

export const backendAuth = {
  signup(body: { email: string; password: string; name: string; institution_id?: string }) {
    return api<AuthPayload>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  login(body: { email: string; password: string }) {
    return api<AuthPayload>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  logout(refreshToken: string | null) {
    return api<{ revoked: number }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },
  me() {
    return api<{ user: ScopeUser }>("/api/auth/me");
  },
};

export const backendUsers = {
  list(params: { institutionId?: string; role?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.institutionId) qs.set("institution_id", params.institutionId);
    if (params.role) qs.set("role", params.role);
    const suffix = qs.toString() ? `?${qs}` : "";
    return api<{ items: ScopeUser[]; next_cursor: string | null; has_more: boolean }>(`/api/users${suffix}`);
  },
  update(id: string, body: Record<string, unknown>) {
    return api<{ user: ScopeUser }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  updateMemberStatus(id: string, studentStatus: "pending_verification" | "active" | "rejected") {
    return api<{ user: ScopeUser }>(`/api/users/${id}/member-status`, {
      method: "PATCH",
      body: JSON.stringify({ student_status: studentStatus }),
    });
  },
  setPortfolioLinks(portfolioLinks: Record<string, string>) {
    const links = Object.entries(portfolioLinks)
      .filter(([, url]) => url.trim())
      .map(([key, url]) => ({
        key,
        label: key.replace(/[-_]/g, " "),
        url,
        category: key.startsWith("custom:") ? "custom" : "domain",
      }));

    return api<{ user: ScopeUser }>("/api/users/profile", {
      method: "POST",
      body: JSON.stringify({ portfolio_links: links }),
    });
  },
  activity(limit = 20) {
    return api<{ items: Array<{ id: string; kind: string; text: string; created_at: string; meta?: Record<string, unknown> }>; next_cursor: string | null; has_more: boolean }>(`/api/users/me/activity?limit=${limit}`);
  },
};

type BackendInstitution = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  pipeline_stage?: string;
};

export const backendInstitutions = {
  publicList() {
    return api<{ items: BackendInstitution[]; next_cursor: string | null; has_more: boolean }>("/api/institutions/public");
  },
  campusSummary() {
    return api<{
      campus_name: string | null;
      city: string | null;
      active_members: number;
      leaders: number;
      projects_shipped: number;
      weekly_growth_pct: number;
    }>("/api/institutions/me/campus-summary");
  },
};

export const backendAdminUsers = {
  create(body: {
    email: string;
    name: string;
    password?: string;
    role: "student" | "faculty" | "institution_admin" | "scope_admin" | "super_admin";
    role_variant?: string;
    institution_id?: string | null;
    send_invite?: boolean;
  }) {
    return api<{ user: ScopeUser; invite_token?: string | null }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

type BackendProject = {
  id: string;
  created_by: string;
  institution_id?: string | null;
  title: string;
  summary?: string | null;
  description?: string | null;
  domain?: string | null;
  tags?: string[];
  status: string;
  capacity: number;
  starts_on?: string | null;
  ends_on?: string | null;
  cover_url?: string | null;
  visibility: string;
  created_at: string;
  updated_at?: string;
};

type BackendNotification = {
  id: string;
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  created_at: string;
};
type InstitutionCommunicationPayload = {
  channel: "broadcast" | "email" | "notice";
  title: string;
  body: string;
};

export const backendProjects = {
  list() {
    return api<{ items: BackendProject[]; next_cursor: string | null; has_more: boolean }>("/api/projects?limit=100");
  },
  create(project: Project) {
    return api<{ project: BackendProject }>("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        title: project.title,
        summary: project.problem,
        description: project.description,
        domain: project.category,
        tags: [project.category].filter(Boolean),
        capacity: 3,
        visibility: "public",
        status: "open",
      }),
    });
  },
  apply(id: string, message: string) {
    return api<{ application: unknown }>(`/api/projects/${id}/apply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
  update(id: string, body: Partial<{ title: string; summary: string; description: string; domain: string; status: string }>) {
    return api<{ project: BackendProject }>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return api<null>(`/api/projects/${id}`, { method: "DELETE" });
  },
};

export const backendNotifications = {
  list() {
    return api<{ items: BackendNotification[]; next_cursor: string | null; has_more: boolean }>("/api/notifications?limit=100");
  },
  markRead(id: string) {
    return api<{ notification: BackendNotification }>(`/api/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ read: true }),
    });
  },
  markAllRead() {
    return api<{ updated: number }>("/api/notifications/read-all", { method: "POST" });
  },
  listInstitution(limit = 50) {
    return api<{ items: BackendNotification[]; next_cursor: string | null; has_more: boolean }>(`/api/notifications/institution?limit=${limit}`);
  },
  sendInstitution(body: InstitutionCommunicationPayload) {
    return api<{ created: number }>("/api/notifications/institution", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

export const backendAnalytics = {
  dau() {
    return api<{ series: Array<{ date: string; value: number }>; total_unique: number }>("/api/analytics/dau");
  },
  wau() {
    return api<{ series: Array<{ date: string; value: number }>; total_unique: number }>("/api/analytics/wau");
  },
  engagement() {
    return api<{
      dau_wau_ratio: number;
      avg_sessions_per_user: number;
      median_session_minutes: number;
      top_events: Array<{ event: string; count: number }>;
    }>("/api/analytics/engagement");
  },
};

export type BackendFeedPost = {
  id: string;
  author: string;
  campus: string;
  time: string;
  type: string;
  content: string;
  likes: number;
  celebrates: number;
  comments: number;
  userLiked: boolean;
  userCelebrated: boolean;
  commentList: Array<{ id: string; author: string; text: string; at: number }>;
};

export const backendFeed = {
  list(limit = 100) {
    return api<{ items: BackendFeedPost[]; next_cursor: string | null; has_more: boolean }>(`/api/feed?limit=${limit}`);
  },
  listCampus(limit = 100) {
    return api<{ items: BackendFeedPost[]; next_cursor: string | null; has_more: boolean }>(`/api/feed?scope=campus&limit=${limit}`);
  },
  create(content: string, type = "Update") {
    return api<{ post: BackendFeedPost }>("/api/feed", { method: "POST", body: JSON.stringify({ content, type }) });
  },
  react(id: string, reaction: "like" | "celebrate") {
    return api<{ post: BackendFeedPost }>(`/api/feed/${id}/react`, { method: "POST", body: JSON.stringify({ reaction }) });
  },
  comment(id: string, text: string) {
    return api<{ post: BackendFeedPost }>(`/api/feed/${id}/comment`, { method: "POST", body: JSON.stringify({ text }) });
  },
};

export function mapBackendProject(project: BackendProject): Project {
  return {
    id: project.id,
    authorId: project.created_by,
    author: "Scope Builder",
    campus: project.institution_id || "Scope Connect",
    title: project.title,
    description: project.description || project.summary || "",
    problem: project.summary || "Solving a real campus / industry pain.",
    team: "Scope Builder",
    category: project.domain || project.tags?.[0] || "Software",
    votes: 0,
    cover: project.cover_url || "🚀",
    createdAt: project.created_at ? new Date(project.created_at).getTime() : Date.now(),
  };
}

export function mapBackendNotification(notification: BackendNotification): Notification {
  return {
    id: notification.id,
    text: notification.body ? `${notification.title}: ${notification.body}` : notification.title,
    at: notification.created_at ? new Date(notification.created_at).getTime() : Date.now(),
    read: notification.read,
    icon: notification.kind === "application_received" ? "users" : notification.kind === "achievement" ? "trophy" : "spark",
    href: notification.link || undefined,
    dedupKey: `backend:${notification.id}`,
  };
}
