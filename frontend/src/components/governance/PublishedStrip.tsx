import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  entity: "challenge" | "project" | "opportunity";
  title?: string;
};

export function PublishedStrip({ entity, title }: Props) {
  const label = title ?? `Verified ${entity}s`;
  return (
    <div className="bg-success/5 border-y border-success/10 py-1.5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap">
        <div className="flex animate-shimmer items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-success/80">
            {label}
          </span>
          <Badge variant="outline" className="h-4 border-success/30 px-1.5 text-[9px] font-bold text-success">
            LIVE NOW
          </Badge>
        </div>
      </div>
    </div>
  );
}
