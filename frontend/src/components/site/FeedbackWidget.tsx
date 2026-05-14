// Floating 1-minute feedback button — soft-launch validation tool.
// - Hidden on /ops, /admin, /auth, /feedback (avoids self-spam).
// - Captures 1-10 NPS-style score + free-text reason.
// - Persists to localStorage (read by /ops Soft Launch tab).
import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageSquarePlus, X, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";

const HIDDEN_ROUTES = ["/ops", "/admin", "/auth", "/feedback"];
const DISMISS_KEY = "scope_feedback_widget_snoozed";

export function FeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [snoozed, setSnoozed] = useState(true); // optimistic — actual value set on mount
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      setSnoozed(until > Date.now());
    } catch { /* noop */ }
  }, []);

  if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return null;
  if (snoozed && !open) return null;

  const submit = () => {
    if (score == null) { toast.error("Pick a score from 0–10."); return; }
    analytics.recordNPS(score, reason.trim());
    try {
      // Mirror to /feedback inbox so admins see qualitative + score together.
      const list = JSON.parse(localStorage.getItem("scope_feedback") || "[]");
      list.unshift({ rating: Math.round(score / 2), type: "Soft launch", text: reason.trim() || `Score ${score}/10`, at: Date.now(), score });
      localStorage.setItem("scope_feedback", JSON.stringify(list.slice(0, 100)));
    } catch { /* noop */ }
    toast.success("Thanks. Your signal shapes Scope.");
    setOpen(false);
    setScore(null);
    setReason("");
    snoozeFor(7); // don't ask again for a week per device
  };

  const snoozeFor = (days: number) => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86400_000)); } catch { /* noop */ }
    setSnoozed(true);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 hidden items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-brand transition-transform hover:scale-105 md:flex"
          aria-label="Send quick feedback"
        >
          <MessageSquarePlus className="h-4 w-4" /> Feedback
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-foreground/30 p-4 backdrop-blur-sm sm:items-end sm:p-6"
          onClick={() => setOpen(false)}
        >
          <Card
            className="w-full max-w-sm overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between bg-gradient-hero p-4 text-primary-foreground">
              <div>
                <div className="text-sm font-semibold">Quick feedback</div>
                <div className="text-xs text-primary-foreground/70">Takes under 60 seconds.</div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-primary-foreground/80 hover:bg-primary-foreground/10" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <div className="text-xs font-medium text-foreground">How likely are you to recommend Scope to a friend?</div>
                <div className="mt-2 grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }).map((_, n) => (
                    <button
                      key={n}
                      onClick={() => setScore(n)}
                      className={`h-8 rounded text-xs font-semibold transition-colors ${
                        score === n
                          ? "bg-gradient-brand text-brand-foreground shadow-brand"
                          : "bg-secondary text-foreground hover:bg-secondary/70"
                      }`}
                    >{n}</button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Not at all</span><span>Definitely</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-foreground">What's the #1 thing we should fix or build?</div>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder="Optional — but every word helps."
                  className="mt-1.5 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={submit} size="sm" className="flex-1 bg-gradient-brand text-brand-foreground">
                  <Send className="mr-1 h-3.5 w-3.5" /> Send
                </Button>
                <Button onClick={() => { setOpen(false); snoozeFor(3); }} size="sm" variant="ghost">Later</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
