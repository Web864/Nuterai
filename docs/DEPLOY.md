# Deploying NutriAI

Recommended production host: **Cloudflare Workers (Workers Paid, $5/month)**,
with the database staying on **Supabase (Pro, $25/month)**.

## Why Cloudflare Workers

| Need                                               | How Workers covers it                                                                                                                                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The build already targets it                       | `vite.config.ts` sets `nitro({ defaultPreset: "cloudflare-module" })`, so `npm run build` outside Vercel emits a ready Worker in `.output/` (`.output/server/wrangler.json`, `.output/public/_headers`). No code changes.          |
| Verified locally                                   | On 26 Nov 2026 the production build ran under `wrangler dev` against a local Supabase: sign-up, onboarding, dashboard, settings, data export, Coach and meal-log error states, all 13 public pages and `scripts/smoke.mjs` passed. |
| AI calls are slow (Gemini/OpenAI, several seconds) | Waiting on `fetch()` does not count as CPU time, and HTTP requests have no duration limit while the client is connected.                                                                                                           |
| Cost                                               | Paid plan: $5/month minimum, 10M requests and 30M CPU-ms included, then $0.30 per extra million requests.                                                                                                                          |
| The Android app loads the live site                | Global edge, instant rollbacks (`wrangler rollback`), and versioned deployments with preview URLs to test before promoting.                                                                                                        |

Use **Workers Paid, not Free**. The Free plan caps CPU at 10 ms per request,
and server-rendering a React page can exceed that, which returns Error 1102.
Paid allows 30 s of CPU by default.

Runners-up: **Netlify** (also a Nitro preset; similar price, but function
timeouts are tighter for long AI calls) and **Render or Railway** with the
`node-server` preset (simple, but you run one region and pay for an always-on
instance, about $7 to $20/month).

Sources, checked 26 Nov 2026:
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[Supabase pricing](https://supabase.com/pricing),
[Supabase free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Estimated monthly running cost

| Item                                       | Cost                                     | Notes                                                                                                                                      |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Cloudflare Workers Paid                    | $5                                       | Covers up to 10M requests/month.                                                                                                           |
| Supabase Pro                               | $25                                      | Free projects pause after 7 days of low activity, which is not acceptable for production. Pro includes 100k MAU, 8 GB disk, 250 GB egress. |
| Domain                                     | about $1 ($10 to $20/year)               | Estimate; depends on the TLD and registrar. Cloudflare Registrar sells at cost.                                                            |
| Email for support@                         | $0 to $6                                 | Cloudflare Email Routing (free forwarding) or a Google Workspace / Zoho seat.                                                              |
| AI usage (Gemini primary, OpenAI fallback) | variable                                 | **Estimate only.** See docs/PRICING.md for the per-user model. Set a monthly budget cap in Google AI Studio and the OpenAI dashboard.      |
| Google Play developer account              | $25 one-time                             |                                                                                                                                            |
| **Fixed total**                            | **about $31 to $37/month** plus AI usage |                                                                                                                                            |

## One-time setup

### 1. Supabase production project

1. Upgrade the project to Pro (paid decision, owner).
2. Apply migrations and check nothing is pending:
   ```sh
   npx supabase@2 link --project-ref <ref>
   npx supabase@2 migration list --linked     # every local migration must show a remote timestamp
   npx supabase@2 db push --linked            # applies pending ones, including 20261126130000_plan_aware_ai_limits
   ```
3. Auth settings (Dashboard, Authentication):
   - Site URL: `https://<your-domain>`
   - Redirect allow-list: `https://<your-domain>/auth/callback`, `https://<your-domain>/**`, `nutriai://auth-callback`
   - Minimum password length: 8 (the sign-up form now asks for 8).
   - Email confirmations on, and a custom SMTP sender on your domain so mail is not rate-limited.
   - Google OAuth: add `https://<project-ref>.supabase.co/auth/v1/callback` in Google Cloud.

### 2. Cloudflare account and Worker

```sh
npm ci
npx wrangler@4 login
```

Build with the public values set (they are inlined into the browser bundle):

```sh
export VITE_SITE_URL="https://<your-domain>"
export VITE_SUPABASE_URL="https://<ref>.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="<publishable key>"
export VITE_SUPABASE_PROJECT_ID="<ref>"
npm run build
```

Set server secrets once (they persist across deploys):

```sh
cd .output/server
for k in SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_PROJECT_ID SUPABASE_SERVICE_ROLE_KEY GEMINI_API_KEY OPENAI_API_KEY; do
  npx wrangler@4 secret put "$k" -c wrangler.json
done
```

The generated Worker name is `web864-nuterai`. To use another name, pass
`--name nutriai` to every `wrangler` command.

### 3. Deploy

```sh
npx wrangler@4 versions upload -c .output/server/wrangler.json   # creates a preview URL, no traffic
node scripts/smoke.mjs https://<preview-url>
npx wrangler@4 versions deploy -c .output/server/wrangler.json   # promote to 100% when the smoke test passes
```

Rollback: `npx wrangler@4 rollback -c .output/server/wrangler.json`.

Because the Android app loads the live site, **always smoke-test the preview
URL before promoting**: a bad web deploy breaks every installed app at once.

### 4. Domain, DNS and HTTPS (owner approval needed: live DNS change)

1. Add the domain to Cloudflare (or buy it through Cloudflare Registrar) and
   point the registrar's nameservers to Cloudflare.
2. Workers & Pages > the Worker > Settings > Domains & Routes > Add Custom
   Domain: `<your-domain>` and `www.<your-domain>`. Cloudflare creates the DNS
   records and the TLS certificate automatically.
3. SSL/TLS: mode **Full (strict)**, Always Use HTTPS **on**, minimum TLS 1.2.
   The app already sends `Strict-Transport-Security`.
4. Redirect `www` to the apex (Rules > Redirect Rules, 301), or the other way
   round; pick one canonical host and keep `VITE_SITE_URL` equal to it.
5. Email: Email Routing (or your mail provider) for `support@<your-domain>`,
   plus SPF, DKIM and DMARC records for the Supabase SMTP sender.

### 5. Leaving Vercel

1. Deploy to Workers and verify on the custom domain.
2. Keep the Vercel project running, and add a permanent redirect from
   `nutriai-cyan.vercel.app/*` to `https://<your-domain>/:path*` (a `vercel.json`
   redirect rule), so links and search rankings carry over.
3. Rebuild the Android shell against the new domain:
   `NUTRIAI_WEB_URL=https://<your-domain> npx cap sync android`, bump
   `versionCode`, and upload to Play. Until users update, the old app keeps
   loading the Vercel URL, so keep the redirect in place for months.
4. Update the Play listing's privacy policy and account-deletion URLs.
5. Search Console: add the new domain, submit `/sitemap.xml`, use Change of
   Address from the Vercel property.

## After every deploy: smoke test

```sh
npm run smoke -- https://<your-domain>
```

It only sends GET requests. It checks status codes, security headers, the
canonical origin on every sitemap page, robots.txt, noindex on private routes,
a real 404, `/llms.txt`, the public `/delete-account` page, and that no secret
key shapes appear in the entry scripts.

Then do a manual pass with a test account: sign up, finish onboarding, log a
meal by text and by photo, send one Coach message, generate a workout plan,
download your data from Settings, and delete the test account.

## Monitoring (recommended, not set up)

- Workers > Observability: turn on Workers Logs (included on Paid).
- An uptime check on `/` and `/robots.txt` (Cloudflare Health Checks or a free
  external pinger).
- Error tracking (Sentry has a Cloudflare Workers SDK). Not wired up yet.
