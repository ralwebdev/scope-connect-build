import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle, Share2, PartyPopper, Image as ImageIcon, Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/site/AppShell";
import { AdSlot } from "@/components/site/AdSlot";
import { useStoreValue, useUser, useIsLoggedIn } from "@/hooks/use-scope";
import { feed } from "@/lib/scope-store";
import { FeatureGate } from "@/components/site/FeatureGate";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Scope Feed — Scope Connect" },
      { name: "description", content: "Live activity feed from India's campus innovation network." },
    ],
  }),
  component: () => <FeatureGate flag="feed"><FeedPage /></FeatureGate>,
});

function FeedPage() {
  const user = useUser();
  const isAuthed = useIsLoggedIn();
  const posts = useStoreValue(() => feed.all());
  const [draft, setDraft] = useState("");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const submit = () => {
    if (!draft.trim()) return;
    if (!isAuthed) { toast.error("Sign in to post."); return; }
    feed.create(draft.trim());
    analytics.track("feed_post_created");
    setDraft("");
    toast.success("Posted. Your chapter noticed this.");
  };

  const onLike = (id: string) => {
    if (!isAuthed) { toast.error("Sign in to react."); return; }
    feed.toggleLike(id);
  };

  const onCelebrate = (id: string) => {
    if (!isAuthed) { toast.error("Sign in to react."); return; }
    feed.toggleCelebrate(id);
    toast("🎉 Celebrate sent");
  };

  const onComment = (id: string) => {
    const text = commentDraft[id]?.trim();
    if (!text) return;
    if (!isAuthed) { toast.error("Sign in to comment."); return; }
    feed.comment(id, text);
    setCommentDraft((m) => ({ ...m, [id]: "" }));
  };

  const onShare = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/feed#${id}`);
    }
    toast.success("Link copied. Spread the momentum.");
  };

  return (
    <AppShell>
      <section className="border-b border-border/40 bg-secondary/40 py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Scope Feed</h1>
          <p className="mt-1 text-sm text-muted-foreground">What India's campus builders are shipping right now.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {isAuthed ? (
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-brand-foreground" style={{ background: user?.avatarColor || "var(--brand)" }}>
                {user?.name.charAt(0).toUpperCase() ?? "Y"}
              </div>
              <div className="flex-1">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Share what you're building…"
                  className="min-h-[80px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
                <div className="mt-3 flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => toast("Image upload coming soon.")}>
                    <ImageIcon className="mr-2 h-4 w-4" /> Media
                  </Button>
                  <Button onClick={submit} size="sm" className="bg-gradient-brand text-brand-foreground" disabled={!draft.trim()}>
                    <Send className="mr-2 h-4 w-4" /> Post (+25 XP)
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-wrap items-center justify-between gap-4 border-dashed bg-secondary/40 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-brand" />
              <div>
                <div className="text-sm font-semibold text-foreground">Sign in to post & react</div>
                <div className="text-xs text-muted-foreground">Earn XP for every action.</div>
              </div>
            </div>
            <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground">
              <Link to="/auth">Join Scope</Link>
            </Button>
          </Card>
        )}

        <div className="mt-6 space-y-4">
          {posts.map((p) => (
            <Card key={p.id} className="p-5 hover-lift animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                  {p.author.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{p.author}</div>
                  <div className="text-xs text-muted-foreground">{p.campus} · {p.time}</div>
                </div>
                <Badge variant="outline" className="text-xs">{p.type}</Badge>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/90">{p.content}</p>

              <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                <Button variant="ghost" size="sm" onClick={() => onLike(p.id)} className={p.userLiked ? "text-brand" : "text-muted-foreground"}>
                  <Heart className={`mr-1.5 h-4 w-4 ${p.userLiked ? "fill-current" : ""}`} /> {p.likes}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onCelebrate(p.id)} className={p.userCelebrated ? "text-cyan" : "text-muted-foreground"}>
                  <PartyPopper className="mr-1.5 h-4 w-4" /> {p.celebrates}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpenComments((m) => ({ ...m, [p.id]: !m[p.id] }))} className="text-muted-foreground">
                  <MessageCircle className="mr-1.5 h-4 w-4" /> {p.comments}
                </Button>
                <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => onShare(p.id)}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {openComments[p.id] && (
                <div className="mt-3 space-y-3 border-t border-border pt-3 animate-fade-in">
                  {(p.commentList ?? []).map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                        {c.author.charAt(0)}
                      </div>
                      <div className="flex-1 rounded-xl bg-secondary px-3 py-2">
                        <div className="text-xs font-semibold text-foreground">{c.author}</div>
                        <div className="text-sm text-foreground/90">{c.text}</div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={commentDraft[p.id] ?? ""}
                      onChange={(e) => setCommentDraft((m) => ({ ...m, [p.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && onComment(p.id)}
                      placeholder="Write a comment…"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                    <Button size="sm" onClick={() => onComment(p.id)} className="bg-gradient-brand text-brand-foreground">Send</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          <AdSlot slotId="feed_inline" variant="card" label="Sponsored" className="mt-2" />
        </div>
      </section>
    </AppShell>
  );
}
