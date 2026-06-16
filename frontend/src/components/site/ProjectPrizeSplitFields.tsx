import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ProjectPrizeRole = {
  role: string;
  count?: number;
  skills?: string[];
  prize_pool_percentage: number;
};

function splitPercentagesEvenly(count: number): number[] {
  if (count <= 0) return [];

  const base = Math.floor(100 / count);
  const remainder = 100 % count;

  return Array.from({ length: count }, (_, index) =>
    base + (index < remainder ? 1 : 0),
  );
}

function rebalanceRolesEvenly(roles: ProjectPrizeRole[]): ProjectPrizeRole[] {
  const percentages = splitPercentagesEvenly(roles.length);

  return roles.map((item, index) => ({
    ...item,
    prize_pool_percentage: percentages[index] ?? 0,
  }));
}

export function createEmptyProjectPrizeRole(): ProjectPrizeRole {
  return {
    role: "",
    count: 1,
    skills: [],
    prize_pool_percentage: 100,
  };
}

export function normalizeProjectPrizeRoles(
  roles: ProjectPrizeRole[],
): ProjectPrizeRole[] {
  return roles.map((item) => ({
    role: item.role.trim(),
    count: 1,
    skills: [],
    prize_pool_percentage: Math.max(
      0,
      Math.min(100, Number(item.prize_pool_percentage) || 0),
    ),
  }));
}

export function getProjectPrizePoolTotal(roles: ProjectPrizeRole[]): number {
  return roles.reduce(
    (sum, item) => sum + (Number(item.prize_pool_percentage) || 0),
    0,
  );
}

type Props = {
  roles: ProjectPrizeRole[];
  rewardPoolXp: number;
  onChange: (roles: ProjectPrizeRole[]) => void;
};

export function ProjectPrizeSplitFields({
  roles,
  rewardPoolXp,
  onChange,
}: Props) {
  const total = getProjectPrizePoolTotal(roles);

  const updateRole = (
    index: number,
    field: "role" | "prize_pool_percentage",
    value: string | number,
  ) => {
    onChange(
      roles.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "prize_pool_percentage"
                  ? Math.max(0, Math.min(100, Number(value) || 0))
                  : String(value),
            }
          : item,
      ),
    );
  };

  const addRole = () => {
    onChange(rebalanceRolesEvenly([...roles, createEmptyProjectPrizeRole()]));
  };

  const removeRole = (index: number) => {
    onChange(
      rebalanceRolesEvenly(
        roles.filter((_, itemIndex) => itemIndex !== index),
      ),
    );
  };

  return (
    <div className="rounded-xl border border-border/70 bg-secondary/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Label className="text-sm font-bold text-foreground">
            Team Prize Split
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Add each team position and assign its percentage of the reward pool.
            Total allocation should be 100%.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRole}
          className="shrink-0"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Position
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {roles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
            No positions added yet.
          </div>
        ) : (
          roles.map((item, index) => {
            const xpShare = Math.round(
              ((Number(rewardPoolXp) || 0) *
                (Number(item.prize_pool_percentage) || 0)) /
                100,
            );

            return (
              <div
                key={`${index}-${item.role}`}
                className="grid gap-3 rounded-lg border border-border/70 bg-background/80 p-3 md:grid-cols-[minmax(0,1.6fr)_160px_120px_44px]"
              >
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Position
                  </Label>
                  <Input
                    value={item.role}
                    onChange={(e) =>
                      updateRole(index, "role", e.target.value)
                    }
                    placeholder="e.g. Programmer"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Prize Pool %
                  </Label>
                  <div className="mt-1.5 flex items-center rounded-md border border-input bg-background px-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.prize_pool_percentage}
                      onChange={(e) =>
                        updateRole(
                          index,
                          "prize_pool_percentage",
                          e.target.value,
                        )
                      }
                      className="h-10 w-full bg-transparent text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-sm font-semibold text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    XP Share
                  </Label>
                  <div className="mt-1.5 flex h-10 items-center rounded-md border border-border/70 bg-secondary/20 px-3 text-sm font-semibold text-foreground">
                    {xpShare} XP
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRole(index)}
                    disabled={roles.length === 1}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          Prize pool:{" "}
          <span className="font-semibold text-foreground">
            {Number(rewardPoolXp) || 0} XP
          </span>
        </span>
        <span
          className={
            total === 100
              ? "font-semibold text-emerald-600"
              : "font-semibold text-amber-600"
          }
        >
          Total allocation: {total}%
        </span>
      </div>
    </div>
  );
}
