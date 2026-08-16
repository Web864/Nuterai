import { defineConfig, loadEnv } from "vite";

// Minimal, standalone from vite.config.ts: the app's config pulls in
// tanstackStart/nitro/PWA plugins meant for a browser+SSR build, none of
// which apply to running plain Node test files against the live Supabase
// REST API. Only the "@" alias (matching vite.config.ts's resolve.alias) and
// .env loading are shared.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
    },
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
      testTimeout: 30000,
      hookTimeout: 30000,
    },
  };
});
