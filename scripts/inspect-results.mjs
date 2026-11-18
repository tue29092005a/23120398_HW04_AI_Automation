// Quick per-test view of a Playwright JSON report: node scripts/inspect-results.mjs <results.json>
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2] ?? 'playwright-report/results.json', 'utf8'));
const walk = (s) => {
  for (const sp of s.specs ?? []) for (const t of sp.tests) {
    const x = t.results.at(-1);
    const err = (x?.error?.message ?? '').replace(/\x1b\[\d+m/g, '').split('\n').slice(0, 3).join(' | ').slice(0, 160);
    console.log(`${x?.status.padEnd(8)} exp=${t.expectedStatus.padEnd(6)} ${String(x?.duration).padStart(6)}ms  ${sp.title.slice(0, 55).padEnd(55)} ${err}`);
  }
  for (const c of s.suites ?? []) walk(c);
};
r.suites.forEach(walk);
