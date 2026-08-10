/**
 * Native-shell bootstrap for the Capacitor Android build. No-ops entirely on
 * web (Capacitor.isNativePlatform() is false there), so this file never
 * changes browser/PWA behavior.
 */
import { Capacitor } from "@capacitor/core";
import type { AnyRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const isNative = Capacitor.isNativePlatform();

/** Custom-scheme deep link Google/Supabase redirect back into after native OAuth. */
export const OAUTH_REDIRECT_URL = "nutriai://auth-callback";

let initialized = false;

export async function initializeNative(router: AnyRouter): Promise<void> {
  if (!isNative || initialized) return;
  initialized = true;

  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
    import("@capacitor/app"),
  ]);

  // Status bar is brand dark-green, so use the "Dark" style — Capacitor's
  // naming refers to the background, and it renders light/white icon+text
  // content, which is what's legible against a dark bar.
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  await StatusBar.setBackgroundColor({ color: "#0F3D2E" }).catch(() => {});

  void setupNetworkStatus();

  // Hide the launch splash once the first real paint has happened, instead
  // of a fixed timer — avoids a blank-white flash while the SSR page loads
  // over the network.
  requestAnimationFrame(() => {
    void SplashScreen.hide();
  });

  // Hardware/gesture back button: go back through router history, or exit
  // the app when there's nowhere left to go (standard Android behavior).
  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      router.history.back();
    } else {
      void App.exitApp();
    }
  });

  // OAuth callback: Google refuses to authenticate inside an embedded
  // WebView, so native sign-in opens the system browser (see handleGoogle in
  // routes/auth.tsx) and Supabase redirects back to this custom scheme
  // instead of a web URL. Capture it here, exchange the code for a session,
  // and hand off to the router — this event never becomes a normal route.
  App.addListener("appUrlOpen", ({ url }) => {
    if (!url.startsWith(OAUTH_REDIRECT_URL)) return;
    void handleOAuthCallback(url, router);
  });
}

/**
 * React Query's default online detection (navigator.onLine + window
 * online/offline events) is unreliable inside an Android WebView, which
 * silently breaks its automatic refetch-on-reconnect behavior. Capacitor's
 * Network plugin reads the OS-level connection state instead.
 */
async function setupNetworkStatus(): Promise<void> {
  const [{ Network }, { onlineManager }] = await Promise.all([
    import("@capacitor/network"),
    import("@tanstack/react-query"),
  ]);

  onlineManager.setEventListener((setOnline) => {
    const subPromise = Network.addListener("networkStatusChange", (status) => {
      setOnline(status.connected);
    });
    return () => {
      void subPromise.then((sub) => sub.remove());
    };
  });

  const status = await Network.getStatus();
  onlineManager.setOnline(status.connected);
}

async function handleOAuthCallback(url: string, router: AnyRouter): Promise<void> {
  const { Browser } = await import("@capacitor/browser");
  await Browser.close().catch(() => {});

  const parsed = new URL(url.replace("nutriai://", "https://placeholder/"));
  const code = parsed.searchParams.get("code");
  const errorDescription = parsed.searchParams.get("error_description");

  if (errorDescription) {
    const { toast } = await import("sonner");
    toast.error(errorDescription);
    return;
  }
  if (!code) return;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const { toast } = await import("sonner");
    toast.error("Sign-in failed. Please try again.");
    return;
  }
  await router.navigate({ to: "/dashboard", replace: true });
}
