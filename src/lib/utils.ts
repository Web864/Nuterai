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
type FetchWithTimeoutOptions = {
  timeoutMs?: number;
  label?: string;
};

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutOrOptions: number | FetchWithTimeoutOptions = 15000,
): Promise<Response> {
  const options =
    typeof timeoutOrOptions === "number" ? { timeoutMs: timeoutOrOptions } : timeoutOrOptions;
  const timeoutMs = options.timeoutMs ?? 15000;
  const label = options.label;
  const started = performance.now();
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  if (import.meta.env.DEV && label) {
    console.info(`[timing] ${label} start`, { timeoutMs });
  }

  try {
    const response = await fetch(input, { ...init, signal });
    if (import.meta.env.DEV && label) {
      console.info(`[timing] ${label} end`, {
        status: response.status,
        durationMs: Math.round(performance.now() - started),
      });
    }
    return response;
  } catch (err) {
    if (import.meta.env.DEV && label) {
      console.info(`[timing] ${label} failed`, {
        durationMs: Math.round(performance.now() - started),
        timeout: isNetworkOrTimeoutError(err),
      });
    }
    throw err;
  }
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

export function describeAiActionError(
  err: unknown,
  fallback = "The AI request failed. Please try again.",
): string {
  if (import.meta.env.DEV) console.error("[ai action error]", err);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You're offline. Reconnect and try again.";
  }
  if (isNetworkOrTimeoutError(err)) {
    return "The request timed out or the network dropped. Please try again.";
  }
  if (!(err instanceof Error) || !err.message) return fallback;

  const lower = err.message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many AI requests were sent. Please wait a moment and try again.";
  }
  if (lower.includes("jwt") || lower.includes("session") || lower.includes("auth")) {
    return "Your session expired. Please sign in again.";
  }
  if (lower.includes("not configured")) return err.message;
  if (lower.includes("malformed") || lower.includes("usable") || lower.includes("invalid")) {
    return err.message;
  }
  if (lower.includes("couldn't reach") || lower.includes("ai service")) return err.message;
  return err.message || fallback;
}
