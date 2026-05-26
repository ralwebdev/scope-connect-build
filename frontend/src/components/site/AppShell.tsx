import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { MobileDock } from "./MobileDock";
import { Footer } from "./Footer";

export function AppShell({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="">{children}</main>
      {!hideFooter && <Footer />}
      <MobileDock />
    </div>
  );
}
