import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare, Star } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { backendPublic } from "@/lib/api/endpoints";
import { toast } from "sonner";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback - Scope Connect" },
      { name: "description", content: "Tell us what would make Scope better." },
    ],
  }),
  component: FeedbackPage,
});

const TYPES = ["Feature request", "Bug report", "General suggestion", "Other"] as const;

function FeedbackPage() {
  const [rating, setRating] = useState(4);
  const [type, setType] = useState<string>(TYPES[0]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      toast.error("Add a bit more detail (10+ characters).");
      return;
    }

    setSubmitting(true);
    try {
      await backendPublic.submitFeedback({
        source: "feedback_page",
        rating,
        type,
        message: text.trim(),
      });

      toast.success("Thanks. The Scope team reads every feedback.");
      setText("");
      setRating(4);
      setType(TYPES[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send feedback.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><MessageSquare className="mr-1 h-3 w-3" /> Feedback</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Tell us what would make Scope better.</h1>
          <p className="mt-2 text-primary-foreground/70">We're building with you, not for you.</p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label>Overall experience</Label>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`} className="rounded-md p-1 transition-transform hover:scale-110">
                    <Star className={`h-7 w-7 ${n <= rating ? "fill-brand text-brand" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="ftype">Type</Label>
              <select id="ftype" value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="ftext">Your feedback</Label>
              <Textarea id="ftext" value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="What's working? What's missing? What broke your flow?" className="mt-1.5" maxLength={1000} />
              <p className="mt-1 text-xs text-muted-foreground">{text.length}/1000</p>
            </div>
            <Button type="submit" size="lg" disabled={submitting} className="w-full bg-gradient-brand text-brand-foreground shadow-brand">Send feedback</Button>
          </form>
        </Card>
      </section>
    </AppShell>
  );
}
