#!/usr/bin/env bash
# 3 features x 3 browsers = 9 Playwright HTML reports in reports/<feature>-<browser>
# Usage: bash scripts/run-all.sh [fr03|fr08|fr16 ...]
set -u
cd "$(dirname "$0")/.."
FEATURES=${*:-"fr03 fr08 fr16"}
for f in $FEATURES; do
  for b in chromium firefox webkit; do
    echo "=== $f on $b ==="
    rm -rf "reports/$f-$b"
    REPORT_DIR="reports/$f-$b" npx playwright test "tests/$f-" --project="$b" || true
  done
done
node scripts/summarize-reports.mjs
