import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils", () => ({
  fetchWithTimeout: requestMock,
  isNetworkOrTimeoutError: (error: unknown) => error instanceof Error,
}));

import { analyzeMealPhotoWithGemini } from "@/lib/ai-vision.functions";

const ERROR_MESSAGE = "Nutrition analysis is temporarily unavailable. Please try again.";
const IMAGE = "data:image/png;base64,aGVsbG8=";

function geminiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validPayload(items = [validItem()]) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify({ items, confidence: 0.9 }) }] } }],
  };
}

function validItem() {
  return {
    name: "Banana",
    serving_qty: 2,
    serving_unit: "pieces",
    calories_kcal: 210,
    protein_g: 2.6,
    carbs_g: 54,
    fat_g: 0.8,
    fiber_g: 6.2,
  };
}

async function analyze() {
  return analyzeMealPhotoWithGemini({
    imageDataUrl: IMAGE,
    hint: "two bananas",
    apiKey: "test-key",
  });
}

describe("analyzeMealPhotoWithGemini", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("returns a structured Gemini image review without another provider", async () => {
    requestMock.mockResolvedValue(geminiResponse(validPayload()));

    await expect(analyze()).resolves.toMatchObject({
      items: [expect.objectContaining({ name: "Banana", serving_qty: 2, calories_kcal: 210 })],
      confidence: 0.9,
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [url, init, options] = requestMock.mock.calls[0];
    expect(url).toContain(":generateContent");
    expect(url).not.toContain("openai");
    expect(url).not.toContain("longcat");
    expect(init.headers).toEqual(expect.objectContaining({ "x-goog-api-key": "test-key" }));
    expect(options).toEqual(
      expect.objectContaining({ timeoutMs: 28_000, label: "ai.meal_photo.gemini" }),
    );
  });

  it.each([401, 403, 429, 500, 502, 503])(
    "returns a controlled error for Gemini HTTP %i",
    async (status) => {
      requestMock.mockResolvedValue(geminiResponse({ error: { code: status } }, status));

      await expect(analyze()).rejects.toThrow(ERROR_MESSAGE);
      expect(requestMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["timeout", () => requestMock.mockRejectedValue(new Error("timeout"))],
    ["empty response", () => requestMock.mockResolvedValue(geminiResponse({ candidates: [] }))],
    [
      "malformed response",
      () =>
        requestMock.mockResolvedValue(
          geminiResponse({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }),
        ),
    ],
    [
      "invalid structured response",
      () =>
        requestMock.mockResolvedValue(
          geminiResponse(validPayload([{ name: "Banana", calories_kcal: "wrong type" }])),
        ),
    ],
  ])("returns a controlled error for %s", async (_, arrange) => {
    arrange();

    await expect(analyze()).rejects.toThrow(ERROR_MESSAGE);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});
