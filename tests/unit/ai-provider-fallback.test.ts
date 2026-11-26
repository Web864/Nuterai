import { beforeEach, describe, expect, it, vi } from "vitest";

// Coach and workout generation use Gemini first. These tests cover the
// fallback path: when Gemini fails and an OpenAI key is configured, OpenAI is
// tried once; without an OpenAI key the Gemini failure surfaces unchanged.

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils", () => ({
  fetchWithTimeout: requestMock,
  isNetworkOrTimeoutError: () => false,
}));

import { generateCoachWithFallback } from "@/lib/ai-coach.functions";
import { generateWorkoutWithFallback } from "@/lib/ai-workout.functions";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const geminiUnavailable = () => json({ error: { code: 503, status: "UNAVAILABLE" } }, 503);

const coachMessages = [
  { role: "system", content: "system prompt" },
  { role: "user", content: "What should I eat after a workout?" },
];

const validPlan = {
  name: "Starter Strength",
  goal: "build muscle",
  difficulty: "beginner",
  days_per_week: 3,
  duration_weeks: 4,
  days: [
    {
      day_index: 1,
      title: "Full body A",
      focus: "full_body",
      estimated_minutes: 45,
      exercises: [{ name: "Goblet squat", muscle_group: "legs", sets: 3, reps: 10 }],
    },
  ],
};

beforeEach(() => {
  requestMock.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("AI Coach provider fallback", () => {
  it("returns the Gemini reply without calling OpenAI when Gemini succeeds", async () => {
    requestMock.mockResolvedValueOnce(
      json({ candidates: [{ content: { parts: [{ text: "Eat protein and carbs." }] } }] }),
    );

    const result = await generateCoachWithFallback({
      requestId: 1,
      messages: coachMessages,
      geminiApiKey: "gemini-test-key",
      openAiApiKey: "openai-test-key",
      supabaseContextDurationMs: 0,
      requestStarted: 0,
    });

    expect(result.provider).toBe("gemini");
    expect(result.fallbackUsed).toBe(false);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to OpenAI after Gemini returns 503 twice", async () => {
    requestMock
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(json({ choices: [{ message: { content: "Fallback reply." } }] }));

    const result = await generateCoachWithFallback({
      requestId: 2,
      messages: coachMessages,
      geminiApiKey: "gemini-test-key",
      openAiApiKey: "openai-test-key",
      supabaseContextDurationMs: 0,
      requestStarted: 0,
    });

    expect(result.provider).toBe("openai");
    expect(result.fallbackUsed).toBe(true);
    expect(result.reply).toBe("Fallback reply.");
    expect(String(requestMock.mock.calls[2][0])).toContain("api.openai.com");
  });

  it("surfaces the Gemini failure when no OpenAI key is configured", async () => {
    requestMock.mockResolvedValue(geminiUnavailable());

    await expect(
      generateCoachWithFallback({
        requestId: 3,
        messages: coachMessages,
        geminiApiKey: "gemini-test-key",
        supabaseContextDurationMs: 0,
        requestStarted: 0,
      }),
    ).rejects.toThrow("AI Coach is temporarily unavailable");
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("returns a safe error when both providers fail", async () => {
    requestMock
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(json({ error: { code: "server_error" } }, 500));

    await expect(
      generateCoachWithFallback({
        requestId: 4,
        messages: coachMessages,
        geminiApiKey: "gemini-test-key",
        openAiApiKey: "openai-test-key",
        supabaseContextDurationMs: 0,
        requestStarted: 0,
      }),
    ).rejects.toThrow("AI Coach is temporarily unavailable");
  });
});

describe("Workout generation provider fallback", () => {
  it("falls back to OpenAI and validates the plan when Gemini is unavailable", async () => {
    requestMock
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(
        json({
          choices: [
            {
              message: {
                tool_calls: [{ function: { arguments: JSON.stringify(validPlan) } }],
              },
            },
          ],
        }),
      );

    const result = await generateWorkoutWithFallback({
      requestId: 1,
      geminiApiKey: "gemini-test-key",
      openAiApiKey: "openai-test-key",
      userPrompt: "Generate a workout plan.",
      requestStarted: 0,
    });

    expect(result.provider).toBe("openai");
    expect(result.fallbackUsed).toBe(true);
    expect(result.plan.days[0].exercises[0].name).toBe("Goblet squat");
  });

  it("rejects a malformed OpenAI plan instead of saving it", async () => {
    requestMock
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(
        json({
          choices: [
            { message: { tool_calls: [{ function: { arguments: '{"name":"x","days":[]}' } }] } },
          ],
        }),
      );

    await expect(
      generateWorkoutWithFallback({
        requestId: 2,
        geminiApiKey: "gemini-test-key",
        openAiApiKey: "openai-test-key",
        userPrompt: "Generate a workout plan.",
        requestStarted: 0,
      }),
    ).rejects.toThrow();
  });

  it("does not call OpenAI when no OpenAI key is configured", async () => {
    requestMock.mockResolvedValue(geminiUnavailable());

    await expect(
      generateWorkoutWithFallback({
        requestId: 3,
        geminiApiKey: "gemini-test-key",
        userPrompt: "Generate a workout plan.",
        requestStarted: 0,
      }),
    ).rejects.toThrow();
    expect(requestMock.mock.calls.every((call) => !String(call[0]).includes("openai"))).toBe(true);
  });
});
