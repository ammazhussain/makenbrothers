/**
 * Smoke test for the Maken Brothers site.
 *
 *   cd tests && npm install           # once
 *   node tests/smoke.mjs              # test the live site
 *   node tests/smoke.mjs http://localhost:8765
 *   node tests/smoke.mjs --shots out  # also write full-page screenshots to ./out
 *
 * Exits non-zero if anything fails. No test framework on purpose.
 *
 * package.json lives in tests/ rather than the repo root on purpose: a root
 * package.json makes the deploy host treat this as a Node project and run a
 * build, which fails and silently stops the site from updating.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const shotsIdx = args.indexOf('--shots');
const shots = shotsIdx === -1 ? null : args[shotsIdx + 1];
const base = (args.find(a => a.startsWith('http')) || 'https://makenbrothers.com').replace(/\/$/, '');

// Pages come from sitemap.xml so adding a page to the site adds it to the test.
const paths = [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m => new URL(m[1]).pathname);

// Double-encoded UTF-8 shows up as a Latin-1 lead byte followed by a C1/punctuation
// byte (the "Â·" bug), or as the replacement character.
const MOJIBAKE = /[ÂÃ][-¿]|�/;

const VIEWPORTS = { mobile: 390, tablet: 768, desktop: 1440 };

if (shots) mkdirSync(shots, { recursive: true });

const fail = [];
const browser = await chromium.launch({ channel: 'chrome' });

for (const [label, width] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  let at = '';
  const where = () => `${label} ${at}`;

  page.on('console', m => m.type() === 'error' && fail.push(`[console] ${where()} :: ${m.text()}`));
  page.on('pageerror', e => fail.push(`[jserror] ${where()} :: ${e.message}`));
  page.on('requestfailed', r => fail.push(`[netfail] ${where()} :: ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', r => r.status() >= 400 && fail.push(`[http${r.status()}] ${where()} :: ${r.url()}`));

  for (const p of paths) {
    at = p;
    const resp = await page.goto(`${base}${p}`, { waitUntil: 'networkidle', timeout: 45000 });
    if (!resp?.ok()) fail.push(`[page] ${where()} :: status ${resp?.status()}`);

    // Walk the page so GSAP ScrollTriggers fire; otherwise revealed content sits at opacity 0.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 120)));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 400));
    });

    if (shots) {
      const name = p === '/' ? 'index' : p.replace(/^\/|\.html$/g, '');
      await page.screenshot({ path: join(shots, `${name}-${label}.png`), fullPage: true });
    }

    const info = await page.evaluate(() => ({
      title: document.title,
      h1Count: document.querySelectorAll('h1').length,
      text: document.body.innerText,
      // alt="" on a decorative image is correct; only a missing attribute is a fault.
      noAlt: [...document.images].filter(i => i.getAttribute('alt') === null).map(i => i.src).slice(0, 5),
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
      stillHidden: [...document.querySelectorAll('section, .reveal, [data-reveal], [data-animate]')]
        .filter(el => getComputedStyle(el).opacity === '0').length,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
        ? `${document.documentElement.scrollWidth}px content in ${window.innerWidth}px viewport` : null,
    }));

    const mojibake = info.text.match(new RegExp(MOJIBAKE, 'g'));

    if (!info.title) fail.push(`[seo] ${where()} :: no <title>`);
    if (info.h1Count !== 1) fail.push(`[seo] ${where()} :: ${info.h1Count} <h1> tags, expected 1`);
    if (info.broken.length) fail.push(`[img] ${where()} :: broken ${info.broken.join(', ')}`);
    if (info.noAlt.length) fail.push(`[a11y] ${where()} :: ${info.noAlt.length} img with no alt attribute`);
    if (mojibake) fail.push(`[encoding] ${where()} :: mojibake ${JSON.stringify([...new Set(mojibake)])}`);
    if (info.stillHidden) fail.push(`[anim] ${where()} :: ${info.stillHidden} elements still opacity:0 after scrolling`);
    if (info.overflow) fail.push(`[layout] ${where()} :: horizontal overflow, ${info.overflow}`);
  }
  await ctx.close();
}

await browser.close();

const unique = [...new Set(fail)];
console.log(`${base} - ${paths.length} pages x ${Object.keys(VIEWPORTS).length} viewports`);
if (unique.length) {
  console.error(`\n${unique.length} problem(s):\n${unique.join('\n')}`);
  process.exit(1);
}
console.log('all checks passed');
