You are working in the repository Web864/nuterai (NutriAI): TanStack Start (React 19, Vite), Tailwind v4, shadcn/Radix UI, Supabase, Capacitor Android. The goal is to make the repo and the public landing page look professional to recruiters. The new README is already in place (added manually), so do not rewrite it.

Work on ONE new branch called `chore/cleanup-and-landing-polish`. Make one small commit per task, in the order below. Do not push to main. Do not add dependencies. Do not change database migrations, server functions, the lockfile, or any authenticated app page. Keep the existing visual language (dark emerald theme, `font-display` headings, `premium-glass`, `shadow-hero`, existing Tailwind tokens, and the existing `Button` and `Link` components).

Before starting: run `npm ci`, then record whether `npm run lint`, `npx vitest run tests/unit` and `npm run build` pass on the untouched repo. Do not fix unrelated failures; only record them.

# PART A: Repo cleanup

## Task 1: Add a unit-test script
In `package.json` add `"test:unit": "vitest run tests/unit"` next to the existing test scripts. Change nothing else in that file. Run `npm run test:unit` and report the result.

## Task 2: Remove the committed backup zip
First confirm nothing references it: `grep -rn "src.zip" . --exclude-dir=node_modules --exclude-dir=.git`. If nothing does, run `git rm src.zip` (a 5.5 MB backup of `src/`). If something references it, stop and report.

## Task 3: Remove duplicate asset files at the repo root
The root folder `nutriai-premium-assets/` and root file `tokens.json` are identical copies of `src/assets/nutriai-premium-assets/` and `src/assets/nutriai-premium-assets/tokens.json`. The app uses the copies under `src/assets` (see `src/styles.css`).
1. Run `diff -r nutriai-premium-assets src/assets/nutriai-premium-assets` and `diff tokens.json src/assets/nutriai-premium-assets/tokens.json`. If there is any difference, stop and report.
2. Search every config and script for references to the root copies: `package.json`, `vite.config.ts`, `capacitor.config.ts`, `components.json`, `tsconfig.json`, `assets/`, `android/`, `docs/`, `.github`. Leave `assets/` itself untouched (Capacitor's asset tool may use it).
3. Only if nothing references the root copies, run `git rm -r nutriai-premium-assets tokens.json`.
4. Run `npm run build`. If it fails because of this change, restore the files and report.

## Task 4: Fix .gitignore
The pattern `.env*` also ignores `.env.example`. Add this line directly after the `.env*` line:
```
!.env.example
```
Keep every other rule. Confirm with `git check-ignore -v .env.example` that it is no longer ignored, and that `.env` is still ignored.

## Task 5: Fix the documentation mismatch
`docs/ARCHITECTURE.md` says "Vite 7" but `package.json` uses `vite ^8.0.16`. Check the real version in `package.json` and `package-lock.json` and correct the doc. In the same file, confirm that the files named in the Domains table exist (`src/lib/nutrition.ts`, `ai-workout.functions.ts`, `ai-coach.functions.ts`, `ai-meal.functions.ts`, `ai-vision.functions.ts`) and fix any wrong name. Make no other wording changes.

## Task 6: Remove dead commented code
In `src/lib/ai-meal.functions.ts`, delete the commented-out line `// const MODEL = "gemini-flash-latest";`. Search `src/` for other clearly dead commented-out code of the same kind (leftover `// const ... =` lines from experiments) and remove only those. List what you removed in the report. Do not touch any logic.

## Task 7: Add CI with GitHub Actions
Create `.github/workflows/ci.yml`: runs on `push` and `pull_request` for `main`, on `ubuntu-latest` with Node 20 and npm caching. Steps: checkout, setup-node, `npm ci`, `npm run lint`, `npm run test:unit`. Do NOT run `tests/integration` in CI, because they need live Supabase secrets.

Run the same commands locally first. If lint or unit tests fail on code you did not change, still add the workflow but tell me which step fails and why. Do not make unrelated code changes to force a green build. Also try `npx tsc --noEmit`; add it as a CI step only if it passes locally.

Then add this badge to `README.md`, directly under the `# NutriAI` heading (only if it is not already there):
`![CI](https://github.com/Web864/nuterai/actions/workflows/ci.yml/badge.svg)`

Check that `README.md` mentions `npm run test:unit` and that the link targets it uses (`docs/BILLING.md`, `docs/ARCHITECTURE.md`, `public/og-image.jpg`) exist. If a README path is wrong, report it; do not rewrite the README.

# PART B: Landing page polish

All of this is in `src/routes/index.tsx` unless stated.

Problems found in the code:
1. "How it works" phones are blurry: `JourneyStep` (about line 468) crops a small raster sprite, `src/assets/how-it-works-cta.png` (894x625), into a 178x225 box with `backgroundPosition`. It shows only in dark mode (`showDarkVisuals`); light mode shows a plain icon card.
2. The bottom CTA section (about line 310) stretches `src/assets/cta1.png` (317x242) and `src/assets/cta2.png` (255x184) with `background-size: cover`, so it is heavily upscaled (dark mode only).
3. The hero `TrustPoint` says "Real / Results" (about line 158), a claim with no proof.
4. `SiteFooter` (about line 386) only says "NutriAI Copyright {year}"; nothing says who built the app.
5. `src/routes/__root.tsx` line 101 sets `twitter:site` to `@NutriAI`, which is not the author's account.
6. Every button leads to signup, so a recruiter cannot see the app without creating an account.

## Task 8: Replace the blurry phone images with crisp code-built mockups
Create `src/components/landing/PhoneMockup.tsx` (new folder) that draws a phone frame using only Tailwind and the existing design tokens (rounded bezel, status bar or notch, dark screen). No raster images; HTML/CSS and lucide-react icons already in the project only.

It takes a `screen` prop with three variants that mirror the real app:
- `onboarding`: greeting "Hi there! Let's get to know you" and three rows (Your goals, Dietary preferences, Activity level) with chevrons.
- `plan`: "Your Plan" heading with Meals / Workouts / Habits tabs, one meal card (for example "Grilled Chicken Bowl", 520 kcal, 32 g protein) and an "Add to plan" button.
- `progress`: "Your Progress" heading with Week / Month / Year tabs, a small bar chart from plain divs or inline SVG, and two stat tiles (for example "-2.5 kg" and a 7-day streak).

Use realistic sample text and do not present it as real user data or real results. Mark the mockup `aria-hidden="true"`; the step title and description stay as the accessible text.

Update `JourneyStep` to render `<PhoneMockup screen=... />` in both light and dark themes, and remove the `backgroundPosition` and `showDarkVisuals` props from it and its three call sites. The mockups must look good in light and dark mode at about 178 px wide, and must not overflow at 375 px viewport width.

## Task 9: Replace the blurry CTA background
In the bottom CTA section remove the `cta1`/`cta2` background layers. Use a crisp decorative background from the existing gradient tokens (for example `bg-gradient-hero` plus soft blurred `bg-primary/20` blobs, and a partly cropped `PhoneMockup` on the right from `md` and up, hidden on small screens). Keep the heading "Ready to feel your best?", the paragraph and the "Create my plan" button as they are. It must read well in light and dark mode.

Afterwards, search for remaining uses of `how-it-works-cta.png`, `cta1.png`, `cta2.png` and `journey-phones.png` in `src`, `tests`, `public` and config files. Delete each file only if nothing references it. Remove now-unused imports. If `.reference-art` in `src/styles.css` (about line 1283) is no longer used anywhere, remove that rule. Run the build.

## Task 10: Replace the vague trust point
Change the third `TrustPoint` from `label="Real" detail="Results"` to `label="Progress" detail="Tracking"`. Keep the icon and the other two points.

## Task 11: Add the author credit to the footer
In `SiteFooter` add "Built by Rabia Naz" with two small external links (lucide-react `Linkedin` and `Github` icons, or plain text links if the icons are not in the installed version):
- LinkedIn: https://www.linkedin.com/in/rabia-naz-01263b339
- GitHub: https://github.com/Web864

Use `target="_blank"` and `rel="noopener noreferrer"`, give each an `aria-label`, and style them like the existing footer links (`hover:text-foreground`). Centered and stacked on mobile, one row from `sm` up.

## Task 12: Remove the wrong Twitter handle
In `src/routes/__root.tsx` delete the `{ name: "twitter:site", content: "@NutriAI" }` entry. Leave every other meta tag unchanged.

## Task 13 (optional, only if the checks pass): "Try the demo" button behind an env flag
1. Read `src/routes/auth.tsx` (sign-in near line 92 uses `supabase.auth.signInWithPassword`) and `src/routes/_authenticated/route.tsx` to understand the redirect after login, including onboarding. Reuse that exact flow; do not invent a new auth path.
2. Add two optional client env vars, `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD`, to `.env.example` (empty) with the comment: "Optional. A throwaway demo account shown as a 'Try demo' button. Never use a real account."
3. Only when both are non-empty, show a third hero button "Try the demo" next to "See how it works", and a text link "Try the demo" in the footer. It signs in with those credentials and goes where a normal login goes. Show a loading state and a friendly `sonner` toast on failure. When the variables are empty, render nothing about the demo.
4. Add a code comment that these values are visible in the browser bundle, so they must belong to a disposable demo account with no real data.

If the redirect or onboarding flow makes this unsafe or complicated, skip the task and say why. I will create the demo account in Supabase and set the variables in Vercel myself.

# Final checks (Task 14)
- Check the landing page at 375 px, 768 px and 1280 px wide, in light and dark mode. If a headless browser such as Playwright is already installed, save screenshots of these six views to `/tmp/landing-shots/`. If none is available, do not install one; say that visual checks were not possible.
- Keep keyboard focus order and visible focus styles. Decorative elements get `aria-hidden="true"`. No horizontal scroll at 375 px. Any new animation uses `motion-safe:` variants.
- Run Prettier only on the files you created or edited. `npm run lint`, `npm run test:unit` and `npm run build` must be no worse than before you started.

# Rules
- Touch only: `package.json` (one script), `.gitignore`, `.github/workflows/ci.yml` (new), `README.md` (badge only), `docs/ARCHITECTURE.md`, `src/lib/ai-meal.functions.ts` and other clearly dead commented lines, `src/routes/index.tsx`, `src/routes/__root.tsx`, `src/components/landing/*` (new), `src/styles.css` (only the unused `.reference-art` removal), `.env.example` (Task 13 only), and the files removed in Tasks 2, 3 and 9.
- Never print, add or commit secrets. Do not create `.env`.
- One commit per task, with a clear message such as `chore: remove committed src.zip`.
- If a task is unsafe or a check fails, skip it and explain why instead of guessing.

# Out of scope (I will do these myself)
- Renaming the GitHub repository from `Nuterai` to `nutriai`.
- Creating the Supabase demo account and setting the Vercel variables.

# Final report
Give me: (1) the list of commits, (2) files changed or deleted, (3) results of `npm run lint`, `npm run test:unit` and `npm run build` before and after, (4) paths of any screenshots, (5) anything skipped and why, and (6) if Task 13 was done, the exact steps I must do myself (create a disposable Supabase user, complete its onboarding, set `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD` in Vercel, redeploy).
