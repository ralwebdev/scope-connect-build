import { Link } from "@tanstack/react-router";
import { Sparkles, Mail, ShieldCheck, MessageSquarePlus } from "lucide-react";
import { useBrand, useFeature } from "@/hooks/use-platform";

export function Footer() {
  const brand = useBrand();
  const feedOn = useFeature("feed");
  const projectsOn = useFeature("projects");
  const eventsOn = useFeature("events");
  const leaderboardsOn = useFeature("leaderboards");
  const portfolioOn = useFeature("portfolio");
  const campusOn = useFeature("campus");
  const ambassadorsOn = useFeature("ambassadors");

  return (
    <footer className="border-t border-border/40 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-6">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-lg tracking-tight">{brand.name}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-primary-foreground/70">{brand.tagline}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground/85">
              <ShieldCheck className="h-3 w-3 text-cyan" /> {brand.operator}
            </div>
            <a href={`mailto:${brand.contactEmail}`} className="mt-3 flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground">
              <Mail className="h-3.5 w-3.5" /> {brand.contactEmail}
            </a>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
              {projectsOn && <li><Link to="/projects" className="hover:text-primary-foreground">Projects</Link></li>}
              {campusOn && <li><Link to="/campus" className="hover:text-primary-foreground">Campuses</Link></li>}
              {eventsOn && <li><Link to="/events" className="hover:text-primary-foreground">Events</Link></li>}
              {leaderboardsOn && <li><Link to="/leaderboards" className="hover:text-primary-foreground">Leaderboards</Link></li>}
              {portfolioOn && <li><Link to="/portfolio" className="hover:text-primary-foreground">Portfolio</Link></li>}
              {/* {feedOn && <li><Link to="/feed" className="hover:text-primary-foreground">Feed</Link></li>} */}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Grow</h4>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/waitlist" className="hover:text-primary-foreground">Join waitlist</Link></li>
              <li><Link to="/refer" className="hover:text-primary-foreground">Refer & earn</Link></li>
              {ambassadorsOn && <li><Link to="/ambassador" className="hover:text-primary-foreground">Ambassador</Link></li>}
              {/* <li><Link to="/announcements" className="hover:text-primary-foreground">Announcements</Link></li> */}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/about" className="hover:text-primary-foreground">About</Link></li>
              <li><Link to="/contact" className="hover:text-primary-foreground">Contact</Link></li>
              {/* <li><Link to="/partnerships" className="hover:text-primary-foreground">Partnerships</Link></li> */}
              <li><Link to={brand.supportUrl as "/support"} className="hover:text-primary-foreground">Support</Link></li>
              <li><Link to="/updates" className="hover:text-primary-foreground">Platform updates</Link></li>
              {/* <li><Link to="/feedback" className="hover:text-primary-foreground">Feedback</Link></li> */}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Trust & Policies</h4>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/innovation-lab" className="hover:text-primary-foreground">Innovation Lab</Link></li>
              <li><Link to="/faqs" className="hover:text-primary-foreground">FAQs</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-foreground">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-primary-foreground">Terms</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-primary-foreground">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/60">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <p>© {new Date().getFullYear()} {brand.operator.replace(/^Operated by |^Powered by /, "")}. {brand.tagline.split(".")[0]}.</p>
            {/* <Link
              to="/feedback"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/25 px-3 py-1 text-[11px] font-medium text-primary-foreground/85 transition-colors hover:border-primary-foreground/60 hover:text-primary-foreground"
            >
              <MessageSquarePlus className="h-3 w-3" /> Share Feedback
            </Link> */}
          </div>
          {/* <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-primary-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-primary-foreground">Terms</Link>
            <Link to="/community-guidelines" className="hover:text-primary-foreground">Community</Link>
          </div> */}
        </div>
      </div>
    </footer>
  );
}