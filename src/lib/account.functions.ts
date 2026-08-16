import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteAccount } from "./account-deletion.server";

/** Lightweight counts shown on the delete-account confirmation screen. */
export const getAccountDeletionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [meals, workouts, coachThreads, posts, friends] = await Promise.all([
      supabase
        .from("meal_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("coach_threads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "accepted"),
    ]);
    return {
      meals: meals.count ?? 0,
      workouts: workouts.count ?? 0,
      coachThreads: coachThreads.count ?? 0,
      posts: posts.count ?? 0,
      friends: friends.count ?? 0,
    };
  });

const DeleteInput = z.object({ confirmation: z.literal("DELETE") });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ context }) => {
    const result = await deleteAccount(context.userId);
    if (!result.success) {
      throw new Error(result.message);
    }
    return { success: true as const };
  });
