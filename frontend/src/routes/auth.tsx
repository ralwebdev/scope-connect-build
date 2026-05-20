import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, seedInterests } from "@/lib/scope-store";
import { useIsLoggedIn } from "@/hooks/use-scope";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { roleFromEmail, landingRouteForRole, ROLE_LABELS } from "@/lib/rbac";
import { backendInstitutions } from "@/lib/api/endpoints";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => {
    return {
      ref: (search.ref as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Join Scope Connect — Sign up" },
      { name: "description", content: "Create your Scope Connect builder profile and join India's campus innovation network." },
    ],
  }),
  component: AuthPage,
});

const STAGES = [
  "Authenticating access…",
  "Syncing your innovation profile…",
  "Calibrating your campus rank…",
];

type SignupInstitution = {
  id: string;
  name: string;
  city?: string;
  state?: string;
};

function AuthPage() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const isAuthed = useIsLoggedIn();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [campus, setCampus] = useState("IIT Bombay");
  const [institutionId, setInstitutionId] = useState("");
  const [institutions, setInstitutions] = useState<SignupInstitution[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["AI", "Startup"]);
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

  useEffect(() => {
    if (mode !== "signup") return;
    let cancelled = false;
    backendInstitutions.publicList()
      .then(({ items }) => {
        if (cancelled) return;
        setInstitutions(items);
        const first = items[0];
        if (first && !institutionId) {
          setInstitutionId(first.id);
          setCampus(first.name);
        }
      })
      .catch((error) => {
        console.warn("Institution list failed", error);
        toast.error("Could not load institutions.");
      });
    return () => { cancelled = true; };
  }, [mode, institutionId]);

  // Fire signup_started once when user first interacts with a signup field.
  const markStarted = () => {
    if (!signupStarted && mode === "signup") {
      setSignupStarted(true);
      analytics.track("signup_started");
    }
  };

  const toggleInterest = (t: string) =>
    setSelectedInterests((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

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
    if (mode === "signup" && !institutionId) {
      toast.error("Please select your institution.");
      return;
    }
    setLoading(true);
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 450);
    const t2 = setTimeout(() => setStage(2), 900);
    await new Promise((r) => setTimeout(r, 1300));
    clearTimeout(t1); clearTimeout(t2);

    try {
      let signedInUser;
      if (mode === "signup") {
        signedInUser = await auth.signup({ name: name || email.split("@")[0], email, campus, institutionId, interests: selectedInterests, password, referralCode: ref });
        auth.updateProfile({ campus, interests: selectedInterests });
        analytics.track("signup_completed");
        toast.success("Welcome to Scope Connect. You're in.");
      } else {
        signedInUser = await auth.login(email, password);
        analytics.track("login_success");
        const role = (signedInUser.role_variant as Parameters<typeof landingRouteForRole>[0] | undefined) ?? roleFromEmail(signedInUser.email);
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
      {/* Left brand panel */}
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

          <p className="text-xs text-primary-foreground/50">© Scope Connect</p>
        </div>
      </div>

      {/* Right form panel */}
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
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                mode === "signup" ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                mode === "login" ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              Log in
            </button>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {mode === "signup" ? "Build your profile" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Takes under 60 seconds. Start building today."
              : "Pick up where you left off."}
          </p>

          {mode === "signup" && (
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">What you get instantly</div>
              <ul className="mt-1 space-y-0.5">
                <li>⚡ +120 XP welcome bonus</li>
                <li>🎯 National rank assigned</li>
                <li>🚀 Curated challenges unlocked</li>
              </ul>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={name} onFocus={markStarted} onChange={(e) => setName(e.target.value)} placeholder="Aarav Mehta" required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="campus">Campus</Label>
                  <select
                    id="campus"
                    value={institutionId}
                    onChange={(e) => {
                      const selected = institutions.find((institution) => institution.id === e.target.value);
                      setInstitutionId(e.target.value);
                      setCampus(selected?.name ?? "");
                    }}
                    required
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {institutions.length === 0 && <option value="">No institutions available</option>}
                    {institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name}{institution.city ? ` · ${institution.city}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@campus.edu" required className="mt-1.5" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => toast("Password reset link sent to your email (demo).")}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1.5" />
            </div>

            {mode === "signup" && (
              <div>
                <Label>Pick your interests</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {seedInterests.map((t) => {
                    const active = selectedInterests.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => toggleInterest(t)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          active
                            ? "border-transparent bg-gradient-brand text-brand-foreground shadow-brand"
                            : "border-border bg-background text-muted-foreground hover:border-brand/40 hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-95">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {STAGES[stage]}
                </>
              ) : (
                <>{mode === "signup" ? "Create account" : "Log in"} <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to our Terms & Code of Conduct.
            </p>
          </form>

        </div>
      </div>
    </div>
  );
}
