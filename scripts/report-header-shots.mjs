// Screenshots the header of each of the 9 HTML reports (shows "Run by: 23120398 – <ISO>")
// into docs/report-headers/<run>.png – evidence for the README / video.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const reports = path.resolve('reports');
const out = path.resolve('docs', 'report-headers');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const run of fs.readdirSync(reports).filter((d) => fs.existsSync(path.join(reports, d, 'index.html')))) {
  await page.goto(pathToFileURL(path.join(reports, run, 'index.html')).href);
  await page.getByText('Run by').first().waitFor();
  await page.screenshot({ path: path.join(out, `${run}.png`) });
  console.log(`${run}: ${await page.title()}`);
}
await browser.close();
