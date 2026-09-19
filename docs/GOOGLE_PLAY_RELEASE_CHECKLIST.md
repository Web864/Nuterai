# Google Play Release Checklist

## Android

- [ ] Confirm compileSdk 36, targetSdk 36, and minSdk 24.
- [ ] Build and sign the production AAB.
- [ ] Confirm package ID com.nutriai.app.
- [ ] Update versionCode and versionName.
- [ ] Verify no unused sensitive permissions ship.
- [ ] Test camera and notification permission denial paths.

## Play Console

- [ ] Complete App content and Health apps declaration.
- [ ] Complete Data safety using GOOGLE_PLAY_DATA_SAFETY.md.
- [ ] Enter the Privacy Policy URL.
- [ ] Provide https://nutriai-cyan.vercel.app/delete-account where account deletion information is requested.
- [ ] Provide App access instructions for reviewers if login is required.
- [ ] Complete Ads declaration, content rating, target audience, store listing, screenshots, icon, and feature graphic.
- [ ] Configure and test subscription products if Pro digital features are sold.
- [ ] Complete required closed testing before production release.

## Functional testing

- [ ] Sign-up, email confirmation, login, logout, and Google OAuth where enabled.
- [ ] Password reset.
- [ ] Account deletion and post-deletion logout.
- [ ] AI Coach, meal plan, workout plan, feedback/report submission, and safety responses.
- [ ] Meal/photo scan, reminders, timezone behavior, and notification denial.
- [ ] Subscription purchase, restore, cancellation, and expiry if billing is enabled.
- [ ] Offline and server-error paths.

Do not represent this checklist as a guarantee of Google Play approval.
