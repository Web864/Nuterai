import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Set server-side only, in src/routes/__root.tsx's shellComponent (never
// re-executed on the client — see the comment there for why: some hosts only
// expose configured env vars to the SSR runtime, not the static build step
// that produces this browser bundle, so import.meta.env.VITE_* alone isn't
// reliable there).
declare global {
  interface Window {
    __PUBLIC_ENV__?: { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string };
  }
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  // Preference order: (1) the value the SSR runtime injected into this exact
  // response's HTML (window.__PUBLIC_ENV__ — always live/correct, since it's
  // read from process.env at request time, not build time), (2) Vite's
  // build-time inlined import.meta.env.VITE_* (covers local dev and
  // Capacitor's local static webDir fallback shell, which never goes through
  // SSR), (3) process.env directly, for SSR itself before the shell has
  // rendered anything.
  const runtimeEnv = typeof window !== "undefined" ? window.__PUBLIC_ENV__ : undefined;
  const SUPABASE_URL =
    runtimeEnv?.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    runtimeEnv?.SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in .env.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      // auth-js defaults this to true, which makes _initialize() *also*
      // auto-exchange a `?code=` it finds on window.location the moment this
      // lazily-constructed client is first touched. Every code/token
      // exchange in this app already happens explicitly in
      // src/routes/auth_.callback.tsx (web) or src/lib/native.ts (Capacitor
      // deep link), so leaving this on races the auto-detect exchange
      // against the explicit one for the same single-use PKCE code —
      // whichever loses fails, silently, with no console output.
      detectSessionInUrl: false,
      // auth-js defaults to 'implicit', but email confirmation links from
      // this project redirect with a PKCE ?code= param. On a flow-type
      // mismatch, _getSessionFromURL() throws internally and _initialize()
      // silently swallows it (returns {error}, never logs or rethrows) — no
      // session is ever set, with nothing in the console to explain why.
      // Must match on both ends of the same flow: signUp()/signInWithOAuth()
      // need this set to persist a PKCE code_verifier at request time, and
      // the callback page needs it set to accept the code redirect.
      flowType: "pkce",
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
