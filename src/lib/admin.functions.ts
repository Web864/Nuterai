/**
 * Admin API — every function verifies the caller holds the `admin` role with
 * their own RLS-scoped client before escalating to the service-role client.
 * Thin wrapper module: helpers live in `admin.server.ts`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAdmin,
  clampLimit,
  countRows,
  dailySeries,
  getAdminClient,
  sinceDays,
  writeAudit,
} from "./admin.server";

export const adminWhoAmI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const d7 = sinceDays(7);

    const [
      users,
      newUsers7,
      onboarded,
      meals,
      meals7,
      workouts,
      workouts7,
      coachMsgs,
      coachMsgs7,
      reminders,
      posts,
      comments,
      openReports,
      achievementsUnlocked,
    ] = await Promise.all([
      countRows(admin, "profiles"),
      countRows(admin, "profiles", d7),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_completed", true),
      countRows(admin, "meal_entries"),
      countRows(admin, "meal_entries", d7),
      countRows(admin, "workout_sessions"),
      countRows(admin, "workout_sessions", d7),
      countRows(admin, "coach_messages"),
      countRows(admin, "coach_messages", d7),
      countRows(admin, "reminders"),
      countRows(admin, "posts"),
      countRows(admin, "post_comments"),
      admin.from("post_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
      admin.from("user_achievements").select("*", { count: "exact", head: true }).not("unlocked_at", "is", null),
    ]);

    const [signupRows, mealRows, workoutRows, xpRows] = await Promise.all([
      admin.from("profiles").select("created_at").gte("created_at", sinceDays(14)),
      admin.from("meal_entries").select("created_at").gte("created_at", sinceDays(14)),
      admin.from("workout_sessions").select("created_at").gte("created_at", sinceDays(14)),
      admin.from("xp_events").select("amount").gte("created_at", sinceDays(30)),
    ]);

    return {
      totals: {
        users,
        newUsers7,
        onboarded: onboarded.count ?? 0,
        meals,
        meals7,
        workouts,
        workouts7,
        coachMsgs,
        coachMsgs7,
        reminders,
        posts,
        comments,
        openReports: openReports.count ?? 0,
        achievementsUnlocked: achievementsUnlocked.count ?? 0,
        xp30: (xpRows.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
      },
      series: {
        signups: dailySeries(signupRows.data ?? [], 14),
        meals: dailySeries(mealRows.data ?? [], 14),
        workouts: dailySeries(workoutRows.data ?? [], 14),
      },
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ q: z.string().trim().max(120).optional(), limit: z.number().optional(), offset: z.number().optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const limit = clampLimit(data.limit, 25, 100);
    const offset = Math.max(0, Math.floor(data.offset ?? 0));

    let query = admin
      .from("profiles")
      .select("id, display_name, full_name, email, username, avatar_url, country, city, onboarding_completed, is_public, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data.q) {
      const like = `%${data.q.replace(/[%_,]/g, "")}%`;
      query = query.or(
        `display_name.ilike.${like},full_name.ilike.${like},email.ilike.${like},username.ilike.${like}`,
      );
    }

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    const [statsRes, rolesRes] = await Promise.all([
      admin.from("user_stats").select("user_id, xp, level, workout_streak, nutrition_streak, login_streak").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("user_roles").select("user_id, role").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const statsBy = new Map((statsRes.data ?? []).map((s) => [s.user_id, s]));
    const rolesBy = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      rolesBy.set(r.user_id, [...(rolesBy.get(r.user_id) ?? []), r.role]);
    }

    return {
      total: count ?? 0,
      rows: (rows ?? []).map((r) => ({
        ...r,
        stats: statsBy.get(r.id) ?? null,
        roles: rolesBy.get(r.id) ?? [],
      })),
    };
  });

export const adminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const uid = data.userId;

    const [profile, goals, stats, roles, meals, workouts, threads, reminders, posts, xp, achievements] =
      await Promise.all([
        admin.from("profiles").select("*").eq("id", uid).maybeSingle(),
        admin.from("user_goals").select("*").eq("user_id", uid).maybeSingle(),
        admin.from("user_stats").select("*").eq("user_id", uid).maybeSingle(),
        admin.from("user_roles").select("role").eq("user_id", uid),
        admin.from("meal_entries").select("id, name, meal_type, calories_kcal, protein_g, logged_at").eq("user_id", uid).order("logged_at", { ascending: false }).limit(10),
        admin.from("workout_sessions").select("id, name, focus, duration_minutes, calories_kcal, logged_at").eq("user_id", uid).order("logged_at", { ascending: false }).limit(10),
        admin.from("coach_threads").select("id, title, last_message_preview, last_message_at").eq("user_id", uid).order("last_message_at", { ascending: false }).limit(10),
        admin.from("reminders").select("id, type, title, is_active, times").eq("user_id", uid).limit(20),
        admin.from("posts").select("id, content, kind, like_count, comment_count, is_hidden, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
        admin.from("xp_events").select("id, amount, reason, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
        admin.from("user_achievements").select("achievement_code, progress, target, unlocked_at").eq("user_id", uid).order("unlocked_at", { ascending: false, nullsFirst: false }).limit(30),
      ]);

    return {
      profile: profile.data,
      goals: goals.data,
      stats: stats.data,
      roles: (roles.data ?? []).map((r) => r.role),
      meals: meals.data ?? [],
      workouts: workouts.data ?? [],
      threads: threads.data ?? [],
      reminders: reminders.data ?? [],
      posts: posts.data ?? [],
      xp: xp.data ?? [],
      achievements: achievements.data ?? [],
    };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "moderator", "user"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role === "admin" && !data.grant) {
      throw new Error("You cannot remove your own admin role.");
    }
    const admin = await getAdminClient();
    if (data.grant) {
      const { error } = await admin.from("user_roles").insert({ user_id: data.userId, role: data.role });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await admin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    await writeAudit(admin, context.userId, data.grant ? "role.grant" : "role.revoke", "user", data.userId, {
      role: data.role,
    });
    return { ok: true };
  });

export const adminSetUserVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), isPublic: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { error } = await admin.from("profiles").update({ is_public: data.isPublic }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await writeAudit(admin, context.userId, "profile.visibility", "user", data.userId, { isPublic: data.isPublic });
    return { ok: true };
  });

export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["open", "reviewed", "dismissed", "all"]).default("open") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    let q = admin
      .from("post_reports")
      .select("id, post_id, reporter_id, reason, details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: reports, error } = await q;
    if (error) throw new Error(error.message);

    const postIds = [...new Set((reports ?? []).map((r) => r.post_id))];
    const { data: posts } = await admin
      .from("posts")
      .select("id, user_id, content, kind, is_hidden, created_at")
      .in("id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"]);
    const authorIds = [...new Set((posts ?? []).map((p) => p.user_id))];
    const { data: authors } = await admin
      .from("profiles")
      .select("id, display_name, username")
      .in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);

    const postBy = new Map((posts ?? []).map((p) => [p.id, p]));
    const authorBy = new Map((authors ?? []).map((a) => [a.id, a]));

    return (reports ?? []).map((r) => {
      const post = postBy.get(r.post_id) ?? null;
      return { ...r, post, author: post ? (authorBy.get(post.user_id) ?? null) : null };
    });
  });

export const adminModeratePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        postId: z.string().uuid(),
        reportId: z.string().uuid().optional(),
        action: z.enum(["hide", "unhide", "delete", "dismiss"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    if (data.action === "hide" || data.action === "unhide") {
      const { error } = await admin.from("posts").update({ is_hidden: data.action === "hide" }).eq("id", data.postId);
      if (error) throw new Error(error.message);
    } else if (data.action === "delete") {
      const { error } = await admin.from("posts").delete().eq("id", data.postId);
      if (error) throw new Error(error.message);
    }

    if (data.reportId) {
      const { error } = await admin
        .from("post_reports")
        .update({ status: data.action === "dismiss" ? "dismissed" : "reviewed" })
        .eq("id", data.reportId);
      if (error) throw new Error(error.message);
    }

    await writeAudit(admin, context.userId, `post.${data.action}`, "post", data.postId, {
      reportId: data.reportId ?? null,
    });
    return { ok: true };
  });

export const adminListAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const [{ data: rows }, { data: unlocks }] = await Promise.all([
      admin.from("achievements").select("*").order("sort_order"),
      admin.from("user_achievements").select("achievement_code").not("unlocked_at", "is", null),
    ]);
    const counts = new Map<string, number>();
    for (const u of unlocks ?? []) counts.set(u.achievement_code, (counts.get(u.achievement_code) ?? 0) + 1);
    return (rows ?? []).map((r) => ({ ...r, unlockCount: counts.get(r.code) ?? 0 }));
  });

export const adminUpdateAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        code: z.string().min(2).max(80),
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().min(2).max(400),
        xp_reward: z.number().int().min(0).max(5000),
        target: z.number().min(1).max(1_000_000),
        is_secret: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { error } = await admin
      .from("achievements")
      .update({
        title: data.title,
        description: data.description,
        xp_reward: data.xp_reward,
        target: data.target,
        is_secret: data.is_secret,
      })
      .eq("code", data.code);
    if (error) throw new Error(error.message);
    await writeAudit(admin, context.userId, "achievement.update", "achievement", data.code, { title: data.title });
    return { ok: true };
  });

export const adminListSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data, error } = await admin.from("app_settings").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ key: z.string().min(2).max(80), value: z.record(z.unknown()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { error } = await admin
      .from("app_settings")
      .update({ value: data.value as never, updated_by: context.userId })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    await writeAudit(admin, context.userId, "setting.update", "app_setting", data.key, data.value);
    return { ok: true };
  });

export const adminAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data: rows, error } = await admin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(clampLimit(data.limit, 100, 200));
    if (error) throw new Error(error.message);
    const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean) as string[])];
    const { data: actors } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", actorIds.length ? actorIds : ["00000000-0000-0000-0000-000000000000"]);
    const by = new Map((actors ?? []).map((a) => [a.id, a]));
    return (rows ?? []).map((r) => ({ ...r, actor: r.actor_id ? (by.get(r.actor_id) ?? null) : null }));
  });
