# Screen Break Reminder Activation Checklist

The Screen Break / Mobile Usage Reminder system is implemented as dormant Phase 2 infrastructure. It is disabled by default and must remain disabled until Android Usage Access UX and Play Store policy impact are approved.

## Feature Flag

Set one of these to enable the feature in a future release:

- `VITE_ENABLE_SCREEN_BREAK_REMINDERS=true`
- `ENABLE_SCREEN_BREAK_REMINDERS=true`

Default is off. While off, NutriAI does not show Screen Break UI, request Usage Access, start monitoring, or schedule Screen Break notifications.

## Activation Steps

1. Enable the feature flag in the target environment.
2. Verify the Android native `ScreenBreakUsage` bridge implementation against real UsageStats behavior.
3. Expose `ScreenBreakSettingsCard` in the intended settings surface.
4. Test Usage Access permission explanation and settings deep link.
5. Test local notifications and action handling for Start Break, Snooze, and Skip.
6. Test background behavior with NutriAI foreground, backgrounded, closed, and after device lock.
7. Test reboot restoration and duplicate prevention.
8. Review Google Play policy requirements for `PACKAGE_USAGE_STATS` before release.
9. Release behind a staged rollout.

## Privacy Rules

Do not upload app names, raw UsageStats events, app-open history, or detailed phone usage timelines. Supabase stores only Screen Break preferences and lightweight reminder history events.
