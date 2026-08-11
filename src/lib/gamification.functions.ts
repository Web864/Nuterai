/**
 * Gamification API — server-only entry point for achievement progress.
 * progress_achievement() is a SECURITY DEFINER RPC restricted to
 * service_role (see supabase/migrations/20260811120000_*.sql); this server
 * function is the only legitimate way to advance a user's achievement
 * progress. It authenticates the caller with requireSupabaseAuth and passes
 * their verified user id — never one the client supplies.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const progressAchievementInput = z.object({
  code: z.string().min(1).max(100),
  progress: z.number(),
  mode: z.enum(["set", "increment"]),
});

export const progressAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => progressAchievementInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("progress_achievement", {
      _user_id: context.userId,
      _code: data.code,
      _progress: data.progress,
      _mode: data.mode,
    });
    if (error) throw error;
    return result;
  });
