/**
 * Best-effort, content-free logging for health-safety triggers (see
 * src/lib/health-safety.ts and supabase/migrations/20260816120200_ai_safety_events.sql).
 * Never throws — a logging failure must not block the user-facing response.
 */
export type AiSafetyCategory = "crisis_input" | "medical_input" | "unsafe_output";

export async function logAiSafetyEvent(
  userId: string,
  endpoint: string,
  category: AiSafetyCategory,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ai_safety_events")
      .insert({ user_id: userId, endpoint, category });
    if (error) console.error("[logAiSafetyEvent] insert failed", endpoint, category, error.message);
  } catch (err) {
    console.error(
      "[logAiSafetyEvent] unexpected failure",
      endpoint,
      category,
      err instanceof Error ? err.message : err,
    );
  }
}
