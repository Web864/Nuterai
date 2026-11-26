import { Link } from "@tanstack/react-router";
import { Github, Leaf, Linkedin } from "lucide-react";
import { FEATURES, NAV_ITEMS, WELLNESS_DISCLAIMER } from "@/content/marketing";

/**
 * Public-site footer. Links every public page (crawlable internal links help
 * new pages get discovered and indexed) and carries the wellness disclaimer.
 */
export function SiteFooter() {
  return (
    <footer className="landing-footer border-t border-border/60 bg-background/50">
      <div className="mx-auto grid max-w-7xl min-w-0 gap-10 px-5 py-12 text-sm text-muted-foreground sm:px-8 md:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-10">
        <div className="min-w-0">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-3.5 w-3.5" />
            </span>
            <span className="font-display text-foreground">NutriAI</span>
          </Link>
          <p className="mt-3 max-w-xs leading-6">
            AI meal planner, calorie tracker and fitness coach for the food you actually eat.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span>Built by Rabia Naz</span>
            <a
              href="https://www.linkedin.com/in/rabia-naz-01263b339"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rabia Naz on LinkedIn (opens in a new tab)"
              className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Linkedin aria-hidden="true" className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/Web864"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rabia Naz on GitHub (opens in a new tab)"
              className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Github aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>
        <FooterColumn
          title="Features"
          links={FEATURES.map((f) => ({ label: f.navLabel, to: f.path }))}
        />
        <FooterColumn title="Product" links={NAV_ITEMS.filter((n) => n.to !== "/features")} />
        <FooterColumn
          title="Legal"
          links={[
            { label: "Privacy policy", to: "/privacy" },
            { label: "Terms of service", to: "/terms" },
            { label: "Delete account", to: "/delete-account" },
          ]}
        />
      </div>
      <div className="mx-auto max-w-7xl border-t border-border/60 px-5 py-6 text-xs leading-5 text-muted-foreground sm:px-8 lg:px-10">
        <p>{WELLNESS_DISCLAIMER}</p>
        <p className="mt-2">Copyright {new Date().getFullYear()} NutriAI</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <nav aria-label={title} className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
