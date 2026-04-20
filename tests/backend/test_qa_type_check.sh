#!/usr/bin/env bash
# QA 类型安全检查 — mypy (Python static type checker)
# Smart Task Manager 专用
set -euo pipefail

SRC="${QA_SRC:-../../src/backend/app}"
REPORT="/tmp/qa_mypy_report.txt"

PASS=0
FAIL=0

echo "[Q_TYPE_001] mypy 类型安全扫描"

if command -v mypy &>/dev/null; then
  mypy "$SRC/" --ignore-missing-imports --no-error-summary 2>&1 | tee "$REPORT" || true

  ERROR_COUNT=$(grep -c "error:" "$REPORT" 2>/dev/null || echo 0)
  echo ""
  echo "  类型错误: $ERROR_COUNT"

  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "  详情:"
    grep "error:" "$REPORT" | head -15 | while read line; do
      echo "    $line"
    done
    echo "  → FAIL ($ERROR_COUNT type errors)"
    FAIL=$((FAIL + 1))
  else
    echo "  → PASS"
    PASS=$((PASS + 1))
  fi
else
  echo "  mypy 未安装 → BLOCKED"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "========================================"
echo "Q(Type Safety): PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
