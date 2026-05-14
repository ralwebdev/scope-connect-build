import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function ChallengeCountdown({ endsAt }: { endsAt?: number }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const now = Date.now();
      const diff = endsAt - now;
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (!timeLeft) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan"></span>
        </span>
        Live Now
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand ring-1 ring-brand/20 shadow-sm transition-all hover:bg-brand/20">
      <Clock className="h-3 w-3" />
      <div className="flex items-baseline gap-1">
        <span>{timeLeft.d}d</span>
        <span className="opacity-50">:</span>
        <span>{timeLeft.h}h</span>
        <span className="opacity-50">:</span>
        <span>{timeLeft.m}m</span>
      </div>
    </div>
  );
}
