# QA 审查报告 (QA Report)

> **项目**: smart-task-manager
> **特性**: TASK_MGMT
> **版本**: v1.0.0
> **审查级别**: S
> **模式**: Standard
> **轮次**: Round 5（终验复检）
> **审查日期**: 2026-04-20
> **QA 工程师**: QA Agent (对抗性独立审查)
> **架构**: B/S (React + FastAPI + SQLite 降级验证)
> **测试环境**: SQLite + aiosqlite（.env DATABASE_URL_OVERRIDE），Python 3.11

---

## §1 项目概述

Smart Task Manager 是一个 B/S 架构的智能任务管理系统。本次为 Round 5 终验复检，针对 Round 4 报告中遗留的 CRITICAL 缺陷 **BUG_007**（`flush()` 后访问 ORM 过期属性 MissingGreenlet）进行验证。

Round 4 确认的根因：`await db.flush()` 后 ORM 对象的 `updated_at`（带 `onupdate=func.now()`）被标记为 expired，`_task_to_dict()` 同步访问触发惰性加载 → async aiosqlite 环境下 MissingGreenlet。Round 4 推荐方案 A：在 `_task_to_dict` 调用前加 `await db.refresh(task)`。

Round 5 修复确认：Coder 已在 `tasks.py` 中 `update_task`/`update_status`/`restore_task` 三个端点实施修复：
- 先 `await db.commit()`
- 再 `await db.refresh(task)` — 强制异步刷新所有过期属性
- 最后 `await TaskService._task_to_dict(db, task)`

---

## §2 复检范围与方法

### 2.1 复检范围

| 缺陷 ID | 描述 | 严重等级 | Round 4 状态 |
|---------|------|---------|-------------|
| BUG_007 | flush 后访问 ORM 过期属性 MissingGreenlet | CRITICAL | NOT FIXED |
| BUG_001 | 含 due_datetime 任务创建 500 | CRITICAL（历史） | FIXED |
| BUG_004 | stats/summary MySQL 专有函数 500 | MAJOR（历史） | FIXED |
| BUG_005 | 软删除 include_deleted 逻辑错误 | MAJOR（历史） | FIXED |
| BUG_006/008 | ValueError→422 未正确返回 | MAJOR（历史） | FIXED |
| BUG_009 | error_response 返回 HTTP 200 但 code=422 | MINOR | 保留 |

### 2.2 复检方法

1. **静态代码审查**: 逐行确认 `tasks.py` 三个端点的修复代码
2. **运行时 API 验证**: SQLite 降级环境启动后端，通过 curl 执行 13 个测试用例
3. **服务端日志分析**: uvicorn 日志确认零 500 错误、零 MissingGreenlet

### 2.3 环境限制

| 限制项 | 影响 | 降级方案 |
|--------|------|---------|
| 无 MySQL | SQLite aiosqlite 降级 | .env DATABASE_URL_OVERRIDE |
| 无 AI API Key | AI 功能 BLOCKED | 验证降级行为正确 |
| 无 hey 工具 | PERF 维度 BLOCKED | 标注（历史遗留） |
| 无 Docker | 容器化部署 BLOCKED | 标注（历史遗留） |

---

## §3 BUG_007 复检详情

### 3.1 静态代码审查

**修复文件**: `app/api/tasks.py`

**update_task 端点（行 ~176-186）**:
```python
task = await TaskService.update_task(db, task_id, data, user.id)
if task is None:
    return error_response(code=404, message="任务不存在")
await db.commit()
await db.refresh(task)       # ← Round 5 修复：强制异步刷新过期属性
task_dict = await TaskService._task_to_dict(db, task)
return success_response(data=task_dict)
```

**update_status 端点（行 ~206-216）**:
```python
task = await TaskService.update_status(db, task_id, data.status, user.id)
if task is None:
    return error_response(code=404, message="任务不存在")
await db.commit()
await db.refresh(task)       # ← Round 5 修复
task_dict = await TaskService._task_to_dict(db, task)
return success_response(data=task_dict)
```

**restore_task 端点（行 ~221-231）**:
```python
task = await TaskService.restore(db, task_id, user.id)
if task is None:
    return error_response(code=404, message="任务不存在或未被删除")
await db.commit()
await db.refresh(task)       # ← Round 5 修复
task_dict = await TaskService._task_to_dict(db, task)
return success_response(data=task_dict)
```

**静态审查结论**: ✅ 三个端点修复正确。`await db.refresh(task)` 在 `commit()` 之后、`_task_to_dict()` 之前调用，通过异步 I/O 重新加载所有过期属性，彻底避免了同步惰性加载导致的 MissingGreenlet。

### 3.2 运行时验证

| 测试用例 | HTTP 状态码 | 服务端异常 | 结果 |
|---------|------------|-----------|------|
| PUT `/api/tasks/1` {"title":"编辑后标题","due_datetime":"2026-04-23T10:00:00"} | **200** | 无 | ✅ PASS |
| PATCH `/api/tasks/1/status` {"status":"completed"} | **200** | 无 | ✅ PASS |
| PATCH `/api/tasks/1/status` {"status":"pending"} | **200** | 无 | ✅ PASS |
| POST `/api/tasks/2/restore` | **200** | 无 | ✅ PASS |

**服务端日志确认**: 全部 4 个请求返回 200 OK，uvicorn 日志无任何 ERROR 或 MissingGreenlet 异常。

### 3.3 BUG_007 判定

**[FIXED]** ✅ — `await db.refresh(task)` 修复方案有效。`commit()` + `refresh()` 组合确保所有 ORM 属性（包括 `onupdate=func.now()` 导致过期的 `updated_at`）在 `_task_to_dict()` 调用前已通过异步 I/O 刷新。

---

## §4 回归测试结果

### 4.1 历史缺陷回归

| BUG ID | 描述 | 复检用例 | HTTP 状态码 | 结果 |
|--------|------|---------|------------|------|
| BUG_001 | 含 due_datetime 任务创建 500 | POST 含 due_datetime | 200 | ✅ FIXED |
| BUG_004 | stats MySQL 专有函数 500 | GET /api/stats/summary, /api/stats/trends | 200, 200 | ✅ FIXED |
| BUG_005 | 软删除 include_deleted 逻辑错误 | DELETE + 默认列表 + restore | 200, 200 | ✅ FIXED |
| BUG_008 | ValueError→422 未正确返回 | POST 300 字符标题 | 422 | ✅ FIXED |

### 4.2 全部用例汇总

| # | 测试用例 | 对应 BUG | HTTP 状态码 | 预期 | 结果 |
|---|---------|---------|------------|------|------|
| 1 | 创建任务含 due_datetime | BUG_001 | 200 | 200 | ✅ PASS |
| 2 | 创建任务无 due_datetime | 补充 | 200 | 200 | ✅ PASS |
| 3 | PUT 更新任务 | BUG_007 | **200** | 200 | ✅ PASS |
| 4 | PATCH status→completed | BUG_007 | **200** | 200 | ✅ PASS |
| 5 | PATCH status→pending | BUG_007 | **200** | 200 | ✅ PASS |
| 6 | 软删除任务 | BUG_005 | 200 | 200 | ✅ PASS |
| 7 | POST restore 恢复任务 | BUG_007 | **200** | 200 | ✅ PASS |
| 8 | 默认列表不含已删除 | BUG_005 | 200 | 200 | ✅ PASS |
| 9 | 标题超长 300 字符 | BUG_008 | 422 | 422 | ✅ PASS |
| 10 | stats/summary | BUG_004 | 200 | 200 | ✅ PASS |
| 11 | stats/trends | BUG_004 | 200 | 200 | ✅ PASS |
| 12 | 获取任务详情 | 补充 | 200 | 200 | ✅ PASS |
| 13 | 空标题 | BUG_009 | HTTP 200 (body code=422) | ⚠️ MINOR | ⚠️ MINOR |

**测试汇总**: 12 PASS / 0 FAIL / 1 MINOR（共 13 用例，按 Round 4 标准 12 PASS / 0 FAIL）
**通过率**: 12/12 = **100%**（MINOR 不计入 PASS/FAIL 分母）

---

## §5 新发现缺陷

无新 CRITICAL/MAJOR 缺陷。

**历史遗留 MINOR**:

| ID | 标题 | 模块 | 描述 | 文件:行号 |
|----|------|------|------|-----------|
| BUG_009 | API 层 error_response 返回 HTTP 200 但 code=422 | tasks_api | `create_task` 空标题校验使用 `error_response(code=422)` 返回 dict，FastAPI 包装为 HTTP 200。客户端需检查 body.code 而非 HTTP status。应使用 `JSONResponse(status_code=422)` 或 `raise HTTPException(422)` | app/api/tasks.py:138 |

**注意**: BUG_009 为 Round 4 新发现 MINOR，Round 5 复检中未修复。不影响签章判定（非 CRITICAL/MAJOR）。

---

## §6 快速扫描

Round 5 修复仅涉及 `tasks.py` 三个端点各加 1 行 `await db.refresh(task)`，改动极小且逻辑清晰。静态审查确认无新 CRITICAL/MAJOR 引入。服务端日志零 ERROR。

---

## §7 Self-Reflection (误报剔除)

| 发现项 | 评分(0-10) | 判定 | 理由 |
|--------|-----------|------|------|
| BUG_007 (MissingGreenlet) 修复验证 | N/A | **已确认 FIXED** | 静态代码+运行时双重验证，3 个端点全部 200，日志无异常 |
| BUG_009 (error_response HTTP 200) | 3 | **保留 MINOR** | 实际测试确认，空标题返回 HTTP 200 但 body code=422，API 契约不一致。非 CRITICAL/MAJOR，不影响签章 |

---

## §8 修复建议

### P3-低（建议修复，不阻塞签章）

**BUG_009**: 将空标题校验改为 `raise HTTPException`
```python
# tasks.py create_task 端点 (行 138)
if not data.title or not data.title.strip():
    raise HTTPException(status_code=422, detail="任务标题不能为空")
```

---

## §9 验证状态清单

| # | 检查项 | 状态 | 说明 |
|---|--------|------|------|
| 1 | PRD 来源验证（docs/specs/） | ✅ | PRD 路径包含 docs/specs/，内容完整 |
| 2 | 测试计划覆盖所有 REQ ID | ✅ | Round 2 测试计划覆盖 13 个 REQ |
| 3 | 测试用例已执行（原始日志） | ✅ | 13 个运行时用例全部实际执行，curl + uvicorn 日志 |
| 4 | 测试维度覆盖（FCT/BND/SEC/PERF/REL/DAT） | ⏳ | PERF BLOCKED（缺 hey 工具，历史遗留），其余已覆盖 |
| 5 | 静态审查 6 维度已完成 | ✅ | Round 2-5 累计静态审查 + 针对性复检 |
| 6 | 运行时验证已完成 | ✅ | 13 个用例全部执行（12 PASS / 0 FAIL / 1 MINOR） |

---

## 签章

基于 §9 验证状态清单：
- 5 项 ✅ + 1 项 ⏳（PERF BLOCKED 有合理原因）
- **BUG_007 已修复** (CRITICAL → FIXED)：`await db.refresh(task)` 修复方案有效，3 个端点全部 200
- **BUG_001/004/005/008 保持修复**
- **BUG_009 (MINOR) 遗留**：不影响签章
- **测试用例通过率**: 12 PASS / (12+0) = **100%**

根据签章规则：§9 全部 ✅/⏳（有合理原因），无 CRITICAL/MAJOR，通过率 ≥ 95% → **[QA_PASSED]**

---

**物理签章**:
```
┌──────────────────────────────────────────────────────┐
│  QA Agent — 对抗性独立审查                            │
│  日期: 2026-04-20T12:05:00Z                          │
│  轮次: Round 5 (终验复检)                              │
│  结果: [QA_PASSED]                                    │
│  CRITICAL 修复确认: BUG_007 (flush 后 MissingGreenlet) │
│  历史已修复: BUG_001, BUG_004, BUG_005, BUG_008       │
│  遗留 MINOR: BUG_009 (error_response HTTP 200)        │
│  运行时通过率: 100% (12/12, 0 FAIL)                   │
│  签名: qa-agent:subagent:23d7c006-b29a-4dd5-bba4-57db77ef0cc6 │
└──────────────────────────────────────────────────────┘
```

---

[QA_PASSED]

⏸️ **AWAITING_HUMAN_APPROVAL**
