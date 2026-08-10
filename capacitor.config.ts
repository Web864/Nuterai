import type { CapacitorConfig } from "@capacitor/cli";

// This app is server-rendered (TanStack Start + Nitro/Cloudflare Worker):
// route loaders, AI calls, and admin operations run as server functions that
// use secrets (SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY) that must never
// ship inside the app bundle. So this can't be a classic "bundle a static
// SPA" Capacitor app — it has to load the real deployed site, same as any
// other Capacitor wrapper around a full-stack/SSR web app.
//
// REQUIRED BEFORE BUILDING: replace `server.url` below with your actual
// deployed HTTPS origin (Cloudflare Workers URL or custom domain). Until you
// do, the app will try to load a placeholder that doesn't exist.
const PRODUCTION_URL = "https://nutriai-cyan.vercel.app";

const config: CapacitorConfig = {
  appId: "com.nutriai.app",
  appName: "NutriAI",
  // Copied into the APK as the local fallback shell (first paint before the
  // WebView finishes navigating to `server.url`, and a safety net if the
  // network is unreachable at launch). Must match vite.config.ts's Nitro
  // output directory.
  webDir: ".output/public",
  server: {
    url: PRODUCTION_URL,
    cleartextTraffic: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // Hidden manually from src/routes/__root.tsx once the app has painted,
      // so users never see a blank WebView flash while the SSR page loads
      // over the network.
      launchAutoHide: false,
      backgroundColor: "#0F3D2E",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F3D2E",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
