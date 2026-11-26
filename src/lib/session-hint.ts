/**
 * Pre-paint hint that a Supabase session is probably stored in this browser.
 *
 * The landing page must be fully server-rendered for search engines, but a
 * signed-in user (especially in the Android app) should not see it flash
 * before the redirect to /dashboard. This inline script adds `has-session` to
 * <html> when a Supabase auth token exists in localStorage; CSS hides
 * `.landing-session-gate` (home page only) while it is set. The landing page removes the class if
 * the session turns out to be missing or expired.
 */
export const SESSION_HINT_CLASS = "has-session";

export const SESSION_HINT_SCRIPT = `try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&/^sb-.+-auth-token$/.test(k)){document.documentElement.classList.add("${SESSION_HINT_CLASS}");break}}}catch(e){}`;

export function clearSessionHint(): void {
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove(SESSION_HINT_CLASS);
  }
}
