import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/native", () => ({
  isNative: false,
  OAUTH_REDIRECT_URL: "nutriai://auth-callback",
}));

import { authRedirectUrl, passwordResetRedirectUrl, safeAuthNext } from "@/lib/auth-redirects";

describe("authentication redirect URLs", () => {
  it("builds the production confirmation callback outside a browser", () => {
    expect(authRedirectUrl("/dashboard")).toBe(
      "https://nutriai-cyan.vercel.app/auth/callback?next=%2Fdashboard",
    );
  });

  it("marks recovery emails with a reset target and explicit recovery intent", () => {
    const url = new URL(passwordResetRedirectUrl());
    expect(`${url.origin}${url.pathname}`).toBe("https://nutriai-cyan.vercel.app/auth/callback");
    expect(url.searchParams.get("next")).toBe("/auth/reset-password");
    expect(url.searchParams.get("flow")).toBe("recovery");
  });

  it("rejects unsafe next paths", () => {
    expect(safeAuthNext("//evil.example")).toBe("/dashboard");
    expect(safeAuthNext("https://evil.example")).toBe("/dashboard");
  });
});
