// Builds Bug_Report.md from docs/bugs.json (+ docs/created-issues.json once issues exist).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const bugs = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'bugs.json'), 'utf8'));
const issuesFile = path.join(root, 'docs', 'created-issues.json');
const issues = fs.existsSync(issuesFile) ? JSON.parse(fs.readFileSync(issuesFile, 'utf8')) : {};
const summary = fs.existsSync(path.join(root, 'reports', 'summary.json'))
  ? JSON.parse(fs.readFileSync(path.join(root, 'reports', 'summary.json'), 'utf8'))
  : [];

const link = (b) => (issues[b.id] ? `[#${issues[b.id].number}](${issues[b.id].url})` : '_pending_');
let md = '# Bug Report – HW04 Automation (23120398)\n\n';
md += 'All defects below are detected by **failing assertions** in the automated suite and reproduce on **Chromium, Firefox and WebKit**. ';
md += 'Each failing data row is tagged with its bug id (`"bugs": [...]` in `data/*.json`) and runs as `test.fail()`, so the HTML reports list it as an expected failure with the issue link.\n\n';
if (summary.length) md += `Evidence runs: ${summary.map((r) => `\`${r.run}\` (${r.startedAt})`).join(', ')}.\n\n`;
md += '## Summary\n\n| Bug ID | Feature | Severity | Title | Failing tests | HW04 issue | HW02 reference |\n|---|---|---|---|---|---|---|\n';
for (const b of bugs) {
  md += `| ${b.id} | ${b.feature} | ${b.severity} | ${b.title} | ${b.tests.join(', ')} | ${link(b)} | ${b.hw02 ? `[HW02](${b.hw02})` : '**new**'} |\n`;
}
md += `\nTotal: **${bugs.length}** bugs (${bugs.filter((b) => !b.hw02).length} new in HW04). Critical: ${bugs.filter((b) => b.severity === 'Critical').length}, High: ${bugs.filter((b) => b.severity === 'High').length}, Medium: ${bugs.filter((b) => b.severity === 'Medium').length}, Low: ${bugs.filter((b) => b.severity === 'Low').length}.\n\n`;
for (const b of bugs) {
  md += `## ${b.id} – ${b.title}\n\n`;
  md += `- **Feature / component:** ${b.feature} – ${b.component}\n- **Severity:** ${b.severity}\n- **GitHub issue:** ${link(b)}${b.hw02 ? ` (first reported in HW02: ${b.hw02})` : ' – new in HW04'}\n`;
  md += `- **Detected by:** ${b.tests.map((t) => `\`${t}\``).join(', ')} in \`tests/${b.spec}-*.spec.ts\`\n\n`;
  md += `**Steps to reproduce**\n\n${b.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`;
  md += `**Expected:** ${b.expected}\n\n**Actual:** ${b.actual}\n\n**Root cause:** ${b.cause}\n\n`;
  for (const kind of ['report', 'app']) {
    const f = `docs/bug-screenshots/${b.id}-${kind}.png`;
    if (fs.existsSync(path.join(root, f))) md += `![${b.id} ${kind}](${f})\n\n`;
  }
}
fs.writeFileSync(path.join(root, 'Bug_Report.md'), md);
console.log(`Bug_Report.md written (${bugs.length} bugs)`);
