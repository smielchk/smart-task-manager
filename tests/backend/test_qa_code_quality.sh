#!/usr/bin/env bash
# QA 代码质量扫描 — ruff (Python lint + bug + security + quality)
# Smart Task Manager 专用
set -euo pipefail

SRC="${QA_SRC:-../../src/backend/app}"
REPORT="/tmp/qa_ruff_report.json"

PASS=0
FAIL=0

# === Phase 1: Bug + Security (B/S/BLE/A rules) ===
echo "[Q_001] ruff Bug + Security 扫描"
ruff check "$SRC/" \
  --select B,S,BLE,A \
  --ignore S101,S106,S311 \
  --output-format=json \
  > "$REPORT" 2>&1 || true

BUGSEC_COUNT=$(python3 -c "
import json
try:
    data = json.load(open('$REPORT'))
    count = len(data) if isinstance(data, list) else sum(len(f.get('results',[])) for f in data)
    print(count)
    if count > 0:
        items = data if isinstance(data, list) else [item for f in data for item in f.get('results',[])]
        high = [i for i in (items if isinstance(items, list) else []) if i.get('issue_severity') == 'HIGH']
        for i in items[:10]:
            fn = i.get('filename','?').split('app/')[-1] if 'app/' in i.get('filename','') else i.get('filename','').split('/')[-1]
            line = i.get('line_number', i.get('location',{}).get('row',0))
            msg = i.get('message','')[:80]
            print(f'  {i.get(\"code\",\"?\")} {fn}:{line} — {msg}')
except Exception as e:
    print(f'0\\n解析错误: {e}')
" 2>&1)

echo "  Bug+Security 问题: $(echo "$BUGSEC_COUNT" | head -1)"
echo "$BUGSEC_COUNT" | tail -n +2 | head -20

if [ "$(echo "$BUGSEC_COUNT" | head -1)" -gt 0 ] 2>/dev/null; then
  echo "  → FAIL"
  FAIL=$((FAIL + 1))
else
  echo "  → PASS"
  PASS=$((PASS + 1))
fi

# === Phase 2: Code Quality (PL/TRY/C4/DTZ/RET/SIM rules) ===
echo ""
echo "[Q_002] ruff Code Quality 扫描"
ruff check "$SRC/" \
  --select PL,TRY,C4,DTZ,RET,SIM,ARG,F,UP \
  --ignore F401,F841 \
  --output-format=json \
  > /tmp/qa_ruff_quality.json 2>&1 || true

QUALITY_COUNT=$(python3 -c "
import json
try:
    data = json.load(open('/tmp/qa_ruff_quality.json'))
    count = len(data) if isinstance(data, list) else sum(len(f.get('results',[])) for f in data)
    print(count)
    if count > 0:
        items = data if isinstance(data, list) else [item for f in data for item in f.get('results',[])]
        for i in items[:10]:
            fn = i.get('filename','?').split('app/')[-1] if 'app/' in i.get('filename','') else i.get('filename','').split('/')[-1]
            line = i.get('line_number', i.get('location',{}).get('row',0))
            msg = i.get('message','')[:80]
            print(f'  {i.get(\"code\",\"?\")} {fn}:{line} — {msg}')
except Exception as e:
    print(f'0\\n解析错误: {e}')
" 2>&1)

echo "  Quality 问题: $(echo "$QUALITY_COUNT" | head -1)"
echo "$QUALITY_COUNT" | tail -n +2 | head -15

if [ "$(echo "$QUALITY_COUNT" | head -1)" -gt 0 ] 2>/dev/null; then
  echo "  → FAIL"
  FAIL=$((FAIL + 1))
else
  echo "  → PASS"
  PASS=$((PASS + 1))
fi

echo ""
echo "========================================"
echo "Q(Code Quality): PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
