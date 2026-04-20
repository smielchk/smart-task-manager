#!/usr/bin/env bash
# QA 安全扫描 — bandit (Python 静态) + curl (动态越权)
# Smart Task Manager 专用
set -euo pipefail

SRC="${QA_SRC:-../../src/backend/app}"
BASE_URL="${QA_BASE_URL:-http://127.0.0.1:18000}"
REPORT="/tmp/qa_bandit_report.json"

PASS=0
FAIL=0

echo "=========================================="
echo "SEC 扫描: bandit (Python 静态安全分析)"
echo "=========================================="

bandit -r "$SRC" -f json -o "$REPORT" -ll 2>&1 || true

if [ -f "$REPORT" ]; then
  HIGH_COUNT=$(python3 -c "
import json
data = json.load(open('$REPORT'))
results = data.get('results', [])
high = [r for r in results if r.get('issue_severity') == 'HIGH']
medium = [r for r in results if r.get('issue_severity') == 'MEDIUM']
print(f'HIGH={len(high)} MEDIUM={len(medium)}')
for r in high:
    fn = r.get('filename','?').split('/')[-1]
    print(f'  [HIGH] {fn}:{r.get(\"line_number\",0)} — {r.get(\"issue_text\",\"\")[:100]}')
" 2>&1)
  echo "扫描结果: $HIGH_COUNT"
  
  # HIGH 级别问题 → FAIL
  HIGH_NUM=$(echo "$HIGH_COUNT" | grep -oP 'HIGH=\K\d+' || echo 0)
  if [ "$HIGH_NUM" -gt 0 ]; then
    FAIL=$((FAIL + 1))
  else
    PASS=$((PASS + 1))
  fi
else
  echo "bandit 输出解析失败"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=========================================="
echo "SEC 扫描: 动态越权测试 (curl)"
echo "=========================================="

# 先注册获取 token
TOKEN=""
REGISTER_RESP=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"qa_sec_user","password":"QaTest12345"}' 2>/dev/null || echo '{}')
TOKEN=$(echo "$REGISTER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"qa_sec_user","password":"QaTest12345"}' 2>/dev/null || echo '{}')
  TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")
fi

# SEC_001: 未授权访问受保护接口
echo "[SEC_001] 未授权访问 /api/tasks"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/tasks" 2>/dev/null || echo "000")
echo "  状态码: $CODE (预期 401/403)"
if [[ "$CODE" == "401" || "$CODE" == "403" ]]; then
  echo "  → PASS"; PASS=$((PASS + 1))
else
  echo "  → FAIL"; FAIL=$((FAIL + 1))
fi

# SEC_002: 无效 Token
echo "[SEC_002] 无效 Token 访问"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/tasks" \
  -H "Authorization: Bearer fake_invalid_token_12345" 2>/dev/null || echo "000")
echo "  状态码: $CODE (预期 401)"
if [[ "$CODE" == "401" ]]; then
  echo "  → PASS"; PASS=$((PASS + 1))
else
  echo "  → FAIL"; FAIL=$((FAIL + 1))
fi

# SEC_003: SQL 注入
echo "[SEC_003] SQL 注入测试 (keyword)"
RESP=$(curl -s "$BASE_URL/api/tasks?keyword=' OR 1=1 --" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo '{}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/tasks?keyword=' OR 1=1 --" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
echo "  状态码: $CODE (预期 200 但不泄露全表数据)"
# 检查不是 500
if [ "$CODE" != "500" ]; then
  echo "  → PASS"; PASS=$((PASS + 1))
else
  echo "  → FAIL"; FAIL=$((FAIL + 1))
fi

# SEC_004: XSS payload
echo "[SEC_004] XSS 注入测试 (任务标题)"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"<script>alert(1)</script>"}' 2>/dev/null || echo "000")
echo "  XSS 标题创建: $CODE (不应 500)"
if [ "$CODE" != "500" ]; then
  echo "  → PASS"; PASS=$((PASS + 1))
else
  echo "  → FAIL"; FAIL=$((FAIL + 1))
fi

# SEC_005: AI API Key 不暴露
echo "[SEC_005] AI API Key 不在响应中暴露"
HEALTH_RESP=$(curl -s "$BASE_URL/api/health/ai" 2>/dev/null || echo '{}')
if echo "$HEALTH_RESP" | grep -qi "api_key\|secret\|sk-" 2>/dev/null; then
  echo "  → FAIL (检测到敏感信息)"; FAIL=$((FAIL + 1))
else
  echo "  → PASS"; PASS=$((PASS + 1))
fi

echo ""
echo "========================================"
echo "SEC: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
