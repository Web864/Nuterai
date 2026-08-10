import { defineConfig, loadEnv, type UserConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";

// vite-plugin-pwa needs to be told nitro's actual client-asset output dir, or
// it globs/writes sw.js against Vite's default `dist` outDir instead — not
// what's actually deployed — shipping a service worker that precaches
// nothing (see docs/ARCHITECTURE.md's PWA section). Nitro itself picks its
// output preset from the hosting platform's own build-time env var (e.g.
// Vercel sets `VERCEL=1`) and `defaultPreset: "cloudflare-module"` below is
// only the fallback for unrecognized/local environments — so this has to
// mirror that same detection rather than assume one fixed preset.
const PWA_OUT_DIR = process.env.VERCEL ? ".vercel/output/static" : ".output/public";

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  const envDefine: Record<string, string> = {};
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  // The browser/Capacitor bundle can only ever read import.meta.env.VITE_* —
  // Vite statically inlines it at build time, there's no real process.env in
  // a WebView. Some hosts (e.g. this project's current Vercel config) only
  // have the unprefixed server-side names set, not duplicated VITE_ copies,
  // which left the client bundle with no Supabase URL/key at all and made it
  // throw at runtime. Fall back to the unprefixed names for the client build
  // too — but only these three public, publishable-safe values. Deliberately
  // never reads SUPABASE_SERVICE_ROLE_KEY here.
  const rawEnv = loadEnv(mode, process.cwd(), "");
  const publicFallbacks: Record<string, string | undefined> = {
    VITE_SUPABASE_URL: rawEnv.SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: rawEnv.SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: rawEnv.SUPABASE_PROJECT_ID,
  };
  for (const [key, value] of Object.entries(publicFallbacks)) {
    if (value && !(`import.meta.env.${key}` in envDefine)) {
      envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  const plugins = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    viteReact(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      filename: "sw.js",
      outDir: PWA_OUT_DIR,
      // The guarded wrapper in src/lib/pwa.ts is the only registrar.
      injectRegister: null,
      devOptions: { enabled: false },
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,woff2,png,svg,ico}"],
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // HTML navigations must never be served cache-first.
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "nutriai-pages",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ url, request }: { url: URL; request: Request }) =>
              url.origin === self.location.origin &&
              ["style", "script", "font", "image"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "nutriai-assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ];

  if (command === "build") {
    plugins.push(nitro({ defaultPreset: "cloudflare-module" }));
  }

  return {
    define: envDefine,
    ...(command === "build" && mode === "development"
      ? { environments: { client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } } } }
      : {}),
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
      ignoreOutdatedRequests: true,
    },
    server: { host: "::", port: 8080 },
    plugins,
  };
});
