import { useEffect, useState } from "react";

/** Animated count-up for hero metrics. */
export function CountUp({ to, duration = 1200, prefix = "", suffix = "" }: { to: number; duration?: number; prefix?: string; suffix?: string }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return <>{prefix}{n.toLocaleString()}{suffix}</>;
}

export function ConfettiBurst({ trigger }: { trigger: number }) {
  if (!trigger) return null;
  const pieces = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center" key={trigger}>
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const dist = 80 + Math.random() * 80;
        const cx = Math.cos(angle) * dist;
        const cy = Math.sin(angle) * dist;
        const colors = ["#E63946", "#00D1FF", "#FFD166", "#06D6A0", "#A78BFA"];
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className="confetti-piece absolute h-2 w-2 rounded-sm"
            style={{ background: color, "--cx": `${cx}px`, "--cy": `${cy}px`, "--cr": `${Math.random() * 720}deg` } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
