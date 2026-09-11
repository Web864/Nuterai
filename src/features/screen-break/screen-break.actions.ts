import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ENABLE_SCREEN_BREAK_REMINDERS, SCREEN_BREAK_FEATURE_DISABLED_MESSAGE } from "./screen-break.config";
import { validateScreenBreakSettings } from "./screen-break.utils";

const ScreenBreakActionSchema = z.object({
  action: z.literal("update_screen_break_settings"),
  enabled: z.boolean().optional(),
  interval_minutes: z.number().int().min(10).max(120).optional(),
  break_duration_seconds: z.number().int().min(10).max(300).optional(),
});

export type ScreenBreakCoachAction = z.infer<typeof ScreenBreakActionSchema>;

export function parseScreenBreakCoachCommand(message: string): ScreenBreakCoachAction | null {
  const text = message.toLowerCase();
  if (!/(screen break|eye break|visual break|phone break|mobile usage|look away)/.test(text)) return null;
  const interval = /(\d+)\s*(minute|minutes|min)/.exec(text);
  const duration = /(\d+)\s*(second|seconds|sec)/.exec(text);
  return {
    action: "update_screen_break_settings",
    enabled: /enable|turn on|remind/.test(text) ? true : /disable|turn off|pause/.test(text) ? false : undefined,
    interval_minutes: interval ? Number(interval[1]) : undefined,
    break_duration_seconds: duration ? Number(duration[1]) : undefined,
  };
}

export const applyScreenBreakCoachAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScreenBreakActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!ENABLE_SCREEN_BREAK_REMINDERS) {
      return { status: "disabled", message: SCREEN_BREAK_FEATURE_DISABLED_MESSAGE };
    }

    const safe = validateScreenBreakSettings({
      enabled: data.enabled,
      intervalMinutes: data.interval_minutes,
      breakDurationSeconds: data.break_duration_seconds,
    });

    const { error } = await context.supabase.from("screen_break_settings" as never).upsert({
      user_id: context.userId,
      enabled: safe.enabled,
      interval_minutes: safe.intervalMinutes,
      break_duration_seconds: safe.breakDurationSeconds,
    } as never, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { status: "updated" };
  });
