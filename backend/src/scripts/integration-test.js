import { env } from "../config/env.js";

const BASE_URL = process.env.API_BASE_URL || `http://localhost:${env.port}`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const message = json?.error?.message || res.statusText;
    throw new Error(`${options.method || "GET"} ${path} failed: ${res.status} ${message}`);
  }
  return json.data;
}

async function main() {
  const health = await request("/api/health");
  if (health.status !== "ok") throw new Error("Health endpoint did not return ok");

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "alice@iitb.ac.in", password: "Password123!" }),
  });
  if (!login.access_token || !login.refresh_token || login.user.email !== "alice@iitb.ac.in") {
    throw new Error("Login response missing tokens or user");
  }

  const authHeaders = { Authorization: `Bearer ${login.access_token}` };
  const me = await request("/api/auth/me", { headers: authHeaders });
  if (me.user.id !== login.user.id) throw new Error("/auth/me did not return the logged-in user");

  const projects = await request("/api/projects?limit=10", { headers: authHeaders });
  if (!Array.isArray(projects.items)) throw new Error("/projects did not return a paginated item list");

  const notifications = await request("/api/notifications?limit=10", { headers: authHeaders });
  if (!Array.isArray(notifications.items)) throw new Error("/notifications did not return a paginated item list");

  const analytics = await request("/api/analytics/track", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      events: [{ event: "integration_test", occurred_at: new Date().toISOString(), props: { source: "backend-script" } }],
    }),
  });
  if (analytics.accepted !== 1) throw new Error("/analytics/track did not accept the test event");

  console.log("Integration test passed");
  console.log(`API: ${BASE_URL}`);
  console.log(`User: ${me.user.email}`);
  console.log(`Projects fetched: ${projects.items.length}`);
  console.log(`Notifications fetched: ${notifications.items.length}`);
}

main().catch((error) => {
  console.error("Integration test failed");
  console.error(error);
  process.exit(1);
});
