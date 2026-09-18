import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { registerServiceWorker } from "../lib/pwa";
import { initializeNative } from "../lib/native";
import { DARK_THEME_COLOR, LIGHT_THEME_COLOR, THEME_INIT_SCRIPT } from "../lib/theme";

import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion/MotionProvider";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-8xl text-primary/20">404</p>
        <h1 className="mt-4 font-display text-3xl text-foreground">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elevated transition-organic hover:bg-primary-glow"
        >
          Back to NutriAI
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-foreground">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We couldn't load this page. Try again or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-organic hover:bg-primary-glow"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-organic hover:bg-secondary"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: LIGHT_THEME_COLOR },
      { name: "theme-color", media: "(prefers-color-scheme: light)", content: LIGHT_THEME_COLOR },
      { name: "theme-color", media: "(prefers-color-scheme: dark)", content: DARK_THEME_COLOR },
      { title: "NutriAI — Your Personal AI Health & Lifestyle Coach" },
      {
        name: "description",
        content:
          "NutriAI adapts to your body, goals, and lifestyle to create the perfect nutrition, fitness, and wellness plan — powered by AI.",
      },
      { name: "author", content: "NutriAI" },
      { property: "og:title", content: "NutriAI — Your Personal AI Health & Lifestyle Coach" },
      {
        property: "og:description",
        content:
          "NutriAI adapts to your body, goals, and lifestyle to create the perfect nutrition, fitness, and wellness plan — powered by AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@NutriAI" },
      { name: "twitter:title", content: "NutriAI — Your Personal AI Health & Lifestyle Coach" },
      {
        name: "twitter:description",
        content:
          "NutriAI adapts to your body, goals, and lifestyle to create the perfect nutrition, fitness, and wellness plan — powered by AI.",
      },
      { property: "og:image", content: "/og-image.jpg" },
      { name: "twitter:image", content: "/og-image.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Rendered server-side only — this shell is never re-executed during client
  // hydration, so it's the safe place to read live process.env at request
  // time and hand the browser client the two public (non-secret) Supabase
  // values it needs. Some hosts only expose configured env vars to the SSR
  // runtime, not the static build step that produces the JS bundle, so
  // relying solely on Vite's build-time import.meta.env.VITE_* isn't
  // reliable there — see src/integrations/supabase/client.ts.
  const publicEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Sets the .dark class on <html> before first paint, using the same
            storage key/resolution logic as ThemeProvider — prevents a
            flash of the wrong theme. Must run before body renders. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {publicEnv.SUPABASE_URL && publicEnv.SUPABASE_PUBLISHABLE_KEY && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__PUBLIC_ENV__=${JSON.stringify(publicEnv).replace(/</g, "\\u003c")};`,
            }}
          />
        )}
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

let rootLifecycleCount = 0;

/** TEMPORARY: remove after confirming the auth-driven global refresh loop is gone. */
function logGlobalRefreshTrigger(type: string, reason: string): void {
  const stack = new Error().stack?.split("\n").slice(2, 4).join("\n");
  console.info("[global.refresh.trigger]", {
    type,
    reason,
    route: typeof window === "undefined" ? "server" : window.location.pathname,
    timestamp: new Date().toISOString(),
    caller: stack,
  });
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const knownAuthUserId = useRef<string | null>(null);
  const authIdentityReady = useRef(false);

  useEffect(() => {
    rootLifecycleCount += 1;
    console.info("[query.client.lifecycle]", {
      state: "mounted",
      count: rootLifecycleCount,
      route: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    return () => {
      console.info("[query.client.lifecycle]", {
        state: "unmounted",
        count: rootLifecycleCount,
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
    };
  }, []);

  useEffect(() => {
    registerServiceWorker();
    void initializeNative(router);
  }, [router]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const previousUserId = knownAuthUserId.current;
      const nextUserId = session?.user.id ?? null;
      const identityChanged = authIdentityReady.current && previousUserId !== nextUserId;

      console.info("[auth.identity.compare]", {
        previousUserId,
        nextUserId,
        authEvent: event,
        identityChanged,
        timestamp: new Date().toISOString(),
      });

      // Supabase delivers this once when the listener subscribes. It seeds the
      // stable identity without turning an existing session into a refresh.
      if (event === "INITIAL_SESSION") {
        knownAuthUserId.current = nextUserId;
        authIdentityReady.current = true;
        return;
      }

      if (!authIdentityReady.current) {
        knownAuthUserId.current = nextUserId;
        authIdentityReady.current = true;
        return;
      }

      if (event === "TOKEN_REFRESHED" || (event === "SIGNED_IN" && !identityChanged)) {
        return;
      }

      knownAuthUserId.current = nextUserId;

      if (event === "SIGNED_IN" && identityChanged) {
        logGlobalRefreshTrigger("router.invalidate", "auth_identity_changed");
        router.invalidate();
        return;
      }

      if (event === "USER_UPDATED" && nextUserId) {
        logGlobalRefreshTrigger("queryClient.invalidateQueries", "auth_user_updated_profile_only");
        queryClient.invalidateQueries({ queryKey: ["profile", nextUserId] });
        return;
      }

      if (event === "SIGNED_OUT" && identityChanged) {
        logGlobalRefreshTrigger("router.invalidate", "auth_signed_out");
        queryClient.clear();
        router.invalidate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <ThemeProvider>
      <MotionProvider />
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <AppToaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
/** sonner's richColors palette is keyed off its own `theme` prop (defaults
 * to "light") independent of our .dark class — without wiring it to
 * resolvedTheme, success/error toasts would stay light-themed in dark mode. */
function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster position="top-center" richColors closeButton theme={resolvedTheme} />;
}
