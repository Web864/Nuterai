# Google Play Compliance Notes

Last reviewed: 2026-09-19.

## Product classification

NutriAI is an AI-powered nutrition and fitness assistant. The repository supports nutrition logging, meal and workout planning, weight and progress tracking, reminders, and AI Coach conversations. Recommended Play Console declarations should be reviewed under Health and Fitness, with Nutrition and Weight Management and Activity and Fitness selected only where they match the final store listing.

The app is general wellness software. It is not a medical device, does not access medical records, and does not use Health Connect, health sensors, activity recognition, location, contacts, SMS, call logs, microphone, or Accessibility Services.

## Android configuration

| Setting    | Repository value |
| ---------- | ---------------- |
| compileSdk | 36               |
| targetSdk  | 36               |
| minSdk     | 24               |
| App ID     | com.nutriai.app  |

CAMERA supports user-initiated food/photo scanning. POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, and VIBRATE support user-configured local reminders. INTERNET and ACCESS_NETWORK_STATE support the hosted app and connectivity handling. No Usage Access permission ships in this release. The dormant screen-break feature remains disabled unless a future explicit feature flag is enabled.

## Manual Play Console work

1. Complete App content, Data safety, Health apps declaration, Ads declaration, Content rating, Target audience, and App access.
2. Publish the Privacy Policy URL and the account deletion URL: https://nutriai-cyan.vercel.app/delete-account.
3. Declare health and fitness data and AI user content only as documented in GOOGLE_PLAY_DATA_SAFETY.md.
4. Configure Google Play Billing if Android sells digital Pro features. The repository has a server-side entitlement abstraction but no Play Billing client integration or product IDs.
5. Upload a signed AAB, update version code/name, complete closed testing, and verify the production package ID.
6. Review store copy and images for medical or guaranteed-outcome claims.

This document is technical guidance, not a guarantee of Google Play approval.
