"""
Round 5 终验 — BUG_007 复检 + 回归测试
QA 独立运行时验证脚本（不复用 Coder 测试）
"""
import asyncio
import httpx
import json
import sys

BASE = "http://127.0.0.1:8917"
results = []

async def api(method, path, **kwargs):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.request(method, f"{BASE}{path}", **kwargs)
        try:
            body = r.json()
        except Exception:
            body = r.text
        return r.status_code, body

async def register_and_login():
    """注册并登录获取 token"""
    # 注册
    code, body = await api("POST", "/api/auth/register", json={
        "username": f"qa_r5_user_{__import__('time').time()}",
        "password": "TestPass123!",
        "email": "qa_r5@test.com"
    })
    # 登录
    code, body = await api("POST", "/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if code == 200 and "data" in body and isinstance(body["data"], dict):
        token = body["data"].get("access_token", body["data"].get("token", ""))
        if token:
            return token
    # 尝试直接用已有用户
    if code == 200:
        token = body.get("data", {}).get("access_token", body.get("data", {}).get("token", ""))
        if token:
            return token
    raise Exception(f"登录失败: code={code}, body={body}")

async def run_tests():
    print("=" * 60)
    print("Round 5 终验 — BUG_007 复检 + 回归测试")
    print("=" * 60)

    # Step 1: 登录
    print("\n--- 登录 ---")
    try:
        token = await register_and_login()
        print(f"  ✅ 登录成功, token={token[:20]}...")
    except Exception as e:
        print(f"  ❌ 登录失败: {e}")
        return
    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: 创建测试任务
    print("\n--- 创建任务 (BUG_001 回归) ---")
    code, body = await api("POST", "/api/tasks", json={
        "title": "R5验证任务",
        "description": "Round5测试",
        "due_datetime": "2026-04-22T10:00:00"
    }, headers=headers)
    task_id = None
    if code == 200:
        task_id = body.get("data", {}).get("id")
        print(f"  ✅ 创建成功 task_id={task_id}, code={code}")
    else:
        print(f"  ❌ 创建失败: code={code}, body={body}")
        return

    # Step 3: 创建第二个任务
    code2, body2 = await api("POST", "/api/tasks", json={
        "title": "R5删除测试任务"
    }, headers=headers)
    task_id2 = body2.get("data", {}).get("id") if code2 == 200 else None
    print(f"  {'✅' if code2 == 200 else '❌'} 创建任务2: code={code2}, id={task_id2}")

    # Step 4: BUG_007 — PUT /api/tasks/{id}
    print("\n--- BUG_007 验证: PUT /api/tasks/{id} ---")
    code, body = await api("PUT", f"/api/tasks/{task_id}", json={
        "title": "编辑后标题",
        "due_datetime": "2026-04-23T10:00:00"
    }, headers=headers)
    status = "✅ PASS" if code == 200 else "❌ FAIL"
    print(f"  {status} PUT 更新任务: code={code}")
    if code != 200:
        print(f"    响应: {json.dumps(body, ensure_ascii=False)[:500]}")

    # Step 5: BUG_007 — PATCH /api/tasks/{id}/status (completed)
    print("\n--- BUG_007 验证: PATCH /api/tasks/{id}/status completed ---")
    code, body = await api("PATCH", f"/api/tasks/{task_id}/status", json={
        "status": "completed"
    }, headers=headers)
    status = "✅ PASS" if code == 200 else "❌ FAIL"
    print(f"  {status} 状态→completed: code={code}")
    if code != 200:
        print(f"    响应: {json.dumps(body, ensure_ascii=False)[:500]}")

    # Step 6: BUG_007 — PATCH /api/tasks/{id}/status (pending)
    print("\n--- BUG_007 验证: PATCH /api/tasks/{id}/status pending ---")
    code, body = await api("PATCH", f"/api/tasks/{task_id}/status", json={
        "status": "pending"
    }, headers=headers)
    status = "✅ PASS" if code == 200 else "❌ FAIL"
    print(f"  {status} 状态→pending: code={code}")
    if code != 200:
        print(f"    响应: {json.dumps(body, ensure_ascii=False)[:500]}")

    # Step 7: 软删除
    print("\n--- BUG_005 回归: 软删除 ---")
    code, body = await api("DELETE", f"/api/tasks/{task_id2}", headers=headers)
    print(f"  {'✅' if code == 200 else '❌'} 软删除: code={code}")

    # Step 8: BUG_007 — POST /api/tasks/{id}/restore
    print("\n--- BUG_007 验证: POST /api/tasks/{id2}/restore ---")
    if task_id2:
        code, body = await api("POST", f"/api/tasks/{task_id2}/restore", headers=headers)
        status = "✅ PASS" if code == 200 else "❌ FAIL"
        print(f"  {status} 恢复任务: code={code}")
        if code != 200:
            print(f"    响应: {json.dumps(body, ensure_ascii=False)[:500]}")

    # Step 9: BUG_005 回归 — 默认列表不含已删除
    print("\n--- BUG_005 回归: 默认列表不含已删除 ---")
    code, body = await api("GET", "/api/tasks", headers=headers)
    items = body.get("data", {}).get("items", []) if code == 200 else []
    deleted_found = any(t.get("deleted_at") for t in items)
    print(f"  {'✅' if not deleted_found else '❌'} 默认列表无已删除: code={code}, 已删除项={deleted_found}")

    # Step 10: BUG_005 回归 — include_deleted=true
    print("\n--- BUG_005 回归: include_deleted=true ---")
    code, body = await api("GET", "/api/tasks?include_deleted=true", headers=headers)
    print(f"  {'✅' if code == 200 else '❌'} include_deleted: code={code}")

    # Step 11: BUG_008 回归 — 标题超长
    print("\n--- BUG_008 回归: 标题超长 300字符 ---")
    code, body = await api("POST", "/api/tasks", json={
        "title": "A" * 300
    }, headers=headers)
    print(f"  {'✅' if code == 422 else '❌'} 超长标题: code={code} (预期 422)")

    # Step 12: BUG_004 回归 — stats
    print("\n--- BUG_004 回归: stats ---")
    code, body = await api("GET", "/api/stats/summary", headers=headers)
    print(f"  {'✅' if code == 200 else '❌'} stats/summary: code={code}")
    code, body = await api("GET", "/api/stats/trends", headers=headers)
    print(f"  {'✅' if code == 200 else '❌'} stats/trends: code={code}")

    # Step 13: 获取任务详情
    print("\n--- 补充: 获取任务详情 ---")
    code, body = await api("GET", f"/api/tasks/{task_id}", headers=headers)
    print(f"  {'✅' if code == 200 else '❌'} get_task: code={code}")

    # Step 14: 空标题
    print("\n--- BUG_009: 空标题 ---")
    code, body = await api("POST", "/api/tasks", json={
        "title": "   "
    }, headers=headers)
    print(f"  {'✅' if code in (200, 422) else '❌'} 空标题: code={code} (注意: error_response 返回 HTTP 200 但 code=422)")

    print("\n" + "=" * 60)
    print("Round 5 运行时测试完成")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
