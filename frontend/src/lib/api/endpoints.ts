import { api } from "./client";
import type { Notification, Project, ScopeUser } from "@/lib/scope-store";

export type AuthPayload = {
  user: ScopeUser;
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
};

export const backendAuth = {
  signup(body: { email: string; password: string; name: string }) {
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
  update(id: string, body: Record<string, unknown>) {
    return api<{ user: ScopeUser }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
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
};

export const backendAnalytics = {
  track(events: Array<{ event: string; occurred_at?: string; props?: Record<string, unknown> }>) {
    return api<{ accepted: number }>("/api/analytics/track", {
      method: "POST",
      body: JSON.stringify({ events }),
    });
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
