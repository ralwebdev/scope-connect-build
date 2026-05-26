import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/scope-store";
import { useIsLoggedIn } from "@/hooks/use-scope";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { roleFromEmail, landingRouteForRole, ROLE_LABELS } from "@/lib/rbac";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => {
    return {
      ref: (search.ref as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Join Scope Connect - Sign up" },
      { name: "description", content: "Create your Scope Connect builder profile and join India's campus innovation network." },
    ],
  }),
  component: AuthPage,
});

const STAGES = [
  "Authenticating access...",
  "Syncing your innovation profile...",
  "Calibrating your campus rank...",
];

type LoginRoleTab = "student" | "institutional_admin" | "faculty_coordinator";

const LOGIN_ROLE_TABS: Array<{ key: LoginRoleTab; label: string; emailPlaceholder: string }> = [
  { key: "student", label: "Students", emailPlaceholder: "Enter Student Email" },
  { key: "institutional_admin", label: "Institute", emailPlaceholder: "Enter Institution Email" },
  { key: "faculty_coordinator", label: "Faculty", emailPlaceholder: "Enter Faculty Email" },
  // { key: "scope_admin", label: "Scope Admin", emailPlaceholder: "admin@scopeconnect.in" },
];

function AuthPage() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const isAuthed = useIsLoggedIn();

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loginRoleTab, setLoginRoleTab] = useState<LoginRoleTab>("student");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [signupStarted, setSignupStarted] = useState(false);

  useEffect(() => {
    if (isAuthed) {
      const u = auth.getUser();
      const role = (u?.role_variant as Parameters<typeof landingRouteForRole>[0] | undefined) ?? roleFromEmail(u?.email);
      navigate({ to: landingRouteForRole(role) });
    }
  }, [isAuthed, navigate]);

  const markStarted = () => {
    if (!signupStarted && mode === "signup") {
      setSignupStarted(true);
      analytics.track("signup_started");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password should be at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== repeatPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 450);
    const t2 = setTimeout(() => setStage(2), 900);
    await new Promise((r) => setTimeout(r, 1300));
    clearTimeout(t1);
    clearTimeout(t2);

    try {
      let signedInUser;
      if (mode === "signup") {
        signedInUser = await auth.signup({
          name: email.split("@")[0],
          email,
          campus: "",
          interests: [],
          password,
          referralCode: ref,
        });
        analytics.track("signup_completed");
        toast.success("Welcome to Scope Connect. You're in.");
      } else {
        let apiRole: string = "student";
        if (loginRoleTab === "institutional_admin") {
          apiRole = "institution_admin";
        } else if (loginRoleTab === "faculty_coordinator") {
          apiRole = "faculty";
        }
        signedInUser = await auth.login(email, password, apiRole);
        analytics.track("login_success");
        const role = (signedInUser.role_variant as Parameters<typeof landingRouteForRole>[0] | undefined) ?? roleFromEmail(signedInUser.email);
        const matchesSelectedTab =
          // (loginRoleTab === "scope_admin" && (role === "scope_admin" || role === "scope_super_admin" || role === "super_admin")) ||
          (loginRoleTab === "institutional_admin" && role === "institutional_admin") ||
          (loginRoleTab === "faculty_coordinator" && role === "faculty_coordinator") ||
          (loginRoleTab === "student" && role === "student");

        if (!matchesSelectedTab) toast.message(`Signed in as ${ROLE_LABELS[role]}.`);
        toast.success(`Welcome back, ${ROLE_LABELS[role]}.`);
      }

      const role = (signedInUser.role_variant as Parameters<typeof landingRouteForRole>[0] | undefined) ?? roleFromEmail(signedInUser.email);
      navigate({ to: landingRouteForRole(role), replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-hero text-primary-foreground lg:block">
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand/30 blur-3xl animate-pulse-glow" />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-72 w-72 rounded-full bg-cyan/20 blur-3xl animate-pulse-glow" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white overflow-hidden shadow-sm">
              <img src="/favicon.png" alt="Logo" className="h-5 w-5 object-contain" />
            </span>
            <span className="text-lg tracking-tight">Scope Connect</span>
          </Link>

          <div>
            <h2 className="text-balance text-4xl font-bold leading-tight">
              Welcome to India's
              <br />
              <span className="text-cyan">campus innovation network.</span>
            </h2>
            <p className="mt-4 max-w-md text-primary-foreground/70">
              12,000+ builders. 142 campuses. One ecosystem for projects, hackathons, leadership, and hiring.
            </p>
            <div className="mt-8 flex gap-6">
              {[
                { v: "12.4k", l: "Members" },
                { v: "142", l: "Campuses" },
                { v: "3.2k", l: "Projects" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-bold">{s.v}</div>
                  <div className="text-xs text-primary-foreground/60">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-primary-foreground/50">Copyright Scope Connect</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 font-bold lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white overflow-hidden shadow-sm">
              <img src="/favicon.png" alt="Logo" className="h-5 w-5 object-contain" />
            </span>
            <span>Scope Connect</span>
          </Link>

          <div className="mb-6 flex rounded-xl bg-secondary p-1">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all cursor-pointer ${mode === "signup" ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
                }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all cursor-pointer ${mode === "login" ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
                }`}
            >
              Log in
            </button>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {mode === "signup" ? "Build your profile" : "Welcome back"}
          </h1>
          {mode !== "signup" && <p className="mt-2 text-sm text-muted-foreground">
            Pick up where you left off.
          </p>}

          {mode === "login" && (
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-2">
              <div className="grid grid-cols-3 gap-2">
                {LOGIN_ROLE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLoginRoleTab(tab.key)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${loginRoleTab === tab.key ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onFocus={markStarted}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "login" ? LOGIN_ROLE_TABS.find((tab) => tab.key === loginRoleTab)?.emailPlaceholder ?? "you@campus.edu" : "you@campus.edu"}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "login" && (
                  <Link to="/forgot-password" className="text-xs font-medium text-brand hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="mt-1.5"
              />
            </div>

            {mode === "signup" && (
              <div>
                <Label htmlFor="repeatPassword">Repeat Password</Label>
                <Input
                  id="repeatPassword"
                  type="password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="mt-1.5"
                />
              </div>
            )}

            <Button type="submit" disabled={loading} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {STAGES[stage]}
                </>
              ) : (
                <>
                  {mode === "signup" ? "Create account" : "Log in"} <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">By continuing you agree to our Terms and Code of Conduct.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
