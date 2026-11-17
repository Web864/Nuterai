import { isNative, OAUTH_REDIRECT_URL } from "@/lib/native";

const PRODUCTION_ORIGIN = "https://nutriai-cyan.vercel.app";
const AUTH_CALLBACK_PATH = "/auth/callback";

// Browsers treat "\" like "/" in URLs and silently drop tab/newline characters, so
// "/\evil.example" and "/<tab>/evil.example" both resolve to "//evil.example" (another
// host). Reject them outright, then double-check by resolving against a dummy origin.
// eslint-disable-next-line no-control-regex
const UNSAFE_NEXT_CHARS = /[\\\u0000-\u001f\u007f]/;
const DUMMY_ORIGIN = "http://safe.invalid";

export function safeAuthNext(next: string | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (UNSAFE_NEXT_CHARS.test(next)) return fallback;
  try {
    if (new URL(next, DUMMY_ORIGIN).origin !== DUMMY_ORIGIN) return fallback;
  } catch {
    return fallback;
  }
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
