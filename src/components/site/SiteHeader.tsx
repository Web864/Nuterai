import { Link } from "@tanstack/react-router";
import { Leaf, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS } from "@/content/marketing";

/** Public-site header. Every menu item is a real page with its own URL. */
export function SiteHeader() {
  return (
    <header className="landing-header safe-top sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="landing-header-inner mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-foreground"
          aria-label="NutriAI home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_22px_oklch(0.77_0.18_153_/_0.3)]">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-lg">NutriAI</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="hover:text-foreground"
              activeProps={{ className: "text-foreground", "aria-current": "page" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="landing-header-actions flex min-w-0 shrink items-center justify-end">
          <Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-4">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start free
            </Link>
          </Button>
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation menu"
                  className="rounded-full"
                >
                  <Menu aria-hidden="true" className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48 rounded-xl p-2">
                {NAV_ITEMS.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="min-h-11 rounded-lg">
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild className="min-h-11 rounded-lg">
                  <Link to="/auth">Sign in</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
