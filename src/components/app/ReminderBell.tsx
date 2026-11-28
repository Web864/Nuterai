import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsQueryOptions } from "@/features/reminders/queries";
import { cn } from "@/lib/utils";

/**
 * Header shortcut to the existing Reminders page. The badge reuses the same
 * notifications query (and cache key) the Reminders page already uses for its
 * unread count, so it adds no new data source.
 */
export function ReminderBell({ userId, className }: { userId: string; className?: string }) {
  const notifications = useQuery(notificationsQueryOptions(userId));
  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;
  const label = unread > 0 ? `Reminders, ${unread} unread` : "Reminders";

  return (
    <Link
      to="/reminders"
      aria-label={label}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
