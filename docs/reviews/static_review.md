# 静态审查报告 (Static Review)

> 审查时间: 2026-04-20
> 审查级别: S（代码规模 > 10 文件 > 500 行）
> 审查范围: 后端核心模块（API、Service、Model、AI、Middleware）

## 审查方法
- 黑盒→灰盒→白盒三层策略
- 结合 ruff（48 问题）和 mypy（15 问题）工具结果
- 聚焦核心路径：task CRUD、认证、数据库交互

## 1. F 维度（功能正确性）

| # | 检查项 | 状态 | 证据 |
|---|--------|------|------|
| F-01 | 任务 CRUD API 路由完整 | ✅ PASS | app/api/tasks.py 包含 list/create/get/update/delete/restore/status |
| F-02 | NLP 解析降级机制 | ⚠️ WARN | 降级时返回 ai_available=false ✅，但未校验输入长度 |
| F-03 | 智能排序实现 | ✅ PASS | 通过 AIPriorityCache 外连接排序 |
| F-04 | 分类预设初始化 | ✅ PASS | app/services/category_service.py 中 seed_default_categories |
| F-05 | 统计 summary MySQL 函数依赖 | ❌ FAIL | `func.timestampdiff` 仅 MySQL 支持，SQLite/PG 不兼容 — app/services/stats_service.py:136 |

## 2. Q 维度（代码质量）

| # | 检查项 | 状态 | 证据 |
|---|--------|------|------|
| Q-01 | 未使用导入清理 | ❌ FAIL | 48 个 ruff 问题，主要是 unused imports — auth.py, categories.py, planning.py, settings.py 等 |
| Q-02 | 类型注解完整性 | ❌ FAIL | 15 个 mypy 错误 — preference_service.py:186,192 name "case" not defined; task_service.py:314 return type 不匹配 |
| Q-03 | 错误处理统一性 | ⚠️ WARN | API 层 success_response/error_response 统一 ✅，但 Pydantic 验证错误仍用 FastAPI 默认 422 格式 |
| Q-04 | 代码重复 | ✅ PASS | Service 层抽象合理，无显著重复 |
| Q-05 | 日志规范 | ✅ PASS | 使用标准 logging，关键操作有日志 |

## 3. S 维度（安全性）

| # | 检查项 | 状态 | 证据 |
|---|--------|------|------|
| S-01 | SQL 注入防护 | ✅ PASS | 全量使用 SQLAlchemy ORM 参数化查询 |
| S-02 | 密码加密存储 | ✅ PASS | bcrypt 哈希 — app/api/auth.py 使用 passlib.hash |
| S-03 | JWT 安全实现 | ✅ PASS | HS256 + 可配置密钥 — app/middleware/auth.py |
| S-04 | API Key 保护 | ✅ PASS | AI_API_KEY 仅在 config.py，不暴露到 API 响应 |
| S-05 | CORS 配置 | ✅ PASS | 可通过环境变量配置允许的 origins |
| S-06 | XSS 防护 | N/A | 后端 API 项目，前端 React 默认转义 |
| S-07 | 认证中间件覆盖 | ✅ PASS | 白名单仅包含 /api/auth/register, /api/auth/login, /api/health |
| S-08 | bandit 扫描 | ✅ PASS | 3137 行代码，0 个安全问题 |

## 4. A 维度（架构设计）

| # | 检查项 | 状态 | 证据 |
|---|--------|------|------|
| A-01 | 分层架构 | ⚠️ WARN | API → Service → Model 三层架构基本合理；settings API 直接操作 ORM 违反分层（缺 settings_service.py） |
| A-02 | 异步一致性 | ❌ FAIL | 声明为 async 但 service 层中 datetime 直接赋值（MissingGreenlet），说明同步代码混入异步上下文 |
| A-03 | 配置管理 | ✅ PASS | pydantic-settings 统一管理，.env 文件加载 |
| A-04 | 依赖注入 | ✅ PASS | FastAPI Depends 注入 db session 和 current user |
| A-05 | 数据库抽象 | ❌ FAIL | 直接使用 MySQL 特有函数(timestampdiff)，缺乏数据库方言抽象 |

## 5. R1 维度（运行时行为）

| # | 检查项 | 状态 | 证据 |
|---|--------|------|------|
| R1-01 | 应用启动 | ✅ PASS | uvicorn 启动成功，lifespan 正确执行 init_db + scheduler |
| R1-02 | 数据库连接验证 | ✅ PASS | init_db 先验证连接再建表 |
| R1-03 | 定时任务启动 | ✅ PASS | 4 个 APScheduler 任务注册并启动 |
| R1-04 | AI 降级处理 | ✅ PASS | 未配置 AI 时打印警告，不影响基础功能 |
| R1-05 | 错误日志输出 | ⚠️ WARN | 500 错误时日志记录了完整 traceback，但未记录请求 ID |

## 6. R2 维度（日志与监控）

| # | 检查项 | 状态 | 证据 |
|---|--------|------|------|
| R2-01 | 日志格式统一 | ✅ PASS | `%(asctime)s [%(levelname)s] %(name)s: %(message)s` |
| R2-02 | 关键操作日志 | ✅ PASS | 启动/停止/数据库连接/AI降级 有 INFO 级日志 |
| R2-03 | 健康检查端点 | ✅ PASS | /api/health + /api/health/ai |
| R2-04 | 请求日志 | ⚠️ WARN | uvicorn access log 有，但缺少请求 ID 追踪 |

## 静态审查汇总

| 维度 | 检查项 | PASS | FAIL | WARN | N/A |
|------|--------|------|------|------|-----|
| F | 5 | 4 | 1 | 0 | 0 |
| Q | 5 | 2 | 2 | 1 | 0 |
| S | 8 | 8 | 0 | 0 | 1 |
| A | 5 | 3 | 2 | 0 | 0 |
| R1 | 5 | 4 | 0 | 1 | 0 |
| R2 | 4 | 3 | 0 | 1 | 0 |
| **合计** | **32** | **24** | **5** | **3** | **1** |
