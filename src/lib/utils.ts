import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * fetch() with a hard timeout. The Gemini/Open Food Facts calls this wraps
 * have no built-in timeout, so a stalled upstream would otherwise hang the
 * request indefinitely instead of surfacing a timely, actionable error.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

/** True for a fetch()-level network failure or fetchWithTimeout's signal firing. */
export function isNetworkOrTimeoutError(err: unknown): boolean {
  if (err instanceof TypeError) return true; // fetch() network failure (offline, DNS, CORS)
  if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return true;
  }
  return false;
}

const NETWORK_ERROR_MESSAGE =
  "Unable to analyze because your internet connection is unavailable or too slow. Please try again.";

/**
 * Maps a caught error from an analysis/lookup call to a safe, specific,
 * user-facing message. Server functions already throw user-safe messages
 * (see ai-meal.functions.ts / ai-vision.functions.ts) for known failure
 * modes — this only needs to catch offline/timeout failures happening
 * client-side before falling back to whatever the server said. Logs the raw
 * error in dev only; never touches API keys or tokens.
 */
export function describeAnalysisError(err: unknown): string {
  if (import.meta.env.DEV) console.error("[analysis error]", err);
  if (typeof navigator !== "undefined" && navigator.onLine === false) return NETWORK_ERROR_MESSAGE;
  if (isNetworkOrTimeoutError(err)) return NETWORK_ERROR_MESSAGE;
  if (err instanceof Error && err.message) return err.message;
  return "Couldn't complete that. Please try again.";
}
