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

  it("always targets the reset-password route for recovery emails", () => {
    expect(passwordResetRedirectUrl()).toBe(
      "https://nutriai-cyan.vercel.app/auth/callback?next=%2Fauth%2Freset-password",
    );
  });

  it("rejects unsafe next paths", () => {
    expect(safeAuthNext("//evil.example")).toBe("/dashboard");
    expect(safeAuthNext("https://evil.example")).toBe("/dashboard");
  });
});
