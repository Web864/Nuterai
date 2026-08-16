/**
 * Server-only account deletion logic. Never imported by client code — kept
 * out of account.functions.ts's top-level scope where possible, following
 * the same split as admin.functions.ts/admin.server.ts.
 */
import { getAdminClient, writeAudit } from "./admin.server";

// Tables explicitly cleaned up before auth.users is deleted, regardless of
// whether the ON DELETE CASCADE added in
// supabase/migrations/20260816120000_account_deletion_fk_fix.sql has been
// deployed yet — this makes deletion correct today even if that migration
// hasn't shipped, rather than silently depending on it. workout_plan_days
// and exercise_logs are NOT listed here: they already cascade correctly from
// workout_plans/workout_sessions via plan_id/session_id (ON DELETE CASCADE),
// so deleting those two root rows removes them too. Every other user-owned
// table already had a verified CASCADE straight from auth.users before this
// phase (see supabase/migrations/*.sql) and needs no explicit handling here.
const DEFENSIVE_CLEANUP_TABLES = [
  "reminders",
  "notifications",
  "workout_sessions",
  "workout_plans",
] as const;

export type DeleteAccountResult = { success: true } | { success: false; message: string };

export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  const admin = await getAdminClient();

  await writeAudit(admin, userId, "account.self_delete_requested", "user", userId);

  try {
    for (const table of DEFENSIVE_CLEANUP_TABLES) {
      const { error } = await admin
        .from(table as never)
        .delete()
        .eq("user_id", userId);
      if (error) {
        // Not fatal on its own — the auth.users delete below still removes
        // everything with a working CASCADE. Logged so a gap is visible.
        console.error(`[deleteAccount] cleanup failed for ${table}`, error.message);
      }
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      await writeAudit(admin, userId, "account.self_delete_failed", "user", userId, {
        error: deleteUserError.message,
      });
      console.error("[deleteAccount] auth.admin.deleteUser failed", deleteUserError.message);
      return {
        success: false,
        message: "We couldn't complete account deletion. Please try again or contact support.",
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await writeAudit(admin, userId, "account.self_delete_failed", "user", userId, {
      error: message,
    });
    console.error("[deleteAccount] unexpected failure", message);
    return {
      success: false,
      message: "We couldn't complete account deletion. Please try again or contact support.",
    };
  }
}
