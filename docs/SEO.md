# NutriAI SEO, AEO and GEO playbook

Last updated 2026-11-26. Covers keyword targets, what is built into the site, and the off-page work that code can't do.

## 1. Keyword targets

I couldn't get exact volume or difficulty numbers: there is no Ahrefs, Semrush or Google Ads account connected, and the free tools need sign-in. The tiers below come from reading the live search results (who ranks, and whether pages are app-store listings, listicles or real product pages). **Before spending money, check each keyword in Google Keyword Planner (free with a Google Ads account) and, after launch, in Search Console.**

How to read it: _Head_ terms have big volume but are dominated by Cal AI, MyFitnessPal, Lose It and large listicles. They are long-term goals. _Mid_ terms have decent volume and the results are mostly small apps and blog listicles, so a focused page can break in. _Long tail_ terms have lower volume, little competition and high intent. Win these first.

| Keyword                                                 | Tier                     | Competition (from SERP)                                          | Target page                         |
| ------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------- | ----------------------------------- |
| ai calorie tracker / ai calorie counter                 | Head                     | High (Cal AI, SnapCalorie, many new apps)                        | /features/ai-calorie-tracker        |
| ai meal planner                                         | Head                     | High (listicles, ChatGPT-style tools)                            | /features/ai-meal-planner           |
| ai nutritionist app                                     | Mid                      | Medium                                                           | /features/ai-nutrition-coach        |
| ai diet planner / ai diet plan generator                | Mid                      | Medium (listicles, small tools)                                  | /features/ai-meal-planner           |
| ai workout planner / ai workout generator               | Mid                      | Medium                                                           | /features/ai-workout-planner        |
| free ai meal planner                                    | Mid                      | Medium                                                           | /features/ai-meal-planner, /pricing |
| photo calorie counter / snap food calorie app           | Mid                      | Medium                                                           | /features/ai-calorie-tracker        |
| ai nutrition coach / ai diet coach                      | Mid                      | Low to medium                                                    | /features/ai-nutrition-coach        |
| ai meal planner and workout app                         | Long tail                | Low                                                              | / , /features                       |
| home workout plan no equipment ai                       | Long tail                | Low to medium                                                    | /features/ai-workout-planner        |
| calorie counter for pakistani food                      | Long tail                | **Low: results are mostly app-store pages, almost no web pages** | /features/desi-food-calorie-tracker |
| desi calorie tracker / indian food calorie tracker app  | Long tail                | Low                                                              | /features/desi-food-calorie-tracker |
| roti calories / biryani calories / daal chawal calories | Long tail, informational | Low to medium, high volume in PK and IN                          | future blog posts                   |
| desi diet plan for weight loss                          | Long tail, informational | Medium                                                           | future blog post                    |

**Biggest opening:** desi food. Global apps target Western packaged food, and searches for Pakistani and Indian food calories return mostly app-store listings. That is where NutriAI can rank first.

## 2. What the site now does (on-page, AEO, GEO)

- **Homepage is server-rendered.** Before this change the homepage sent crawlers an empty loading shell (no H1, no text) because it waited for the login check. It now always renders full content; signed-in users are hidden before paint and redirected to /dashboard.
- **Every menu item is its own URL:** /features, five feature pages, /how-it-works, /pricing, /faq, /about. No scroll-anchor menu items.
- **One H1 per page with the primary keyword**, clear H2s, unique titles (under 60 characters) and descriptions (110 to 160 characters), canonical, Open Graph and Twitter tags on every public page (`src/lib/seo.ts`).
- **JSON-LD:** Organization and WebSite site-wide; SoftwareApplication with offers, FAQPage, BreadcrumbList, HowTo (/how-it-works), ItemList (/features), AboutPage.
- **Visible FAQ sections** on home, features, each feature page, pricing and /faq, built from the same data as the FAQPage schema (`src/content/marketing.ts`), with answers in the HTML so answer engines can quote them.
- **Direct-answer summaries** under each H1: one or two sentences that state what the feature is. This is the text AI answers tend to lift.
- **/llms.txt** for AI assistants, **/sitemap.xml** with lastmod, **/robots.txt** blocking the logged-in app. AI crawlers are allowed on public pages on purpose.
- **Logged-in app is noindex** (`src/routes/_authenticated/route.tsx`) and disallowed in robots.txt; /auth is noindex.
- **Host-neutral:** no Vercel-only features. Set `VITE_SITE_URL` to the final domain at build time on the new host so canonicals, sitemap and llms.txt use it.
- **Copy stays general wellness:** a unit test fails if public copy makes medical claims, or if titles and descriptions exceed snippet limits.

## 3. Off-page action list (do these yourself)

In order of impact:

1. **Buy a real domain** (e.g. nutriai.app if you own it) before pushing SEO. Links and rankings earned on nutriai-cyan.vercel.app are lost when you move. Set `VITE_SITE_URL`, and 301-redirect the old domain.
2. **Google Search Console and Bing Webmaster Tools:** verify the domain, submit /sitemap.xml, request indexing for the homepage and the five feature pages. Bing also feeds ChatGPT search and Copilot.
3. **Google Play listing:** use "AI meal planner and calorie tracker" in the title or short description, link to the website. The Play page itself ranks and passes trust.
4. **Product launches:** Product Hunt, BetaList, Indie Hackers, Hacker News "Show HN". Each gives a backlink and early users.
5. **AI-tool and app directories:** There's An AI For That, Futurepedia, Toolify, AlternativeTo (list as an alternative to MyFitnessPal and Cal AI), SaaSHub. These pages are often what AI assistants cite.
6. **Get into the listicles:** email the authors of "best AI calorie tracker 2026" and "best AI meal planner" posts and ask to be reviewed; offer a free Pro account once it is live.
7. **Pakistani and Indian community channels:** Reddit (r/pakistan, r/india fitness threads, r/loseit when relevant and allowed), Facebook fitness groups, Pakistani tech blogs (ProPakistani, TechJuice) for a launch story.
8. **Short video:** TikTok, Instagram Reels and YouTube Shorts showing "snap a plate of biryani, get calories". Link to /features/desi-food-calorie-tracker.
9. **Founder profiles:** add the site to Rabia's LinkedIn, GitHub and any social profiles (consistent name "NutriAI"). Add those URLs to `sameAs` in `organizationSchema()`.
10. **Reviews:** ask early users for Play Store reviews; ratings show in search and AI answers.

## 4. Blog (recommended next, not built)

A blog is the best way to win the informational desi-food searches (roti calories, biryani calories, desi diet plan). Recommendation: start with 8 to 10 posts as Markdown files in the repo rendered by a `/blog/$slug` route, no CMS and no new database. Add each post to `PUBLIC_PAGES` so it joins the sitemap and llms.txt, give it Article schema, and link it to the matching feature page. Have nutrition numbers checked by a qualified person and keep the general-wellness disclaimer.

Starter topics:

- How many calories in roti, paratha and naan?
- Chicken biryani calories, and how to make a lighter plate
- A sample 1,800-calorie desi meal plan (general wellness)
- High-protein desi breakfasts
- How accurate are AI photo calorie counters?
- Home workouts with no equipment: a 3-day beginner plan
