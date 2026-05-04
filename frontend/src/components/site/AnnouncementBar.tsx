// Top announcement strip — dismissible per ID, persisted in localStorage.
// Renders only on client (after mount) to avoid SSR/CSR mismatch.

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Megaphone, X, ArrowRight } from "lucide-react";

const ANNOUNCEMENT = {
  id: "scope-hack-26",
  text: "🚀 Scope Hack '26 registrations are live — 2,400 seats, 50 campuses.",
  href: "/events",
  cta: "Reserve seat",
};

export function AnnouncementBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`scope_announce_${ANNOUNCEMENT.id}`);
      if (!dismissed) setShow(true);
    } catch { /* noop */ }
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(`scope_announce_${ANNOUNCEMENT.id}`, "1"); } catch { /* noop */ }
  };

  if (!show) return null;
  return (
    <div className="relative bg-gradient-brand text-brand-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-xs sm:text-sm sm:px-6 lg:px-8">
        <Megaphone className="hidden h-3.5 w-3.5 shrink-0 sm:inline-block" />
        <span className="line-clamp-1">{ANNOUNCEMENT.text}</span>
        <Link to={ANNOUNCEMENT.href} className="inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline">
          {ANNOUNCEMENT.cta} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 hover:bg-brand-foreground/10">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
