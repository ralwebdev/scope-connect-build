import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Crown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/site/AppShell";
import { useUser } from "@/hooks/use-scope";
import { cn } from "@/lib/utils";
import { backendUsers } from "@/lib/api/endpoints";

export const Route = createFileRoute("/leaderboards")({
  head: () => ({
    meta: [
      { title: "Leaderboards — Scope Connect" },
      { name: "description", content: "Top members, chapters, and campuses on Scope Connect." },
    ],
  }),
  component: LeaderboardsPage,
});

const tabs = ["Members", "Chapters", "Campuses"] as const;
type Tab = (typeof tabs)[number];

function LeaderboardsPage() {
  const [tab, setTab] = useState<Tab>("Members");
  const user = useUser();
  const [members, setMembers] = useState<Array<{ id: string; name: string; sub: string; value: number; isMe?: boolean }>>([]);
  const [chapters, setChapters] = useState<Array<{ id: string; name: string; sub: string; value: number }>>([]);
  const [campuses, setCampuses] = useState<Array<{ id: string; name: string; sub: string; value: number }>>([]);
  const myRank = members.findIndex((r) => r.isMe) + 1;

  useEffect(() => {
    let cancelled = false;
    backendUsers.listStudentsByXp()
      .then(({ items }) => {
        if (cancelled) return;
        const rows = items
          .map((member) => ({
            id: member.id,
            name: member.name,
            sub: `${member.campus || "Scope Connect"} · Level ${member.stats?.level ?? 1}`,
            value: member.stats?.xp ?? 0,
            isMe: user ? member.id === user.id : false,
          }));
        setMembers(rows);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    backendUsers.listCampusesByMembers()
      .then(({ items }) => {
        if (!cancelled) setCampuses(items);
      })
      .catch(() => {
        if (!cancelled) setCampuses([]);
      });
    backendUsers.listChaptersByXp()
      .then(({ items }) => {
        if (!cancelled) setChapters(items);
      })
      .catch(() => {
        if (!cancelled) setChapters([]);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <AppShell>
      <section className="bg-gradient-hero py-12 text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Badge className="bg-cyan/15 text-cyan hover:bg-cyan/20"><Trophy className="mr-1 h-3 w-3" /> Live rankings</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Leaderboards</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/70">
            Updated in real time. Earn points by shipping projects, attending events, and growing your chapter.
          </p>
          {myRank > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan/15 px-4 py-2 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              You're #{myRank}. {myRank > 10 ? `Climb ${myRank - 10} more spots to crack Top 10.` : "You're in the Top 10. Hold the line."}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex rounded-xl bg-secondary p-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                tab === t ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "Members" && (
            members.length > 0
              ? <Board rows={members} unit="pts" />
              : <Card className="p-6 text-sm text-muted-foreground">No member leaderboard data yet.</Card>
          )}
          {tab === "Chapters" && (
            chapters.length > 0
              ? <Board rows={chapters} unit="xp" />
              : <Card className="p-6 text-sm text-muted-foreground">No chapter leaderboard data yet.</Card>
          )}
          {tab === "Campuses" && (
            campuses.length > 0
              ? <Board rows={campuses} unit="members" />
              : <Card className="p-6 text-sm text-muted-foreground">No campus leaderboard data yet.</Card>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function Podium({ items }: { items: { id: string; name: string; sub: string; value: string; isMe?: boolean }[] }) {
  const order = [1, 0, 2];
  const heights = ["h-32", "h-40", "h-28"];
  const colors = ["bg-secondary", "bg-gradient-brand text-brand-foreground", "bg-secondary"];

  return (
    <div className="mb-8 grid grid-cols-3 items-end gap-3">
      {order.map((idx, pos) => {
        const it = items[idx];
        if (!it) return <div key={pos} />;
        return (
          <div key={pos} className="text-center">
            <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-primary-foreground", it.isMe ? "bg-gradient-brand ring-4 ring-cyan/40" : "bg-gradient-hero")}>
              {it.name.charAt(0)}
            </div>
            <div className="mt-2 truncate text-sm font-semibold text-foreground">{it.name}{it.isMe ? " (You)" : ""}</div>
            <div className="truncate text-xs text-muted-foreground">{it.sub}</div>
            <div className={cn("mt-2 flex items-end justify-center rounded-t-xl text-sm font-bold animate-fade-in", heights[pos], colors[pos])}>
              <div className="pb-3">
                {idx === 0 && <Crown className="mx-auto mb-1 h-4 w-4" />}
                #{idx + 1}
                <div className="text-xs opacity-80">{it.value}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Board({ rows, unit, growths }: { rows: { id: string; name: string; sub: string; value: number; isMe?: boolean }[]; unit: string; growths?: string[] }) {
  return (
    <>
      <Podium items={rows.slice(0, 3).map((r) => ({ id: r.id, name: r.name, sub: r.sub, value: `${r.value.toLocaleString()} ${unit}`, isMe: r.isMe }))} />
      <Card className="divide-y divide-border">
        {rows.map((r, i) => (
          <div key={r.id} className={cn("flex items-center gap-4 p-4 transition-colors", r.isMe ? "bg-cyan/10" : "hover:bg-secondary/40")}>
            <div className="w-8 text-center text-sm font-bold text-muted-foreground">#{i + 1}</div>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-brand-foreground", r.isMe ? "bg-gradient-brand ring-2 ring-cyan" : "bg-gradient-brand")}>
              {r.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-foreground">{r.name}{r.isMe && <span className="ml-2 rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-foreground">YOU</span>}</div>
              <div className="text-xs text-muted-foreground">{r.sub}</div>
            </div>
            {growths?.[i] && <Badge className="bg-success/15 text-success hover:bg-success/20"><TrendingUp className="mr-1 h-3 w-3" />{growths[i]}</Badge>}
            <div className="text-right">
              <div className="text-sm font-bold text-foreground">{r.value.toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{unit}</div>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
