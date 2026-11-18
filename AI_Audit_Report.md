# AI Audit Report – HW04 Automation Testing (23120398)

## Declaration

**I use AI tools for the following tasks,** listed below with the tool, date/time, prompt and output.
All AI output was executed against the real SUT on my machine; the failing results were
analysed, and the corrections are recorded in the commit history (`Git_Commit_Log.txt`) and in
Main_Report §6. I am responsible for the final scripts.

| AI tool | Version / model | Used for |
|---|---|---|
| Claude Code (VS Code extension) | `claude-opus-5-5` | SUT source analysis, data files, page objects, specs, running/debugging Playwright, bug evidence scripts, report drafts, Agent Skill |

Not AI-generated: the HTML reports (produced by Playwright runs on this machine, title
`Run by: 23120398 – <ISO timestamp>`), the demo videos (own voice, `whoami`/`hostname`).

The complete raw log (every prompt, every AI answer, every file the AI wrote and every command it
ran) is extracted from the Claude Code transcript with `node scripts/extract-ai-log.mjs` →
`docs/AI_Interaction_Log.md`.

## Interaction log (session 2026-11-18, times UTC+7)

### #1 – 09:42 – Plan execution request
- **Tool:** Claude Code, `claude-opus-5-5`
- **Prompt:** "@PLAN.md dựa vào plan hãy làm cho tôi tự tạo repo và thực thi theo plan /goal"
- **AI output (steps it took, each verified by a run):**
  1. *Analysis* – read HW02 `Main_Report.md` (FR-03/08/16 tables), `ForgotPassword.jsx`, `Checkout.jsx`, `Cart.jsx`, `CartContext.jsx`, `AuthContext.jsx`, `Home.jsx`, `ProductDetail.jsx`, `Login.jsx`, admin `App.jsx`, `server.js`, `database.js`. Reported: results via `alert()`, cart only in React state (lost on reload), add-to-cart needs two clicks, DB reseeded on backend start, `/api/register` unvalidated (fresh user per test), import route has no role check (→ new TC11).
  2. *Environment* – installed SUT dependencies, started backend/web/admin, `npm i -D @playwright/test`, installed Chromium/Firefox/WebKit, `git init`.
  3. *Scaffold* (09:48, `dc25727`) – `playwright.config.ts` ("Run by" title + metadata), fixtures, page objects.
  4. *FR-03 data + spec* (09:49, `a413f0c`) – 34 rows in `data/fr03-forgot-password.json`.

### #2 – 09:44 – Mid-turn instruction
- **Prompt:** "hãy làm vào trong thư mục này và push lên git"
- **AI output:** kept all work in `23120398_HW04_AI_Automation_090`; planned a public repo `23120398-HW04-Automation`. (Repo creation/push was blocked by the tool's permission guard and done by me – see #5.)

### #3 – 09:51 – Mid-turn instruction
- **Prompt:** "lưu ý không được dùng co author với claude"
- **AI output:** rewrote the two existing commit messages without the co-author trailer; all later commits have none.

### #1 (continued) – run, debug, review
| Time | Step | AI action / finding | Result |
|---|---|---|---|
| 09:5x | Run FR-03 (Chromium) | 19 pass / 15 fail; per-test durations showed fixed dialog waits and a 30 s timeout in TC17 | analysed |
| 10:00 | Fix | event-driven `captureDialog`, assert-before-click, json reporter order (`dbaf3de`) | 2.2 min → 68 s |
| 10:01 | FR-08 data + spec | 12 HW02 TCs (`fbdbab1`) | 5 pass / 8 fail |
| 10:04 | Review | TC02 "guest" was logged in through `addInitScript` (`e3425da`) | fixed |
| 10:05 | FR-08 TC08–TC10 | TC08 re-designed (no quantity control in cart) (`045e5bd`) | 3 pass |
| 10:06 | FR-16 manifest + 12 CSV fixtures | (`12837ec`) | 6 pass / 5 fail |
| 10:07 | FR-16 TC09–TC12 | TC11 → new bug BUG-FR16-005 (`89b2b86`) | |
| 10:2x | Firefox/WebKit | WebKit flake in login (6/60 with `--repeat-each=4`) | |
| 10:28 | Fix + annotations | UI login (60/60 stable), `test.fail` + issue annotation for known bugs (`732b523`, `d128745`) | |
| 10:3x | 9 runs | `scripts/run-all.sh` → `reports/<feature>-<browser>` | see README |

### What I (the student) checked / changed after the AI
- Verified each failing test fails on the assertion that matches the bug (not on setup) – this is how the TC02 isolation error was found.
- Rejected the plan's FR-08 TC08 as written and accepted the re-designed version.
- Reviewed `AI_Critique.md`, `Main_Report.md`, `Bug_Report.md` before submission.

<!-- Append the auto-extracted log: node scripts/extract-ai-log.mjs -->
