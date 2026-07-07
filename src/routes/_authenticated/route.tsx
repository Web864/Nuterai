import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next: location.pathname } });
    }
    return { userId: data.session.user.id, user: data.session.user };
  },
  component: () => <Outlet />,
});
