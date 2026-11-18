// Markdown -> PDF using marked + Playwright Chromium.
// Usage: node scripts/md-to-pdf.mjs Main_Report.md Bug_Report.md ...
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { marked } from 'marked';
import { chromium } from '@playwright/test';

const css = `
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #111; }
  h1 { font-size: 20pt; border-bottom: 2px solid #333; padding-bottom: 4px; }
  h2 { font-size: 15pt; margin-top: 22px; border-bottom: 1px solid #bbb; }
  h3 { font-size: 12.5pt; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9pt; page-break-inside: auto; }
  th, td { border: 1px solid #999; padding: 3px 5px; vertical-align: top; }
  th { background: #eee; }
  code { font-family: Consolas, monospace; font-size: 9pt; background: #f3f3f3; padding: 0 2px; }
  pre { background: #f6f6f6; padding: 8px; font-size: 8.5pt; white-space: pre-wrap; }
  img { max-width: 100%; border: 1px solid #ccc; margin: 4px 0; }
  blockquote { color: #333; border-left: 3px solid #ccc; margin: 4px 0; padding-left: 8px; }
`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const file of process.argv.slice(2)) {
  const abs = path.resolve(file);
  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${pathToFileURL(path.dirname(abs))}/">
    <style>${css}</style></head><body>${marked.parse(fs.readFileSync(abs, 'utf8'))}</body></html>`;
  const tmp = abs.replace(/\.md$/, '.tmp.html');
  fs.writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  const out = abs.replace(/\.md$/, '.pdf');
  await page.pdf({ path: out, format: 'A4', margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' }, printBackground: true });
  fs.unlinkSync(tmp);
  console.log(`${file} -> ${path.relative(process.cwd(), out)}`);
}
await browser.close();
