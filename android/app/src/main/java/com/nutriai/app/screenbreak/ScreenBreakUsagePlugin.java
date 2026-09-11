package com.nutriai.app.screenbreak;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Phase 2: Screen Break Reminder
// Feature is intentionally disabled in production. This bridge is dormant
// until ENABLE_SCREEN_BREAK_REMINDERS is enabled and Usage Access UX is approved.
@CapacitorPlugin(name = "ScreenBreakUsage")
public class ScreenBreakUsagePlugin extends Plugin {
    private long sessionStartedAtMs = 0L;
    private boolean monitoring = false;

    @PluginMethod
    public void isUsageAccessGranted(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasUsageAccess());
        result.put("unavailable", false);
        call.resolve(result);
    }

    @PluginMethod
    public void openUsageAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getActiveUsageDuration(PluginCall call) {
        JSObject result = new JSObject();
        if (!monitoring || sessionStartedAtMs <= 0L) {
            result.put("activeUsageMs", 0);
        } else {
            result.put("activeUsageMs", Math.max(0L, System.currentTimeMillis() - sessionStartedAtMs));
        }
        result.put("source", hasUsageAccess() ? "system" : "nutriai_foreground");
        call.resolve(result);
    }

    @PluginMethod
    public void resetUsageSession(PluginCall call) {
        sessionStartedAtMs = monitoring ? System.currentTimeMillis() : 0L;
        call.resolve();
    }

    @PluginMethod
    public void startUsageMonitoring(PluginCall call) {
        // Placeholder for efficient native UsageStats/session monitoring.
        // Do not add high-frequency polling or background network work here.
        monitoring = true;
        sessionStartedAtMs = System.currentTimeMillis();
        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopUsageMonitoring(PluginCall call) {
        monitoring = false;
        sessionStartedAtMs = 0L;
        call.resolve();
    }

    private boolean hasUsageAccess() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }
}