# NutriAI pricing recommendation (DRAFT, not live)

Status: **draft for the owner's approval.** Nothing here is charged. Paid plans
stay off (`app_settings.billing.paid_plans_enabled = false`) until the owner
approves prices and Stripe / Google Play Billing are connected (docs/BILLING.md).

Date checked: 26 November 2026.

## Who buys

Adults (18+) who want to lose weight, gain muscle or eat better, and who find
Western-only calorie apps a poor fit. Strongest wedge: people in Pakistan, India
and the Gulf diaspora who eat roti, daal and biryani and want photo or text
logging in plain words. Secondary: busy beginners who want one app for food,
workouts and a coach instead of three.

## Pricing model

**Freemium subscription** (monthly and annual), sold as an in-app upgrade on the
user's own account. A one-time price or source-code licence does not fit: every
Coach reply and photo scan costs money at the AI provider each month, so revenue
must recur too.

What Pro is today: **higher daily AI limits**, enforced in the database
(`check_ai_rate_limit`, migration `20261126130000`). Pro adds no separate
features yet. That makes Pro a thinner upgrade than MyFitnessPal Premium, so
price it below the big brands.

|                                                      | Free   | Pro    |
| ---------------------------------------------------- | ------ | ------ |
| AI Coach messages / day                              | 10     | 150    |
| AI photo food scans / day                            | 5      | 60     |
| AI text meal analyses / day                          | 30     | 150    |
| AI workout plans / day                               | 2      | 20     |
| Barcode lookups                                      | no cap | no cap |
| Targets, tracking, reminders, community, data export | yes    | yes    |

## Comparable products (third-party sources, checked 26 Nov 2026)

These are blog posts, not the vendors' own price pages (most apps show prices
only in-app). Several are written by competitors. Treat them as indicative.

| App                                      | Monthly          | Annual                          | Trial              | Source                                                                                                                            |
| ---------------------------------------- | ---------------- | ------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| MyFitnessPal Premium                     | $19.99           | $79.99                          | occasional 7-day   | [fitbudd.com](https://www.fitbudd.com/post/myfitnesspal-app-cost) (updated 21 Sep 2026)                                           |
| MyFitnessPal Premium+                    | $24.99           | $99.99                          | occasional 7-day   | same                                                                                                                              |
| Cal AI (photo AI tracker, closest match) | $9.99            | $29.99 (A/B tests up to $49.99) | 3-day              | [eesel.ai](https://www.eesel.ai/blog/cal-ai-pricing) (edited 24 Nov 2026)                                                         |
| Lose It! Premium                         | not stated       | about $39.99                    | promotional 7-day  | [nutrola.app](https://nutrola.app/en/blog/how-much-does-lose-it-cost-2026) (7 Apr 2026, competitor-written)                       |
| Fitia Premium                            | $19.99           | $59.99                          | 3-day, annual only | [nutriscan.app](https://nutriscan.app/blog/posts/is-fitia-free-pricing-premium-cost-6656b5340a) (30 Oct 2026, competitor-written) |
| HealthifyMe (India)                      | **not verified** | **not verified**                |                    | The page fetched failed. INR comparisons below are an estimate.                                                                   |

Range for AI-first trackers: **$30 to $60 a year**, $10 to $20 a month.

## Recommendation

|                                          | Launch price (first 90 days after Pro opens)           | Standard price                      |
| ---------------------------------------- | ------------------------------------------------------ | ----------------------------------- |
| Pro annual (default on the paywall)      | **$39.99 / year** for the first year, 7-day free trial | **$49.99 / year**, 7-day free trial |
| Pro monthly                              | **$9.99 / month**                                      | **$9.99 / month**                   |
| Pakistan (Play regional price)           | PKR 3,999 / year, PKR 999 / month                      | PKR 4,999 / year, PKR 999 / month   |
| India (estimate, unverified competitors) | INR 1,999 / year, INR 399 / month                      | INR 2,499 / year, INR 399 / month   |

Reasoning:

- **$49.99/yr standard** sits between Lose It! (~$39.99) and Fitia ($59.99),
  well under MyFitnessPal ($79.99), and inside Cal AI's tested range. Desi-food
  support and a coach that knows your log justify not being the cheapest.
- **$39.99 launch annual** (a 20% founding discount, locked for the first year)
  gives early users a reason to commit while Pro is only "more AI". Raise to the
  standard price for new subscribers after 90 days or once Pro gains features
  that Free lacks.
- **Monthly at $9.99** matches Cal AI and makes annual look like the obvious
  choice (58% cheaper per month at the standard price).
- **Trial on annual only**, so trial users convert into the plan that retains.
- Regional prices follow purchasing power; Play Console lets you set them per
  country. PKR figures are a starting point to test, not researched benchmarks.

## Unit economics (estimates, clearly marked)

**Payment fees** (from memory of published rates; verify in each dashboard):
Google Play takes **15%** of subscriptions. Stripe takes about **2.9% + $0.30**
per card charge in the US, plus about 1.5% for international cards and about
0.7% for Stripe Billing.

| Plan                   | Gross  | After fees (Play) | After fees (Stripe web, intl card, estimate) |
| ---------------------- | ------ | ----------------- | -------------------------------------------- |
| $49.99 / year          | $49.99 | $42.49            | about $46.2                                  |
| $39.99 / year (launch) | $39.99 | $33.99            | about $36.6                                  |
| $9.99 / month          | $9.99  | $8.49             | about $9.2                                   |

**AI cost per user, ESTIMATE.** Assumption: $0.0005 to $0.003 per AI call
(Gemini Flash-class model, short prompts, one image for scans). Check the real
per-call cost in Google AI Studio after the first week of production traffic.

| User type                        | AI calls / month | Estimated AI cost / month |
| -------------------------------- | ---------------- | ------------------------- |
| Typical Free user                | 60 to 150        | $0.03 to $0.45            |
| Typical Pro user                 | 300 to 600       | $0.15 to $1.80            |
| Pro user at every cap, every day | about 11,400     | $5.70 to $34 (worst case) |

Typical Pro users are comfortably profitable. A user maxing every cap daily
could cost more than they pay, so watch `ai_usage_events` per user for the first
month and lower the Pro caps in a new migration if the tail is expensive.

**Fixed costs** (docs/DEPLOY.md): about $31 to $37 a month (Workers Paid $5,
Supabase Pro $25, domain, email), so about $370 to $445 a year. Break-even on
fixed costs is about **11 to 13 annual Pro subscribers** at the launch price via
Play ($33.99 net each), before AI usage.

Support load: budget one inbox (support@) and a 2 business-day reply target.
Refunds on Play are handled by Google; on Stripe by you.

## Buyer-facing pricing copy

**Pricing page headline:** Simple, honest pricing.

**Subhead:** Start free with everything you need. Go Pro when you want more AI
coaching and scans every day.

**Free, $0, forever.** Personal calorie and macro targets, meal ideas from the
AI Coach, AI workout plans, water, sleep, weight and mood tracking, 10 Coach
messages and 5 photo scans a day, barcode lookups with no cap, and a full data
download whenever you want it. No credit card.

**Pro, $49.99 a year (that's $4.17 a month) or $9.99 monthly.** Everything in
Free, plus up to 150 Coach messages, 60 photo scans, 150 text meal logs and 20
workout plans a day. Try it free for 7 days on the annual plan. Cancel anytime.

**Launch offer (first 90 days):** Founding members get Pro annual for $39.99
for the first year.

Fine print: Prices in USD; local prices apply in some countries. Subscriptions
renew automatically until cancelled. Cancel in Google Play (Android) or in
Settings > Plan (web) at least 24 hours before renewal. Pro limits are fair-use
daily caps that reset on a rolling 24-hour window.
**The renewal and refund wording needs the owner's and a lawyer's sign-off and
must match the Terms before Pro goes live.**

## What is in the code now

- `src/lib/billing/plans.ts`: Pro $9.99/month, $49.99/year, 7-day annual trial,
  limits matching the database. The launch price ($39.99) and regional prices
  are **not** in code; they belong in Stripe and Play Console as introductory
  and regional prices.
- `/pricing` shows these as planned prices with "Not yet available" and no
  checkout. No Pro `Offer` is published in structured data until Pro is buyable.
