import { isNative, OAUTH_REDIRECT_URL } from "@/lib/native";

const PRODUCTION_ORIGIN = "https://nutriai-cyan.vercel.app";
const AUTH_CALLBACK_PATH = "/auth/callback";

export function safeAuthNext(next: string | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export function isPasswordRecoveryCallback(
  next: string | undefined,
  flow: string | undefined,
  type?: string,
): boolean {
  return next === "/auth/reset-password" || flow === "recovery" || type === "recovery";
}

export function authCallbackUrl(): string {
  if (isNative) return OAUTH_REDIRECT_URL;

  const origin = typeof window === "undefined" ? PRODUCTION_ORIGIN : window.location.origin;
  return new URL(AUTH_CALLBACK_PATH, origin).toString();
}

export function authRedirectUrl(next: string): string {
  const url = new URL(authCallbackUrl());
  url.searchParams.set("next", safeAuthNext(next));
  return url.toString();
}

export function passwordResetRedirectUrl(): string {
  const url = new URL(authRedirectUrl("/auth/reset-password"));
  url.searchParams.set("flow", "recovery");
  return url.toString();
}
