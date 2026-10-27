package com.nutriai.app;

import com.getcapacitor.BridgeActivity;
import com.nutriai.app.screenbreak.ScreenBreakUsagePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ScreenBreakUsagePlugin.class);
        registerPlugin(BackgroundReminderSettingsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}