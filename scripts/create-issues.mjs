// Creates one GitHub issue per bug in docs/bugs.json (needs `gh auth login`
// and the repo pushed, so the screenshot URLs resolve), then writes the issue
// links back into data/known-bugs.json and docs/created-issues.json.
// Usage: node scripts/create-issues.mjs [owner/repo]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const repo =
  process.argv[2] ??
  execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { cwd: root }).toString().trim();
const bugs = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'bugs.json'), 'utf8'));
const createdFile = path.join(root, 'docs', 'created-issues.json');
const created = fs.existsSync(createdFile) ? JSON.parse(fs.readFileSync(createdFile, 'utf8')) : {};
const raw = (f) => `https://raw.githubusercontent.com/${repo}/main/docs/bug-screenshots/${f}`;

for (const label of ['bug', 'known-bug', 'new-in-hw04', 'FR-03', 'FR-08', 'FR-16']) {
  try { execFileSync('gh', ['label', 'create', label, '--repo', repo, '--force'], { stdio: 'ignore' }); } catch {}
}

for (const b of bugs) {
  if (created[b.id]) { console.log(`${b.id}: already #${created[b.id].number}`); continue; }
  const body = [
    `**Bug ID:** ${b.id}  `,
    `**Feature:** ${b.feature}  `,
    `**Severity:** ${b.severity}  `,
    `**Component:** ${b.component}  `,
    `**Found by automated tests:** ${b.tests.map((t) => `\`${t}\``).join(', ')} in \`tests/${b.spec}-*.spec.ts\` (Chromium, Firefox, WebKit)  `,
    b.hw02 ? `**First reported in HW02:** ${b.hw02}` : '**New in HW04** (not in the HW02 report).',
    '',
    '### Steps to reproduce',
    ...b.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    '### Expected', b.expected, '',
    '### Actual', b.actual, '',
    '### Root cause (from source)', b.cause, '',
    '### Evidence',
    `Playwright HTML report (Run by: 23120398) – test \`${b.shot}\`:`, '',
    `![report](${raw(`${b.id}-report.png`)})`, '',
    'Screenshot taken by Playwright at the end of the test:', '',
    `![app](${raw(`${b.id}-app.png`)})`,
  ].join('\n');
  const labels = ['bug', b.feature, b.hw02 ? 'known-bug' : 'new-in-hw04'].join(',');
  const url = execFileSync('gh', ['issue', 'create', '--repo', repo, '--title', `[${b.id}] ${b.title}`, '--body', body, '--label', labels])
    .toString().trim();
  created[b.id] = { number: Number(url.split('/').pop()), url };
  fs.writeFileSync(createdFile, JSON.stringify(created, null, 2) + '\n');
  console.log(`${b.id}: ${url}`);
}

const kbFile = path.join(root, 'data', 'known-bugs.json');
const kb = JSON.parse(fs.readFileSync(kbFile, 'utf8'));
for (const [id, v] of Object.entries(created)) if (kb[id]) kb[id].issue = v.url;
fs.writeFileSync(kbFile, JSON.stringify(kb, null, 2) + '\n');
console.log('data/known-bugs.json now links the HW04 issues. Re-run scripts/run-all.sh so reports show them.');
