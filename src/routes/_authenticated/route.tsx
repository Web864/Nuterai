import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReminderEngine } from "@/features/reminders/useReminderEngine";
import { useDailyCheckIn } from "@/features/gamification/useGamification";
import { useScreenBreakSystem } from "@/features/screen-break/useScreenBreakSystem";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next: location.pathname } });
    }
    return { userId: data.session.user.id, user: data.session.user };
  },
  component: AuthedLayout,
});

let authenticatedLayoutMounts = 0;

function AuthedLayout() {
  const { userId } = Route.useRouteContext();
  useEffect(() => {
    authenticatedLayoutMounts += 1;
    console.info("[authenticated.layout.lifecycle]", {
      state: "mounted",
      count: authenticatedLayoutMounts,
      route: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    return () =>
      console.info("[authenticated.layout.lifecycle]", {
        state: "unmounted",
        count: authenticatedLayoutMounts,
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
  }, []);
  useReminderEngine(userId);
  useDailyCheckIn(userId);
  useScreenBreakSystem(userId);
  return <Outlet />;
}
