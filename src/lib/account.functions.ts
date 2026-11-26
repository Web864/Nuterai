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

// Tables a user owns, keyed by user_id. Read with the caller's RLS-scoped
// client, so an export can only ever contain the caller's own rows.
const EXPORT_USER_TABLES = [
  "user_goals",
  "meal_entries",
  "water_logs",
  "weight_logs",
  "workout_plans",
  "workout_plan_days",
  "workout_sessions",
  "exercise_logs",
  "coach_threads",
  "coach_messages",
  "reminders",
  "reminder_events",
  "notifications",
  "recipes",
  "posts",
  "post_comments",
  "post_likes",
  "user_stats",
  "xp_events",
  "user_achievements",
  "streak_history",
  "activity_events",
  "subscriptions",
  "screen_break_settings",
  "ai_content_feedback",
] as const;

const EXPORT_ROW_LIMIT = 10_000;

/**
 * Data access/portability: returns everything NutriAI stores about the caller
 * as JSON. Available on every plan; access rights can't sit behind a paywall.
 */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const tables: Record<string, unknown[]> = {};
    const truncated: string[] = [];

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new Error("Couldn't export your data. Please try again.");
    tables.profiles = profile ? [profile] : [];

    for (const table of EXPORT_USER_TABLES) {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .eq("user_id", userId)
        .limit(EXPORT_ROW_LIMIT);
      if (error) {
        console.error("[exportMyData] read failed", { table, code: error.code });
        throw new Error("Couldn't export your data. Please try again.");
      }
      tables[table] = data ?? [];
      if ((data?.length ?? 0) >= EXPORT_ROW_LIMIT) truncated.push(table);
    }

    const recipeIds = (tables.recipes as Array<{ id: string }>).map((r) => r.id);
    if (recipeIds.length) {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .in("recipe_id", recipeIds)
        .limit(EXPORT_ROW_LIMIT);
      if (error) throw new Error("Couldn't export your data. Please try again.");
      tables.recipe_ingredients = data ?? [];
    }

    const [{ data: foods, error: foodsError }, { data: friendships, error: friendsError }] =
      await Promise.all([
        supabase.from("foods").select("*").eq("owner_user_id", userId).limit(EXPORT_ROW_LIMIT),
        supabase
          .from("friendships")
          .select("*")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .limit(EXPORT_ROW_LIMIT),
      ]);
    if (foodsError || friendsError) throw new Error("Couldn't export your data. Please try again.");
    tables.custom_foods = foods ?? [];
    tables.friendships = friendships ?? [];

    // Returned as a JSON string: rows are arbitrary JSON and the file is
    // downloaded as-is by the client.
    const exportedAt = new Date().toISOString();
    const json = JSON.stringify(
      {
        exported_at: exportedAt,
        account: {
          id: userId,
          email: typeof claims.email === "string" ? claims.email : null,
        },
        truncated_tables: truncated,
        tables,
      },
      null,
      2,
    );
    return { json, exportedAt };
  });
