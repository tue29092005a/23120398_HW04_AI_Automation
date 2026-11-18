---
name: playwright-ddt
description: Turn a feature's black-box test-case table (EP/BVA from HW02-style reports) into data-driven, multi-browser Playwright tests for the EShop SUT (or a similar web app), review the AI-generated script against a checklist, run it on Chromium/Firefox/WebKit with "Run by" HTML reports, and log known bugs. Use when asked to automate a new feature (e.g. "automate FR-05 search"), add test cases to an existing spec, or re-run/maintain the suite.
---

# Playwright data-driven automation (step by step, human-reviewed)

Work through the six steps **in order** and stop after each one so the student can
review it. Never write the whole suite in one go. Every step you take is logged
automatically in the Claude Code transcript; `scripts/extract-ai-log.mjs` turns it
into the AI Audit appendix.

Inputs you need (ask if missing): feature id + name, the test-case table (ID,
technique, partition, inputs, expected), the SUT source files for that feature,
student id for the report title.

## Step 1 – Analyse (no code yet)
Read the SUT source for the feature (page component, context/state, backend route).
Report back:
- selectors you will use, preferring `getByRole` / `getByText` scoped to `main`
  (labels without `htmlFor` → `label` + `xpath=following-sibling::input[1]`);
- how results are surfaced (`alert()` → dialogs, inline text, redirect, API only);
- state that does **not** survive `page.goto` (e.g. a cart held in React state);
- how to get isolated data (register a fresh user per test via API, count rows
  before/after via API, unique names);
- business rules the source violates – candidates for known bugs **and** for new
  test cases the table does not have yet.

## Step 2 – Data file
Write `data/<fr>-<name>.json` (and `data/<fr>/*.csv` fixtures when the input is a
file). One row per test case: `id`, `technique`, `partition`, `title`, inputs,
`expect`, optional `bugs: ["BUG-…"]`, optional `note`. Group rows by the code path
they need (e.g. `requestOtp`, `resetPassword`, `api`). No inline arrays in specs.

## Step 3 – Page objects
`pages/<Name>Page.ts`: locators in the constructor, small intention-revealing
methods. Navigation that must keep client state goes through in-app links.
Dialog handling goes through `captureDialog(page, action, { until })` from
`fixtures/test-fixtures.ts` (returns as soon as the alert or the success signal
appears – never a fixed sleep).

## Step 4 – Spec
`tests/<fr>-<name>.spec.ts`:
```ts
for (const tc of data.group) {
  test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ page, user }) => {
    markKnownBug((tc as { bugs?: string[] }).bugs);   // test.fail + issue link
    ...
  });
}
```
Use at least three assertion patterns (`toHaveURL`, `toHaveText`, `toHaveCount`,
`toHaveAttribute`, API status, `expect.poll` on server state, dialog text,
`expect.soft` for multi-property checks). Verify the server side, not only the UI.

## Step 5 – Run and debug
```bash
npx playwright test tests/<fr>- --project=chromium          # first pass
node scripts/inspect-results.mjs                             # status/duration/error per test
npx playwright test tests/<fr>- --project=webkit --repeat-each=4   # flakiness check
bash scripts/run-all.sh <fr>                                 # 3 browsers -> reports/<fr>-<browser>
```
For every failure decide: **SUT bug** (add `bugs` to the data row + entry in
`data/known-bugs.json`) or **script bug** (fix it, go to step 6).

## Step 6 – Human review checklist (commit after each fix)
| Check | Red flag |
|---|---|
| Selectors | `nth-child`, CSS classes as the only hook, unscoped text that also matches the header |
| Waits | `waitForTimeout`, a dialog wait that always runs to its timeout, `click()` on something that may not exist (assert visible first) |
| Assertions | UI-only check where the rule is enforced server-side; missing post-condition |
| Isolation | shared accounts across browsers, `addInitScript` that re-injects state you later try to clear, tests depending on order |
| Data | inline arrays/objects in the spec; expected values computed by the same code under test |
| Bugs | failing rows without `bugs`, or `bugs` rows that now pass (shown as "Bug no longer reproduces" in `reports/SUMMARY.md`) |

Commit message style: `fix(<fr>): <what was wrong in the AI script and why>`.
Do **not** add AI co-author trailers.

## Report title template (already in `playwright.config.ts`)
```ts
reporter: [
  ['html', { outputFolder: process.env.REPORT_DIR ?? 'playwright-report', open: 'never',
             title: `Run by: <STUDENT_ID> – ${new Date().toISOString()}` }],
  ['json', { outputFile: `${process.env.REPORT_DIR ?? 'playwright-report'}/results.json` }], // after html
],
metadata: { 'Run by': '<STUDENT_ID>', Timestamp: new Date().toISOString() },
```

## Finish
Run `node scripts/summarize-reports.mjs` and `node scripts/extract-ai-log.mjs`, then
summarise for the student: TC count per feature, passed / known-bug / unexpected,
fixes made in step 6 and why the AI missed them.
