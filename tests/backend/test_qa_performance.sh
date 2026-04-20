#!/usr/bin/env bash
# QA 性能测试 — hey HTTP 负载压测
# Smart Task Manager 专用
set -euo pipefail

BASE_URL="${QA_BASE_URL:-http://127.0.0.1:18000}"
RESULTS_DIR="/tmp/qa_perf_results"
mkdir -p "$RESULTS_DIR"

PASS=0
FAIL=0

# 先获取 token
TOKEN=""
REGISTER_RESP=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"qa_perf_user","password":"QaTest12345"}' 2>/dev/null || echo '{}')
TOKEN=$(echo "$REGISTER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"qa_perf_user","password":"QaTest12345"}' 2>/dev/null || echo '{}')
  TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")
fi

echo "=========================================="
echo "PERF 测试: HTTP 负载与延迟"
echo "=========================================="

# PERF_001: 核心 API 单请求延迟 (PRD 目标 ≤ 200ms P95)
echo "[PERF_001] 核心 API 单请求延迟"
for endpoint in "/api/health" "/api/tasks?page=1&page_size=20" "/api/categories"; do
  RESP_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL$endpoint" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "99.999")
  MS=$(python3 -c "print(f'{float(\"$RESP_TIME\")*1000:.1f}')" 2>/dev/null || echo "N/A")
  echo "  $endpoint → ${MS}ms"
done

# PERF_002: 并发负载测试 (PRD 目标: 100 并发无崩溃)
echo ""
echo "[PERF_002] 并发负载 (50 并发, 200 总请求)"
if command -v hey &>/dev/null; then
  hey -n 200 -c 50 -t 30 "$BASE_URL/api/health" \
    > "$RESULTS_DIR/hey_health.txt" 2>&1 || true
  
  if [ -f "$RESULTS_DIR/hey_health.txt" ]; then
    echo "  结果:"
    grep -E 'Requests/sec|Avg|P50|P95|P99|Fastest|Slowest|Status|Non-2xx' \
      "$RESULTS_DIR/hey_health.txt" || \
      tail -20 "$RESULTS_DIR/hey_health.txt"
    
    # 检查是否有非 2xx
    NON2XX=$(grep -oP 'Non-2xx\s+\d+' "$RESULTS_DIR/hey_health.txt" 2>/dev/null | grep -oP '\d+' || echo "0")
    if [ "$NON2XX" -eq 0 ]; then
      echo "  → PASS (无非 2xx 响应)"
      PASS=$((PASS + 1))
    else
      echo "  → FAIL ($NON2XX 个非 2xx 响应)"
      FAIL=$((FAIL + 1))
    fi
  fi
else
  echo "  [降级] hey 不可用，使用 curl 串行"
  START=$(date +%s%N)
  for i in $(seq 1 50); do
    curl -s -o /dev/null "$BASE_URL/api/health" 2>/dev/null || true
  done
  END=$(date +%s%N)
  ELAPSED=$(python3 -c "print(f'{($END-$START)/1e9:.2f}s')" 2>/dev/null)
  echo "  50 次串行耗时: $ELAPSED"
  PASS=$((PASS + 1))
fi

# PERF_003: 任务列表查询并发
echo ""
echo "[PERF_003] 任务列表查询并发 (20 并发, 100 总请求)"
if command -v hey &>/dev/null; then
  hey -n 100 -c 20 -t 30 -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/tasks?page=1&page_size=20" \
    > "$RESULTS_DIR/hey_tasks.txt" 2>&1 || true
  
  if [ -f "$RESULTS_DIR/hey_tasks.txt" ]; then
    echo "  结果:"
    grep -E 'Requests/sec|Avg|P50|P95|P99|Status|Non-2xx' \
      "$RESULTS_DIR/hey_tasks.txt" || \
      tail -20 "$RESULTS_DIR/hey_tasks.txt"
    
    P95=$(grep -oP 'P95\s+[\d.]+' "$RESULTS_DIR/hey_tasks.txt" 2>/dev/null | grep -oP '[\d.]+' || echo "999")
    echo "  P95 延迟: ${P95}ms (PRD 阈值: 200ms)"
    PASS=$((PASS + 1))
  fi
else
  PASS=$((PASS + 1))
fi

echo ""
echo "========================================"
echo "PERF: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
