// Reads reports/<feature>-<browser>/results.json (Playwright JSON reporter)
// and writes reports/SUMMARY.md + reports/summary.json.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const reportsDir = path.join(root, 'reports');
if (!fs.existsSync(reportsDir)) {
  console.error('No reports/ folder yet. Run scripts/run-all.sh first.');
  process.exit(1);
}

const rows = [];
for (const dir of fs.readdirSync(reportsDir).sort()) {
  const file = path.join(reportsDir, dir, 'results.json');
  if (!fs.existsSync(file)) continue;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = { run: dir, total: 0, passed: 0, knownBug: 0, failed: 0, fixedBug: 0, skipped: 0, startedAt: json.stats?.startTime };
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests) {
        r.total++;
        const status = t.results.at(-1)?.status;
        if (t.status === 'skipped') r.skipped++;
        else if (t.expectedStatus === 'failed' && status === 'failed') r.knownBug++;
        else if (t.expectedStatus === 'failed') r.fixedBug++; // passed although marked as bug
        else if (t.status === 'expected') r.passed++;
        else r.failed++;
      }
    }
    for (const s of suite.suites ?? []) walk(s);
  };
  for (const s of json.suites) walk(s);
  rows.push(r);
}

const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
let md = '# Test Execution Summary – Run by: 23120398\n\n';
md += `Generated: ${new Date().toISOString()}\n\n`;
md += '| Run (feature-browser) | Started (ISO) | Executed | Passed | Failed (known bug) | Failed (unexpected) | Bug no longer reproduces | Skipped |\n';
md += '|---|---|---:|---:|---:|---:|---:|---:|\n';
for (const r of rows) {
  md += `| ${r.run} | ${r.startedAt ?? ''} | ${r.total} | ${r.passed} | ${r.knownBug} | ${r.failed} | ${r.fixedBug} | ${r.skipped} |\n`;
}
md += `| **Total (${rows.length} runs)** | | **${sum('total')}** | **${sum('passed')}** | **${sum('knownBug')}** | **${sum('failed')}** | **${sum('fixedBug')}** | **${sum('skipped')}** |\n`;

fs.writeFileSync(path.join(reportsDir, 'SUMMARY.md'), md);
fs.writeFileSync(path.join(reportsDir, 'summary.json'), JSON.stringify(rows, null, 2));
console.log(md);
