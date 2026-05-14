// Dashboard credibility widget — surfaces the user's verification, profile
// completeness, role badges, recent activity state, and portfolio link count.
// Encourages profile completion and link adding.
import { Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight, MapPin, Crown, Link as LinkIcon, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScopeVerifiedBadge } from "@/components/site/ScopeVerifiedBadge";
import { useUser, useProfileStrength, useStoreValue, useXP } from "@/hooks/use-scope";
import { portfolio, meta } from "@/lib/scope-store";

type ActivityState = "Active today" | "Active this week" | "Returning builder" | "New member";

function activityFromVisits(lastVisit: number | null, totalVisits: number): ActivityState {
  if (!lastVisit) return totalVisits > 0 ? "Returning builder" : "New member";
  const hours = (Date.now() - lastVisit) / 36e5;
  if (hours <= 24) return "Active today";
  if (hours <= 24 * 7) return "Active this week";
  if (totalVisits >= 3) return "Returning builder";
  return "New member";
}

// Lightweight, deterministic role-badge derivation from user data so the
// panel feels alive without a real role table. Real role assignment can
// replace this later without changing the UI surface.
function deriveRoles(level: string | undefined, xp: number): string[] {
  const roles: string[] = [];
  if (xp >= 4000) roles.push("Top Builder");
  if (level === "Leader" || level === "Ambassador") roles.push("Growth Lead");
  if (xp >= 2500 && xp < 4000) roles.push("Projects Lead");
  return roles.slice(0, 3);
}

export function CredibilityPanel() {
  const user = useUser();
  const strength = useProfileStrength();
  const portfolioCount = useStoreValue(() => (user ? portfolio.forUser(user.id).length : 0));
  const totalVisits = useStoreValue(() => meta.visits());
  const xpVal = useXP();

  if (!user) return null;

  // No dedicated lastVisit accessor — treat any visit count as "active today"
  // proxy since visits are bumped on every load.
  const activity = activityFromVisits(totalVisits > 0 ? Date.now() : null, totalVisits);
  const roles = deriveRoles(undefined, xpVal);
  const isVerified = strength >= 70;
  const showCompletionCTA = strength < 70;
  const showPortfolioCTA = portfolioCount === 0;

  return (
    <Card className="p-5 hover-lift">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <h3 className="font-semibold text-foreground">Your credibility</h3>
        </div>
        {isVerified ? (
          <ScopeVerifiedBadge size="sm" />
        ) : (
          <Badge variant="outline" className="text-[10px]">Building trust</Badge>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">Credibility opens opportunities.</p>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-foreground">{user.campus ?? "No campus selected"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-foreground">{activity}</span>
        </div>
        <div className="flex items-center gap-2">
          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-foreground">{portfolioCount} portfolio link{portfolioCount === 1 ? "" : "s"}</span>
        </div>
        {roles.length > 0 && (
          <div className="flex items-start gap-2">
            <Crown className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {roles.map((r) => (
                <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Profile completion</span>
          <span className="font-semibold text-foreground">{strength}%</span>
        </div>
        <Progress value={strength} className="mt-1.5" />
      </div>

      {showCompletionCTA && (
        <Button asChild size="sm" variant="outline" className="mt-4 w-full">
          <Link to="/profile">Complete your profile <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      )}
      {!showCompletionCTA && showPortfolioCTA && (
        <Button asChild size="sm" variant="outline" className="mt-4 w-full">
          <Link to="/portfolio">Add a portfolio link <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      )}
    </Card>
  );
}
