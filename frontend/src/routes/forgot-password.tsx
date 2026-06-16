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
  const [isStudentReset, setIsStudentReset] = useState(false);
  const [isFacultyReset, setIsFacultyReset] = useState(false);
  const [isInstitutionAdminReset, setIsInstitutionAdminReset] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await backendAuth.forgotPassword({ email });
      setSubmitted(true);
      if (res.studentReset) {
        setIsStudentReset(true);
        setIsFacultyReset(false);
        setIsInstitutionAdminReset(false);
        toast.success("Request sent to your institution admins!");
      } else if (res.facultyReset) {
        setIsStudentReset(false);
        setIsFacultyReset(true);
        setIsInstitutionAdminReset(false);
        toast.success("Request sent to Institutional and Scope Admins!");
      } else if (res.institutionAdminReset) {
        setIsStudentReset(false);
        setIsFacultyReset(false);
        setIsInstitutionAdminReset(true);
        toast.success("Request sent to Scope Admins!");
      } else {
        setIsStudentReset(false);
        setIsFacultyReset(false);
        setIsInstitutionAdminReset(false);
        toast.success("If this account exists, we have sent a reset link.");
      }
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
            <p className="text-sm text-muted-foreground">Enter your account email to retrieve access.</p>
          </div>
        </div>

        {!submitted ? (
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
                "Send reset request"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {isStudentReset ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900 shadow-sm animate-in fade-in duration-300">
                <p className="font-semibold text-blue-800">🏫 Routed to Campus Admins</p>
                <p className="mt-1.5 text-xs text-blue-700/95 leading-relaxed">
                  As you are registered as a student on Scope Connect, your request has been directly sent to your **Institutional Admin** and **Faculty Coordinator**.
                </p>
                <p className="mt-2.5 text-[11px] text-blue-600/90 font-medium">
                  Please contact them to obtain your new temporary password and log in.
                </p>
              </div>
            ) : isFacultyReset ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900 shadow-sm animate-in fade-in duration-300">
                <p className="font-semibold text-amber-800">💼 Routed to Institutional & Scope Admins</p>
                <p className="mt-1.5 text-xs text-amber-700/95 leading-relaxed">
                  As you are registered as a Faculty Coordinator, your request has been routed to your **Institutional Admin** and all **Scope Platform Admins**.
                </p>
                <p className="mt-2.5 text-[11px] text-amber-600/90 font-medium">
                  Please contact them to obtain your new temporary password and log in.
                </p>
              </div>
            ) : isInstitutionAdminReset ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 text-sm text-purple-900 shadow-sm animate-in fade-in duration-300">
                <p className="font-semibold text-purple-800">🛡️ Routed to Scope Admins</p>
                <p className="mt-1.5 text-xs text-purple-700/95 leading-relaxed">
                  As you are registered as an Institutional Admin, your request has been routed exclusively to the **Scope Platform Admins**.
                </p>
                <p className="mt-2.5 text-[11px] text-purple-600/90 font-medium">
                  Please contact the Scope support/admin team to obtain your new temporary password and log in.
                </p>
              </div>
            ) : (
              <p className="rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground animate-in fade-in duration-300">
                Check your inbox and spam folder. If an admin/staff account exists for this email, we have sent a reset link. The link expires in 15 minutes.
              </p>
            )}
            
            <Button variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
              Request again
            </Button>
          </div>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Remembered it? <Link to="/auth" className="font-medium text-brand hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
