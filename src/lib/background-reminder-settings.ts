import { Capacitor, registerPlugin } from "@capacitor/core";

interface BackgroundReminderSettingsPlugin {
  openAppDetailsSettings(): Promise<void>;
}

const BackgroundReminderSettings = registerPlugin<BackgroundReminderSettingsPlugin>(
  "BackgroundReminderSettings",
);

export async function openAndroidAppDetailsSettings(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return false;

  try {
    await BackgroundReminderSettings.openAppDetailsSettings();
    return true;
  } catch {
    return false;
  }
}
