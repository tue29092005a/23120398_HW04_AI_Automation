// Collects bug evidence from the Chromium reports produced by run-all.sh:
//   docs/bug-screenshots/<BUG>-app.png     – the SUT screenshot Playwright took for the failing test
//   docs/bug-screenshots/<BUG>-report.png  – the HTML-report page of that test (error + "Run by: 23120398")
// Usage: node scripts/bug-evidence.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const bugs = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'bugs.json'), 'utf8'));
const outDir = path.join(root, 'docs', 'bug-screenshots');
fs.mkdirSync(outDir, { recursive: true });

const specDir = { fr03: 'fr03-chromium', fr08: 'fr08-chromium', fr16: 'fr16-chromium' };

function findTest(results, idPrefix) {
  let hit = null;
  const walk = (s) => {
    for (const spec of s.specs ?? []) if (spec.title.startsWith(`${idPrefix} [`)) hit = spec;
    for (const c of s.suites ?? []) walk(c);
  };
  results.suites.forEach(walk);
  return hit;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
for (const bug of bugs) {
  const dir = path.join(root, 'reports', specDir[bug.spec]);
  const results = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
  const spec = findTest(results, bug.shot);
  if (!spec) { console.warn(`${bug.id}: test ${bug.shot} not found`); continue; }
  const run = spec.tests[0].results.at(-1);
  const shot = run.attachments.find((a) => a.contentType === 'image/png' && a.path);
  if (shot && fs.existsSync(shot.path)) fs.copyFileSync(shot.path, path.join(outDir, `${bug.id}-app.png`));

  const url = 'file:///' + path.join(dir, 'index.html').replace(/\\/g, '/') + `#?testId=${spec.id}`;
  await page.goto(url);
  await page.getByText(bug.shot, { exact: false }).first().waitFor();
  await page.waitForTimeout(500); // let the report finish rendering the error block
  await page.screenshot({ path: path.join(outDir, `${bug.id}-report.png`), fullPage: false });
  console.log(`${bug.id}: ${bug.shot} -> ${shot ? 'app + ' : ''}report screenshot`);
}
await browser.close();
