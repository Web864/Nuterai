package com.nutriai.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Opens the official Android app-details page; OEM battery and auto-start labels vary by device. */
@CapacitorPlugin(name = "BackgroundReminderSettings")
public class BackgroundReminderSettingsPlugin extends Plugin {
    @PluginMethod
    public void openAppDetailsSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException error) {
            call.reject("Android app settings are unavailable on this device.");
        }
    }
}