import { api } from "./client";
import type { ScopeUser } from "@/lib/scope-store";

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
