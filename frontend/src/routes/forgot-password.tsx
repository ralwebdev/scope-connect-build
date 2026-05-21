import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { backendAuth } from "@/lib/api/endpoints";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password | Scope Connect" },
      { name: "description", content: "Request a secure password reset link for your Scope Connect account." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await backendAuth.forgotPassword({ email });
      setSubmitted(true);
      toast.success("If this account exists, we have sent a reset link.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground">Enter your account email to receive a reset link.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@campus.edu"
              required
              className="mt-1.5"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        {submitted && (
          <p className="mt-4 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            Check your inbox and spam folder. The link expires in 15 minutes.
          </p>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Remembered it? <Link to="/auth" className="font-medium text-brand hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
