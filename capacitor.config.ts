import type { CapacitorConfig } from "@capacitor/cli";

const PRODUCTION_URL = "https://nutriai-cyan.vercel.app";

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