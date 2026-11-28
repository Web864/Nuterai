import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReminderEngine } from "@/features/reminders/useReminderEngine";
import { useDailyCheckIn } from "@/features/gamification/useGamification";
import { useScreenBreakSystem } from "@/features/screen-break/useScreenBreakSystem";
import { AppNav } from "@/components/app/AppNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // The signed-in app is private: keep every child page out of search results.
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next: location.pathname } });
    }
    return { userId: data.session.user.id, user: data.session.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { userId, user } = Route.useRouteContext();
  useReminderEngine(userId);
  useDailyCheckIn(userId);
  useScreenBreakSystem(userId);
  return (
    <div className="app-workspace">
      <Outlet />
      <AppNav email={user.email} />
    </div>
  );
}
