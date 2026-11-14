# NutriAI

![CI](https://github.com/Web864/nuterai/actions/workflows/ci.yml/badge.svg)

**Personalized AI meal planning, food logging and fitness coaching, built around the food people actually eat** (roti, biryani, chicken karahi and more, not just generic Western meals).

**Live demo:** https://nutriai-cyan.vercel.app

![NutriAI](public/og-image.jpg)

## What it does

- **AI meal analysis:** describe a meal in plain text and get a structured nutrition breakdown (calories, protein, carbs, fat, fibre) per item.
- **Food scanner:** photo-based analysis with AI vision, plus barcode scanning (ZXing).
- **Recipes and custom foods:** build recipes from ingredients with calculated nutrition, and save your own foods.
- **International food resolution:** matches familiar local dishes and portions, with a review step so users can correct estimates.
- **Personalized plans:** onboarding wizard (goals, biometrics, diet, activity, lifestyle) feeds calorie and macro targets (Mifflin-St Jeor).
- **AI workout generator and AI coach:** adaptive gym, home and no-equipment sessions, and a chat coach.
- **Reminders and screen breaks:** in-app reminder engine plus native local notifications on Android.
- **Gamification and community:** XP, streaks, achievements, posts, likes, comments and friends.
- **Admin dashboard:** role-based access with an audit log for every admin action.
- **Billing layer:** provider-agnostic subscription model (see [docs/BILLING.md](docs/BILLING.md)). Real Stripe checkout is not wired up yet, so paid plans are disabled in the UI.
- **Installable everywhere:** PWA with service worker, and an Android app via Capacitor.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | TanStack Start (React 19, Vite), TanStack Router and Query |
| UI | Tailwind CSS v4, Radix UI / shadcn components, Recharts, dark mode |
| Forms and validation | React Hook Form, Zod |
| Backend | Supabase (Postgres, Auth, Row Level Security), server functions |
| AI | Gemini API, with OpenAI and LongCat as fallback providers |
| Mobile | PWA (vite-plugin-pwa), Capacitor (Android) |
| Testing | Vitest (unit and integration), Postman collections |

## Engineering highlights

- **Security by default:** Row Level Security on every table, roles checked through a security-definer `has_role()` function, subscription writes limited to the service role, and a regression suite for IDOR and auth edge cases.
- **Auth:** email/password and Google OAuth using the PKCE flow.
- **Responsible AI use:** per-user AI rate limiting, a health-risk classifier with a crisis-safe response, and logging of AI safety events.
- **Reliable AI calls:** request timeouts, retries, provider fallback, and Zod-validated model output.
- **Database discipline:** 33 versioned SQL migrations in `supabase/migrations`.
- **Documentation:** architecture, billing, screen-break and Google Play release docs in [`docs/`](docs/).

## Getting started

Requires Node.js 20+ and npm, and a Supabase project.

```sh
git clone https://github.com/Web864/nuterai.git
cd nuterai
npm install
cp .env.example .env
npm run dev
```

Fill in `.env` with your Supabase URL and keys and a `GEMINI_API_KEY` (get one at https://aistudio.google.com/apikey). `OPENAI_API_KEY` and `LONGCAT_API_KEY` are optional fallback providers. Apply the SQL files in `supabase/migrations` to your project, in order.

Never commit `.env`. The service-role key is server-only.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview a production build locally |
| `npm run lint` | Lint and format check |
| `npm run format` | Auto-format with Prettier |
| `npm test` | Run all tests with Vitest |

The integration tests in `tests/integration` talk to a live Supabase project and need `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Use a separate test project, not production data.

## Project structure

```text
src/routes/             file-based routes (public pages, auth, authenticated app)
src/features/<domain>/  React Query hooks and domain components
src/lib/*.functions.ts  auth-checked server functions
src/lib/*.server.ts     server-only helpers
supabase/migrations/    database schema, RLS policies and RPCs
tests/                  unit and integration tests
android/                Capacitor Android project
docs/                   architecture, billing and release documentation
```

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Author

Built by **Rabia Naz**. [LinkedIn](https://www.linkedin.com/in/rabia-naz-01263b339) | [GitHub](https://github.com/Web864)