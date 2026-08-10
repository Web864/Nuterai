# Android release builds

## One-time setup

You need Android Studio (or the command-line SDK tools) and a JDK installed —
neither is available in this repo's dev environment, so these builds have to
run on your own machine.

1. Set `server.url` in `capacitor.config.ts` (repo root) to your real deployed
   HTTPS origin, then re-sync:
   ```sh
   npm run build
   npx cap sync android
   ```
2. Generate a release keystore (do this once, keep the file and passwords safe
   forever — losing it means you can never update the app on Play Store again):
   ```sh
   keytool -genkeypair -v -storetype JKS -keystore release.keystore.jks \
     -alias nutriai -keyalg RSA -keysize 2048 -validity 10000
   ```
   Put `release.keystore.jks` in `android/` (already gitignored).
3. Copy `android/keystore.properties.example` to `android/keystore.properties`
   and fill in the store/key passwords you just chose (also gitignored).

## Build commands

Run from the repo root.

**Debug APK** (unsigned test build, installable directly on a device):
```sh
npx cap sync android
cd android && ./gradlew assembleDebug
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK** (signed, if you want a direct-install file in addition to the AAB):
```sh
npx cap sync android
cd android && ./gradlew assembleRelease
# output: android/app/build/outputs/apk/release/app-release.apk
```

**Release AAB** (what you actually upload to Google Play):
```sh
npx cap sync android
cd android && ./gradlew bundleRelease
# output: android/app/build/outputs/bundle/release/app-release.aab
```

Both release tasks pick up signing automatically from `keystore.properties` if
present (see `app/build.gradle`); without it, the release build produces an
**unsigned** artifact.

## Before every Play Store upload

- Bump `versionCode` (integer, must increase every submission) and
  `versionName` (user-facing string) in `android/app/build.gradle`.
- Run `npm run build && npx cap sync android` first so the bundled fallback
  assets match what you're shipping.
