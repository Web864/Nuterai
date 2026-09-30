import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils", () => ({
  fetchWithTimeout: requestMock,
  isNetworkOrTimeoutError: (error: unknown) => error instanceof Error,
}));

import { analyzeMealWithProviders } from "@/lib/ai-meal.functions";

const ERROR_MESSAGE = "Nutrition analysis is temporarily unavailable. Please try again.";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "x-request-id": "provider-request-id" },
  });
}

function geminiSuccess() {
  return response({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                items: [
                  {
                    name: "Banana",
                    serving_qty: 2,
                    serving_unit: "pieces",
                    calories_kcal: 210,
                    protein_g: 2.6,
                    carbs_g: 54,
                    fat_g: 0.8,
                    fiber_g: 6.2,
                  },
                ],
                confidence: 0.9,
              }),
            },
          ],
        },
      },
    ],
  });
}

function openAiSuccess() {
  return response({
    choices: [
      {
        message: {
          tool_calls: [
            {
              function: {
                arguments: JSON.stringify({
                  items: [
                    {
                      name: "Banana",
                      serving_qty: 2,
                      serving_unit: "pieces",
                      calories_kcal: 210,
                      protein_g: 2.6,
                      carbs_g: 54,
                      fat_g: 0.8,
                      fiber_g: 6.2,
                    },
                  ],
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
      },
    ],
  });
}

async function analyze(openAiApiKey?: string) {
  return analyzeMealWithProviders({
    description: "2 banana",
    geminiApiKey: "gemini-test-key",
    openAiApiKey,
    sleep: async () => {},
  });
}

describe("analyzeMealWithProviders", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("returns a valid first-attempt Gemini result", async () => {
    requestMock.mockResolvedValue(geminiSuccess());

    await expect(analyze()).resolves.toMatchObject({
      items: [expect.objectContaining({ name: "Banana", calories_kcal: 210 })],
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock.mock.calls[0][0]).toContain(":generateContent");
  });

  it("retries a 503 once and returns the next Gemini result", async () => {
    requestMock.mockResolvedValueOnce(response({ error: { code: 503 } }, 503));
    requestMock.mockResolvedValueOnce(geminiSuccess());

    await expect(analyze()).resolves.toMatchObject({
      items: [expect.objectContaining({ serving_qty: 2 })],
    });
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(
      requestMock.mock.calls.every((call) => String(call[0]).includes(":generateContent")),
    ).toBe(true);
  });

  it("exhausts repeated retryable 503 errors without producing nutrition", async () => {
    requestMock.mockResolvedValue(response({ error: { code: 503 } }, 503));

    await expect(analyze()).rejects.toThrow(ERROR_MESSAGE);
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-retryable Gemini 4xx response", async () => {
    requestMock.mockResolvedValue(response({ error: { code: 400 } }, 400));

    await expect(analyze()).rejects.toThrow(ERROR_MESSAGE);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("uses one existing OpenAI fallback only after Gemini retries are exhausted", async () => {
    requestMock.mockResolvedValueOnce(response({ error: { code: 503 } }, 503));
    requestMock.mockResolvedValueOnce(response({ error: { code: 503 } }, 503));
    requestMock.mockResolvedValueOnce(openAiSuccess());

    await expect(analyze("openai-test-key")).resolves.toMatchObject({
      items: [expect.objectContaining({ calories_kcal: 210 })],
    });
    expect(requestMock).toHaveBeenCalledTimes(3);
    expect(requestMock.mock.calls[2][0]).toContain("api.openai.com");
  });
});
