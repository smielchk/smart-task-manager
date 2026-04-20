# Smart Task Manager — 代码评审报告 (Code Review)

> **评审人**: 系统架构师 (SA)
> **评审日期**: 2026-04-20
> **项目**: Smart Task Manager (TASK_MGMT v1.0.0)
> **评审范围**: 后端全模块 + 前端全模块 + 基础设施

---

## 1. 评审总结

| 维度 | 评价 | 说明 |
|------|------|------|
| 设计一致性 | ⚠️ 基本一致，存在 4 处偏差 | 代码整体遵循设计文档，部分 API 方法、环境变量命名、类型定义与设计不一致 |
| 需求覆盖 | ✅ 13 个需求锚点全部覆盖 | 所有 REQ_TASK_MGMT_001~013 均有对应源码实现 |
| 代码质量 | ⚠️ 存在 3 个中危 + 5 个低危问题 | 后端逻辑完整，但有安全隐患、类型不匹配、功能缺失 |
| 前端质量 | ⚠️ 存在 2 个中危 + 3 个低危问题 | 组件结构合理，但缺少文件、关键功能未完全实现 |
| 基础设施 | ❌ 存在 2 个阻断级问题 | .env 变量名错误 + nginx-frontend.conf 缺失导致 Docker 构建必定失败 |

**综合判定**: `[SA_REJECTED]` — 存在阻断级部署缺陷和中危安全问题，必须修复后方可通过。

---

## 2. 阻断级问题 (BLOCKER — 必须修复)

### B-001: `.env.example` 环境变量名与代码不匹配

**严重程度**: 🔴 阻断

**问题描述**: `.env.example` 中的 AI 配置变量名为 `AI_MODEL_URL` 和 `AI_MODEL_API_KEY`，但 `config.py` 中定义的是 `AI_BASE_URL` 和 `AI_API_KEY`。

**代码位置**:
- `.env.example` 第 14-15 行:
  ```
  AI_MODEL_URL=https://open.bigmodel.cn/api/paas/v4
  AI_MODEL_API_KEY=your_ai_api_key_here
  ```
- `config.py` 第 41-42 行:
  ```python
  AI_BASE_URL: str | None = None
  AI_API_KEY: str | None = None
  ```

**影响**: 用户按 `.env.example` 配置后，AI 功能永远无法启用。`AIClient.is_available()` 始终返回 `False`，所有 AI 功能静默降级。

**修复方案**: 将 `.env.example` 中的 `AI_MODEL_URL` 改为 `AI_BASE_URL`，`AI_MODEL_API_KEY` 改为 `AI_API_KEY`。

---

### B-002: 前端 Dockerfile 引用不存在的 `nginx-frontend.conf`

**严重程度**: 🔴 阻断

**问题描述**: 前端 `Dockerfile` 第 25 行尝试 COPY `nginx-frontend.conf`，但该文件在前端目录中不存在。同时前端容器没有挂载外部 nginx 配置，也没有配置 `try_files` SPA fallback。

**代码位置**: `frontend/Dockerfile` 第 25 行:
```dockerfile
COPY --from=builder /app/nginx-frontend.conf /etc/nginx/conf.d/default.conf
```

**影响**: `docker-compose build frontend` 必定失败。

**修复方案**: 创建 `frontend/nginx-frontend.conf` 文件，包含 SPA fallback 配置（`try_files $uri $uri/ /index.html`），或改为挂载 `src/nginx.conf`（但该文件中 `location /` 的 root 指向 `/usr/share/nginx/html`，与当前架构一致，可直接复用）。

---

## 3. 中危问题 (HIGH — 强烈建议修复)

### H-001: `POST /api/tasks/parse-nlp` 实际使用 GET 方法

**严重程度**: 🟠 中危

**问题描述**: 设计文档 §7.1 和 §7.2.1 明确定义 NLP 解析为 `POST /api/tasks/parse-nlp`，前端 `api/tasks.ts` 的 `parseNLP` 也用 `apiClient.get`。但 **自然语言输入包含用户自由文本，不应放在 URL Query 参数中**（存在 URL 长度限制和编码问题）。

**代码位置**:
- `backend/app/api/tasks.py` 第 70 行: `@router.get("/parse-nlp")`
- `frontend/src/api/tasks.ts` 第 53 行: `await apiClient.get('/tasks/parse-nlp', { params: { input_text: input, timezone } })`

**影响**: 用户输入超长时可能被浏览器截断（URL 限制约 2000 字符）；设计偏离。

**修复方案**: 将后端改为 `@router.post("/parse-nlp")`，前端改为 `apiClient.post('/tasks/parse-nlp', { input, timezone })`。同时注意路由注册顺序，`/parse-nlp` 必须在 `/{task_id}` 之前。

---

### H-002: `user_settings` 表 `work_days` 类型不一致

**严重程度**: 🟠 中危

**问题描述**: `init.sql` 第 94 行将 `work_days` 定义为 `JSON` 类型，但 ORM 模型 `models/settings.py` 第 18 行将其定义为 `String(20)`。

**代码位置**:
- `init.sql` 第 94 行: `work_days JSON DEFAULT NULL`
- `models/settings.py` 第 18 行: `work_days: Mapped[str] = mapped_column(String(20), default="1,2,3,4,5")`

**影响**: ORM 写入逗号分隔字符串（如 `"1,2,3,4,5"`），MySQL 将其存入 JSON 列时可能产生隐式类型转换问题；若使用 Alembic 迁移则可能冲突。

**修复方案**: 统一为 `String(20)` 或 `JSON` 类型。考虑到 `work_days` 当前以逗号分隔字符串使用，建议 `init.sql` 改为 `VARCHAR(20)`。

---

### H-003: `init.sql` 中 `categories` 表缺少 `updated_at` 字段

**严重程度**: 🟠 中危

**问题描述**: `init.sql` 第 22-32 行的 `categories` 表定义缺少 `updated_at` 字段，但 ORM 模型通过 `TimestampMixin` 包含了 `updated_at`。`tags` 表同样缺少 `updated_at`（第 37-45 行）。

**代码位置**:
- `init.sql` 第 22-32 行（categories 表）
- `init.sql` 第 37-45 行（tags 表）

**影响**: SQLAlchemy 查询时如果引用 `categories.updated_at` 将报列不存在的错误。可能导致 Alembic 迁移与手动 DDL 不一致。

**修复方案**: 在 `init.sql` 的 `categories` 和 `tags` 表定义中添加 `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`。

---

### H-004: 优先级排序 `sort == "priority"` 逻辑未实际实现

**严重程度**: 🟠 中危

**问题描述**: `task_service.py` 第 290 行，当 `sort == "priority"` 时，代码仍然使用 `Task.created_at.desc()` 排序，没有按优先级字段排序。

**代码位置**: `backend/app/services/task_service.py` 第 289-290 行:
```python
elif sort == "priority":
    priority_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    query = query.order_by(Task.created_at.desc())
```

**影响**: 用户选择"按优先级排序"时，实际按创建时间排序，功能无效。`priority_order` 变量被定义但未使用。

**修复方案**: 使用 `case` 表达式按优先级排序，如:
```python
from sqlalchemy import case
priority_case = case(
    (Task.priority == "P0", 0), (Task.priority == "P1", 1),
    (Task.priority == "P2", 2), (Task.priority == "P3", 3),
)
query = query.order_by(priority_case.asc() if sort_order == "asc" else priority_case.desc())
```

---

### H-005: 24 小时防重复提醒机制未实现

**严重程度**: 🟠 中危

**问题描述**: 设计文档 §4.2 明确要求"同一任务同类型提醒 24 小时内仅推送 1 次"，`init.sql` 中也创建了 `reminder_log` 表。但 `ReminderService.get_pending_reminders()` 没有查询 `reminder_log` 进行去重检查。

**代码位置**: `backend/app/services/reminder_service.py` 全文

**影响**: 前端每 15 分钟轮询一次 `pending-reminders`，未去重的话同一条提醒会反复出现，违反 [AC-005-03]。

**修复方案**: 在返回提醒前查询 `reminder_log` 表，过滤掉 24 小时内已推送的 `(task_id, reminder_type)` 组合，并在推送后写入 `reminder_log`。

---

## 4. 低危问题 (LOW — 建议修复)

### L-001: `config.py` JWT_SECRET 有默认值

**代码位置**: `config.py` 第 36 行: `JWT_SECRET: str = "change_this_secret_in_production"`

**影响**: 如果用户忘记配置，将使用不安全的默认密钥。PRD [REQ_TASK_MGMT_011] 要求 `JWT_SECRET` 必填。

**修复方案**: 去掉默认值或改为空字符串，在启动时校验 `JWT_SECRET` 非空。

---

### L-002: `DB_USER` 有默认值 `root`

**代码位置**: `config.py` 第 26 行: `DB_USER: str = "root"`

**影响**: 设计文档 §5.1 要求 `DB_USER` 为必填（无默认值）。默认使用 root 不符合最小权限原则。

**修复方案**: 去掉默认值。

---

### L-003: `UserBehaviorLog.created_at` 类型定义为 `Mapped[str]` 但应为 `Mapped[datetime]`

**代码位置**: `models/behavior.py` 第 23 行: `created_at: Mapped[str] = mapped_column(DateTime, ...)`

**影响**: `Mapped[str]` 与 `DateTime` 列类型不匹配，可能导致序列化/反序列化问题。

**修复方案**: 改为 `Mapped[datetime]`。

---

### L-004: `AIPriorityCache.calculated_at` 同样为 `Mapped[str]` 应为 `Mapped[datetime]`

**代码位置**: `models/ai_cache.py` 第 13 行: `calculated_at: Mapped[str] = mapped_column(DateTime, ...)`

**修复方案**: 同 L-003。

---

### L-005: `categories` 表 `updated_at` 在 `init.sql` 中缺失（同 H-003）

已在 H-003 中记录。

---

### L-006: `requirements.txt` 中 `httpx` 重复

**代码位置**: `requirements.txt` 第 14 行和第 19 行

**修复方案**: 删除重复行。

---

### L-007: 看板拖拽使用原生 HTML5 Drag API 而非 `@dnd-kit`

**代码位置**: `frontend/src/pages/Kanban/index.tsx` 使用 `React.DragEvent` 和 `dataTransfer`

**影响**: 设计文档 §2.1.2 明确要求使用 `@dnd-kit/core` + `@dnd-kit/sortable`。原生拖拽 API 功能有限（不支持触屏、无动画、无自动排序）。

**修复方案**: 重构 KanbanColumn 和 KanbanCard 使用 @dnd-kit。

---

### L-008: 前端 `ParsePreview` 创建任务时缺少 `category_id` 映射

**代码位置**: `frontend/src/pages/Tasks/ParsePreview.tsx` 第 37-48 行

**问题描述**: `createTask` 调用时传入 `category` 字符串而非 `category_id` 数字。后端 `TaskCreate` schema 期望的是 `category_id: int | None`。

**影响**: AI 解析出的分类名称无法正确关联到分类 ID，任务将以无分类状态创建。

---

### L-009: TaskSortSelector 未实现 localStorage 持久化

**代码位置**: `frontend/src/pages/Tasks/TaskSortSelector.tsx` 全文

**问题描述**: 组件接受外部 `value` 和 `onChange` props，但组件本身不存储排序偏好到 localStorage。[AC-004-05] 要求排序偏好持久化。

---

### L-010: Nginx 配置中前端静态文件路径错误

**代码位置**: `nginx.conf` 第 16 行: `root /usr/share/nginx/html;`

**问题描述**: 当前架构中，前端静态文件由 `frontend` 容器的 Nginx 服务，但 `nginx.conf`（由最外层 Nginx 容器使用）的 `location /` 也尝试服务静态文件。`frontend` 容器未暴露端口给外层 Nginx 代理，导致 `location /` 无法访问前端静态文件。

**修复方案**: 外层 Nginx 应通过 `proxy_pass` 转发前端请求到 `frontend` 容器，或将前端构建产物也挂载到外层 Nginx。

---

## 5. 需求覆盖验证（防幻觉审计）

以下对 `traceability_manifest.json` 中的关键映射进行物理验证：

| 需求 ID | 声明的源文件 | 物理验证结果 |
|---------|-------------|-------------|
| REQ_001 TaskService | `services/task_service.py` | ✅ `create_task`, `update_task`, `update_status`, `soft_delete`, `restore`, `get_task_list` 全部实现 |
| REQ_002 NLPParser | `ai/nlp_parser.py` | ✅ `NLPParser.parse` 实现完整，含双重 JSON 解析降级 |
| REQ_002 SmartCreate | `pages/Tasks/SmartCreate.tsx` | ✅ 组件实现，含 AI 可用性检查和手动创建入口 |
| REQ_002 ParsePreview | `pages/Tasks/ParsePreview.tsx` | ✅ 组件实现，支持修改确认 |
| REQ_003 Classifier | `ai/classifier.py` | ✅ 含 70% 阈值检查 |
| REQ_003 TagService.merge_tags | `services/tag_service.py` | ✅ 关联迁移 + 源标签删除 |
| REQ_004 PriorityEngine | `ai/priority_engine.py` | ✅ 批量评分实现 |
| REQ_004 fallback_priority | `ai/fallback_priority.py` | ✅ 规则引擎降级实现 |
| REQ_004 daily_priority_recalc | `scheduler/jobs/daily_priority_recalc.py` | ✅ 含 AI/规则引擎降级 |
| REQ_005 ReminderService | `services/reminder_service.py` | ⚠️ 实现了层1/2/3，但**缺少层4（习惯时段提醒）和24h去重** |
| REQ_006 PlanningEngine | `ai/planning_engine.py` | ✅ 实现完整 |
| REQ_007 Kanban | `pages/Kanban/index.tsx` | ⚠️ 三列展示实现，但拖拽使用原生 API 而非 @dnd-kit |
| REQ_008 Calendar | `pages/Calendar/index.tsx` | ✅ 月/周切换实现 |
| REQ_009 StatsService | `services/stats_service.py` | ✅ 7 项指标 + 趋势查询 |
| REQ_010 PreferenceService | `services/preference_service.py` | ✅ 含 7 天冷启动检查 |
| REQ_010 daily_learning | `scheduler/jobs/daily_learning.py` | ✅ 03:00 定时任务 |
| REQ_011 JWT 中间件 | `middleware/__init__.py` | ✅ `JWTAuthMiddleware` 实现完整 |
| REQ_011 单用户约束 | `api/auth.py` | ✅ `register` 中检查 `user_count > 0` |
| REQ_011 AuthGuard | `components/Layout/AuthGuard.tsx` | ✅ 路由守卫实现 |
| REQ_012 AIClient | `ai/client.py` | ✅ 含 `is_available()` 和 `check_connection()` |
| REQ_012 ai_retry | `ai/retry.py` | ✅ 重试装饰器实现 |
| REQ_012 AIDegradationMixin | `ai/degradation.py` | ✅ 降级混入实现 |
| REQ_012 health/ai | `api/health.py` | ✅ 端点实现 |
| REQ_013 init_db | `database.py` | ✅ 连接失败 `SystemExit(1)` |
| REQ_013 .env.example | `backend/.env.example` | ❌ 变量名错误（见 B-001） |

**结论**: `traceability_manifest.json` 中 13 个需求锚点的映射基本真实，未发现"发票造假"。但部分映射声明的功能质量不达标（如 REQ_005 缺少去重、REQ_007 拖拽方案偏离、REQ_013 环境变量错误）。

---

## 6. 设计一致性审计

| 设计文档要求 | 代码实现 | 一致性 |
|-------------|---------|--------|
| §7.1: `POST /api/tasks/parse-nlp` | `GET /api/tasks/parse-nlp` | ❌ 偏差 |
| §7.1: 32 个 API 端点 | 后端实际实现 31 个端点（缺 `POST /api/tasks/parse-nlp` 的 POST 版本） | ⚠️ |
| §2.1.9: AIClient 使用 `AsyncOpenAI` | ✅ 代码一致 | ✅ |
| §6.1: AI 不可用时前端隐藏 AI 入口 | SmartCreate 组件检查 AI 可用性 | ✅ |
| §2.1.2: 拖拽使用 @dnd-kit | 使用原生 HTML5 Drag API | ❌ 偏差 |
| §2.1.8: 统一响应 `{"code": int, "message": str, "data": Any}` | ✅ `response.py` 实现 | ✅ |
| §5.1: `AI_BASE_URL` 选填 | ✅ config.py 正确 | ✅ |
| §5.1: `DB_USER` 必填 | ❌ 有默认值 `root` | ⚠️ |
| §12.1: `user_settings.updated_at` | ORM 有，init.sql 缺 | ❌ 偏差 |

---

## 7. 安全性审计

| 检查项 | 结果 | 说明 |
|-------|------|------|
| 密码 bcrypt 哈希 | ✅ | `passlib.hash.bcrypt` |
| JWT HS256 签名 | ✅ | `python-jose` |
| ORM 参数化查询 | ✅ | SQLAlchemy |
| JWT_SECRET 默认值 | ❌ | 有不安全默认值（L-001） |
| AI API Key 不暴露到前端 | ✅ | 仅在后端 .env |
| CORS 配置 | ✅ | 可配置 |
| 输入校验 | ✅ | Pydantic 校验 title/password |

---

## 8. 基础设施审计

| 检查项 | 结果 | 说明 |
|-------|------|------|
| docker-compose 编排 | ✅ | mysql + backend + frontend + nginx 四容器 |
| MySQL healthcheck | ✅ | `service_healthy` 条件 |
| 后端 Dockerfile | ✅ | Python 3.11 + pip install + uvicorn |
| 前端 Dockerfile | ❌ | 缺少 `nginx-frontend.conf`（B-002） |
| Nginx 反代配置 | ⚠️ | `/api/` 代理正确，但 `location /` 无法访问前端（L-010） |
| .env.example | ❌ | AI 变量名错误（B-001） |
| init.sql | ⚠️ | categories/tags 缺 `updated_at`（H-003），work_days 类型不一致（H-002） |
| requirements.txt | ⚠️ | httpx 重复（L-006） |

---

## 9. 修复优先级排序

| 优先级 | 编号 | 问题 | 预估工时 |
|-------|------|------|---------|
| P0 | B-001 | .env 变量名错误 | 5 min |
| P0 | B-002 | 前端 nginx-frontend.conf 缺失 | 15 min |
| P1 | H-001 | parse-nlp GET→POST | 10 min |
| P1 | H-002 | work_days 类型不一致 | 5 min |
| P1 | H-003 | categories/tags 缺 updated_at | 5 min |
| P1 | H-004 | priority 排序未实现 | 15 min |
| P1 | H-005 | 提醒 24h 去重缺失 | 30 min |
| P2 | L-001 | JWT_SECRET 默认值 | 5 min |
| P2 | L-002 | DB_USER 默认值 | 5 min |
| P2 | L-003/004 | datetime 类型错误 | 5 min |
| P2 | L-006 | httpx 重复 | 2 min |
| P2 | L-007 | @dnd-kit 替换原生拖拽 | 2h |
| P2 | L-008 | ParsePreview category 映射 | 20 min |
| P2 | L-009 | TaskSortSelector localStorage | 15 min |
| P2 | L-010 | Nginx 前端代理路径 | 20 min |

**P0 总修复时间**: 约 20 分钟
**P1 总修复时间**: 约 65 分钟
**P2 总修复时间**: 约 3 小时

---

## 10. 评审结论

代码整体架构设计合理，分层清晰，AI 降级策略（重试 + 规则引擎 fallback + 配置检查）实现完整。需求覆盖率高，13 个需求锚点均有对应实现，未发现"发票造假"。

但存在 **2 个阻断级部署缺陷**（环境变量名错误、Docker 构建文件缺失）和 **5 个中危功能缺陷**（排序逻辑无效、提醒去重缺失、类型不匹配等），必须修复后方可通过评审。

建议 Coder 优先修复 P0 和 P1 问题后提交二次评审。

---

---

## 11. 二次代码评审 (CR Round 2)

> **评审日期**: 2026-04-20
> **评审范围**: 针对 Round 1 发现的 2 个 P0 + 5 个 P1 问题逐项物理验证

### 验证结果汇总

| 编号 | 问题摘要 | 修复状态 | 验证依据 |
|------|---------|---------|--------|
| B-001 | `.env.example` 变量名统一为 `AI_BASE_URL`/`AI_API_KEY` | ✅ 已修复 | `.env.example` 第 14-15 行已改为 `AI_BASE_URL`/`AI_API_KEY`，与 `config.py` 第 41-42 行一致 |
| B-002 | 前端 `nginx-frontend.conf` 已创建 | ✅ 已修复 | `frontend/nginx-frontend.conf` 存在（601 字节），含 `try_files $uri $uri/ /index.html` SPA fallback + gzip + 静态资源缓存 |
| H-001 | NLP parse-nlp 端点改为 POST | ✅ 已修复 | `backend/app/api/tasks.py` 第 76 行 `@router.post("/parse-nlp")`；`frontend/src/api/tasks.ts` 第 57 行 `apiClient.post('/tasks/parse-nlp', { input_text: input, timezone })` |
| H-002 | `user_settings.work_days` 统一为 VARCHAR | ✅ 已修复 | `init.sql` 第 96 行 `work_days VARCHAR(20) DEFAULT NULL`；`models/settings.py` 第 18 行 `String(20)`，类型一致 |
| H-003 | categories/tags 表补上 `updated_at` | ✅ 已修复 | `init.sql` categories 表第 34 行、tags 表第 46 行均已添加 `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |
| H-004 | 优先级排序修复为按 priority_score | ✅ 已修复 | `task_service.py` 第 290-300 行使用 `sa_case` 表达式将 P0→0, P1→1, P2→2, P3→3 映射后排序，支持升序/降序 |
| H-005 | 24h 防重复提醒实现 | ✅ 已修复 | `models/reminder_log.py` 定义 `ReminderLog` 模型；`reminder_service.py` 第 34-45 行查询 24h 去重，第 130-132 行批量写入日志 |

### 详细验证说明

**B-001**: `.env.example` 第 14 行 `AI_BASE_URL`，第 15 行 `AI_API_KEY`。与 `config.py` 第 41-42 行完全对齐。✅

**B-002**: `nginx-frontend.conf` 包含 SPA fallback、gzip 压缩、静态资源缓存。`frontend/Dockerfile` 的 COPY 指令现在能正确找到文件。✅

**H-001**: 后端 `@router.get` → `@router.post`（第 76 行），前端 `apiClient.get` + params → `apiClient.post` + JSON body。与设计文档 §7.1 对齐。✅

**H-002**: `init.sql` 第 96 行 `VARCHAR(20)`，ORM `String(20)`，类型一致。✅

**H-003**: categories 第 34 行、tags 第 46 行均补充 `updated_at`，与 ORM `TimestampMixin` 对齐。✅

**H-004**: `sqlalchemy.case` 表达式（第 291-297 行）替换了未使用的 `priority_order` 字典，支持 `sort_order` 控制升/降序。✅

**H-005**: ① `ReminderLog` 模型（`reminder_log.py`）；② 查询去重（第 34-45 行，24h 窗口内 `(task_id, reminder_type)` 集合）；③ 批量写入（第 130-132 行）。三层提醒均实现去重。✅

### Round 2 结论

Round 1 发现的 **7 个问题（2 P0 + 5 P1）全部修复到位**，代码物理验证通过。

`[SA_APPROVED]`
