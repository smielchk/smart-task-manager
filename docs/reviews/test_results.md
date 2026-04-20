# 测试结果 (Test Results)

> 生成时间: 2026-04-20T11:43:00Z
> 测试环境: SQLite 降级模式 (DATABASE_URL_OVERRIDE=sqlite+aiosqlite:///...)
> 后端端口: localhost:18000

## 1. 运行时测试结果 (Step 6 — PRD AC 驱动)

| 用例 ID | 场景 | 优先级 | 状态 | 偏差说明 |
|---------|------|--------|------|---------|
| RT_TC_001 | 用户注册密码校验 | P0 | **PASS** | 短密码422、纯数字422、合法密码200 |
| RT_TC_002 | 用户登录 JWT | P0 | **PASS** | 返回有效 JWT Token |
| RT_TC_003 | 创建任务校验+正常创建 | P0 | **PARTIAL** | 缺标题422 ✅；正常创建201 ✅；**含 due_datetime 创建时 500 Internal Server Error** — MissingGreenlet 异常 |
| RT_TC_004 | 编辑任务同步更新 | P0 | **PARTIAL** | PUT 返回 500，但查询确认数据已写入（commit 在错误前执行） |
| RT_TC_005 | 标记完成+重新打开 | P0 | **FAIL** | PATCH /status 返回 500 Internal Server Error — MissingGreenlet（datetime 赋值触发） |
| RT_TC_006 | 软删除+回收站 | P1 | **PARTIAL** | 软删除 200 ✅；默认列表不含 ✅；**include_deleted=true 仍只返回 1 条（应返回 2 条含已删除）** |
| RT_TC_007 | 列表排序 | P1 | **PASS** | 按优先级、创建时间、AI 智能排序均正常返回 |
| RT_TC_008 | 列表筛选 | P1 | **PASS** | 状态筛选、关键词搜索（URL编码后）均正常 |
| RT_TC_009 | 预设分类初始化 | P0 | **PASS** | 6 个预设分类全部存在（工作、生活、学习、健康、社交、财务） |
| RT_TC_010 | 分类 CRUD | P1 | **PASS** | 创建、更新、删除均 200 |
| RT_TC_011 | 标签 CRUD + 关联 | P1 | **PASS** | 标签创建、任务关联标签均正常 |
| RT_TC_012 | 认证保护 | P0 | **PASS** | 无 Token 401 ✅；无效 Token 401 ✅ |
| RT_TC_013 | 健康检查 | P1 | **PASS** | /api/health 200 ✅；/api/health/ai 返回 available=false ✅ |
| RT_TC_014 | NLP 降级 | P0 | **PASS** | 未配置 AI 时返回 ai_available=false |
| RT_TC_015 | 统计接口 | P1 | **PARTIAL** | trends 200 ✅；**summary 500 — `func.timestampdiff` 是 MySQL 特有函数，SQLite 不支持** |
| RT_TC_016 | 规划接口 | P0 | **PASS** | daily 返回推荐任务+工作量评估 ✅；weekly 返回空（无带截止时间任务） ✅ |
| RT_TC_017 | 设置 CRUD | P1 | **PASS** | 获取设置 200 ✅；更新设置 200（theme 变为 dark）✅ |
| RT_TC_018 | 偏好接口 | P1 | **PASS** | 获取偏好 200 ✅（days_of_data=0）；重置学习数据 200 ✅ |

**运行时通过率**: 18 用例 / 10 PASS / 5 PARTIAL / 2 FAIL / 1 PASS → **有效通过率 10/18 = 55.6%**（含部分通过的 AC 视为 PASS 则 15/18 = 83.3%）

## 2. QA 六维度测试结果 (Step 4 — 工具链)

### 2.1 FCT 维度 (功能正确性)

| 用例 ID | 场景 | 状态 | 备注 |
|---------|------|------|------|
| QA_FCT_001 | 任务 CRUD 全生命周期 | **FAIL** | 创建含 due_datetime 失败；编辑含 datetime 字段失败 |
| QA_FCT_002 | 注册→登录→受保护资源 | **PASS** | 全流程通过 |
| QA_FCT_003 | 分类初始化+增删 | **PASS** | 6 个预设分类存在，CRUD 正常 |
| QA_FCT_004 | 标签创建+关联+删除 | **PASS** | tag_ids 关联正常 |
| QA_FCT_005 | 任务状态流转 | **FAIL** | completed/pending 状态更新 500 |
| QA_FCT_006 | 设置修改持久化 | **PASS** | theme 修改成功 |
| QA_FCT_007 | 统计数据准确性 | **FAIL** | summary 500 |
| QA_FCT_008 | 偏好重置回退 | **PASS** | reset 返回成功 |

### 2.2 BND 维度 (边界与异常)

| 用例 ID | 场景 | 状态 | 备注 |
|---------|------|------|------|
| QA_BND_001 | 超长标题(300字符) | **FAIL** | 应拒绝（PRD 要求最大 200 字符），实际成功创建 — 模型/服务层缺少长度校验 |
| QA_BND_002 | 无效优先级 P99 | **PASS** | 返回 422 |
| QA_BND_003 | 空列表分页 page=999 | **PASS** | 返回空 items 数组 |
| QA_BND_004 | 不存在任务 ID 99999 | **PASS** | 返回 404 |
| QA_BND_005 | 重复用户名注册 | **PASS** | 返回 409 |
| QA_BND_006 | NLP 超长输入 | **FAIL** | AI 降级模式下不校验输入长度（500 字符限制未生效） |

### 2.3 SEC 维度 (安全性)

| 用例 ID | 场景 | 状态 | 备注 |
|---------|------|------|------|
| QA_SEC_001 | SQL 注入防护 | **PASS** | ORM 参数化查询，注入无效 |
| QA_SEC_002 | 无 Token/无效 Token | **PASS** | 均返回 401 |
| QA_SEC_003 | 密码不明文存储 | **PASS** | bcrypt 哈希 $2b$12$... |
| QA_SEC_004 | AI API Key 不暴露 | **PASS** | health/ai 未返回 key |
| QA_SEC_005 | CORS 配置 | **N/A** | 需浏览器测试，curl 无法验证 |

**bandit 扫描**: 3137 行代码，0 个安全问题。

### 2.4 PERF 维度 (性能)

| 用例 ID | 场景 | 状态 | 备注 |
|---------|------|------|------|
| QA_PERF_001 | CRUD API 响应时间 | **BLOCKED** | 无 hey 工具，SQLite 环境不具代表性 |
| QA_PERF_002 | 并发创建 | **BLOCKED** | 同上 |
| QA_PERF_003 | 列表查询性能 | **BLOCKED** | 同上 |

### 2.5 REL 维度 (可靠性与容错)

| 用例 ID | 场景 | 状态 | 备注 |
|---------|------|------|------|
| QA_REL_001 | AI 不可用时 CRUD 正常 | **PASS** | 未配置 AI Key 时 CRUD 正常 |
| QA_REL_002 | 错误响应格式统一 | **PARTIAL** | API 层错误用 success_response/error_response 统一 ✅；但 Pydantic 422 用 FastAPI 默认格式 ❌ |
| QA_REL_003 | 数据库连接异常 | **BLOCKED** | 已验证 SQLite 降级可用，MySQL 异常需环境支持 |

### 2.6 DAT 维度 (数据完整性)

| 用例 ID | 场景 | 状态 | 备注 |
|---------|------|------|------|
| QA_DAT_001 | 软删除不物理删除 | **PARTIAL** | 软删除后 deleted_at 被设置 ✅，但 include_deleted 查询逻辑有误 |
| QA_DAT_002 | 多标签关联 | **PASS** | task_tags 表记录正确 |
| QA_DAT_003 | 完成时间戳 | **FAIL** | 因 MissingGreenlet 无法验证 |
| QA_DAT_004 | created_at/updated_at | **PASS** | 返回数据中 created_at 和 updated_at 正确填充 |

## 3. 六维度汇总

| 维度 | 用例数 | PASS | FAIL | PARTIAL | BLOCKED | 通过率 |
|------|--------|------|------|---------|---------|--------|
| FCT | 8 | 5 | 3 | 0 | 0 | 62.5% |
| BND | 6 | 4 | 2 | 0 | 0 | 66.7% |
| SEC | 5 | 4 | 0 | 0 | 1 | 100%* |
| PERF | 3 | 0 | 0 | 0 | 3 | N/A |
| REL | 3 | 1 | 0 | 1 | 1 | 50% |
| DAT | 4 | 2 | 1 | 1 | 0 | 50% |
| **合计** | **29** | **16** | **6** | **2** | **5** | **55.2%** |

> *SEC 通过率排除 BLOCKED 用例
> *PERF 维度全部 BLOCKED（缺少 hey 工具 + SQLite 不具代表性）

## 4. 缺陷清单

| BUG ID | 严重等级 | 模块 | 描述 | 复现步骤 | 文件:行号 |
|--------|---------|------|------|---------|-----------|
| BUG_001 | [CRITICAL] | task_service | 含 due_datetime 的任务创建返回 500 MissingGreenlet | POST /api/tasks body 含 due_datetime 字符串 | app/services/task_service.py:58 (TaskCreate.due_datetime 为 str，直接赋给 DateTime 字段) |
| BUG_002 | [CRITICAL] | task_service | 任务状态更新(PATCH /status)返回 500 MissingGreenlet | PATCH /api/tasks/1/status {"status":"completed"} | app/services/task_service.py:103 (datetime.now() 赋值触发) |
| BUG_003 | [CRITICAL] | task_service | 任务编辑(PUT)返回 500 Internal Server Error | PUT /api/tasks/1 任意字段更新 | app/services/task_service.py:83 (due_datetime 字符串直接赋值) |
| BUG_004 | [MAJOR] | stats_service | /api/stats/summary 返回 500 — MySQL 特有函数 | GET /api/stats/summary?range=week | app/services/stats_service.py:136 (func.timestampdiff MySQL 专有) |
| BUG_005 | [MAJOR] | task_service | 软删除后 include_deleted=true 查询逻辑错误 | 删除任务后 GET /api/tasks?include_deleted=true | app/services/task_service.py:~158 (WHERE deleted_at IS NOT NULL 但 total 计数可能未正确处理) |
| BUG_006 | [MAJOR] | tasks_api | 任务标题超过 200 字符未被拒绝 | POST /api/tasks {"title":"AAA...300字符"} | app/services/task_service.py:58 (缺少 title 长度校验) |
| BUG_007 | [MINOR] | tasks_api | NLP 解析接口参数名与 test_plan 不一致 | POST /api/tasks/parse-nlp body 使用 input_text 而非 input | app/api/tasks.py:78 (NLPParseRequest.input_text vs test_plan 写的 input) |
| BUG_008 | [MINOR] | tasks_api | NLP 降级模式下未校验输入长度 | POST /api/tasks/parse-nlp {"input_text":"AAA...600字符"} — 降级时绕过校验 | app/api/tasks.py:88 |
| BUG_009 | [MINOR] | ruff | 48 个代码质量问题（未使用导入、未使用变量等） | ruff check app/ | 全项目 |
| BUG_010 | [MINOR] | mypy | 15 个类型错误（name-defined, return-value, var-annotated 等） | mypy app/ | app/services/preference_service.py:186,192, app/services/task_service.py:314 等 |
