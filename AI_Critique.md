# AI Critique – HW04 Automation Testing (23120398)

The AI (Claude Code) was fast at the mechanical parts: reading the SUT source, proposing page objects and turning the HW02 tables into JSON/CSV data files. But every first draft needed correction, and the mistakes followed a pattern.

**Where it went wrong.** (1) *Waits:* the first dialog helper always waited 1.5–3 s for an `alert()` that never came on the happy path, and one test called `click()` on a link that does not exist, so it died on the 30 s test timeout instead of a 7 s assertion. (2) *Isolation:* it logged users in with `addInitScript`, which re-injects the token on every navigation – so the "guest" test TC02 was silently logged in and failed for the wrong reason. (3) *Cross-browser:* its second login approach (write `localStorage`, reload) flaked in ~10 % of WebKit runs. (4) *Incomplete coverage:* the plan's FR-08 TC08 ("change quantity in the cart") is impossible – the cart has no quantity control.

**Why it missed them.** It writes code from patterns, not from observing the running SUT: it cannot see that `alert()` is used, that the cart lives only in React state, or how WebKit behaves on Windows until a test actually runs. When my prompt only said "log in as a user", it chose the shortest code, not the one that keeps tests independent.

**What I learned.** Treat AI output as a draft whose correctness must be proven by execution: run on all three browsers, repeat runs (`--repeat-each`) to expose flakiness, and read *why* a test fails, not just *that* it fails – a failing test with the wrong root cause is as misleading as a passing one. The most valuable AI contribution was not the scripts but reading `server.js`, which revealed a new defect (BUG-FR16-005: any logged-in user can import products).
