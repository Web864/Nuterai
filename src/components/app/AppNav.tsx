import { useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Camera,
  ChevronRight,
  CirclePlus,
  ClipboardList,
  Droplets,
  Dumbbell,
  House,
  Leaf,
  MessageCircle,
  Settings,
  Trophy,
  UserRound,
  Users,
  Utensils,
  type LucideProps,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Primary app navigation: the same five destinations on every screen size.
 * - Below `lg` (mobile + tablet): icon-only bottom bar.
 * - From `lg` up (desktop): left sidebar with icons and labels.
 * Exactly one of the two is visible at any width. Every destination is an existing
 * route or flow; this component only links to them.
 */

type Icon = ComponentType<LucideProps>;
type SheetName = "add" | "profile";

type SheetAction = {
  label: string;
  description: string;
  icon: Icon;
  go: () => void;
};

type NavItem =
  | {
      kind: "link";
      label: string;
      icon: Icon;
      to: "/dashboard" | "/workout" | "/coach";
      active: boolean;
    }
  | { kind: "sheet"; label: string; icon: Icon; sheet: SheetName; active: boolean };

const PROFILE_PATHS = ["/community", "/achievements", "/settings", "/u/"];
const ADD_PATHS = ["/log", "/scan"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function AppNav({ email }: { email?: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetName | null>(null);

  // Onboarding is a focused, full-screen wizard; keep it free of app navigation.
  if (pathname.startsWith("/onboarding")) return null;

  const close = () => setSheet(null);

  const items: NavItem[] = [
    {
      kind: "link",
      label: "Home",
      icon: House,
      to: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      kind: "sheet",
      label: "Add",
      icon: CirclePlus,
      sheet: "add",
      active: sheet === "add" || matches(pathname, ADD_PATHS),
    },
    {
      kind: "link",
      label: "Workout",
      icon: Dumbbell,
      to: "/workout",
      active: matches(pathname, ["/workout"]),
    },
    {
      kind: "link",
      label: "Coach",
      icon: MessageCircle,
      to: "/coach",
      active: matches(pathname, ["/coach"]),
    },
    {
      kind: "sheet",
      label: "Profile",
      icon: UserRound,
      sheet: "profile",
      active: sheet === "profile" || matches(pathname, PROFILE_PATHS),
    },
  ];

  const addActions: SheetAction[] = [
    {
      label: "Add Meal",
      description: "Log what you ate",
      icon: Utensils,
      go: () => navigate({ to: "/log" }),
    },
    {
      label: "Add Water",
      description: "Track your hydration",
      icon: Droplets,
      go: () => navigate({ to: "/log", search: { tab: "water" } }),
    },
    {
      label: "Scan Food",
      description: "Photo or barcode",
      icon: Camera,
      go: () => navigate({ to: "/scan" }),
    },
  ];

  const profileActions: SheetAction[] = [
    {
      label: "Community",
      description: "Feed, friends & activity",
      icon: Users,
      go: () => navigate({ to: "/community" }),
    },
    {
      label: "Progress",
      description: "XP, streaks & badges",
      icon: Trophy,
      go: () => navigate({ to: "/achievements" }),
    },
    {
      label: "Settings",
      description: "Profile, goals & account",
      icon: Settings,
      go: () => navigate({ to: "/settings" }),
    },
    {
      label: "Your Plan",
      description: "Goal, activity & diet",
      icon: ClipboardList,
      go: () => navigate({ to: "/dashboard", hash: "your-plan" }),
    },
    {
      label: "Weekly Summary",
      description: "Your last 7 days",
      icon: BarChart3,
      go: () => navigate({ to: "/dashboard", hash: "weekly-summary" }),
    },
  ];

  return (
    <>
      {/* Mobile + tablet: icon-only bottom bar */}
      <nav aria-label="Primary" className="app-bottom-nav lg:hidden">
        <div className="app-bottom-nav-bar">
          {items.map((item) => (
            <NavEntry key={item.label} item={item} variant="bar" sheet={sheet} onOpen={setSheet} />
          ))}
        </div>
      </nav>

      {/* Desktop: left sidebar with labels */}
      <nav aria-label="Primary" className="app-sidebar hidden lg:flex">
        <div className="app-sidebar-brand">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-[1.05rem] font-semibold tracking-tight">NutriAI</span>
        </div>
        <div className="mt-6 flex flex-col gap-1">
          {items.map((item) => (
            <NavEntry
              key={item.label}
              item={item}
              variant="sidebar"
              sheet={sheet}
              onOpen={setSheet}
            />
          ))}
        </div>
      </nav>

      <ActionSheet
        open={sheet === "add"}
        onClose={close}
        title="Add"
        description="Log a meal, water or scan food."
        actions={addActions}
      />
      <ActionSheet
        open={sheet === "profile"}
        onClose={close}
        title="Profile"
        description={email ?? "Your account"}
        actions={profileActions}
      />
    </>
  );
}

function NavEntry({
  item,
  variant,
  sheet,
  onOpen,
}: {
  item: NavItem;
  variant: "bar" | "sidebar";
  sheet: SheetName | null;
  onOpen: (s: SheetName) => void;
}) {
  const className = cn(
    variant === "bar" ? "app-bottom-nav-item" : "app-sidebar-item",
    item.active && "is-active",
  );
  const IconCmp = item.icon;
  const content =
    variant === "bar" ? (
      <span className="app-bottom-nav-icon">
        <IconCmp className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />
      </span>
    ) : (
      <>
        <IconCmp className="h-5 w-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
        <span>{item.label}</span>
      </>
    );

  if (item.kind === "link") {
    return (
      <Link
        to={item.to}
        aria-label={variant === "bar" ? item.label : undefined}
        aria-current={item.active ? "page" : undefined}
        className={className}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={variant === "bar" ? item.label : undefined}
      aria-haspopup="dialog"
      aria-expanded={sheet === item.sheet}
      className={className}
      onClick={() => onOpen(item.sheet)}
    >
      {content}
    </button>
  );
}

function ActionSheet({
  open,
  onClose,
  title,
  description,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  actions: SheetAction[];
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent side="bottom" className="app-action-sheet">
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/25 lg:hidden"
          aria-hidden
        />
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription className="truncate">{description}</SheetDescription>
        </SheetHeader>
        <ul className="mt-4 space-y-1.5">
          {actions.map(({ label, description: desc, icon: IconCmp, go }) => (
            <li key={label}>
              <button
                type="button"
                className="app-action-row"
                onClick={() => {
                  onClose();
                  go();
                }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <IconCmp className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-medium text-foreground">{label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
