import type { CapacitorConfig } from "@capacitor/cli";

// The Android app is a shell around the live website. Set NUTRIAI_WEB_URL (or
// VITE_SITE_URL) to the production domain before `npx cap sync android` when
// the site moves; the fallback is the current production URL.
const PRODUCTION_URL = (
  process.env.NUTRIAI_WEB_URL ||
  process.env.VITE_SITE_URL ||
  "https://nutriai-cyan.vercel.app"
).replace(/\/+$/, "");

const config: CapacitorConfig = {
  appId: "com.nutriai.app",
  appName: "NutriAI",

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

    LocalNotifications: {
      smallIcon: "ic_stat_nutriai",
      iconColor: "#0F3D2E",
      sound: "default",
    },
  },
};

export default config;
