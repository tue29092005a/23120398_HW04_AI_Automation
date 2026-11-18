# 23120398 – HW04 AI Automation Testing (EShop SUT)

Data-driven Playwright (TypeScript) automation of three EShop web features, generated step by
step with Claude Code, reviewed and fixed by me, executed on **Chromium, Firefox and WebKit**
with one Playwright HTML report per feature × browser (title **"Run by: 23120398 – <ISO timestamp>"**).

| Deliverable | File |
|---|---|
| Main report (automation report + gap analysis) | [Main_Report.md](Main_Report.md) / `Main_Report.pdf` |
| Bug report | [Bug_Report.md](Bug_Report.md) / `Bug_Report.pdf` |
| AI Audit Report | [AI_Audit_Report.md](AI_Audit_Report.md) / `AI_Audit_Report.pdf` |
| AI Critique | [AI_Critique.md](AI_Critique.md) / `AI_Critique.pdf` |
| Git commit log | [Git_Commit_Log.txt](Git_Commit_Log.txt) |
| HTML reports (9 runs) | [reports/](reports/) – summary in [reports/SUMMARY.md](reports/SUMMARY.md) |
| Agent Skill | [.claude/skills/playwright-ddt/SKILL.md](.claude/skills/playwright-ddt/SKILL.md) |
| Demo video (Task 2) | _YouTube link – TODO_ |
| Agent Skill demo video | _YouTube link – TODO_ |

## Self-assessment

| No. | Criteria | Grade | Self-Assessed |
|---|---|---:|---:|
| 1 | Task 1 – Feature A (FR-03 Forgot password + OTP) | 25 | 24 |
| 1 | Task 1 – Feature B (FR-08 Checkout) | 25 | 23 |
| 1 | Task 1 – Feature C (FR-16 CSV import) | 25 | 23 |
| 2 | Task 2 – Demo video | 15 | 12 |
| 3 | Agent Skills | 10 | 8 |
| | **Total** | **100** | **90** |

## Test summary

| Feature | Test cases automated | Browser runs | Executed (TC × browsers) | Passed | Failed – known bug (`test.fail`) | Failed – unexpected | Bugs found |
|---|---:|---:|---:|---:|---:|---:|---:|
| FR-03 Forgot password + OTP | 34 | 3 | 102 | 57 | 45 | 0 | 5 |
| FR-08 Checkout | 15 | 3 | 45 | 24 | 21 | 0 | 4 |
| FR-16 CSV import (admin) | 15 | 3 | 45 | 24 | 21 | 0 | 5 |
| **Total (3 features)** | **64** | **9** | **192** | **105** | **87** | **0** | **14** (13 from HW02 re-confirmed + 1 new) |

Per run (from `reports/SUMMARY.md`):

| Run | Report title (ISO timestamp) | Executed | Passed | Known bug | Unexpected |
|---|---|---:|---:|---:|---:|
| [fr03-chromium](reports/fr03-chromium/index.html) | Run by: 23120398 – 2026-11-18T04:12:21.893Z | 34 | 19 | 15 | 0 |
| [fr03-firefox](reports/fr03-firefox/index.html) | Run by: 23120398 – 2026-11-18T04:13:12.594Z | 34 | 19 | 15 | 0 |
| [fr03-webkit](reports/fr03-webkit/index.html) | Run by: 23120398 – 2026-11-18T04:15:22.423Z | 34 | 19 | 15 | 0 |
| [fr08-chromium](reports/fr08-chromium/index.html) | Run by: 23120398 – 2026-11-18T04:16:39.254Z | 15 | 8 | 7 | 0 |
| [fr08-firefox](reports/fr08-firefox/index.html) | Run by: 23120398 – 2026-11-18T04:17:36.195Z | 15 | 8 | 7 | 0 |
| [fr08-webkit](reports/fr08-webkit/index.html) | Run by: 23120398 – 2026-11-18T04:19:07.271Z | 15 | 8 | 7 | 0 |
| [fr16-chromium](reports/fr16-chromium/index.html) | Run by: 23120398 – 2026-11-18T04:20:20.016Z | 15 | 8 | 7 | 0 |
| [fr16-firefox](reports/fr16-firefox/index.html) | Run by: 23120398 – 2026-11-18T04:21:08.306Z | 15 | 8 | 7 | 0 |
| [fr16-webkit](reports/fr16-webkit/index.html) | Run by: 23120398 – 2026-11-18T04:22:32.548Z | 15 | 8 | 7 | 0 |

Every row expected to fail fails on the assertion that matches its bug in all three browsers; no unexpected failures and no flaky tests (WebKit FR-08 also checked with `--repeat-each=4`: 60/60).


## How to run

```bash
# SUT (separate terminals): backend :3000, web :5173, admin :5174
cd eshop-sut/backend && npm i && node server.js
cd eshop-sut/frontend-web && npm i && npx vite --port 5173
cd eshop-sut/frontend-admin && npm i && npx vite

# this repo
npm ci && npx playwright install chromium firefox webkit
bash scripts/run-all.sh            # 3 features x 3 browsers -> reports/<feature>-<browser>/index.html
npx playwright show-report reports/fr08-webkit
node scripts/summarize-reports.mjs # reports/SUMMARY.md
```

Known SUT defects are kept in the suite as `test.fail()` rows (`"bugs"` field in `data/*.json`),
so a green run means "every assertion behaved as expected, including the known bugs"; a
fixed bug shows up as a failure until the row is updated.
