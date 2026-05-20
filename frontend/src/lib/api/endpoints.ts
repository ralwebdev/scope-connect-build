import { api } from "./client";
import type { Notification, Project, ScopeUser } from "@/lib/scope-store";

export type AuthPayload = {
  user: ScopeUser;
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
};

export const backendAuth = {
  signup(body: { email: string; password: string; name: string; institution_id?: string; interests?: string[]; referral_code?: string }) {
    return api<AuthPayload>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  login(body: { email: string; password: string }) {
    return api<AuthPayload>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  logout(refreshToken: string | null) {
    return api<{ revoked: number }>("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },
  me() {
    return api<{ user: ScopeUser }>("/api/v1/auth/me");
  },
};

export const backendUsers = {
  list(params: { institutionId?: string; role?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.institutionId) qs.set("institution_id", params.institutionId);
    if (params.role) qs.set("role", params.role);
    const suffix = qs.toString() ? `?${qs}` : "";
    return api<{ items: ScopeUser[]; next_cursor: string | null; has_more: boolean }>(`/api/v1/users${suffix}`);
  },
  getRank() {
    return api<{ globalRank: number; campusRank: number | null }>("/api/v1/users/me/rank");
  },
  update(id: string, body: Record<string, unknown>) {
    return api<{ user: ScopeUser }>(`/api/v1/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  adminUpdate(id: string, body: Record<string, unknown>) {
    return api<{ user: ScopeUser }>(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  updateMemberStatus(id: string, studentStatus: "pending_verification" | "active" | "rejected") {
    return api<{ user: ScopeUser }>(`/api/v1/users/${id}/member-status`, {
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

    return api<{ user: ScopeUser }>("/api/v1/users/profile", {
      method: "POST",
      body: JSON.stringify({ portfolio_links: links }),
    });
  },
  activity(limit = 20) {
    return api<{ items: Array<{ id: string; kind: string; text: string; created_at: string; meta?: Record<string, unknown> }>; next_cursor: string | null; has_more: boolean }>(`/api/v1/users/me/activity?limit=${limit}`);
  },
  async listStudentsByXp(params: { institutionId?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.institutionId) qs.set("institution_id", params.institutionId);
    const suffix = qs.toString() ? `?${qs}` : "";
    const response = await api<{ items: ScopeUser[]; next_cursor: string | null; has_more: boolean }>(`/api/v1/users/leaderboard/students${suffix}`);
    return {
      ...response,
      items: [...response.items].sort((a, b) => (b.stats?.xp ?? 0) - (a.stats?.xp ?? 0)),
    };
  },
  listCampusesByMembers() {
    return api<{ items: Array<{ id: string; name: string; sub: string; value: number }>; next_cursor: string | null; has_more: boolean }>("/api/v1/users/leaderboard/campuses");
  },
  listChaptersByXp() {
    return api<{ items: Array<{ id: string; name: string; sub: string; value: number }>; next_cursor: string | null; has_more: boolean }>("/api/v1/users/leaderboard/chapters");
  },
  awardDashboardPoints(segments: Array<"joined_campus" | "complete_profile" | "first_application" | "first_portfolio">) {
    return api<{ awarded: number; awarded_segments: string[]; user: ScopeUser }>("/api/v1/users/me/dashboard-points", {
      method: "POST",
      body: JSON.stringify({ segments }),
    });
  },
  addXP(amount: number, reason?: string) {
    return api<{ xp: number }>("/api/v1/users/me/xp", {
      method: "POST",
      body: JSON.stringify({ amount, reason }),
    });
  },
  tickStreak() {
    return api<{ streak: number; xp: number }>("/api/v1/users/me/streak-tick", { method: "POST" });
  },
  weeklyMissionStatus() {
    return api<{ claimed: boolean; week_key: string }>("/api/v1/users/me/weekly-mission-status");
  },
  weeklyMissionClaim(body: { amount: number; mission_title: string }) {
    return api<{ already_claimed: boolean; xp: number | null }>("/api/v1/users/me/weekly-mission-claim", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  getSavedProjects() {
    return api<{ saved_projects: string[] }>("/api/v1/users/me/saved-projects");
  },
  toggleSavedProject(id: string, action: "save" | "unsave") {
    return api<{ saved_projects: string[] }>("/api/v1/users/me/saved-projects", {
      method: "POST",
      body: JSON.stringify({ id, action }),
    });
  },
};

type BackendInstitution = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  pipeline_stage?: string;
  documents?: Array<{
    kind: "brochure" | "proposal" | "pricing" | "mou";
    file_id: string;
    file_name: string;
    file_url: string;
    sent_at: string;
  }>;
};

export const backendInstitutions = {
  publicList() {
    return api<{ items: BackendInstitution[]; next_cursor: string | null; has_more: boolean }>("/api/v1/institutions/public");
  },
  campusSummary() {
    return api<{
      campus_name: string | null;
      city: string | null;
      active_members: number;
      leaders: number;
      projects_shipped: number;
      weekly_growth_pct: number;
    }>("/api/v1/institutions/me/campus-summary");
  },
  sendDocument(id: string, body: {
    kind: "brochure" | "proposal" | "pricing" | "mou" | "document";
    file_id: string;
    file_name: string;
    file_url: string;
  }) {
    return api<{ item: BackendInstitution }>("/api/v1/institutions/" + id + "/documents", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  list() {
    return api<{ items: BackendInstitution[] }>("/api/v1/institutions");
  }
};

export type BackendProject = {
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
  teams_allowed?: number;
  team_members_limit?: number;
  starts_on?: string | null;
  ends_on?: string | null;
  cover_url?: string | null;
  visibility: string;
  meta?: Record<string, string>;
  created_at: string;
  updated_at?: string;
};

export type BackendNotification = {
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
    return api<{ items: BackendProject[]; next_cursor: string | null; has_more: boolean }>("/api/v1/projects?limit=100");
  },
  create(project: any) {
    return api<{ project: BackendProject }>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({
        title: project.title,
        summary: project.summary || project.problem,
        description: project.description,
        domain: project.domain || project.category,
        tags: project.tags || [project.domain || project.category].filter(Boolean),
        capacity: project.capacity || 3,
        teams_allowed: project.teams_allowed || 0,
        team_members_limit: project.team_members_limit || 1,
        visibility: project.visibility || "public",
        status: project.status || "open",
      }),
    });
  },
  apply(id: string, message: string) {
    return api<{ application: BackendApplication }>(`/api/v1/projects/${id}/apply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
  update(id: string, body: Partial<{ title: string; summary: string; description: string; domain: string; status: string }>) {
    return api<{ project: BackendProject }>(`/api/v1/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return api<null>(`/api/v1/projects/${id}`, { method: "DELETE" });
  },
};

export const backendNotifications = {
  list() {
    return api<{ items: BackendNotification[]; next_cursor: string | null; has_more: boolean }>("/api/v1/notifications?limit=100");
  },
  markRead(id: string) {
    return api<{ notification: BackendNotification }>(`/api/v1/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ read: true }),
    });
  },
  markAllRead() {
    return api<{ updated: number }>("/api/v1/notifications/read-all", { method: "POST" });
  },
  listInstitution(limit = 50) {
    return api<{ items: BackendNotification[]; next_cursor: string | null; has_more: boolean }>(`/api/v1/notifications/institution?limit=${limit}`);
  },
  sendInstitution(body: InstitutionCommunicationPayload) {
    return api<{ created: number }>("/api/v1/notifications/institution", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

export type BackendApplication = {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  user_institution?: string | null;
  message?: string;
  status: "pending" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
  submission_review_status: "not_submitted" | "submitted" | "passed" | "needs_changes";
  submission?: {
    live_url?: string | null;
    github_url?: string | null;
    screenshot_file_id?: string | null;
    screenshot_url?: string | null;
    notes?: string | null;
    submitted_at?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    admin_comment?: string | null;
  } | null;
  created_at: string;
};

export const backendApplications = {
  list(params: { projectId?: string; status?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.projectId) qs.set("project_id", params.projectId);
    if (params.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs}` : "";
    return api<{ items: BackendApplication[]; next_cursor: string | null; has_more: boolean }>(`/api/v1/applications${suffix}`);
  },
  listMe() {
    return api<{ items: BackendApplication[]; next_cursor: string | null; has_more: boolean }>("/api/v1/applications");
  },
  updateStatus(id: string, status: BackendApplication["status"]) {
    return api<{ application: BackendApplication }>(`/api/v1/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  submitWork(id: string, body: {
    live_url: string;
    github_url: string;
    screenshot_file_id: string;
    screenshot_url: string;
    notes?: string;
  }) {
    return api<{ application: BackendApplication }>(`/api/v1/applications/${id}/submission`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  reviewSubmission(id: string, body: {
    submission_review_status: "submitted" | "passed" | "needs_changes";
    admin_comment?: string;
  }) {
    return api<{ application: BackendApplication }>(`/api/v1/applications/${id}/submission-review`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

export const backendAdminUsers = {
  create(body: {
    email: string;
    name?: string;
    salutation?: "Dr" | "Mrs" | "Mr";
    firstName?: string;
    middleName?: string;
    lastName?: string;
    phone?: string;
    password?: string;
    role: "student" | "faculty" | "institution_admin" | "scope_admin" | "super_admin";
    role_variant?: string;
    institution_id?: string | null;
    department_id?: string | null;
    send_invite?: boolean;
  }) {
    return api<{ user: ScopeUser; invite_token?: string | null }>("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return api<{ message: string }>(`/api/v1/admin/users/${id}`, {
      method: "DELETE",
    });
  },
  listFeedback() {
    return api<{ feedback: Array<{
      id: string;
      source: "feedback_page" | "feedback_widget";
      rating?: number | null;
      score?: number | null;
      type?: string;
      message: string;
      createdAt: string;
    }> }>("/api/v1/admin/users/feedback");
  },
  deleteFeedback(id: string) {
    return api<{ message: string }>(`/api/v1/admin/users/feedback/${id}`, {
      method: "DELETE",
    });
  },
};

export const backendAnalytics = {
  dau() {
    return api<{ series: Array<{ date: string; value: number }>; total_unique: number }>("/api/v1/analytics/dau");
  },
  wau() {
    return api<{ series: Array<{ date: string; value: number }>; total_unique: number }>("/api/v1/analytics/wau");
  },
  engagement() {
    return api<{
      dau_wau_ratio: number;
      avg_sessions_per_user: number;
      median_session_minutes: number;
      top_events: Array<{ event: string; count: number }>;
      dau?: number;
      wau?: number;
      member_count?: number;
      student_faculty_count?: number;
      activity_rate_pct?: number;
    }>("/api/v1/analytics/engagement");
  },
  /** Institution-scoped DAU (last 30 days). */
  institutionDau(institutionId: string) {
    return api<{ series: Array<{ date: string; value: number }>; total_unique: number }>(
      `/api/v1/analytics/institution/${institutionId}/dau`,
    );
  },
  /** Institution-scoped WAU (last 12 weeks). */
  institutionWau(institutionId: string) {
    return api<{ series: Array<{ date: string; value: number }>; total_unique: number; member_count: number }>(
      `/api/v1/analytics/institution/${institutionId}/wau`,
    );
  },
  /** Institution-scoped engagement breakdown. */
  institutionEngagement(institutionId: string) {
    return api<{
      dau_wau_ratio: number;
      dau: number;
      wau: number;
      member_count: number;
      engagement_count: number;
      activity_rate_pct: number;
      top_events: Array<{ event: string; count: number }>;
    }>(`/api/v1/analytics/institution/${institutionId}/engagement`);
  },
};

export type BackendEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  venue: string;
  seats: number;
  color: "brand" | "cyan" | "primary";
  institution?: string | null;
  rsvps?: string[];
};

export const backendEvents = {
  list(institutionId?: string) {
    return api<{ items: BackendEvent[]; next_cursor: string | null; has_more: boolean }>(`/api/v1/events${institutionId ? `?institutionId=${institutionId}` : ""}`);
  },
  create(body: Omit<BackendEvent, "id">) {
    return api<{ event: BackendEvent }>("/api/v1/events", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return api<null>(`/api/v1/events/${id}`, { method: "DELETE" });
  },
  rsvp(id: string) {
    return api<{ going: boolean; rsvpsCount: number; xp: number }>(`/api/v1/events/${id}/rsvp`, {
      method: "POST",
    });
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
  media?: Array<{ type: "image" | "video"; url: string; fileId?: string }>;
};

export const backendFeed = {
  list(limit = 100) {
    return api<{ items: BackendFeedPost[]; next_cursor: string | null; has_more: boolean }>(`/api/v1/feed?limit=${limit}`);
  },
  listCampus(limit = 100) {
    return api<{ items: BackendFeedPost[]; next_cursor: string | null; has_more: boolean }>(`/api/v1/feed?scope=campus&limit=${limit}`);
  },
  create(content: string, type?: string, targetInstitutionId?: string | null, media?: Array<{ type: "image" | "video"; url: string; fileId?: string }>) {
    return api<{ post: BackendFeedPost }>("/api/v1/feed", {
      method: "POST",
      body: JSON.stringify({ content, type, target_institution_id: targetInstitutionId, media }),
    });
  },
  react(id: string, reaction: "like" | "celebrate") {
    return api<{ post: BackendFeedPost }>(`/api/v1/feed/${id}/react`, { method: "POST", body: JSON.stringify({ reaction }) });
  },
  comment(id: string, text: string) {
    return api<{ post: BackendFeedPost }>(`/api/v1/feed/${id}/comment`, { method: "POST", body: JSON.stringify({ text }) });
  },
};

export type BackendPortfolioItem = {
  id: string;
  user_id: string;
  type: "Project" | "Design" | "Research" | "Startup Idea" | "Campaign" | "Certificate";
  title: string;
  description: string;
  skills: string[];
  link: string;
  cover: string;
  created_at: string;
};

export const backendPortfolio = {
  listMe() {
    return api<{ items: BackendPortfolioItem[]; next_cursor: string | null; has_more: boolean }>("/api/v1/portfolio-items/me");
  },
  create(body: Omit<BackendPortfolioItem, "id" | "user_id" | "created_at">) {
    return api<{ item: BackendPortfolioItem }>("/api/v1/portfolio-items", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  update(id: string, body: Partial<Omit<BackendPortfolioItem, "id" | "user_id" | "created_at">>) {
    return api<{ item: BackendPortfolioItem }>(`/api/v1/portfolio-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return api<null>(`/api/v1/portfolio-items/${id}`, { method: "DELETE" });
  },
};

export const backendReports = {
  institution(id: string) {
    return api<{
      institution: { id: string; name: string };
      metrics: {
        totalStudents: number;
        activeStudents: number;
        verifiedStudents: number;
        completionRate: number;
        totalCampusXp: number;
        campusRank: number;
      };
      growthTrend: Array<{ month: string; students: number }>;
      skillDistribution: Array<{ name: string; value: number }>;
      projectMetrics: {
        total: number;
        open: number;
        inProgress: number;
        completed: number;
      };
      topPerformers: ScopeUser[];
    }>(`/api/v1/reports/institution/${id}`);
  },
  globalLeaderboard() {
    return api<{ items: Array<{ id: string; name: string; xp: number; logo: string }> }>("/api/v1/reports/global/leaderboard");
  },
  facultyOverview(id: string) {
    return api<{
      metrics: {
        verifiedMembers: number;
        pendingApprovals: number;
        reviewsDue: number;
        monthlyActivity: number;
      };
      studentsToReview: Array<{
        id: string;
        name: string;
        reason: string;
        when: string;
      }>;
      projectChecks: Array<{
        id: string;
        title: string;
        quality: number;
        status: "review" | "ok";
      }>;
      events: Array<{
        id: string;
        title: string;
        status: string;
        ok: boolean;
      }>;
    }>(`/api/v1/reports/faculty/${id}`);
  },
};

export const backendDepartments = {
  list(institutionId?: string) {
    return api<Array<{
      id: string;
      name: string;
      code: string;
      description: string;
      headOfDepartment: string;
      studentCount: number;
    }>>(`/api/v1/departments${institutionId ? `?institutionId=${institutionId}` : ""}`);
  },
  create(body: { name: string; code?: string; description?: string; headOfDepartment?: string }) {
    return api<any>(`/api/v1/departments`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  update(id: string, body: any) {
    return api<any>(`/api/v1/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return api<any>(`/api/v1/departments/${id}`, { method: "DELETE" });
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
    endsAt: project.ends_on ? new Date(project.ends_on).getTime() : undefined,
    teams_allowed: project.teams_allowed,
    team_members_limit: project.team_members_limit,
  };
}

export function mapBackendNotification(notification: BackendNotification): Notification {
  return {
    id: notification.id,
    text: notification.body ? `${notification.title}: ${notification.body}` : notification.title,
    at: notification.created_at ? new Date(notification.created_at).getTime() : Date.now(),
    read: notification.read,
    icon:
      notification.kind === "application_received" || notification.kind === "opportunity_application_received"
        ? "users"
        : notification.kind === "achievement" || notification.kind === "opportunity_application_status_changed"
        ? "trophy"
        : "spark",
    href: notification.link || undefined,
    dedupKey: `backend:${notification.id}`,
  };
}

export type BackendFile = {
  id: string;
  url: string;
  mime_type: string;
  byte_size: number;
  kind: string;
};

export const backendUpload = {
  async upload(file: File, kind: "avatar" | "cover" | "resume" | "document" = "document") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    formData.append("public", "true");
    return api<{ file: BackendFile }>("/api/v1/upload", {
      method: "POST",
      body: formData,
    });
  },
};

export const backendDocuments = {
  list() {
    return api<{ files: Array<BackendFile & { file_name: string; created_at: string }> }>("/api/v1/upload/documents");
  }
};

export type BackendOpportunity = {
  id: string;
  title: string;
  by: string;
  company: string;
  category: string;
  description: string;
  requiredSkills: string[];
  min_xp_required?: number;
  unlocked?: boolean;
  xp_shortfall?: number;
  createdAt?: string;
  updatedAt?: string;
};

export const backendOpportunities = {
  list() {
    return api<{ items: BackendOpportunity[] }>("/api/v1/opportunities");
  },
  create(opportunity: Omit<BackendOpportunity, "id" | "unlocked" | "xp_shortfall">) {
    return api<{ opportunity: BackendOpportunity }>("/api/v1/opportunities", {
      method: "POST",
      body: JSON.stringify(opportunity),
    });
  },
};

export type BackendOpportunityApplication = {
  id: string;
  opportunity_id: string;
  opportunity_title?: string | null;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  user_institution?: string | null;
  profile_type: "developer" | "designer" | "general";
  status: "pending" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
  fit_note: string;
  portfolio_url?: string | null;
  github_url?: string | null;
  dribbble_url?: string | null;
  other_url?: string | null;
  resume_file_id?: string | null;
  resume_url?: string | null;
  admin_comment?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export const backendOpportunityApplications = {
  list(params: { opportunityId?: string; status?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.opportunityId) qs.set("opportunity_id", params.opportunityId);
    if (params.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs}` : "";
    return api<{ items: BackendOpportunityApplication[]; next_cursor: string | null; has_more: boolean }>(`/api/v1/opportunities/applications${suffix}`);
  },
  apply(id: string, body: {
    fit_note?: string;
    portfolio_url?: string | null;
    github_url?: string | null;
    dribbble_url?: string | null;
    other_url?: string | null;
    resume_file_id?: string | null;
    resume_url?: string | null;
  }) {
    return api<{ application: BackendOpportunityApplication; xp_awarded?: number; current_xp?: number }>(`/api/v1/opportunities/${id}/apply`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  updateStatus(id: string, body: {
    status?: BackendOpportunityApplication["status"];
    admin_comment?: string;
  }) {
    return api<{ application: BackendOpportunityApplication }>(`/api/v1/opportunities/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

export const backendPublic = {
  submitFeedback(body: {
    source: "feedback_page" | "feedback_widget";
    rating?: number;
    score?: number;
    type?: string;
    message: string;
  }) {
    return api<{ submission_id: string }>("/api/v1/public/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  joinWaitlist(body: {
    source: "waitlist_page";
    name: string;
    email: string;
    campus: string;
    interests: string[];
  }) {
    return api<{ submission_id: string; already_joined: boolean }>("/api/v1/public/waitlist", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  submitContact(body: {
    source: "contact_page" | "footer" | "support_page";
    name?: string;
    email: string;
    reason?: string;
    message: string;
  }) {
    return api<{ submission_id: string }>("/api/v1/public/contact", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  submitSupportIssue(body: {
    source: "support_page";
    message: string;
  }) {
    return api<{ submission_id: string }>("/api/v1/public/support-issue", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  submitAmbassador(body: {
    source: "ambassador_page";
    name: string;
    email: string;
    campus: string;
    why: string;
  }) {
    return api<{ submission_id: string; already_applied: boolean }>("/api/v1/public/ambassador", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  checkLink(url: string) {
    return api<{ valid: boolean; reason?: string }>(`/api/v1/public/check-link?url=${encodeURIComponent(url)}`, {
      method: "GET",
    });
  },
};

export type BackendProposal = {
  id: string;
  user: { id: string; name: string; email: string } | null;
  title: string;
  problem: string;
  why: string;
  teamSkills: string;
  campusRelevance: string;
  anonymous: boolean;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  adminComment?: string;
  createdAt: string;
};

export const backendProposals = {
  async list(): Promise<{ items: BackendProposal[] }> {
    return api<{ items: BackendProposal[] }>("/api/v1/proposals");
  },
  async create(body: {
    title: string;
    problem: string;
    why: string;
    team_skills?: string;
    campus_relevance?: string;
    anonymous?: boolean;
  }): Promise<{ proposal: BackendProposal }> {
    return api<{ proposal: BackendProposal }>("/api/v1/proposals", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  async patch(id: string, body: {
    status: "pending" | "reviewed" | "accepted" | "rejected";
    admin_comment?: string;
  }): Promise<{ proposal: BackendProposal }> {
    return api<{ proposal: BackendProposal }>(`/api/v1/proposals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }
};
