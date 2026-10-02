import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/native", () => ({
  isNative: false,
  OAUTH_REDIRECT_URL: "nutriai://auth-callback",
}));

import {
  authRedirectUrl,
  isPasswordRecoveryCallback,
  passwordResetRedirectUrl,
  safeAuthNext,
} from "@/lib/auth-redirects";

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

  it("recognizes recovery callbacks when the email provides only the reset next path", () => {
    expect(isPasswordRecoveryCallback("/auth/reset-password", undefined)).toBe(true);
    expect(isPasswordRecoveryCallback("/auth/reset-password", "recovery")).toBe(true);
  });

  it("keeps normal callbacks on their safe destination", () => {
    expect(isPasswordRecoveryCallback(undefined, undefined)).toBe(false);
    expect(safeAuthNext(undefined)).toBe("/dashboard");
    expect(safeAuthNext("/some-route")).toBe("/some-route");
  });
  it("rejects unsafe next paths", () => {
    expect(safeAuthNext("//evil.example")).toBe("/dashboard");
    expect(safeAuthNext("https://evil.example")).toBe("/dashboard");
  });
});
