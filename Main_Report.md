# HW04 – AI Automation Testing: Main Report

| | |
|---|---|
| Student ID | 23120398 |
| SUT | EShop – https://github.com/ttbhanh/eshop-sut (backend `:3000`, web `:5173`, admin `:5174`) |
| Tools | Playwright 1.65 (TypeScript), Playwright HTML reporter, Claude Code (model `claude-opus-5-5`) |
| Browsers | Chromium, Firefox, WebKit |
| Source of test cases | HW02 report `23120398_HW02_AI_DomainTesting_100/Main_Report.md` (EP + BVA tables) |
| Repository | https://github.com/tue29092005a/23120398-HW04-Automation |

## 1. Scope

The same three web features as HW02 (Pool D / FR-20 mobile is out of scope for HW04):

| Pool | Feature | HW02 TCs | Automated in HW04 | New in HW04 |
|---|---|---:|---:|---|
| A | **FR-03** Forgot password + OTP reset (two steps) | 36 | **34** | – (TC25 code audit and BVA11 merged, see §6) |
| B | **FR-08** Checkout | 12 | **15** | TC08, TC09, TC10 (UI level) |
| C | **FR-16** Import products from CSV (admin) | 11 | **15** | TC09, TC10, TC11, TC12 |
| | **Total** | 59 | **64** | 7 |

Every feature has ≥ 12 automated test cases; every test case runs on 3 browsers → **192 test executions in 9 browser runs** (3 features × 3 browsers), each with its own HTML report.

## 2. Project layout

```
playwright.config.ts        3 projects, HTML title "Run by: 23120398 – <ISO timestamp>", metadata, json results
fixtures/test-fixtures.ts   fresh user per test (API register), loginViaUi, adminPage, captureDialog, markKnownBug
pages/                      ForgotPasswordPage, ShopPages (Home/ProductDetail/Cart/Checkout), AdminImportPage
data/
  fr03-forgot-password.json  34 rows grouped by code path (requestOtp, resetPassword, uiChecks, api, sweep)
  fr08-checkout.json         15 rows (cartTotals, cartEdits, checkoutFlows, access, apiTampering)
  fr16-import.json           manifest: 15 rows -> CSV fixture + expected outcome
  fr16/*.csv, *.txt          12 real input files (valid, quoted comma, price 0/-10000/0.01, header-only ...)
  known-bugs.json            bug id -> title + issue link (used for test.fail annotations)
tests/                      fr03-forgot-password.spec.ts, fr08-checkout.spec.ts, fr16-csv-import.spec.ts
scripts/                    run-all.sh (9 reports), summarize-reports.mjs, inspect-results.mjs,
                            bug-evidence.mjs, create-issues.mjs, extract-ai-log.mjs
reports/<feature>-<browser>/ 9 Playwright HTML reports (+ results.json), reports/SUMMARY.md
.claude/skills/playwright-ddt/SKILL.md   reusable Agent Skill
```

**Data-driven:** specs contain no test data; each spec loops over a JSON group
(`for (const tc of data.resetPassword) test(\`${tc.id} …\`)`). FR-16 rows point to real CSV
files that are uploaded with `setInputFiles`.

**Known bugs:** a data row with `"bugs": ["BUG-…"]` calls `markKnownBug()` →
`test.fail()` + an `issue` annotation with the bug title and GitHub link. The report then
separates *passed*, *expected failure (known bug)* and *unexpected failure*; a known bug that
stops reproducing shows up as a failure ("expected to fail, but passed").

**Isolation:** the SUT stores everything in one SQLite file. Each test registers its own
user through `POST /api/register` (FR-03 changes passwords, FR-08 creates orders), FR-16
measures product-count deltas and checks the *new* product ids only, and the suite runs with
`workers: 1`.

## 3. Assertion patterns used (≥ 3 per feature)

| Pattern | FR-03 | FR-08 | FR-16 |
|---|:-:|:-:|:-:|
| `toHaveURL` (navigation / redirect) | ✓ TC01, TC17 | ✓ TC02 | |
| `toHaveText` / `toContainText` | ✓ step indicator | ✓ totals, line subtotals | ✓ result message, preview, errors |
| `toBeVisible` / `toHaveCount` | ✓ OTP banner, password inputs | ✓ rows, empty cart | ✓ admin table row, preview |
| `toHaveAttribute` | ✓ `type="password"` | | ✓ `accept=".csv"` |
| `toHaveJSProperty` (HTML5 validity) | ✓ `validity.valueMissing` | | |
| `not.toBeEditable` / `toBeDisabled` | | ✓ total field | ✓ import button |
| Dialog text (`alert()` captured) | ✓ all step-2 rows | | |
| API status / server state | ✓ login with new password, `/reset-password` | ✓ `/orders/my-orders`, `/checkout` | ✓ `/products` delta, 401/403 |
| `expect.poll` | | ✓ order appears | ✓ product count |
| `expect.soft` | ✓ TC18 (20 samples), TC23 (7 chars) | ✓ TC01 multi-check | |

## 4. Process – AI step by step, then human review

Each feature went through the same six steps (now packaged as the
`playwright-ddt` skill): **(1) analyse** the SUT source and list selectors / rules →
**(2) data** file from the HW02 table → **(3) page objects** → **(4) spec** →
**(5) run & debug** on Chromium, then Firefox/WebKit (with `--repeat-each=4` for
flakiness) → **(6) review & fix**, committing every fix. The full prompt/output log is in
`AI_Audit_Report.md`; the commit history is in `Git_Commit_Log.txt`.

## 5. Execution results

Source: `reports/SUMMARY.md` (generated from the 9 `results.json` files).

| Feature | Test cases automated | Browser runs | Executed (TC × browsers) | Passed | Failed – known bug (`test.fail`) | Failed – unexpected | Bugs found |
|---|---:|---:|---:|---:|---:|---:|---:|
| FR-03 Forgot password + OTP | 34 | 3 | 102 | 57 | 45 | 0 | 5 |
| FR-08 Checkout | 15 | 3 | 45 | 24 | 21 | 0 | 4 |
| FR-16 CSV import (admin) | 15 | 3 | 45 | 24 | 21 | 0 | 5 |
| **Total (3 features)** | **64** | **9** | **192** | **105** | **87** | **0** | **14** (13 from HW02 re-confirmed + 1 new) |

Per run (from `reports/SUMMARY.md`):

| Run | Report title (ISO timestamp) | Executed | Passed | Known bug | Unexpected |
|---|---|---:|---:|---:|---:|
| [fr03-chromium](reports/fr03-chromium/index.html) | Run by: 23120398 – 2026-11-18T03:28:27.518Z | 34 | 19 | 15 | 0 |
| [fr03-firefox](reports/fr03-firefox/index.html) | Run by: 23120398 – 2026-11-18T03:29:21.371Z | 34 | 19 | 15 | 0 |
| [fr03-webkit](reports/fr03-webkit/index.html) | Run by: 23120398 – 2026-11-18T03:31:36.551Z | 34 | 19 | 15 | 0 |
| [fr08-chromium](reports/fr08-chromium/index.html) | Run by: 23120398 – 2026-11-18T03:32:56.392Z | 15 | 8 | 7 | 0 |
| [fr08-firefox](reports/fr08-firefox/index.html) | Run by: 23120398 – 2026-11-18T03:33:54.478Z | 15 | 8 | 7 | 0 |
| [fr08-webkit](reports/fr08-webkit/index.html) | Run by: 23120398 – 2026-11-18T03:35:26.402Z | 15 | 8 | 7 | 0 |
| [fr16-chromium](reports/fr16-chromium/index.html) | Run by: 23120398 – 2026-11-18T03:36:45.790Z | 15 | 8 | 7 | 0 |
| [fr16-firefox](reports/fr16-firefox/index.html) | Run by: 23120398 – 2026-11-18T03:37:39.196Z | 15 | 8 | 7 | 0 |
| [fr16-webkit](reports/fr16-webkit/index.html) | Run by: 23120398 – 2026-11-18T03:39:09.041Z | 15 | 8 | 7 | 0 |

Every row expected to fail fails on the assertion that matches its bug in all three browsers; no unexpected failures and no flaky tests (WebKit FR-08 also checked with `--repeat-each=4`: 60/60).


## 6. Review / gap analysis of the AI-generated scripts

What the AI got wrong or missed, found during review and test runs, with the fix commit:

| # | Problem in AI output | Evidence | Why the AI missed it | Fix (commit) |
|---|---|---|---|---|
| 1 | **Flaky / slow waits.** The dialog helper always waited a fixed 1.5–3 s for an `alert()`, even after the OTP banner had appeared. | FR-03 Chromium run took **2.2 min**; every happy-path test ≈ 2.2 s. | Model habit: "wait for event with timeout" without a success signal; the AI could not see the timing until it ran. | `captureDialog(page, action, { until })` returns on the first of alert / success signal → **68 s**. (`fix(fr03): event-driven dialog handling…`) |
| 2 | **`click()` on an element that may not exist.** TC17 clicked "Back to Login" directly. | TC17 failed by **30 s test timeout**, not by an assertion. | Prompt described the expected UI; the AI coded the happy path. | `await expect(link).toBeVisible()` first → fails in 7 s with a clear message. (same commit) |
| 3 | **Broken test isolation – guest test was logged in.** `userPage` injected the JWT with `addInitScript`, which re-runs on every navigation; TC02 requested both `page` and `userPage`, then `localStorage.clear()` had no effect. | TC02 failed "for the right assertion" but as a logged-in user – a false bug confirmation. | The AI optimised for short code; it did not reason about fixture side effects across navigations. | Guest test uses a bare `page` and asserts the precondition (header shows "Đăng nhập"). (`fix(fr08): TC02 'guest' was silently logged in…`) |
| 4 | **Cross-browser flakiness (WebKit).** Second login approach wrote `localStorage` then `reload()`. | `--repeat-each=4` on WebKit: **6/60** runs came back as guest. | Engine-specific timing on Windows WebKit cannot be predicted from code. | Log in through the real `/login` form → **60/60** stable. (`fix(fr08): log in through the /login form…`) |
| 5 | **Plan TC not automatable as written.** FR-08 TC08 "change quantity in the cart". | `Cart.jsx` renders quantity as plain text; no control exists. | The plan/prompt was written before reading the component. | TC08 re-designed: multi-line cart, line subtotal = price × qty, total = sum. |
| 6 | **Weak assertion – UI only.** First FR-08 draft read the order once right after the success screen. | Possible race with the async insert. | Prompt did not say the rule is enforced server-side. | `expect.poll` on `/api/orders/my-orders`, checks total **and** status. (`test(fr08): add UI-level TC08–TC10…`) |
| 7 | **Missing edge cases.** HW02 had no role check for FR-16 and no header-only / whitespace-name files. | Reading `server.js`: import route only verifies a JWT exists. | Black-box HW02 tables did not include roles; AI only covered what the table listed until asked to read the backend. | Added FR-16 TC09–TC12; **TC11 found a new bug (BUG-FR16-005)**. |
| 8 | **Test data coupled to a SUT bug.** OTP-negative rows (TC05, TC08, BVA08, BVA10) need a password that passes the *buggy* client regex to reach the backend. | With `Reset@2026` the request never leaves the browser. | Not an AI error but a feature characteristic; documented in the data row `note`. | Rows use `"Reset 2026"`; when BUG-FR03-001 is fixed these rows must switch to a valid password. |
| 9 | **Report data lost.** JSON reporter configured before HTML reporter. | `results.json` missing – HTML reporter wipes its folder. | Tool ordering detail. | JSON reporter listed after HTML. |

**Root-cause summary:** prompt quality (rules enforced server-side and isolation needs were
not stated – #3, #6), model limitations (no runtime view of the SUT, timing, browser engine –
#1, #2, #4) and feature characteristics (client-only cart state, `alert()` for results,
a defect that blocks reaching other code paths – #5, #8).

## 7. Test cases not automated (or automated with limits)

| TC | Reason |
|---|---|
| FR-03 OTP **delivery by e-mail** | The demo SUT shows the OTP on the page instead of e-mailing it; tests read it from the UI. Real delivery (SMTP inbox) is not testable here. |
| FR-03 **TC25** (code audit of the regex) | Static review, not an executable behaviour; covered behaviourally by TC14/TC23/BVA02–07. |
| FR-03 **BVA11** (OTP range, N = 300) | Merged into TC18 with N = 20 per browser: the property is server-side and browser-independent, 300 × 3 browsers would add load without new information. |
| FR-03 **OTP expiry** | The SUT has no expiry; a time-based test would need clock control of the backend. |
| FR-08 TC08 as planned ("change quantity in the cart") | No quantity control in the cart UI → re-designed (see §6 #5). |
| FR-16 `.xlsx` / large files | No requirement-defined limit; an upload of an arbitrary size has no expected result to assert. |

## 8. Bugs

14 defects confirmed by failing assertions (13 from HW02 re-confirmed on 3 browsers + 1 new).
Details, reproduction steps and screenshots: `Bug_Report.md`; GitHub issues: see `docs/created-issues.json`.

## 9. Agent Skill

`.claude/skills/playwright-ddt/SKILL.md` packages the six-step workflow, the review checklist
(selectors, waits, assertions, isolation, data, bugs) and the "Run by" reporter template;
`scripts/extract-ai-log.mjs` turns the Claude Code transcript into the AI Audit appendix.
