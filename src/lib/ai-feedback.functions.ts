import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FeedbackInput = z
  .object({
    coachMessageId: z.string().uuid(),
    feedback: z.enum(["helpful", "not_helpful", "report"]),
    category: z
      .enum([
        "unsafe_advice",
        "incorrect_information",
        "offensive_inappropriate",
        "medical_concern",
        "other",
      ])
      .optional(),
    details: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.feedback === "report" && !value.category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a report reason." });
    }
  });

export const submitAiFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeedbackInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: message, error: messageError } = await context.supabase
      .from("coach_messages")
      .select("id, user_id, role")
      .eq("id", data.coachMessageId)
      .maybeSingle();

    if (
      messageError ||
      !message ||
      message.user_id !== context.userId ||
      message.role !== "assistant"
    ) {
      throw new Error("That AI response is no longer available for feedback.");
    }

    const { error } = await context.supabase.from("ai_content_feedback" as never).insert({
      user_id: context.userId,
      coach_message_id: data.coachMessageId,
      feedback_type: data.feedback,
      category: data.category ?? null,
      details: data.details || null,
    } as never);

    if (error) {
      console.error("[ai.feedback] submission failed", { code: error.code });
      throw new Error("We couldn't submit your feedback. Please try again.");
    }
    return { success: true as const };
  });
