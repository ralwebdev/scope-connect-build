function normalizeApiBase(rawBase: string) {
  if (!rawBase) return "";

  try {
    const url = new URL(rawBase);

    // `localhost` can trigger aggregated socket errors on some Windows setups.
    // Use IPv4 loopback explicitly for local API traffic.
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return rawBase.replace(/\/$/, "");
  }
}

const envBase = normalizeApiBase(import.meta.env.VITE_API_BASE_URL ?? "");
// When the API is on the local dev backend, prefer relative requests so Vite can proxy them.
export const BASE = envBase.includes(":5050") ? "" : envBase;
const ACCESS_KEY = "scope_access_token";
const REFRESH_KEY = "scope_refresh_token";

function networkError(path: string) {
  const target = BASE || (typeof window !== "undefined" ? window.location.origin : "");
  return new ApiException(
    0,
    "NETWORK_ERROR",
    `Cannot reach the backend API at ${target}${path}. Make sure the backend server is running.`,
  );
}

export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown; request_id: string };
};

export class ApiException extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<void> | null = null;

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("scope_user_profile");
  localStorage.setItem("scope_logged_in", "false");
  window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: ["*"] } }));
}

async function doRefresh(): Promise<void> {
  const token = localStorage.getItem(REFRESH_KEY);
  if (!token) throw new ApiException(401, "INVALID_REFRESH_TOKEN", "No refresh token");

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token }),
    });
  } catch {
    throw networkError("/api/v1/auth/refresh");
  }
  const json = (await res.json()) as ApiSuccess<{ access_token: string; refresh_token: string }> | ApiError;
  if (!json.success) {
    throw new ApiException(res.status, json.error.code, json.error.message, json.error.details);
  }
  localStorage.setItem(ACCESS_KEY, json.data.access_token);
  localStorage.setItem(REFRESH_KEY, json.data.refresh_token);
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  // Automatically prefix /api/ with /api/v1/ if not already present
  // but don't double-prefix if it's already /api/v1/ or health.
  const versionedPath = (path.startsWith("/api/") && !path.startsWith("/api/v1/") && !path.startsWith("/api/health"))
    ? path.replace("/api/", "/api/v1/")
    : path;

  const headers = new Headers(init.headers);
  const body = init.body;

  if (!headers.has("Content-Type") && body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const access = typeof window !== "undefined" ? localStorage.getItem(ACCESS_KEY) : null;
  if (access) headers.set("Authorization", `Bearer ${access}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${versionedPath}`, { ...init, headers });
  } catch {
    throw networkError(versionedPath);
  }
  const json = (await res.json().catch(() => ({}))) as ApiSuccess<T> | ApiError;

  if (!json.success) {
    const err = json.error || { code: "INTERNAL_ERROR", message: "Request failed" };
    if (res.status === 401 && retry && (err.code === "TOKEN_EXPIRED" || err.code === "UNAUTHENTICATED")) {
      try {
        if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
        await refreshPromise;
        return api<T>(path, init, false);
      } catch {
        clearSession();
        throw new ApiException(401, "UNAUTHENTICATED", "Session expired");
      }
    }
    throw new ApiException(res.status, err.code, err.message, err.details);
  }

  return json.data;
}

export const tokenStore = {
  set(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  refreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  },
  clear: clearSession,
};
