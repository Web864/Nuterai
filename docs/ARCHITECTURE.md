# NutriAI — architecture

Stack: TanStack Start (React 19 + Vite 7), Tailwind v4 design tokens, Supabase
(Postgres + Auth + storage) and the Gemini API directly (gemini-flash-latest).

## Layout

```text
src/routes/                 file-based routes
  index, about, pricing,    public marketing + SEO (per-route head(), JSON-LD)
  privacy, terms
  robots[.]txt, sitemap[.]xml  dynamically generated, absolute URLs
  auth, auth.callback       email/password + Google OAuth
  _authenticated/route.tsx  session gate; mounts reminder engine, daily check-in
  _authenticated/*          dashboard, log, workout, coach, scan, reminders,
                            community, achievements, settings, admin, u/$username
src/features/<domain>/      queries.ts (React Query) + domain components
src/lib/*.functions.ts      server functions (auth-checked RPC)
src/lib/*.server.ts         server-only helpers, blocked from client bundles
```

## Domains

| Domain | Data | Server AI |
| --- | --- | --- |
| Goals & onboarding | `profiles`, `user_goals` | — (Mifflin-St Jeor in `lib/nutrition.ts`) |
| Nutrition logging | `meal_entries`, `water_logs`, `weight_logs` | `ai-meal.functions.ts`, `ai-vision.functions.ts` |
| Workouts | `workout_plans`, `workout_plan_days`, `workout_sessions`, `exercise_logs` | `ai-workout.functions.ts` |
| Coach | `coach_threads`, `coach_messages` | `ai-coach.functions.ts` |
| Reminders | `reminders`, `notifications` | client engine in `features/reminders` |
| Community | `posts`, `post_likes`, `post_comments`, `friendships`, `post_reports` | — |
| Gamification | `user_stats`, `xp_events`, `achievements`, `user_achievements`, `streak_history`, `activity_events` | — |
| Admin | `audit_logs`, `app_settings` | — |
| Billing | `subscriptions`, `billing_events` | see `docs/BILLING.md` |

## Security model

- Every table has RLS; users reach only their own rows unless a row is public
  (`profiles.is_public`) or shared with an accepted friend.
- Roles live in `user_roles` and are checked through the security-definer
  `has_role()` function — never from client state.
- Admin server functions verify `has_role(admin)` with the caller's own
  RLS-scoped client *before* escalating to the service-role client, and write an
  `audit_logs` entry for every mutation.
- Subscription rows are readable by their owner (and admins) but writable only
  by the service role, so entitlements cannot be self-granted.
- Secrets are read inside server-function handlers only; the browser sees just
  the publishable key.

## Performance

- Automatic route code splitting; the ZXing barcode decoder (~500 kB) is
  dynamically imported only when the barcode tab starts a scan.
- Route loaders prime React Query caches (`ensureQueryData`) so the first paint
  has data; components read via `useSuspenseQuery`/`useQuery`.
- LCP hero image ships explicit dimensions with `fetchPriority="high"`; every
  other image is `loading="lazy" decoding="async"`.
- PWA: `vite-plugin-pwa` (`generateSW`), `NetworkFirst` for navigations,
  `CacheFirst` for hashed assets, registration blocked in dev/preview by
  `src/lib/pwa.ts`.

## Monitoring

- Root `errorComponent` logs to the console; `lib/error-capture.ts` captures
  unhandled errors/rejections so `server.ts` can recover a stack trace even
  when h3 swallows the original throw.
- AI and billing failures are logged server-side with provider detail; users get
  a safe message.
