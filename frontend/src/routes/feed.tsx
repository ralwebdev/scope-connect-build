import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/site/AppShell";
import { AdSlot } from "@/components/site/AdSlot";
import { useIsLoggedIn } from "@/hooks/use-scope";
import { FeatureGate } from "@/components/site/FeatureGate";
import { toast } from "sonner";
import { backendFeed, type BackendFeedPost } from "@/lib/api/endpoints";
import { FeedComposer } from "@/components/site/FeedComposer";

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
  const isAuthed = useIsLoggedIn();
  const [posts, setPosts] = useState<BackendFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const refreshPosts = () => {
    backendFeed.list()
      .then(({ items }) => setPosts(items))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load feed"));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    backendFeed.list()
      .then(({ items }) => { if (!cancelled) setPosts(items); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load feed"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const onLike = (id: string) => {
    if (!isAuthed) { toast.error("Sign in to react."); return; }
    backendFeed.react(id, "like")
      .then(({ post }) => setPosts((current) => current.map((p) => (p.id === id ? post : p))))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not update reaction"));
  };

  const onCelebrate = (id: string) => {
    if (!isAuthed) { toast.error("Sign in to react."); return; }
    backendFeed.react(id, "celebrate")
      .then(({ post }) => setPosts((current) => current.map((p) => (p.id === id ? post : p))))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not update reaction"));
    toast("🎉 Celebrate sent");
  };

  const onComment = (id: string) => {
    const text = commentDraft[id]?.trim();
    if (!text) return;
    if (!isAuthed) { toast.error("Sign in to comment."); return; }
    backendFeed.comment(id, text)
      .then(({ post }) => {
        setPosts((current) => current.map((p) => (p.id === id ? post : p)));
        setCommentDraft((m) => ({ ...m, [id]: "" }));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not add comment"));
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
        <FeedComposer onPosted={refreshPosts} />

        <div className="mt-6 space-y-4">
          {loading && <Card className="p-5 text-sm text-muted-foreground">Loading feed...</Card>}
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
