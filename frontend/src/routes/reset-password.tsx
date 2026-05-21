import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { backendAuth } from "@/lib/api/endpoints";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset Password | Scope Connect" },
      { name: "description", content: "Set a new password for your Scope Connect account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error("Reset token is missing. Please use the link from your email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await backendAuth.resetPassword({ token, password });
      toast.success("Password reset successful. Please log in.");
      navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Set a new password</h1>
            <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
          </div>
        </div>

        {!token ? (
          <div className="space-y-4">
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Invalid reset link. Request a new password reset email.
            </p>
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request new link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="mt-1.5"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Back to <Link to="/auth" className="font-medium text-brand hover:underline">login</Link>
        </p>
      </div>
    </div>
  );
}
