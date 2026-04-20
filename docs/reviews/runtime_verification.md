# 运行时验证报告 (Runtime Verification)

> 验证时间: 2026-04-20
> 验证方法: 逐条执行 test_plan.md §5 的 18 个 PRD AC 驱动用例
> 环境: SQLite 降级模式，无 AI API Key，localhost:18000

## 验证环境
- Python 3.11, uvicorn, FastAPI
- 数据库: SQLite (aiosqlite) — 降级模式
- AI: 未配置，全部 AI 功能降级
- 无 Docker, 无 MySQL

## 用例执行详情

### RT_TC_001: 用户注册密码校验 ✅ PASS
- **AC-011-01** | P0
- 反向-短密码(3位): 返回 422 `密码长度不能少于 8 位` ✅
- 反向-纯数字(8位): 返回 422 `密码需包含至少一个字母` ✅
- 正向-合法密码: 返回 201, user 对象 + token ✅

### RT_TC_002: 用户登录 JWT ✅ PASS
- **AC-011-02** | P0
- POST /api/auth/login: 返回 200, JWT Token (eyJhbGci...) ✅
- Token 格式: HS256 签名, 含 sub=1, exp=7天后 ✅

### RT_TC_003: 创建任务校验+正常创建 ⚠️ PARTIAL
- **AC-001-01** ✅ | **AC-001-02** ⚠️ | P0
- 缺标题: 返回 422 `Field required` ✅
- 正常创建(无 due_datetime): 返回 201, 字段完整 ✅
- **创建(含 due_datetime): 500 Internal Server Error** ❌ — `sqlalchemy.exc.MissingGreenlet`
  - 原因: TaskCreate.due_datetime 为 str 类型，直接赋给 Task(DateTime 字段)，SQLite async 需要显式转换

### RT_TC_004: 编辑任务同步更新 ⚠️ PARTIAL
- **AC-001-03** ⚠️ | P0
- PUT /api/tasks/1: 返回 500 Internal Server Error ❌
- 但 GET /api/tasks/1 查询确认: title="完成月报", priority="P0" — 数据已写入
- 原因: PUT handler 中 `await db.commit()` 在 `_task_to_dict` 前执行，但 `_task_to_dict` 失败导致 500

### RT_TC_005: 标记完成+重新打开 ❌ FAIL
- **AC-001-05** ❌ | **AC-001-06** ❌ | P0
- PATCH /api/tasks/1/status {"status":"completed"}: 500 Internal Server Error
- 原因: `task.completed_at = datetime.now(timezone.utc)` 在异步上下文中触发 MissingGreenlet
- 无法验证 completed_at 自动填充和清空

### RT_TC_006: 软删除+回收站 ⚠️ PARTIAL
- **AC-001-04** ⚠️ | P1
- DELETE /api/tasks/2: 200 ✅
- 默认列表(不含删除): 1 条 ✅
- include_deleted=true: **仍只返回 1 条** ❌ (预期 2 条)
- 原因: get_task_list 中 include_deleted 的 WHERE 条件逻辑可能反了

### RT_TC_007: 列表排序 ✅ PASS
- **AC-001-07** | P1
- sort=priority&sort_order=asc: 返回按优先级排序 ✅
- sort=created_at&sort_order=desc: 返回按创建时间倒序 ✅
- sort=smart: 使用 AIPriorityCache 外连接排序 ✅

### RT_TC_008: 列表筛选 ✅ PASS
- **AC-001-08** | P1
- status=pending: 正确过滤 ✅
- keyword=月报(URL编码): 正确搜索 ✅

### RT_TC_009: 预设分类初始化 ✅ PASS
- **AC-003-01** | P0
- 返回 6 个预设分类: 工作💼、生活🏠、学习📚、健康💪、社交🤝、财务💰 ✅
- is_default=true ✅

### RT_TC_010: 分类 CRUD ✅ PASS
- **AC-003-04/05** | P1
- 创建自定义分类: 201 ✅
- 更新: 200 ✅
- 删除: 200 ✅

### RT_TC_011: 标签 CRUD + 多标签关联 ✅ PASS
- **AC-003-06** | P1
- 创建标签"紧急": 201 ✅
- 创建任务关联 tag_ids=[1]: tags 数组含 {"id":1,"name":"紧急"} ✅

### RT_TC_012: 认证保护 ✅ PASS
- **安全需求** | P0
- 无 Token: 401 "未提供有效的认证凭据" ✅
- 无效 Token: 401 "Token 已过期或无效" ✅

### RT_TC_013: 健康检查 ✅ PASS
- **AC-012-04** | P1
- /api/health: {"status":"ok","version":"1.0.0"} ✅
- /api/health/ai: {"available":false,"reason":"AI_BASE_URL or AI_API_KEY not configured"} ✅

### RT_TC_014: NLP 降级 ✅ PASS
- **AC-002-05** | P0
- 未配置 AI 时: {"ai_available":false,"parsed_task":null} ✅
- 注意: 接口参数名为 `input_text`，非 PRD 描述中的 `input`

### RT_TC_015: 统计接口 ⚠️ PARTIAL
- **AC-009-01** ⚠️ | P1
- /api/stats/trends: 200, 返回 7 天趋势数据 ✅
- /api/stats/summary: **500 Internal Server Error** ❌ — `func.timestampdiff` MySQL 专有函数

### RT_TC_016: 规划接口 ✅ PASS
- **AC-006-01** | P0
- /api/planning/daily: 返回推荐任务列表 + 工作量评估(load_percentage=12.5%) ✅
- /api/planning/weekly: 返回空 tasks_by_day（无带截止时间的未完成任务）✅

### RT_TC_017: 设置 CRUD ✅ PASS
- **AC-011-04** | P1
- GET /api/settings: 返回完整设置对象 ✅
- PUT /api/settings: theme 从 light 变为 dark ✅

### RT_TC_018: 偏好接口 ✅ PASS
- **AC-010-07** | P1
- GET /api/preferences: days_of_data=0, 全部 null（使用默认值不报错）✅
- POST /api/preferences/reset: {"message":"学习数据已重置"} ✅

## 结果汇总

| 结果 | 数量 | 用例 |
|------|------|------|
| ✅ PASS | 10 | RT_TC_001,002,007,008,009,010,011,012,013,016,017,018 |
| ⚠️ PARTIAL | 5 | RT_TC_003,004,006,014,015 |
| ❌ FAIL | 2 | RT_TC_005,014 |

> 注: RT_TC_014 核心逻辑 PASS，标注 PASS（降级行为正确）
> 重新统计: 12 PASS / 3 PARTIAL / 1 FAIL

## 环境限制说明
1. **MySQL 不可用**: 使用 SQLite 降级，部分 MySQL 专有功能不可测
2. **AI 不可用**: 未配置 API Key，AI 相关功能均降级测试
3. **PERF 工具缺失**: 无 hey 二进制，性能测试 BLOCKED
4. **CORS 验证**: curl 无法测试 CORS 行为
