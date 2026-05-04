// Scope Connect — analytics + soft-launch validation engine.
// Aggregates counters in localStorage for instant UI, and mirrors events to
// the backend when the user is authenticated.
// Surfaced in /admin and /ops (Soft Launch tab).

import { backendAnalytics } from "./api/endpoints";

export type AnalyticsEvent =
  | "signup_completed"
  | "signup_started"
  | "campus_selected"
  | "profile_completed"
  | "login_success"
  | "project_view"
  | "project_apply"
  | "portfolio_item_added"
  | "event_rsvp"
  | "feed_post_created"
  | "notification_opened"
  | "session_start"
  | "route_visit"
  | "homepage_visit"
  | "landing_visit"
  | "cta_click_primary"
  | "cta_click_secondary"
  | "first_action_completed"
  | "waitlist_joined"
  | "dashboard_returned"
  | "session_repeat_visit"
  | "rage_click_detected"
  | "feedback_submitted"
  | "nps_submitted"
  | "checklist_step_completed"
  | "nudge_shown"
  | "nudge_clicked"
  | "nudge_dismissed"
  | "export_results_clicked"
  | "range_selected"
  | "format_selected";

type Counters = Record<string, number>;
type DayMap = Record<string, number>; // YYYY-MM-DD -> count
type RouteMap = Record<string, number>;

const KEY = "scope_analytics_v1";
const TESTER_KEY = "scope_tester_id";
const TESTER_SOURCE_KEY = "scope_tester_source";
const NPS_KEY = "scope_nps_v1";

type Store = {
  events: Counters;
  dailySignups: DayMap;
  dailyActive: DayMap;       // distinct days with session_start
  routes: RouteMap;
  sessions: number;
  lastSessionAt: number;
  lastActiveDay: string;
  firstSeenAt: number;       // ms — when this device first opened the app
  rageClicks: number;
};

type NPSEntry = { score: number; reason: string; at: number };

const empty = (): Store => ({
  events: {},
  dailySignups: {},
  dailyActive: {},
  routes: {},
  sessions: 0,
  lastSessionAt: 0,
  lastActiveDay: "",
  firstSeenAt: 0,
  rageClicks: 0,
});

function read(): Store {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...(JSON.parse(raw) as Partial<Store>) };
  } catch {
    return empty();
  }
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- Tester identity (anonymous) ---------------- */

function ensureTesterId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(TESTER_KEY);
    if (!id) {
      id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      localStorage.setItem(TESTER_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function captureTesterSource() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(TESTER_SOURCE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const src = params.get("t") || params.get("ref") || params.get("utm_source") || document.referrer || "direct";
    localStorage.setItem(TESTER_SOURCE_KEY, src.slice(0, 80));
  } catch { /* noop */ }
}

export const analytics = {
  track(event: AnalyticsEvent, meta?: { route?: string }) {
    if (typeof window === "undefined") return;
    const s = read();
    s.events[event] = (s.events[event] || 0) + 1;

    if (!s.firstSeenAt) s.firstSeenAt = Date.now();

    if (event === "signup_completed") {
      const d = today();
      s.dailySignups[d] = (s.dailySignups[d] || 0) + 1;
    }
    if (event === "session_start") {
      s.sessions += 1;
      const previousSessionAt = s.lastSessionAt;
      s.lastSessionAt = Date.now();
      const d = today();
      if (s.lastActiveDay !== d) {
        s.dailyActive[d] = (s.dailyActive[d] || 0) + 1;
        s.lastActiveDay = d;
      }
      // Repeat visit signal — back within 30 days but not same session.
      if (previousSessionAt && Date.now() - previousSessionAt > 30 * 60 * 1000) {
        s.events["session_repeat_visit"] = (s.events["session_repeat_visit"] || 0) + 1;
      }
    }
    if (event === "route_visit" && meta?.route) {
      s.routes[meta.route] = (s.routes[meta.route] || 0) + 1;
      if (meta.route === "/dashboard" && s.events["dashboard_returned"] !== undefined) {
        s.events["dashboard_returned"] = (s.events["dashboard_returned"] || 0) + 1;
      } else if (meta.route === "/dashboard") {
        s.events["dashboard_returned"] = 1;
      }
      if (meta.route === "/") {
        s.events["landing_visit"] = (s.events["landing_visit"] || 0) + 1;
      }
    }
    if (event === "rage_click_detected") {
      s.rageClicks += 1;
    }
    write(s);
    backendAnalytics.track([{ event, occurred_at: new Date().toISOString(), props: meta ?? {} }]).catch(() => {
      /* unauthenticated analytics stay local */
    });
  },

  init() {
    if (typeof window === "undefined") return;
    ensureTesterId();
    captureTesterSource();
  },

  testerId(): string {
    return ensureTesterId();
  },

  testerSource(): string {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(TESTER_SOURCE_KEY) || "direct"; } catch { return "direct"; }
  },

  snapshot() {
    return read();
  },

  topRoutes(limit = 5): { route: string; count: number }[] {
    const s = read();
    return Object.entries(s.routes)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  signupsLast7(): { day: string; count: number }[] {
    const s = read();
    const out: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key.slice(5), count: s.dailySignups[key] || 0 });
    }
    return out;
  },

  activeLast7(): number {
    const s = read();
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      total += s.dailyActive[d.toISOString().slice(0, 10)] || 0;
    }
    return total;
  },

  activeToday(): number {
    return read().dailyActive[today()] || 0;
  },

  /* ---------------- Soft launch validation ---------------- */

  funnel() {
    const s = read();
    const visits = s.events["landing_visit"] || s.events["homepage_visit"] || 0;
    const started = s.events["signup_started"] || 0;
    const completed = s.events["signup_completed"] || 0;
    const firstAction = s.events["first_action_completed"] || 0;
    const dashReturns = Math.max(0, (s.events["dashboard_returned"] || 0) - 1);
    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
    return {
      visits,
      started,
      completed,
      firstAction,
      dashReturns,
      visitToSignup: pct(completed, visits),
      signupCompletion: pct(completed, started),
      activation: pct(firstAction, completed),
      d1Return: pct(dashReturns, completed),
    };
  },

  recordNPS(score: number, reason: string) {
    if (typeof window === "undefined") return;
    try {
      const list: NPSEntry[] = JSON.parse(localStorage.getItem(NPS_KEY) || "[]");
      list.unshift({ score: Math.max(0, Math.min(10, Math.round(score))), reason: reason.slice(0, 280), at: Date.now() });
      localStorage.setItem(NPS_KEY, JSON.stringify(list.slice(0, 200)));
    } catch { /* noop */ }
    this.track("nps_submitted");
  },

  npsSummary() {
    if (typeof window === "undefined") return { count: 0, score: 0, promoters: 0, passives: 0, detractors: 0, recent: [] as NPSEntry[] };
    let list: NPSEntry[] = [];
    try { list = JSON.parse(localStorage.getItem(NPS_KEY) || "[]"); } catch { /* noop */ }
    const count = list.length;
    const promoters = list.filter((n) => n.score >= 9).length;
    const passives = list.filter((n) => n.score >= 7 && n.score <= 8).length;
    const detractors = list.filter((n) => n.score <= 6).length;
    const score = count > 0 ? Math.round(((promoters - detractors) / count) * 100) : 0;
    return { count, score, promoters, passives, detractors, recent: list.slice(0, 8) };
  },

  rageClickCount(): number { return read().rageClicks; },

  /* ---------------- Range-aware exports ---------------- */

  npsInRange(days: number) {
    if (typeof window === "undefined") return { count: 0, score: 0, promoters: 0, passives: 0, detractors: 0, entries: [] as NPSEntry[] };
    let list: NPSEntry[] = [];
    try { list = JSON.parse(localStorage.getItem(NPS_KEY) || "[]"); } catch { /* noop */ }
    const cutoff = Date.now() - days * 86400_000;
    const entries = list.filter((n) => n.at >= cutoff);
    const count = entries.length;
    const promoters = entries.filter((n) => n.score >= 9).length;
    const passives = entries.filter((n) => n.score >= 7 && n.score <= 8).length;
    const detractors = entries.filter((n) => n.score <= 6).length;
    const score = count > 0 ? Math.round(((promoters - detractors) / count) * 100) : 0;
    return { count, score, promoters, passives, detractors, entries };
  },

  feedbackTagCounts(days: number) {
    if (typeof window === "undefined") return { positive: {} as Record<string, number>, negative: {} as Record<string, number>, requests: [] as string[] };
    let list: { type?: string; text?: string; rating?: number; at?: number }[] = [];
    try { list = JSON.parse(localStorage.getItem("scope_feedback") || "[]"); } catch { /* noop */ }
    const cutoff = Date.now() - days * 86400_000;
    const recent = list.filter((f) => (f.at ?? 0) >= cutoff);
    const positive: Record<string, number> = {};
    const negative: Record<string, number> = {};
    const requests: string[] = [];
    for (const f of recent) {
      const t = (f.type || "note").toLowerCase();
      const isPos = (f.rating ?? 3) >= 4 || /love|great|good|amazing|nice/i.test(f.text || "");
      const bucket = isPos ? positive : negative;
      bucket[t] = (bucket[t] || 0) + 1;
      if (/want|wish|should|please add|need|request/i.test(f.text || "")) {
        requests.push((f.text || "").slice(0, 200));
      }
    }
    return { positive, negative, requests: requests.slice(0, 25) };
  },

  funnelInRange(_days: number) {
    const f = this.funnel();
    const s = read();
    const day1 = s.dailyActive[today()] || 0;
    const day7 = this.activeLast7();
    const day1Rate = f.completed > 0 ? Math.round((day1 / f.completed) * 100) : 0;
    const day7Rate = f.completed > 0 ? Math.round((day7 / f.completed) * 100) : 0;
    return {
      landing_visits: f.visits,
      signup_started: f.started,
      signup_completed: f.completed,
      campus_selected: s.events["campus_selected"] || 0,
      profile_completed: s.events["profile_completed"] || 0,
      first_application: s.events["project_apply"] || 0,
      day1_return_rate: day1Rate,
      day7_return_rate: day7Rate,
    };
  },

  engagementMetrics() {
    const s = read();
    const top = this.topRoutes(1)[0];
    const ctas = (s.events["cta_click_primary"] || 0) >= (s.events["cta_click_secondary"] || 0) ? "primary" : "secondary";
    let checklist = 0;
    try {
      const raw = localStorage.getItem("scope_activation_steps");
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, boolean>;
        const total = 4;
        const done = ["signup_completed","campus_selected","profile_completed","first_application"].filter((k) => obj[k]).length;
        checklist = Math.round((done / total) * 100);
      }
    } catch { /* noop */ }
    return {
      avg_sessions_per_user: s.sessions,
      avg_checklist_completion: checklist,
      top_clicked_cta: ctas,
      most_viewed_route: top?.route ?? "—",
    };
  },

  exportResults(days: number) {
    const nps = this.npsInRange(days);
    const fb = this.feedbackTagCounts(days);
    const funnel = this.funnelInRange(days);
    const eng = this.engagementMetrics();
    const findTop = (m: Record<string, number>): string => {
      const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
      return entries[0]?.[0] ?? "—";
    };
    return {
      meta: {
        generated_at: new Date().toISOString(),
        range_days: days,
        edition_id: (() => {
          try { return JSON.parse(localStorage.getItem("sc_config_v1") || "{}")?.edition?.edition_id || "scope-connect-main"; }
          catch { return "scope-connect-main"; }
        })(),
      },
      results: {
        nps_scores: {
          responses_count: nps.count,
          average_score: nps.score,
          promoters_count: nps.promoters,
          passives_count: nps.passives,
          detractors_count: nps.detractors,
        },
        feedback_reasons: {
          most_common_positive_reason: findTop(fb.positive),
          most_common_negative_reason: findTop(fb.negative),
          raw_tag_counts: { positive: fb.positive, negative: fb.negative },
          feature_requests: fb.requests,
        },
        funnel_metrics: funnel,
        engagement_metrics: eng,
      },
    };
  },

  reset() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(NPS_KEY);
    } catch {
      /* noop */
    }
  },
};
