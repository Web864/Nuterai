#!/usr/bin/env node
/**
 * Post-deploy smoke test. Read-only: it only sends GET requests and never
 * signs in, writes data or calls AI endpoints.
 *
 *   node scripts/smoke.mjs https://nutriai.app
 *
 * Exits 1 if any check fails. See docs/DEPLOY.md for when to run it.
 */
const base = (process.argv[2] || "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: node scripts/smoke.mjs <https://your-domain>");
  process.exit(2);
}
const expectHttps = base.startsWith("https://");
let failures = 0;
const ok = (msg) => console.log(`  ok   ${msg}`);
const bad = (msg) => {
  failures += 1;
  console.log(`  FAIL ${msg}`);
};
const check = (cond, msg) => (cond ? ok(msg) : bad(msg));

async function get(path) {
  const res = await fetch(base + path, { redirect: "manual" });
  return { res, body: await res.text() };
}

console.log(`Smoke test: ${base}\n`);

// 1. Home page, headers and SEO basics
{
  const { res, body } = await get("/");
  check(res.status === 200, `GET / returns 200 (got ${res.status})`);
  for (const h of ["x-frame-options", "x-content-type-options", "referrer-policy"]) {
    check(res.headers.has(h), `header ${h} present`);
  }
  if (expectHttps) check(res.headers.has("strict-transport-security"), "HSTS header present");
  const canonical = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  check(canonical === `${base}/`, `canonical is ${base}/ (got ${canonical})`);
  check(/<h1[\s>]/.test(body), "home page has an h1");
  check(/application\/ld\+json/.test(body), "home page has structured data");
  check(!/your-project-ref|lorem ipsum|TODO/i.test(body), "no placeholder text in home HTML");
}

// 2. robots.txt and sitemap.xml point at this origin
{
  const { res, body } = await get("/robots.txt");
  check(res.status === 200, "GET /robots.txt returns 200");
  check(
    body.includes(`Sitemap: ${base}/sitemap.xml`),
    "robots.txt references this origin's sitemap",
  );
  check(body.includes("Disallow: /dashboard"), "robots.txt blocks private routes");
}
let sitemapUrls = [];
{
  const { res, body } = await get("/sitemap.xml");
  check(res.status === 200, "GET /sitemap.xml returns 200");
  sitemapUrls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(sitemapUrls.length >= 10, `sitemap lists ${sitemapUrls.length} URLs`);
  check(
    sitemapUrls.every((u) => u.startsWith(base)),
    "every sitemap URL uses this origin (VITE_SITE_URL set correctly)",
  );
}

// 3. Every sitemap page renders, is indexable and self-canonical
for (const url of sitemapUrls) {
  const path = url.slice(base.length) || "/";
  const { res, body } = await get(path);
  const canonical = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(body);
  check(
    res.status === 200 && canonical === url && !noindex,
    `${path} 200, self-canonical, indexable`,
  );
}

// 4. Private and error routes
{
  const { body } = await get("/dashboard");
  check(/<meta name="robots" content="[^"]*noindex/.test(body), "/dashboard is noindex");
  const { res } = await get("/this-page-does-not-exist-smoke");
  check(res.status === 404, `unknown path returns 404 (got ${res.status})`);
  const llms = await get("/llms.txt");
  check(llms.res.status === 200 && llms.body.startsWith("# NutriAI"), "/llms.txt served");
  const del = await get("/delete-account");
  check(del.res.status === 200, "/delete-account public page (Google Play requirement)");
}

// 5. Client bundle carries no server secrets
{
  const { body } = await get("/");
  const scripts = [...body.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
  let leaked = false;
  for (const src of scripts.slice(0, 10)) {
    const js = await (await fetch(new URL(src, base))).text();
    // Real key shapes only: supabase-js itself contains the bare "sb_secret_"
    // prefix, so look for an actual key value or a service-role JWT payload.
    if (
      /sb_secret_[A-Za-z0-9_-]{16,}|c2VydmljZV9yb2xl|AIza[0-9A-Za-z_-]{30,}|\bsk-(?:proj-)?[A-Za-z0-9]{32,}/.test(
        js,
      )
    ) {
      leaked = true;
    }
  }
  check(!leaked, `no secret markers in ${Math.min(scripts.length, 10)} entry scripts`);
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll smoke checks passed.");
process.exit(failures ? 1 : 0);
