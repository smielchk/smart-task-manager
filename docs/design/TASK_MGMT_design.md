# Smart Task Manager 架构设计

> **项目名称**: Smart Task Manager（智能任务管理器）
> **特性标识**: TASK_MGMT
> **版本**: v1.0.0
> **编写日期**: 2026-04-20
> **编写人员**: 架构师 (SA)
> **项目模式**: Standard（全新项目）

---

## 1. 设计概述

### 1.1 设计目标

为 Smart Task Manager 构建一套 B/S 架构的完整技术蓝图，覆盖从用户认证、任务 CRUD 到 AI 智能分析的全链路。核心目标：

1. **AI 深度融合**：AI 不是附属功能，而是贯穿任务全生命周期的核心能力层，需要清晰的能力抽象与降级策略。
2. **优雅降级**：AI 模型不可用时，系统仍可提供完整的任务 CRUD、手动分类、手动排序等基础能力。
3. **单用户架构，多用户预留**：本期明确单用户约束，但数据模型在 `user_id` 层面预留扩展能力。
4. **前后端分离**：React SPA + FastAPI RESTful API，通过 Nginx 反代统一入口。

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| 关注点分离 | 前端负责视图与交互，后端负责业务逻辑与数据持久化，AI 能力封装为独立服务层 |
| 接口契约化 | 所有 API 以 OpenAPI 3.0 规范定义，前后端严格按契约开发 |
| 渐进式 AI 融入 | AI 能力通过配置开关控制，不配置则自动降级，不阻塞核心功能 |
| 防御性设计 | AI 调用超时/失败/返回非法数据均有明确处理路径，杜绝异常传播到用户界面 |
| 最小权限 | 后端 API Key、JWT Secret 等敏感信息仅存在于后端环境变量，绝不暴露到前端 |

### 1.3 架构分层

系统采用经典三层架构 + AI 能力层的四层模型：

```
┌─────────────────────────────────────────────────────┐
│                   前端展示层 (React SPA)              │
│  Pages / Components / State (Zustand) / API Client  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST (JSON)
┌──────────────────────▼──────────────────────────────┐
│                   API 路由层 (FastAPI Router)         │
│  Auth / Tasks / Categories / Tags / Planning /      │
│  Stats / Settings / Preferences / Health            │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────────┐ ┌──────────▼──────────────────┐
│   业务逻辑层         │ │   AI 能力层                  │
│  (Services)         │ │  (AI Engine)                 │
│  - TaskService      │ │  - NLP Parser                │
│  - CategoryService  │ │  - Classifier                │
│  - TagService       │ │  - Priority Engine           │
│  - PlanningService  │ │  - Reminder Engine           │
│  - StatsService     │ │  - Suggestion Engine         │
│  - PreferenceService│ │  - Prompt Builder            │
│  - BehaviorLogSvc   │ │  - Retry Decorator           │
└──────────┬──────────┘ └──────────┬──────────────────┘
           │                       │
┌──────────▼──────────────────────▼──────────────────┐
│                  数据访问层 (SQLAlchemy ORM)          │
│  Models / Repositories / Migrations (Alembic)       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              MySQL 8.0 (数据持久化)                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│            定时任务层 (APScheduler)                    │
│  - 每日优先级重算  - 每日习惯学习  - 每日规划刷新      │
│  - 提醒检查 (每 15 分钟)                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              外部 AI 模型 API                          │
│  GLM-4 / 通义千问 (通过 .env 配置)                    │
└─────────────────────────────────────────────────────┘
```

---

## 2. 模块设计

### 2.1 新增模块

#### 2.1.1 前端：任务列表模块 `frontend/src/pages/Tasks/`

**职责**: 任务 CRUD 全流程交互，包含列表视图、智能创建入口、筛选/排序/分页控制。

**核心组件**:
```
Tasks/
├── index.tsx              # 任务列表主页面（路由 /tasks）
├── TaskList.tsx           # 任务列表渲染 + 虚拟滚动
├── TaskForm.tsx           # 任务创建/编辑表单（Modal 抽屉）
├── SmartCreate.tsx        # 自然语言智能创建入口
├── ParsePreview.tsx       # AI 解析结果预览卡片
├── TaskFilter.tsx         # 筛选栏（分类/标签/状态/关键词）
├── TaskSortSelector.tsx   # 排序方式选择器（AI 排序/手动排序）
└── TaskDetail.tsx         # 任务详情侧边抽屉
```

**需求追溯**: [REQ_TASK_MGMT_001] [REQ_TASK_MGMT_002] [REQ_TASK_MGMT_004]

---

#### 2.1.2 前端：看板视图模块 `frontend/src/pages/Kanban/`

**职责**: 三列看板视图（待办/进行中/已完成），支持拖拽任务卡片在列间移动。

**核心组件**:
```
Kanban/
├── index.tsx              # 看板主页面（路由 /kanban）
├── KanbanColumn.tsx       # 单列容器
├── KanbanCard.tsx         # 任务卡片
└── KanbanHeader.tsx       # 统计摘要
```

**拖拽方案**: 使用 `@dnd-kit/core` + `@dnd-kit/sortable` 实现跨列拖拽。

**需求追溯**: [REQ_TASK_MGMT_007]

---

#### 2.1.3 前端：日历视图模块 `frontend/src/pages/Calendar/`

**职责**: 月历/周历视图，展示任务截止时间分布。

**核心组件**:
```
Calendar/
├── index.tsx              # 日历主页面（路由 /calendar）
├── MonthView.tsx          # 月视图
├── WeekView.tsx           # 周视图
└── DayTasks.tsx           # 日期任务列表（点击日期弹出）
```

**日历组件**: 基于 Ant Design `Calendar` 组件二次封装，自定义日期单元格渲染。

**需求追溯**: [REQ_TASK_MGMT_008]

---

#### 2.1.4 前端：时间规划模块 `frontend/src/pages/Planning/`

**职责**: 展示 AI 生成的每日/每周任务规划建议。

**核心组件**:
```
Planning/
├── index.tsx              # 规划主页面（路由 /planning）
├── DailyPlan.tsx          # 今日规划 Tab
├── WeeklyPlan.tsx         # 本周规划 Tab（甘特图/时间轴）
├── WorkloadIndicator.tsx  # 工作量评估条
└── PlanTimeline.tsx       # 时间轴组件
```

**需求追溯**: [REQ_TASK_MGMT_006]

---

#### 2.1.5 前端：统计看板模块 `frontend/src/pages/Stats/`

**职责**: 任务完成情况可视化统计。

**核心组件**:
```
Stats/
├── index.tsx              # 统计主页面（路由 /stats）
├── SummaryCards.tsx       # 数字卡片（本周完成数、完成率、逾期率等）
├── CompletionTrend.tsx    # 折线图
├── CategoryPie.tsx        # 分类分布饼图
└── CompletionRing.tsx     # 完成率环形图
```

**图表库**: 使用 `ECharts`，通过 `echarts-for-react` 封装。

**需求追溯**: [REQ_TASK_MGMT_009]

---

#### 2.1.6 前端：设置模块 `frontend/src/pages/Settings/`

**职责**: 用户认证管理、系统偏好设置、AI 学习偏好管理。

**核心组件**:
```
Settings/
├── index.tsx              # 设置主页面（路由 /settings）
├── ProfileSection.tsx     # 账户信息
├── GeneralSettings.tsx    # 通用设置（时区、工作日、可用时间等）
├── ReminderSettings.tsx   # 提醒设置（免打扰时段）
├── PreferenceLearning.tsx # AI 偏好学习展示与手动修正
└── ThemeToggle.tsx        # 主题切换（亮色/暗色）
```

**需求追溯**: [REQ_TASK_MGMT_010] [REQ_TASK_MGMT_011]

---

#### 2.1.7 前端：公共组件 `frontend/src/components/`

**职责**: 跨页面复用的 UI 组件。

```
components/
├── Layout/
│   ├── AppLayout.tsx      # 全局布局（侧边栏 + 顶栏 + 内容区）
│   ├── Sidebar.tsx        # 导航侧边栏
│   └── AuthGuard.tsx      # 路由守卫（JWT 校验）
├── Task/
│   ├── TaskCard.tsx       # 任务卡片（列表/看板复用）
│   ├── PriorityBadge.tsx  # 优先级标签
│   └── StatusBadge.tsx    # 状态标签
├── Notification/
│   ├── InPageNotification.tsx  # 页面内通知条
│   ├── BrowserNotification.tsx # 浏览器通知封装
│   └── NotificationProvider.tsx # 通知上下文
└── AI/
    ├── AIStatusIndicator.tsx    # AI 可用性状态指示
    └── LoadingOverlay.tsx       # AI 调用加载遮罩
```

**需求追溯**: [REQ_TASK_MGMT_005]（通知系统）

---

#### 2.1.8 后端：API 路由层 `backend/app/api/`

**职责**: RESTful API 端点定义、请求校验、响应格式化。

```python
# backend/app/api/__init__.py
# backend/app/api/auth.py          — 注册/登录
# backend/app/api/tasks.py         — 任务 CRUD + NLP 解析 + 智能排序
# backend/app/api/categories.py    — 分类 CRUD
# backend/app/api/tags.py          — 标签 CRUD
# backend/app/api/planning.py      — 日/周规划
# backend/app/api/stats.py         — 统计数据
# backend/app/api/settings.py      — 用户设置
# backend/app/api/preferences.py   — AI 偏好管理
# backend/app/api/health.py        — 健康检查
```

**API 设计规范**:
- 统一响应格式：`{"code": int, "message": str, "data": Any}`
- 分页格式：`{"items": [], "total": int, "page": int, "page_size": int}`
- 错误码体系：2xx 成功，4xx 客户端错误，5xx 服务端错误
- 所有业务 API（除 auth/health）需 JWT 认证中间件

**需求追溯**: [REQ_TASK_MGMT_011]（认证中间件）

---

#### 2.1.9 后端：AI 能力层 `backend/app/ai/`

**职责**: 封装所有 AI 模型交互，提供统一的能力抽象接口。

**核心模块**:
```python
# backend/app/ai/__init__.py
# backend/app/ai/client.py         — AI API 客户端（OpenAI 兼容协议）
# backend/app/ai/retry.py          — 重试装饰器
# backend/app/ai/prompt_builder.py — Prompt 模板管理
# backend/app/ai/nlp_parser.py     — 自然语言任务解析
# backend/app/ai/classifier.py     — 自动分类
# backend/app/ai/priority_engine.py — 优先级评分
# backend/app/ai/suggestion_engine.py — 标签推荐
# backend/app/ai/planning_engine.py  — 时间规划生成
# backend/app/ai/reminder_engine.py  — 拖延风险评估
```

**AI 客户端设计** (`client.py`):

```python
from openai import AsyncOpenAI

class AIClient:
    """统一 AI 模型客户端，兼容所有 OpenAI API 协议的国产模型"""
    
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=settings.AI_BASE_URL,
            api_key=settings.AI_API_KEY,
        )
        self.model = settings.AI_MODEL_NAME
        self.timeout = settings.AI_REQUEST_TIMEOUT
        self.max_retries = settings.AI_MAX_RETRIES
        self.retry_delay = settings.AI_RETRY_DELAY
    
    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        response_format: dict | None = None,
    ) -> str:
        """调用 AI 模型，带自动重试"""
        ...
    
    def is_available(self) -> bool:
        """检查 AI 配置是否完整"""
        return bool(settings.AI_BASE_URL and settings.AI_API_KEY)
```

**NLP 解析器设计** (`nlp_parser.py`):

```python
from pydantic import BaseModel

class ParsedTask(BaseModel):
    title: str
    due_datetime: str | None = None      # ISO 8601 格式
    location: str | None = None
    category: str | None = None
    priority: str = "P2"                 # P0/P1/P2/P3
    estimated_minutes: int | None = None

class NLPParser:
    async def parse(self, user_input: str, timezone: str) -> ParsedTask:
        """
        解析自然语言输入为结构化任务。
        失败时抛出 AIParseError，由上层统一处理降级。
        """
        prompt = self.prompt_builder.build_nlp_prompt(user_input, timezone)
        response = await self.ai_client.chat(
            messages=[{"role": "system", "content": prompt}, 
                       {"role": "user", "content": user_input}],
            response_format={"type": "json_object"},
        )
        return ParsedTask.model_validate_json(response)
```

**优先级引擎设计** (`priority_engine.py`):

```python
class PriorityScore(BaseModel):
    task_id: int
    score: float          # 0.0 - 100.0
    reason: str           # 一句话排序理由

class PriorityEngine:
    async def calculate_batch(
        self, tasks: list[Task], user_preference: UserPreference
    ) -> list[PriorityScore]:
        """批量计算任务优先级分数"""
        ...
    
    async def calculate_single(
        self, task: Task, user_preference: UserPreference
    ) -> PriorityScore:
        """计算单个任务优先级分数（增量更新时使用）"""
        ...
```

**降级策略**:

```python
# backend/app/ai/degradation.py

class AIDegradationMixin:
    """AI 降级混入：所有 AI 调用的统一降级处理"""
    
    async def call_with_fallback(
        self,
        ai_func: Callable,
        fallback_func: Callable,
        error_context: str,
    ) -> Any:
        """
        尝试调用 AI 函数，失败时自动降级到 fallback。
        所有异常统一捕获，不向上层传播。
        """
        if not self.ai_client.is_available():
            logger.warning(f"AI 不可用，降级执行: {error_context}")
            return await fallback_func()
        try:
            return await ai_func()
        except AIError as e:
            logger.error(f"AI 调用失败 [{error_context}]: {e}")
            return await fallback_func()
```

**需求追溯**:
- [REQ_TASK_MGMT_002]（NLP 解析器）
- [REQ_TASK_MGMT_003]（分类器）
- [REQ_TASK_MGMT_004]（优先级引擎）
- [REQ_TASK_MGMT_005]（提醒引擎）
- [REQ_TASK_MGMT_006]（规划引擎）
- [REQ_TASK_MGMT_010]（偏好融入 Prompt）

---

#### 2.1.10 后端：业务逻辑层 `backend/app/services/`

**职责**: 核心业务逻辑编排，协调数据访问层与 AI 能力层。

```python
# backend/app/services/__init__.py
# backend/app/services/task_service.py        — 任务 CRUD + 软删除
# backend/app/services/category_service.py    — 分类管理
# backend/app/services/tag_service.py         — 标签管理（含合并）
# backend/app/services/planning_service.py    — 日/周规划生成与缓存
# backend/app/services/stats_service.py       — 统计聚合查询
# backend/app/services/settings_service.py    — 用户设置 CRUD
# backend/app/services/preference_service.py  — 偏好学习与查询
# backend/app/services/behavior_log_service.py — 行为日志记录
# backend/app/services/reminder_service.py    — 提醒策略判断
```

**任务服务设计** (`task_service.py`):

```python
class TaskService:
    async def create_task(self, data: TaskCreate, user_id: int) -> Task:
        """
        创建任务。创建成功后：
        1. 记录行为日志（action=task_created）
        2. 触发 AI 自动分类（异步，不阻塞创建）
        3. 触发 AI 标签推荐（异步，不阻塞创建）
        4. 标记 ai_generated=False
        """
        ...
    
    async def create_from_nlp(
        self, user_input: str, user_id: int, timezone: str
    ) -> ParsedTask:
        """
        自然语言创建。调用 NLPParser 解析。
        失败时返回明确错误信息，前端引导手动创建。
        """
        ...
    
    async def update_status(
        self, task_id: int, status: TaskStatus, user_id: int
    ) -> Task:
        """
        更新任务状态。当状态变为 completed 时：
        1. 自动填充 completed_at
        2. 记录行为日志（action=task_completed）
        3. 触发 AI 偏好学习（异步）
        """
        ...
    
    async def soft_delete(self, task_id: int, user_id: int) -> Task:
        """软删除：设置 deleted_at 时间戳"""
        ...
    
    async def restore(self, task_id: int, user_id: int) -> Task:
        """从回收站恢复：清除 deleted_at"""
        ...
    
    async def get_task_list(
        self,
        user_id: int,
        filter: TaskFilter,
        sort: SortMode,
        page: int,
        page_size: int,
    ) -> PageResult[Task]:
        """
        获取任务列表。
        sort=smart 时，查询 ai_priority_cache 表获取排序分数。
        """
        ...
```

**行为日志服务设计** (`behavior_log_service.py`):

```python
class BehaviorLogService:
    async def log(
        self,
        user_id: int,
        action_type: str,       # task_created / task_completed / task_modified / ai_accepted / ai_rejected
        target_type: str,       # task / category / tag
        target_id: int,
        metadata: dict | None = None,
        ai_suggestion_id: str | None = None,
        user_accepted: bool | None = None,
    ) -> None:
        """记录用户行为到 user_behavior_log 表"""
        ...
```

**偏好服务设计** (`preference_service.py`):

```python
class PreferenceService:
    async def get_preference(self, user_id: int) -> UserPreference:
        """获取用户偏好（AI 学习值 + 手动修正值合并）"""
        ...
    
    async def update_manual_override(
        self, user_id: int, field: str, value: Any
    ) -> None:
        """手动修正偏好参数，修正值优先于学习值"""
        ...
    
    async def reset_learning_data(self, user_id: int) -> None:
        """清除所有 AI 学习数据，回退到默认值"""
        ...
    
    async def run_daily_learning(self, user_id: int) -> None:
        """
        每日学习分析：聚合 user_behavior_log 原始数据，
        计算偏好参数，更新 user_preference 表。
        不足 7 天数据时使用系统默认值。
        """
        ...
```

**需求追溯**:
- [REQ_TASK_MGMT_001]（TaskService）
- [REQ_TASK_MGMT_003]（标签合并逻辑）
- [REQ_TASK_MGMT_010]（BehaviorLogService, PreferenceService）

---

#### 2.1.11 后端：数据模型层 `backend/app/models/`

**职责**: SQLAlchemy ORM 模型定义。

```python
# backend/app/models/__init__.py
# backend/app/models/user.py         — User
# backend/app/models/task.py         — Task
# backend/app/models/category.py     — Category
# backend/app/models/tag.py          — Tag, TaskTag
# backend/app/models/settings.py     — UserSettings
# backend/app/models/behavior.py     — UserBehaviorLog, UserPreference
# backend/app/models/ai_cache.py     — AIPriorityCache
```

**核心模型** (`task.py`):

```python
from sqlalchemy import String, Text, DateTime, Integer, Float, Boolean, ForeignKey, Enum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import enum

class Priority(str, enum.Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Task(Base):
    __tablename__ = "tasks"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_datetime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.P2)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.PENDING)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # 软删除
    
    # 关系
    category: Mapped["Category | None"] = relationship()
    tags: Mapped[list["Tag"]] = relationship(secondary="task_tags")
    priority_cache: Mapped["AIPriorityCache | None"] = relationship(back_populates="task", uselist=False)
```

**用户偏好模型** (`behavior.py`):

```python
class UserPreference(Base):
    __tablename__ = "user_preference"
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    active_hours: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    productive_hours: Mapped[list | None] = mapped_column(JSON, nullable=True)  # e.g. ["09:00-11:00", "14:00-16:00"]
    category_preference: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"工作": 0.35, "学习": 0.25, ...}
    tag_preference: Mapped[dict | None] = mapped_column(JSON, nullable=True)       # {"Python": 5, "报告": 3, ...}
    completion_speed: Mapped[dict | None] = mapped_column(JSON, nullable=True)     # {"P0": 120, "P1": 480, ...} (分钟)
    procrastination_pattern: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"ahead": 0.3, "ontime": 0.4, "overdue": 0.3}
    manual_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)     # 用户手动修正值
    days_of_data: Mapped[int] = mapped_column(Integer, default=0)                   # 累计学习天数
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
```

**需求追溯**:
- [REQ_TASK_MGMT_001]（Task 模型）
- [REQ_TASK_MGMT_010]（UserPreference, UserBehaviorLog 模型）

---

#### 2.1.12 后端：定时任务层 `backend/app/scheduler/`

**职责**: 后台定时任务调度。

```python
# backend/app/scheduler/__init__.py
# backend/app/scheduler/app.py       — APScheduler 初始化与生命周期管理

# backend/app/scheduler/jobs/
#     daily_priority_recalc.py       — 每日 02:00 全量重算优先级分数
#     daily_learning.py              — 每日 03:00 运行习惯学习分析
#     daily_plan_refresh.py          — 每日 08:00 刷新当日规划
#     reminder_check.py              — 每 15 分钟检查提醒触发条件
```

**调度器设计** (`app.py`):

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

def create_scheduler(app_context) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    
    # 每日 02:00 全量重算优先级
    scheduler.add_job(
        daily_priority_recalc.run,
        CronTrigger(hour=2, minute=0),
        id="daily_priority_recalc",
    )
    
    # 每日 03:00 习惯学习分析
    scheduler.add_job(
        daily_learning.run,
        CronTrigger(hour=3, minute=0),
        id="daily_learning",
    )
    
    # 每日 08:00 刷新当日规划
    scheduler.add_job(
        daily_plan_refresh.run,
        CronTrigger(hour=8, minute=0),
        id="daily_plan_refresh",
    )
    
    # 每 15 分钟检查提醒
    scheduler.add_job(
        reminder_check.run,
        IntervalTrigger(minutes=15),
        id="reminder_check",
    )
    
    return scheduler
```

**需求追溯**:
- [REQ_TASK_MGMT_004]（每日优先级重算）
- [REQ_TASK_MGMT_005]（提醒检查）
- [REQ_TASK_MGMT_006]（每日规划刷新）
- [REQ_TASK_MGMT_010]（每日习惯学习）

---

#### 2.1.13 后端：应用核心 `backend/app/`

**职责**: 应用启动、中间件注册、生命周期管理。

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时
    await init_db()                    # 数据库连接初始化
    scheduler = create_scheduler(app)  # 启动定时任务
    scheduler.start()
    yield
    # 关闭时
    scheduler.shutdown()
    await close_db()

app = FastAPI(title="Smart Task Manager API", lifespan=lifespan)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # 生产环境仅同源，开发环境 localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT 认证中间件（排除 auth 和 health 路由）
app.middleware("http")(jwt_auth_middleware)

# 路由注册
app.include_router(auth_router, prefix="/api/auth", tags=["认证"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["任务"])
app.include_router(categories_router, prefix="/api/categories", tags=["分类"])
app.include_router(tags_router, prefix="/api/tags", tags=["标签"])
app.include_router(planning_router, prefix="/api/planning", tags=["规划"])
app.include_router(stats_router, prefix="/api/stats", tags=["统计"])
app.include_router(settings_router, prefix="/api/settings", tags=["设置"])
app.include_router(preferences_router, prefix="/api/preferences", tags=["偏好"])
app.include_router(health_router, prefix="/api/health", tags=["健康检查"])
```

**配置管理** (`backend/app/config.py`):

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 数据库
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "smart_task_manager"
    DB_USER: str
    DB_PASSWORD: str
    
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7
    
    # AI
    AI_BASE_URL: str | None = None
    AI_API_KEY: str | None = None
    AI_MODEL_NAME: str = "glm-4"
    AI_REQUEST_TIMEOUT: int = 30
    AI_MAX_RETRIES: int = 2
    AI_RETRY_DELAY: int = 3
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # 提醒
    REMINDER_CHECK_INTERVAL_MINUTES: int = 15
    
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()
```

**需求追溯**:
- [REQ_TASK_MGMT_011]（JWT 中间件、CORS）
- [REQ_TASK_MGMT_012]（AI 配置）
- [REQ_TASK_MGMT_013]（数据库配置）

---

### 2.2 修改模块

N/A（全新项目，无存量模块需要修改）。

---

## 3. 类设计

### 3.1 新增类清单

| 类名 | 所在模块 | 职责 | 依赖 |
|------|---------|------|------|
| `User` | `models/user.py` | 用户账户模型 | — |
| `Task` | `models/task.py` | 任务主表模型 | `User`, `Category`, `Tag` |
| `Category` | `models/category.py` | 任务分类模型 | `User` |
| `Tag` | `models/tag.py` | 标签模型 | `User` |
| `TaskTag` | `models/tag.py` | 任务-标签多对多关联 | `Task`, `Tag` |
| `UserSettings` | `models/settings.py` | 用户设置模型 | `User` |
| `UserBehaviorLog` | `models/behavior.py` | 用户行为日志 | `User` |
| `UserPreference` | `models/behavior.py` | AI 学习偏好 | `User` |
| `AIPriorityCache` | `models/ai_cache.py` | 优先级分数缓存 | `Task` |
| `AIClient` | `ai/client.py` | AI 模型统一客户端 | `Settings` |
| `NLPParser` | `ai/nlp_parser.py` | 自然语言解析 | `AIClient`, `PromptBuilder` |
| `Classifier` | `ai/classifier.py` | 自动分类 | `AIClient`, `PromptBuilder` |
| `PriorityEngine` | `ai/priority_engine.py` | 优先级评分 | `AIClient`, `PromptBuilder` |
| `SuggestionEngine` | `ai/suggestion_engine.py` | 标签推荐 | `AIClient`, `PromptBuilder` |
| `PlanningEngine` | `ai/planning_engine.py` | 时间规划生成 | `AIClient`, `PromptBuilder` |
| `ReminderEngine` | `ai/reminder_engine.py` | 拖延风险评估 | `AIClient`, `UserPreference` |
| `TaskService` | `services/task_service.py` | 任务业务逻辑 | `TaskRepo`, `NLPParser`, `Classifier`, `SuggestionEngine`, `BehaviorLogService` |
| `PlanningService` | `services/planning_service.py` | 规划业务逻辑 | `PlanningEngine`, `UserPreference` |
| `PreferenceService` | `services/preference_service.py` | 偏好学习逻辑 | `UserBehaviorLog`, `UserPreference` |
| `ReminderService` | `services/reminder_service.py` | 提醒策略判断 | `ReminderEngine`, `UserSettings` |
| `Settings` | `config.py` | 全局配置管理 | Pydantic Settings |

### 3.2 修改类清单

N/A（全新项目）。

### 3.3 类关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                        API 路由层                                │
│  auth_router  tasks_router  planning_router  stats_router ...   │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
┌──────▼──────────────▼──────────────▼──────────────▼────────────┐
│                       业务逻辑层                                │
│  TaskService ───────┬─── NLPParser     (AI 能力层)              │
│  PlanningService ───┤─── Classifier                               │
│  StatsService  ─────┤─── PriorityEngine                           │
│  ReminderService ───┤─── SuggestionEngine                         │
│  PreferenceService ─┤─── PlanningEngine                           │
│  BehaviorLogService─┘─── ReminderEngine                           │
│                        AIClient ──── PromptBuilder                │
└──────┬──────────────┬──────────────┬────────────────────────────┘
       │              │              │
┌──────▼──────────────▼──────────────▼────────────────────────────┐
│                       数据访问层                                │
│  TaskRepo    CategoryRepo    TagRepo    UserRepo                │
│       │            │             │           │                   │
└──────▼──────────────▼─────────────▼───────────▼────────────────┘
       │
┌──────▼────────────────────────────────────────────────────────┐
│  User ◄──── Task ◄── Category                                 │
│    │        │                                                   │
│    │        ├──► TaskTag ◄── Tag                                │
│    │        │                                                   │
│    │        └──► AIPriorityCache                                │
│    │                                                            │
│    ├──► UserSettings                                            │
│    ├──► UserBehaviorLog                                         │
│    └──► UserPreference                                          │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. 数据流设计

### 4.1 自然语言创建任务流程

```
用户输入自然语言 → [SmartCreate 组件]
        │
        ▼
POST /api/tasks/parse-nlp { input, timezone }
        │
        ▼
[TaskService.create_from_nlp]
        │
        ├── AI 可用？
        │     ├── YES → [NLPParser.parse] → [AIClient.chat] → AI 模型 API
        │     │         │
        │     │         ├── 成功 → 返回 ParsedTask JSON
        │     │         └── 失败/超时 → 抛出 AIParseError
        │     │
        │     └── NO → 返回降级响应 { ai_available: false }
        │
        ▼
[ParsePreview 组件] 展示解析结果 → 用户确认/修改
        │
        ▼
POST /api/tasks { ...parsed fields... }
        │
        ▼
[TaskService.create_task]
        ├── 1. 写入 tasks 表
        ├── 2. 写入 task_tags（如有推荐标签被采纳）
        ├── 3. 记录 UserBehaviorLog (task_created, ai_generated=true)
        └── 4. 异步触发: AI 分类 + 优先级计算（不阻塞响应）
        │
        ▼
返回创建成功的 Task 对象 → 前端刷新列表
```

### 4.2 智能提醒检查流程

```
[APScheduler 每 15 分钟触发]
        │
        ▼
[reminder_check.run]
        │
        ▼
[ReminderService.get_pending_reminders(user_id, now)]
        │
        ├── 查询条件: status ∈ {pending, in_progress}, deleted_at IS NULL,
        │             reminder_enabled = true (task 级 + 全局)
        │
        ▼
对每个候选任务，逐层判断提醒规则：
        │
        ├── 层1: 截止日提醒
        │     条件: due_datetime 的日期 == today, 且 09:00-09:15 之间
        │     检查: 24h 内是否已推送过同类提醒（查 reminder_log）
        │
        ├── 层2: 提前一天提醒
        │     条件: due_datetime 的日期 == tomorrow, 且 09:00-09:15 之间
        │     检查: 24h 内是否已推送过同类提醒
        │
        ├── 层3: 紧急预警
        │     条件: [ReminderEngine.assess_procrastination_risk]
        │           → AI 综合评估（截止时间+状态+历史拖延模式）
        │     检查: 24h 内是否已推送过同类提醒
        │
        └── 层4: 习惯时段提醒
              条件: 当前时间 ∈ 用户的 productive_hours,
                    且有待办高优先级任务
              检查: 24h 内是否已推送过同类提醒
        │
        ▼
[推送提醒列表]
        │
        ├── 客户端轮询 GET /api/tasks/pending-reminders
        │     │
        │     ├── 浏览器通知已授权？
        │     │     ├── YES → [BrowserNotification] 推送
        │     │     └── NO  → [InPageNotification] 展示通知条
        │     │
        │     └── 检查免打扰时段 → 在免打扰时段内则跳过
        │
        └── 记录 reminder_log 防止 24h 重复推送
```

### 4.3 每日习惯学习流程

```
[APScheduler 每日 03:00 触发]
        │
        ▼
[daily_learning.run(user_id)]
        │
        ▼
[PreferenceService.run_daily_learning(user_id)]
        │
        ├── 1. 查询 user_behavior_log，统计 days_of_data
        │
        ├── 2. days_of_data < 7?
        │     ├── YES → 使用系统默认值，跳过学习
        │     └── NO  → 继续分析
        │
        ├── 3. 聚合活跃时段分布
        │     SELECT HOUR(created_at) as hour, COUNT(*) as count
        │     FROM user_behavior_log WHERE user_id = ? AND created_at >= NOW() - INTERVAL 30 DAY
        │     GROUP BY hour → 取 TOP 3 时段作为 productive_hours
        │
        ├── 4. 聚合分类偏好
        │     SELECT category_id, COUNT(*) as count
        │     FROM tasks WHERE user_id = ? AND status = 'completed'
        │     GROUP BY category_id → 计算各分类占比
        │
        ├── 5. 聚合标签偏好
        │     SELECT tag_id, COUNT(*) as count FROM task_tags JOIN tasks ...
        │     → 按使用频率排序
        │
        ├── 6. 聚合完成速度
        │     SELECT priority, AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as avg_minutes
        │     FROM tasks WHERE user_id = ? AND status = 'completed'
        │     GROUP BY priority
        │
        ├── 7. 聚合拖延模式
        │     统计任务完成时间 vs 截止时间的分布：
        │     ahead (提前完成), ontime (按时完成), overdue (逾期完成)
        │
        └── 8. 更新 user_preference 表
              合并 AI 学习值与用户 manual_overrides（手动修正值优先）
```

### 4.4 智能优先级排序流程

```
用户打开任务列表页面 / 进入看板
        │
        ▼
GET /api/tasks?sort=smart&page=1&page_size=20
        │
        ▼
[TaskService.get_task_list(sort=smart)]
        │
        ├── 查询 ai_priority_cache 表获取各任务 score
        │
        ├── 按 score DESC 排序
        │
        ├── 返回任务列表（附带 priority_score 和 reason）
        │
        ▼
前端渲染列表，默认展示 AI 智能排序

--- 全量重算（每日 02:00） ---

[daily_priority_recalc.run(user_id)]
        │
        ▼
[PriorityEngine.calculate_batch(tasks, user_preference)]
        │
        ├── AI 可用？
        │     ├── YES → 构造 Prompt（包含任务列表 + 用户偏好）→ AI 批量评分
        │     │         │
        │     │         └── 返回各任务 score + reason → 写入 ai_priority_cache
        │     │
        │     └── NO  → 基于规则的本地算法降级计算：
        │               score = f(距截止天数, 用户优先级权重, 任务状态)
        │               → 写入 ai_priority_cache
```

---

## 5. 配置设计

### 5.1 环境变量配置

| 环境变量 | 类型 | 默认值 | 说明 | 对应需求 |
|---------|------|--------|------|---------|
| `DB_HOST` | string | `localhost` | MySQL 服务器地址 | [REQ_TASK_MGMT_013] |
| `DB_PORT` | integer | `3306` | MySQL 端口 | [REQ_TASK_MGMT_013] |
| `DB_NAME` | string | `smart_task_manager` | 数据库名称 | [REQ_TASK_MGMT_013] |
| `DB_USER` | string | 无（必填） | 数据库用户名 | [REQ_TASK_MGMT_013] |
| `DB_PASSWORD` | string | 无（必填） | 数据库密码 | [REQ_TASK_MGMT_013] |
| `JWT_SECRET` | string | 无（必填） | JWT 签名密钥 | [REQ_TASK_MGMT_011] |
| `JWT_ALGORITHM` | string | `HS256` | JWT 签名算法 | [REQ_TASK_MGMT_011] |
| `JWT_EXPIRE_DAYS` | integer | `7` | JWT 有效期（天） | [REQ_TASK_MGMT_011] |
| `AI_BASE_URL` | string | 无（选填） | AI 模型 API 基础 URL | [REQ_TASK_MGMT_012] |
| `AI_API_KEY` | string | 无（选填） | AI 模型 API 密钥 | [REQ_TASK_MGMT_012] |
| `AI_MODEL_NAME` | string | `glm-4` | AI 模型名称 | [REQ_TASK_MGMT_012] |
| `AI_REQUEST_TIMEOUT` | integer | `30` | AI 请求超时（秒） | [REQ_TASK_MGMT_012] |
| `AI_MAX_RETRIES` | integer | `2` | AI 最大重试次数 | [REQ_TASK_MGMT_012] |
| `AI_RETRY_DELAY` | integer | `3` | AI 重试间隔（秒） | [REQ_TASK_MGMT_012] |
| `CORS_ORIGINS` | string | `http://localhost:3000` | 允许的前端源（逗号分隔） | 安全需求 |
| `REMINDER_CHECK_INTERVAL_MINUTES` | integer | `15` | 提醒检查间隔（分钟） | [REQ_TASK_MGMT_005] |

### 5.2 配置文件示例

`.env.example`:
```env
# ========== 数据库配置 ==========
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smart_task_manager
DB_USER=root
DB_PASSWORD=your_secure_password_here

# ========== JWT 配置 ==========
JWT_SECRET=your_jwt_secret_here_change_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7

# ========== AI 模型配置 ==========
AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
AI_API_KEY=your_ai_api_key_here
AI_MODEL_NAME=glm-4
AI_REQUEST_TIMEOUT=30
AI_MAX_RETRIES=2
AI_RETRY_DELAY=3

# ========== CORS 配置 ==========
CORS_ORIGINS=http://localhost:3000

# ========== 提醒配置 ==========
REMINDER_CHECK_INTERVAL_MINUTES=15
```

---

## 6. 降级策略

### 6.1 降级场景

| 场景 | 触发条件 | 降级行为 | 影响范围 |
|-----|---------|---------|---------|
| AI 模型完全不可用 | `AI_BASE_URL` 或 `AI_API_KEY` 未配置，或启动时连接失败 | 系统启动时打印警告日志，AI 相关 API 返回 `ai_available: false`，前端隐藏 AI 功能入口，保留手动操作 | [REQ_TASK_MGMT_002] [REQ_TASK_MGMT_003] [REQ_TASK_MGMT_004] [REQ_TASK_MGMT_005] [REQ_TASK_MGMT_006] |
| AI 单次调用超时 | 单次 API 请求 > `AI_REQUEST_TIMEOUT`（30s） | 中断请求，返回超时错误，前端显示友好提示 | 单次 AI 功能调用 |
| AI 单次调用失败 | API 返回 4xx/5xx 错误 | 自动重试最多 `AI_MAX_RETRIES`（2）次，间隔 `AI_RETRY_DELAY`（3s），仍失败则降级到规则引擎或手动操作 | 单次 AI 功能调用 |
| AI 返回非法数据 | 解析后的 JSON 不符合 Pydantic Schema | 使用默认值回退（如标题=整条输入、优先级=P2），记录异常日志 | [REQ_TASK_MGMT_002] |
| 浏览器通知未授权 | 用户拒绝或未授予通知权限 | 自动降级为页面内通知条（InPageNotification），并在设置页面提供授权引导 | [REQ_TASK_MGMT_005] |
| 数据库连接失败 | MySQL 不可达 | 系统启动时报错并退出，不提供降级运行模式 | 全系统 |

### 6.2 降级实现

```python
# backend/app/ai/retry.py

import asyncio
import logging
from functools import wraps

logger = logging.getLogger(__name__)

def ai_retry(max_retries: int = 2, retry_delay: int = 3):
    """AI 调用自动重试装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except AIError as e:
                    last_error = e
                    if attempt < max_retries:
                        logger.warning(
                            f"AI 调用失败 (第 {attempt + 1} 次)，"
                            f"{retry_delay}s 后重试: {e}"
                        )
                        await asyncio.sleep(retry_delay)
            logger.error(f"AI 调用最终失败，已重试 {max_retries} 次: {last_error}")
            raise AIDegradedError(f"AI 服务暂时不可用: {last_error}")
        return wrapper
    return decorator
```

```python
# backend/app/ai/fallback_priority.py

def rule_based_priority_score(task: Task) -> tuple[float, str]:
    """
    基于规则的本地优先级评分算法（AI 不可用时的降级方案）。
    
    评分维度：
    - 截止时间紧迫度（0-40分）
    - 用户设定的优先级（P0=40, P1=30, P2=20, P3=10）
    - 任务状态（in_progress 加 5 分，pending 不加）
    
    返回 (score, reason)
    """
    score = 0.0
    reasons = []
    
    # 截止时间紧迫度
    if task.due_datetime:
        hours_left = (task.due_datetime - datetime.now()).total_seconds() / 3600
        if hours_left <= 0:
            score += 40
            reasons.append("已逾期")
        elif hours_left <= 24:
            score += 30
            reasons.append("24小时内到期")
        elif hours_left <= 72:
            score += 20
            reasons.append("3天内到期")
        elif hours_left <= 168:
            score += 10
            reasons.append("本周到期")
    else:
        reasons.append("无截止时间")
    
    # 用户优先级
    priority_scores = {"P0": 40, "P1": 30, "P2": 20, "P3": 10}
    score += priority_scores.get(task.priority.value, 20)
    reasons.append(f"优先级 {task.priority.value}")
    
    # 任务状态加分
    if task.status == TaskStatus.IN_PROGRESS:
        score += 5
        reasons.append("进行中")
    
    reason = "；".join(reasons)
    return (min(score, 100.0), reason)
```

### 6.3 降级告警

- AI 调用失败：通过 Python `logging` 模块输出 `WARNING`/`ERROR` 级别日志，不发送外部告警（单用户自部署场景）。
- AI 完全不可用：系统启动时输出明确 WARNING 日志，前端通过 `/api/health/ai` 接口感知并隐藏 AI 功能入口。
- 数据库连接失败：系统启动时直接 `sys.exit(1)`，Docker 会自动重启容器。

---

## 7. API 设计

### 7.1 新增 API 清单

| 方法 | 路径 | 描述 | 请求体 | 响应体 | 需求追溯 |
|-----|------|------|--------|--------|---------|
| POST | `/api/auth/register` | 用户注册 | `{username, password}` | `{user, token}` | [REQ_TASK_MGMT_011] |
| POST | `/api/auth/login` | 用户登录 | `{username, password}` | `{token, expires_at}` | [REQ_TASK_MGMT_011] |
| GET | `/api/tasks` | 任务列表 | Query: `sort, status, category_id, tag_id, keyword, page, page_size` | `{items, total, page, page_size}` | [REQ_TASK_MGMT_001] |
| POST | `/api/tasks` | 创建任务 | TaskCreate Schema | Task | [REQ_TASK_MGMT_001] |
| GET | `/api/tasks/{id}` | 任务详情 | — | Task | [REQ_TASK_MGMT_001] |
| PUT | `/api/tasks/{id}` | 更新任务 | TaskUpdate Schema | Task | [REQ_TASK_MGMT_001] |
| DELETE | `/api/tasks/{id}` | 软删除任务 | — | `{message}` | [REQ_TASK_MGMT_001] |
| PATCH | `/api/tasks/{id}/status` | 更新状态 | `{status}` | Task | [REQ_TASK_MGMT_001] |
| POST | `/api/tasks/{id}/restore` | 恢复任务 | — | Task | [REQ_TASK_MGMT_001] |
| POST | `/api/tasks/parse-nlp` | NLP 解析 | `{input, timezone}` | `{parsed_task, ai_available}` | [REQ_TASK_MGMT_002] |
| GET | `/api/tasks/smart-sort` | AI 排序结果 | Query: `category_id, status` | `[{task_id, score, reason}]` | [REQ_TASK_MGMT_004] |
| GET | `/api/tasks/pending-reminders` | 待推送提醒 | Query: `timestamp` | `[{task, type, message}]` | [REQ_TASK_MGMT_005] |
| GET | `/api/categories` | 分类列表 | Query: `include_counts` | Category[] | [REQ_TASK_MGMT_003] |
| POST | `/api/categories` | 创建分类 | `{name, icon}` | Category | [REQ_TASK_MGMT_003] |
| PUT | `/api/categories/{id}` | 更新分类 | `{name, icon}` | Category | [REQ_TASK_MGMT_003] |
| DELETE | `/api/categories/{id}` | 删除分类 | — | `{message}` | [REQ_TASK_MGMT_003] |
| GET | `/api/tags` | 标签列表 | Query: `include_counts` | Tag[] | [REQ_TASK_MGMT_003] |
| POST | `/api/tags` | 创建标签 | `{name}` | Tag | [REQ_TASK_MGMT_003] |
| PUT | `/api/tags/{id}` | 更新标签 | `{name}` | Tag | [REQ_TASK_MGMT_003] |
| DELETE | `/api/tags/{id}` | 删除标签 | — | `{message}` | [REQ_TASK_MGMT_003] |
| POST | `/api/tags/merge` | 合并标签 | `{source_id, target_id}` | Tag | [REQ_TASK_MGMT_003] |
| GET | `/api/planning/daily` | 今日规划 | Query: `date` (默认 today) | DailyPlan | [REQ_TASK_MGMT_006] |
| GET | `/api/planning/weekly` | 本周规划 | Query: `week_start` | WeeklyPlan | [REQ_TASK_MGMT_006] |
| POST | `/api/planning/regenerate` | 重新生成规划 | `{type: "daily" | "weekly"}` | DailyPlan \| WeeklyPlan | [REQ_TASK_MGMT_006] |
| GET | `/api/stats/summary` | 统计摘要 | Query: `range` (week/month/quarter), `start_date`, `end_date` | StatsSummary | [REQ_TASK_MGMT_009] |
| GET | `/api/stats/trends` | 趋势数据 | Query: `days` (7/30) | `{date: count}[]` | [REQ_TASK_MGMT_009] |
| GET | `/api/settings` | 获取设置 | — | UserSettings | [REQ_TASK_MGMT_011] |
| PUT | `/api/settings` | 更新设置 | SettingsUpdate Schema | UserSettings | [REQ_TASK_MGMT_011] |
| GET | `/api/preferences` | 偏好摘要 | — | UserPreference | [REQ_TASK_MGMT_010] |
| PUT | `/api/preferences` | 手动修正偏好 | `{field, value}` | UserPreference | [REQ_TASK_MGMT_010] |
| POST | `/api/preferences/reset` | 重置学习数据 | — | `{message}` | [REQ_TASK_MGMT_010] |
| GET | `/api/health` | 系统健康检查 | — | `{status, version}` | [REQ_TASK_MGMT_012] |
| GET | `/api/health/ai` | AI 连接状态 | — | `{available, model, latency_ms}` | [REQ_TASK_MGMT_012] |

### 7.2 API 详细设计

#### 7.2.1 POST /api/tasks/parse-nlp — 自然语言解析任务

**请求体**:
```json
{
  "input": "下周三下午3点在会议室A开会讨论Q2方案",
  "timezone": "Asia/Shanghai"
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "ai_available": true,
    "parsed_task": {
      "title": "开会讨论Q2方案",
      "due_datetime": "2026-04-29T15:00:00+08:00",
      "location": "会议室A",
      "category": "工作",
      "priority": "P2",
      "estimated_minutes": null
    }
  }
}
```

**AI 不可用响应** (200, ai_available=false):
```json
{
  "code": 0,
  "message": "AI 解析暂时不可用，请手动创建任务",
  "data": {
    "ai_available": false,
    "parsed_task": null
  }
}
```

**超时响应** (504):
```json
{
  "code": 504,
  "message": "AI 解析响应超时，请稍后重试或手动创建任务",
  "data": null
}
```

#### 7.2.2 POST /api/tasks — 创建任务

**请求体**:
```json
{
  "title": "完成周报",
  "description": "整理本周工作内容，提交周报",
  "due_datetime": "2026-04-21T18:00:00+08:00",
  "priority": "P1",
  "status": "pending",
  "category_id": 1,
  "tag_ids": [2, 5],
  "estimated_minutes": 60,
  "location": null,
  "ai_generated": false
}
```

**成功响应** (201):
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 42,
    "title": "完成周报",
    "description": "整理本周工作内容，提交周报",
    "due_datetime": "2026-04-21T18:00:00+08:00",
    "priority": "P1",
    "status": "pending",
    "category_id": 1,
    "category_name": "工作",
    "tags": [
      {"id": 2, "name": "周报"},
      {"id": 5, "name": "紧急"}
    ],
    "estimated_minutes": 60,
    "location": null,
    "completed_at": null,
    "ai_generated": false,
    "created_at": "2026-04-20T10:15:00Z",
    "updated_at": "2026-04-20T10:15:00Z",
    "priority_score": 85.5,
    "priority_reason": "24小时内到期；优先级 P1"
  }
}
```

#### 7.2.3 GET /api/tasks — 任务列表

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sort` | string | `smart` | 排序方式: `smart` / `created_at` / `due_datetime` / `priority` / `status` |
| `sort_order` | string | `desc` | 排序方向: `asc` / `desc` |
| `status` | string | null | 状态筛选，逗号分隔多选: `pending,in_progress` |
| `category_id` | integer | null | 分类筛选 |
| `tag_id` | integer | null | 标签筛选 |
| `keyword` | string | null | 关键词模糊搜索（标题+描述） |
| `include_deleted` | boolean | `false` | 是否包含已删除任务（回收站） |
| `page` | integer | `1` | 页码 |
| `page_size` | integer | `20` | 每页数量（最大 100） |

#### 7.2.4 GET /api/planning/daily — 今日规划

**成功响应** (200):
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "date": "2026-04-20",
    "recommended_tasks": [
      {
        "task_id": 42,
        "title": "完成周报",
        "priority": "P1",
        "due_datetime": "2026-04-21T18:00:00+08:00",
        "estimated_minutes": 60,
        "suggested_slot": "09:00-10:00",
        "reason": "明天到期，优先级最高"
      },
      {
        "task_id": 38,
        "title": "阅读技术文档",
        "priority": "P2",
        "due_datetime": "2026-04-24T18:00:00+08:00",
        "estimated_minutes": 90,
        "suggested_slot": "10:00-11:30",
        "reason": "本周到期，填充可用时段"
      }
    ],
    "total_estimated_minutes": 150,
    "available_minutes": 480,
    "load_percentage": 31.25,
    "is_overloaded": false,
    "generated_at": "2026-04-20T08:00:00Z"
  }
}
```

#### 7.2.5 GET /api/health/ai — AI 连接状态

**成功响应** (200):
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "available": true,
    "model": "glm-4",
    "base_url": "https://open.bigmodel.cn/api/paas/v4",
    "latency_ms": 1250,
    "checked_at": "2026-04-20T10:00:00Z"
  }
}
```

**不可用响应** (200):
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "available": false,
    "model": null,
    "base_url": null,
    "latency_ms": null,
    "reason": "AI_BASE_URL or AI_API_KEY not configured",
    "checked_at": "2026-04-20T10:00:00Z"
  }
}
```

---

## 8. 需求追溯表

### 8.1 需求 → 设计映射

| 需求 ID | 需求描述 | 设计章节 | 实现模块 |
|---------|---------|---------|---------|
| [REQ_TASK_MGMT_001] | 任务 CRUD 基础操作 | 2.1.1, 2.1.8, 2.1.10, 2.1.11, 7.1 | TaskService, Task model, tasks API |
| [REQ_TASK_MGMT_002] | 自然语言创建任务（AI_NLP） | 2.1.1, 2.1.9, 4.1, 7.2.1 | NLPParser, AIClient, parse-nlp API |
| [REQ_TASK_MGMT_003] | 自动分类与标签系统 | 2.1.9, 2.1.10, 7.1 | Classifier, SuggestionEngine, categories/tags API |
| [REQ_TASK_MGMT_004] | 智能优先级排序 | 2.1.9, 2.1.10, 2.1.12, 4.4, 6.2 | PriorityEngine, AIPriorityCache, daily_priority_recalc job |
| [REQ_TASK_MGMT_005] | 智能提醒 | 2.1.7, 2.1.9, 2.1.10, 2.1.12, 4.2 | ReminderService, ReminderEngine, reminder_check job, InPageNotification, BrowserNotification |
| [REQ_TASK_MGMT_006] | 时间规划建议 | 2.1.4, 2.1.9, 2.1.10, 2.1.12, 7.2.4 | PlanningEngine, PlanningService, daily_plan_refresh job, planning API |
| [REQ_TASK_MGMT_007] | 任务看板视图 | 2.1.2 | Kanban 页面组件 |
| [REQ_TASK_MGMT_008] | 任务日历视图 | 2.1.3 | Calendar 页面组件 |
| [REQ_TASK_MGMT_009] | 任务统计与数据看板 | 2.1.5, 2.1.10, 7.1 | StatsService, Stats 页面组件, stats API |
| [REQ_TASK_MGMT_010] | 基于习惯学习 | 2.1.6, 2.1.10, 2.1.11, 2.1.12, 4.3 | PreferenceService, BehaviorLogService, UserPreference model, daily_learning job |
| [REQ_TASK_MGMT_011] | 用户认证与设置 | 2.1.6, 2.1.8, 2.1.13, 7.1 | auth API, settings API, JWT middleware, Settings model |
| [REQ_TASK_MGMT_012] | AI 模型配置 | 2.1.9, 2.1.13, 5.1, 7.2.5 | AIClient, Settings(config.py), .env, health/ai API |
| [REQ_TASK_MGMT_013] | 数据库配置 | 2.1.13, 5.1 | Settings(config.py), SQLAlchemy engine init |

### 8.2 验收条件追溯

| 验收条件 | 对应设计 | 验证方法 |
|---------|---------|---------|
| AC-001-01 必填字段校验 | API Schema validation (Pydantic) | 提交空标题，验证 422 响应 |
| AC-001-02 创建后列表展示 | TaskService.create_task → DB insert | 创建任务后查询列表，验证字段完整 |
| AC-001-03 编辑同步更新 | TaskService.update_task → DB update | 编辑后查询列表，验证字段更新 |
| AC-001-04 软删除+回收站 | TaskService.soft_delete (set deleted_at) | 软删除后默认列表不显示，include_deleted=true 可见 |
| AC-001-05 完成时间自动填充 | TaskService.update_status(status=completed) → set completed_at | 标记完成后查询 completed_at 非空 |
| AC-001-06 重新打开清空完成时间 | TaskService.update_status(status=pending) → clear completed_at | 重新打开后查询 completed_at 为 null |
| AC-001-07 4 种排序 | GET /api/tasks?sort=created_at\|due_datetime\|priority\|smart | 切换排序参数验证列表顺序 |
| AC-001-08 组合筛选 | Query: status, category_id, tag_id, keyword | 多条件组合查询验证 |
| AC-002-01 NLP 解析截止时间 | NLPParser + PromptBuilder (相对时间→绝对时间) | 输入"下周三下午3点"，验证解析出的 ISO 时间 |
| AC-002-02 NLP 解析地点 | NLPParser (地点实体提取) | 输入"去超市买牛奶"，验证 location="超市" |
| AC-002-03 NLP 解析优先级 | NLPParser (紧急词→P0 映射) | 输入"赶紧提交报告"，验证 priority="P0" |
| AC-002-04 预览卡片可修改 | ParsePreview 组件 (受控表单) | 解析后修改字段，验证提交值正确 |
| AC-002-05 AI 失败降级 | AIDegradationMixin → ai_available=false | 停止 AI 服务，验证错误提示和手动入口 |
| AC-002-06 解析超时 | AI_REQUEST_TIMEOUT + 前端 10s 截断 | 配置超时，验证超时提示 |
| AC-002-07 无截止时间保留为空 | NLPParser (null fallback) | 输入"整理桌面"，验证 due_datetime=null |
| AC-002-08 非任务语义提示 | NLPParser → 标题=整条输入 + 前端提示 | 输入"你好"，验证提示文案 |
| AC-003-01 预设分类初始化 | init_default_categories (app lifespan) | 系统启动后查询 categories，验证 6 条记录 |
| AC-003-02 AI 自动分类 | Classifier + task creation hook | 创建"写周报"，验证 category_id 对应"工作" |
| AC-003-03 低匹配度不强制分类 | Classifier (阈值 70% 检查) | 创建语义模糊任务，验证 category_id=null |
| AC-003-04 新增自定义分类 | POST /api/categories | 创建后查询验证列表包含新分类 |
| AC-003-05 删除/修改分类 | PUT/DELETE /api/categories/{id} | 操作后验证列表更新 |
| AC-003-06 多标签关联 | TaskTag 多对多 + tag_ids 参数 | 创建任务时传 tag_ids，验证关联正确 |
| AC-003-07 AI 标签推荐 | SuggestionEngine | 创建任务，验证推荐标签列表 |
| AC-003-08 标签管理 CRUD | categories/tags API + 前端管理页面 | 全流程验证 |
| AC-004-01 默认 AI 排序 | GET /api/tasks?sort=smart (默认值) | 打开列表页，验证默认按 AI 分数排序 |
| AC-004-02 截止时间近的排序靠前 | PriorityEngine (距截止天数权重) | 对比 1 天 vs 7 天到期任务排序位置 |
| AC-004-03 AI/手动切换 | 前端 TaskSortSelector + localStorage | 切换排序方式，验证列表顺序变化并持久化 |
| AC-004-04 状态变更后更新分数 | TaskService.update_status → 触发优先级重算 | 修改状态后，验证受影响任务分数更新 |
| AC-004-05 localStorage 持久化 | 前端 SortSelector (useLocalStorage) | 刷新页面，验证排序偏好保持 |
| AC-004-06 每日全量重算 | daily_priority_recalc job (CronTrigger 02:00) | 检查日志验证凌晨 02:00 执行 |
| AC-005-01 截止日提醒 | ReminderService 层1 + reminder_check job | 设置今天到期任务，等待提醒触发 |
| AC-005-02 提前一天提醒 | ReminderService 层2 + reminder_check job | 设置明天到期任务，等待提醒触发 |
| AC-005-03 24h 防重复 | reminder_log 去重检查 | 触发提醒后 24h 内不重复推送 |
| AC-005-04 单任务提醒开关 | task.reminder_enabled 字段 | 关闭单任务提醒，验证不再推送 |
| AC-005-05 免打扰时段 | UserSettings.quiet_hours_start/end | 设置免打扰，验证时段内无通知 |
| AC-005-06 通知降级 | BrowserNotification → InPageNotification | 拒绝授权，验证页面内通知条显示 |
| AC-005-07 AI 紧急预警 | ReminderEngine.assess_procrastination_risk | 高风险任务触发红色预警 |
| AC-005-08 习惯时段提醒 | UserPreference.productive_hours + 层4 | 累积 7 天数据后验证活跃时段提醒 |
| AC-006-01 今日规划展示 | GET /api/planning/daily + DailyPlan 组件 | 打开规划页，验证推荐任务列表 |
| AC-006-02 时间段分配 | PlanningEngine (suggested_slot 生成) | 验证各任务时间段不重叠 |
| AC-006-03 工作量评估 | total_estimated_minutes / available_minutes | 验证 load_percentage 计算正确 |
| AC-006-04 过载预警 | is_overloaded = load_percentage > 80 | 创建超过 80% 负载的任务，验证红色预警 |
| AC-006-05 周视图甘特图 | GET /api/planning/weekly + PlanTimeline 组件 | 验证周视图时间轴展示 |
| AC-006-06 重新生成 | POST /api/planning/regenerate | 点击按钮，验证规划结果刷新 |
| AC-006-07 每日自动刷新 | daily_plan_refresh job (08:00) | 检查日志验证 08:00 执行 |
| AC-007-01 三列看板展示 | Kanban 页面 + status 分组查询 | 验证三列任务卡片归属正确 |
| AC-007-02 拖拽更新状态 | @dnd-kit + PATCH /api/tasks/{id}/status | 拖拽后验证状态更新 |
| AC-007-03 列内 AI 排序 | 列组件内排序 = smart | 验证列内任务按优先级分数排列 |
| AC-007-04 统计摘要 | KanbanHeader + 各状态 COUNT 查询 | 验证数字与实际一致 |
| AC-007-05 已完成展示时间 | KanbanCard (completed_at 显示) | 完成列卡片展示完成时间 |
| AC-008-01 月视图展示 | Calendar MonthView + due_datetime 查询 | 验证月历中色块位置正确 |
| AC-008-02 色块颜色 | PriorityBadge (P0红/P1橙/P2蓝/P3灰) | 验证各优先级颜色映射 |
| AC-008-03 日期任务列表 | DayTasks (点击日期弹窗) | 点击日期，验证任务列表正确 |
| AC-008-04 月/周切换 | Calendar index (tab 切换) | 切换视图验证正确渲染 |
| AC-008-05 今日高亮 | Calendar 组件 (today 高亮样式) | 验证今日格子高亮 |
| AC-009-01 7 项统计指标 | StatsService (聚合查询) + Stats 页面 | 验证所有指标展示 |
| AC-009-02 完成率环形图 | CompletionRing (completed/total * 100) | 验证数据与实际一致 |
| AC-009-03 趋势折线图 | CompletionTrend (过去 7 天) | 验证折线数据点正确 |
| AC-009-04 时间范围切换 | range query parameter | 切换周/月/季度验证数据变化 |
| AC-009-05 逾期率计算 | StatsService (overdue count / due_tasks count) | 验证逾期率分子分母正确 |
| AC-010-01 行为日志记录 | BehaviorLogService.log (CRUD hooks) | 执行操作后查询 user_behavior_log |
| AC-010-02 每日学习分析 | daily_learning job (03:00) | 检查日志验证执行 + 查询 user_preference |
| AC-010-03 7 天后影响推理 | PreferenceService (days_of_data 检查) | 模拟 7 天数据，验证 AI prompt 包含偏好 |
| AC-010-04 偏好摘要展示 | GET /api/preferences + PreferenceLearning 组件 | 验证前端展示偏好摘要 |
| AC-010-05 手动修正优先 | manual_overrides 字段 + PreferenceService | 修正后验证输出值使用修正值 |
| AC-010-06 重置学习数据 | POST /api/preferences/reset | 重置后验证偏好回退默认 |
| AC-010-07 不足 7 天用默认值 | PreferenceService.run_daily_learning | 新用户验证功能正常无报错 |
| AC-011-01 注册密码校验 | auth API (Pydantic: min_length=8, regex) | 注册短密码/纯数字，验证拒绝 |
| AC-011-02 JWT 7 天有效期 | JWT_SECRET + JWT_EXPIRE_DAYS | 登录后验证 token expire claim |
| AC-011-03 单用户隐藏注册 | 前端 AuthGuard (查询用户数) | 注册后验证注册入口隐藏 |
| AC-011-04 设置修改保存 | PUT /api/settings | 修改各项，重新查询验证持久化 |
| AC-011-05 时区切换 | UserSettings.timezone → 影响前端日期显示 | 修改时区后验证截止时间显示变化 |
| AC-012-01 .env 配置生效 | Settings pydantic-settings | 配置 .env 后启动验证 AI 功能可用 |
| AC-012-02 未配置打印警告 | AIClient.is_available() + startup warning | 不配置 AI 变量，检查启动日志 |
| AC-012-03 AI 不可用 CRUD 正常 | AIDegradationMixin → 不影响 TaskService 基础方法 | 停止 AI，验证 CRUD 全流程 |
| AC-012-04 /api/health/ai | health router | 调用接口验证返回 AI 状态 |
| AC-012-05 切换模型仅改 .env | AIClient (base_url + model 参数化) | 修改 .env 重启验证新模型 |
| AC-013-01 数据库连接 | SQLAlchemy engine init | 配置 .env 后启动验证连接成功 |
| AC-013-02 连接失败退出 | lifespan → sys.exit(1) | 配置错误密码，验证启动失败 |

---

## 9. 设计评审点

### 9.1 关键技术决策

| 决策点 | 选择 | 理由 | 风险 |
|-------|------|------|------|
| 前端框架 | React 18 + Ant Design 5 | PRD 明确指定；Ant Design 的 Calendar/Kanban 等复杂组件可大幅减少开发量 | Ant Design 包体积较大，需按需加载 |
| 状态管理 | Zustand | 轻量（< 2KB），API 简洁，TypeScript 支持好，社区活跃度足够 | 社区规模小于 Redux，但对本项目完全够用 |
| AI 客户端 | OpenAI 兼容协议（openai Python SDK） | 国产主流模型（GLM、通义）均兼容 OpenAI Chat API，一套客户端代码适配多家 | 个别模型可能不支持 response_format=json_object，需 fallback 到正则提取 |
| AI 调用模式 | 同步请求 + 重试 + 降级 | 单用户场景无需消息队列；APScheduler 处理定时任务；重试 + 规则引擎降级保证可用性 | AI API 高延迟会阻塞请求；通过前端 loading + 合理超时缓解 |
| 定时任务 | APScheduler (AsyncIO) | 轻量嵌入式，无需额外服务（如 Celery）；单用户场景足够 | 不支持分布式锁，但本项目为单实例部署无此问题 |
| 拖拽方案 | @dnd-kit | 轻量、可访问性好、React 生态主流选择 | 学习曲线略高于 react-beautiful-dnd |
| ORM | SQLAlchemy 2.x (async) | Python 最成熟 ORM，async 支持完善，Alembic 迁移工具配套 | async 模式下部分高级特性支持有限，但本项目不涉及 |
| 提醒推送 | 后端计算 + 前端轮询 | 单用户无需 WebSocket 复杂度；15 分钟间隔轮询足够 | 非实时，但任务提醒对实时性要求不高（分钟级可接受） |

### 9.2 风险点

| 风险 | 影响 | 缓解措施 | 优先级 |
|-----|------|---------|--------|
| 国产 AI 模型 response_format 兼容性 | NLP 解析依赖 JSON 输出格式，部分模型可能不支持 | 实现双重策略：优先 response_format=json_object，失败后 fallback 到正则提取 JSON | 高 |
| AI 解析准确率不达 80% 目标 | FAT-002 验收失败 | ① 精心设计 Prompt（few-shot + 约束描述）；② 预览卡片允许用户修改，降低准确率依赖；③ 持续迭代优化 Prompt | 中 |
| 提醒定时精度 | APScheduler + 前端 15 分钟轮询，提醒可能有最多 15 分钟延迟 | 可接受（PRD 未要求秒级精度）；如需更精准可将轮询间隔缩短到 5 分钟 | 低 |
| 单用户安全假设 | JWT + CORS 等安全措施基于单用户假设，多人使用时不足 | 本期明确单用户约束；数据模型已预留 user_id 便于未来扩展 | 低 |
| 习惯学习冷启动 7 天 | 前 7 天无个性化体验 | 系统默认值保证功能可用；前端展示"学习进行中"进度条，管理用户预期 | 中 |

### 9.3 待确认事项

| 事项 | 选项 | 建议 | 状态 |
|-----|------|------|------|
| 前端路由模式 | Hash / Browser History | Browser History（需 Nginx 配置 fallback） | 待确认 |
| 前端是否需要 PWA 支持 | 是 / 否 | 否（仅桌面端） | 已确认 |
| 数据库备份策略 | mysqldump cron / Docker volume snapshot | mysqldump cron（简单可靠） | 待确认 |
| AI 调用是否需要审计日志 | 记录所有 AI 调用 / 仅记录失败 | 记录所有（便于 Prompt 优化） | 待确认 |
| 任务回收站保留期限 | 永久 / 30 天自动清理 | 30 天自动清理（避免数据膨胀） | 待确认 |

---

## 10. 依赖变更

### 10.1 新增依赖

**后端 Python 依赖** (`requirements.txt`):

| 包名 | 版本要求 | 用途 |
|------|---------|------|
| fastapi | ≥ 0.110 | Web 框架 |
| uvicorn[standard] | ≥ 0.29 | ASGI 服务器 |
| sqlalchemy[asyncio] | ≥ 2.0 | ORM (async) |
| aiomysql | ≥ 0.2 | MySQL async driver |
| alembic | ≥ 1.13 | 数据库迁移 |
| pydantic | ≥ 2.0 | 数据校验 |
| pydantic-settings | ≥ 2.0 | 环境变量配置 |
| python-jose[cryptography] | ≥ 3.3 | JWT |
| passlib[bcrypt] | ≥ 1.7 | 密码哈希 |
| openai | ≥ 1.0 | AI 模型客户端（OpenAI 兼容协议） |
| httpx | ≥ 0.27 | 异步 HTTP 客户端（openai 依赖） |
| apscheduler | ≥ 3.10 | 定时任务调度 |
| python-multipart | ≥ 0.0.6 | 表单解析 |

**前端 npm 依赖** (`package.json`):

| 包名 | 版本要求 | 用途 |
|------|---------|------|
| react | ≥ 18.2 | UI 框架 |
| react-dom | ≥ 18.2 | React DOM 渲染 |
| react-router-dom | ≥ 6.20 | 路由 |
| antd | ≥ 5.15 | UI 组件库 |
| @ant-design/icons | ≥ 5.3 | 图标 |
| @ant-design/charts | ≥ 2.0 | 图表（基于 ECharts） |
| zustand | ≥ 4.5 | 状态管理 |
| axios | ≥ 1.6 | HTTP 客户端 |
| dayjs | ≥ 1.11 | 日期处理 |
| @dnd-kit/core | ≥ 6.1 | 拖拽核心 |
| @dnd-kit/sortable | ≥ 8.0 | 拖拽排序 |
| echarts | ≥ 5.5 | 图表引擎 |
| echarts-for-react | ≥ 3.0 | ECharts React 封装 |

### 10.2 版本兼容性

| 依赖 | 版本要求 | 兼容性说明 |
|-----|---------|-----------|
| Node.js | ≥ 18.0 | Vite 5.x 要求 Node 18+ |
| Python | ≥ 3.10 | FastAPI + SQLAlchemy 2.0 async 要求 3.10+ |
| MySQL | ≥ 8.0 | JSON 字段类型支持（user_preference 表） |
| Docker | ≥ 20.10 | BuildKit 支持 |
| Docker Compose | ≥ 2.0 | docker compose v2 语法 |

---

## 11. 实施建议

### 11.1 实施顺序

严格按 PRD 7.2 节定义的 4 阶段实施：

**Phase 1: 基础骨架（P0，预估 5 天）**
1. 项目脚手架搭建：前后端项目初始化、Docker Compose 编排、.env 配置模板
2. 数据库模型定义 + Alembic 初始迁移
3. 用户认证 API（注册/登录/JWT）
4. 任务 CRUD API（创建/查看/更新/软删除/恢复/状态变更）
5. 前端：AppLayout + 路由 + 认证守卫
6. 前端：任务列表页面（列表视图 + 创建/编辑表单 + 筛选/排序）
7. Docker 一键部署验证

**Phase 2: AI 核心（P1，预估 5 天）**
1. AI 能力层：AIClient + 重试 + 降级
2. NLP 解析器 + 自然语言创建前端（智能创建输入框 + 解析预览卡片）
3. 分类器 + 自动分类逻辑（任务创建时自动触发）
4. 标签推荐引擎 + 标签管理
5. 优先级引擎 + 智能排序（AI 排序 + 规则引擎降级）
6. 优先级缓存表 + 定时全量重算
7. AI 健康检查接口 + 前端 AI 状态指示

**Phase 3: 视图扩展（P1，预估 3 天）**
1. 看板视图（三列布局 + 拖拽 + 统计摘要）
2. 日历视图（月视图 + 周视图 + 优先级色块 + 日期任务弹窗）
3. 前端：设置页面（通用设置 + 提醒设置 + 主题切换）

**Phase 4: 智能进阶（P2，预估 5 天）**
1. 提醒系统：提醒服务 + 定时检查 + 浏览器通知 + 页面内通知 + 免打扰
2. 时间规划：规划引擎 + 日/周规划 API + 前端展示 + 拖拽调整
3. 数据统计：统计服务 + 趋势查询 + 前端可视化（卡片/折线图/饼图/环形图）
4. 习惯学习：行为日志 + 每日学习分析 + 偏好查询/修正/重置 + 偏好设置页面
5. 全链路集成测试 + 性能测试

**总计预估：18 个工作日**

### 11.2 测试策略

| 测试类型 | 测试内容 | 工具 |
|---------|---------|------|
| 单元测试 | 后端 Service 层业务逻辑、AI 能力层（mock AI API） | pytest + pytest-asyncio |
| API 集成测试 | 全部 API 端点的请求/响应验证 | pytest + httpx (AsyncClient) |
| 前端组件测试 | 核心组件渲染和交互 | Vitest + React Testing Library |
| E2E 测试 | 核心用户流程（登录→创建任务→AI 解析→排序→完成） | Playwright |
| 性能测试 | API 响应时间（P95）、首屏加载时间 | locust（API）、Lighthouse（前端） |
| AI 准确率测试 | NLP 解析 + 分类准确率（10 组测试用例） | 手动 + 脚本批量验证 |

---

## 12. 附录

### 12.1 文件变更清单

| 变更类型 | 文件路径 | 说明 |
|---------|---------|------|
| 新增 | `backend/app/main.py` | FastAPI 应用入口 + 中间件 + 路由注册 |
| 新增 | `backend/app/config.py` | Pydantic Settings 全局配置 |
| 新增 | `backend/app/database.py` | SQLAlchemy async engine + session factory |
| 新增 | `backend/app/dependencies.py` | FastAPI 依赖注入（DB session、当前用户） |
| 新增 | `backend/app/api/__init__.py` | API 路由包 |
| 新增 | `backend/app/api/auth.py` | 认证 API（注册/登录） |
| 新增 | `backend/app/api/tasks.py` | 任务 API（CRUD/NLP/排序/提醒） |
| 新增 | `backend/app/api/categories.py` | 分类 API |
| 新增 | `backend/app/api/tags.py` | 标签 API（含合并） |
| 新增 | `backend/app/api/planning.py` | 规划 API |
| 新增 | `backend/app/api/stats.py` | 统计 API |
| 新增 | `backend/app/api/settings.py` | 设置 API |
| 新增 | `backend/app/api/preferences.py` | 偏好 API |
| 新增 | `backend/app/api/health.py` | 健康检查 API |
| 新增 | `backend/app/models/__init__.py` | ORM 模型包 |
| 新增 | `backend/app/models/user.py` | User 模型 |
| 新增 | `backend/app/models/task.py` | Task 模型 |
| 新增 | `backend/app/models/category.py` | Category 模型 |
| 新增 | `backend/app/models/tag.py` | Tag, TaskTag 模型 |
| 新增 | `backend/app/models/settings.py` | UserSettings 模型 |
| 新增 | `backend/app/models/behavior.py` | UserBehaviorLog, UserPreference 模型 |
| 新增 | `backend/app/models/ai_cache.py` | AIPriorityCache 模型 |
| 新增 | `backend/app/services/__init__.py` | 服务层包 |
| 新增 | `backend/app/services/task_service.py` | 任务业务逻辑 |
| 新增 | `backend/app/services/category_service.py` | 分类业务逻辑 |
| 新增 | `backend/app/services/tag_service.py` | 标签业务逻辑（含合并） |
| 新增 | `backend/app/services/planning_service.py` | 规划业务逻辑 |
| 新增 | `backend/app/services/stats_service.py` | 统计业务逻辑 |
| 新增 | `backend/app/services/settings_service.py` | 设置业务逻辑 |
| 新增 | `backend/app/services/preference_service.py` | 偏好学习业务逻辑 |
| 新增 | `backend/app/services/behavior_log_service.py` | 行为日志服务 |
| 新增 | `backend/app/services/reminder_service.py` | 提醒策略服务 |
| 新增 | `backend/app/ai/__init__.py` | AI 能力层包 |
| 新增 | `backend/app/ai/client.py` | AI 统一客户端 |
| 新增 | `backend/app/ai/retry.py` | 重试装饰器 |
| 新增 | `backend/app/ai/degradation.py` | 降级混入 |
| 新增 | `backend/app/ai/prompt_builder.py` | Prompt 模板管理 |
| 新增 | `backend/app/ai/nlp_parser.py` | 自然语言解析器 |
| 新增 | `backend/app/ai/classifier.py` | 自动分类器 |
| 新增 | `backend/app/ai/priority_engine.py` | 优先级引擎 |
| 新增 | `backend/app/ai/suggestion_engine.py` | 标签推荐引擎 |
| 新增 | `backend/app/ai/planning_engine.py` | 时间规划引擎 |
| 新增 | `backend/app/ai/reminder_engine.py` | 拖延风险评估 |
| 新增 | `backend/app/ai/fallback_priority.py` | 规则引擎降级算法 |
| 新增 | `backend/app/scheduler/__init__.py` | 定时任务包 |
| 新增 | `backend/app/scheduler/app.py` | APScheduler 初始化 |
| 新增 | `backend/app/scheduler/jobs/daily_priority_recalc.py` | 优先级重算任务 |
| 新增 | `backend/app/scheduler/jobs/daily_learning.py` | 习惯学习任务 |
| 新增 | `backend/app/scheduler/jobs/daily_plan_refresh.py` | 规划刷新任务 |
| 新增 | `backend/app/scheduler/jobs/reminder_check.py` | 提醒检查任务 |
| 新增 | `backend/app/middleware/auth.py` | JWT 认证中间件 |
| 新增 | `backend/alembic.ini` | Alembic 配置 |
| 新增 | `backend/alembic/env.py` | Alembic 环境配置 |
| 新增 | `backend/alembic/versions/001_init.py` | 初始迁移脚本 |
| 新增 | `backend/requirements.txt` | Python 依赖 |
| 新增 | `frontend/src/main.tsx` | React 入口 |
| 新增 | `frontend/src/App.tsx` | 根组件 + 路由 |
| 新增 | `frontend/src/api/client.ts` | Axios 实例 + JWT 拦截器 |
| 新增 | `frontend/src/api/tasks.ts` | 任务 API 封装 |
| 新增 | `frontend/src/api/auth.ts` | 认证 API 封装 |
| 新增 | `frontend/src/store/` | Zustand stores |
| 新增 | `frontend/src/pages/Tasks/` | 任务列表页面组件 |
| 新增 | `frontend/src/pages/Kanban/` | 看板页面组件 |
| 新增 | `frontend/src/pages/Calendar/` | 日历页面组件 |
| 新增 | `frontend/src/pages/Planning/` | 规划页面组件 |
| 新增 | `frontend/src/pages/Stats/` | 统计页面组件 |
| 新增 | `frontend/src/pages/Settings/` | 设置页面组件 |
| 新增 | `frontend/src/components/` | 公共组件 |
| 新增 | `frontend/package.json` | 前端依赖 |
| 新增 | `frontend/vite.config.ts` | Vite 构建配置 |
| 新增 | `docker-compose.yml` | 多容器编排（app + mysql + nginx） |
| 新增 | `docker/Dockerfile.backend` | 后端 Docker 镜像 |
| 新增 | `docker/Dockerfile.frontend` | 前端 Docker 镜像 |
| 新增 | `docker/nginx.conf` | Nginx 反向代理配置 |
| 新增 | `.env.example` | 环境变量模板 |
| 新增 | `.gitignore` | Git 忽略配置 |

### 12.2 数据库 ER 关系

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │      tasks       │       │  categories  │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │◄──┐   │ id (PK)          │   ┌──►│ id (PK)      │
│ username     │   │   │ user_id (FK)     │───┘   │ user_id (FK) │
│ password_hash│   │   │ title            │       │ name         │
│ created_at   │   │   │ description      │       │ icon         │
│ updated_at   │   │   │ due_datetime     │       │ sort_order   │
└──────────────┘   │   │ priority         │       │ is_default   │
       │           │   │ status           │       │ created_at   │
       │           │   │ category_id (FK) │       └──────────────┘
       │           │   │ estimated_minutes│
       │           │   │ location         │       ┌──────────────┐
       │           │   │ completed_at     │       │     tags     │
       │           │   │ ai_generated     │       ├──────────────┤
       │           │   │ created_at       │       │ id (PK)      │
       │           │   │ updated_at       │       │ user_id (FK) │
       │           │   │ deleted_at       │       │ name         │
       │           │   └────────┬─────────┘       │ created_at   │
       │                    │                   └──────┬───────┘
       │                    │                          │
       │           ┌────────▼────────┐         ┌──────▼───────┐
       │           │   task_tags     │         │  task_tags   │
       │           ├─────────────────┤         └──────────────┘
       │           │ task_id (FK)    │
       │           │ tag_id (FK)     │
       │           └─────────────────┘
       │
       ├──► ┌──────────────────┐       ┌────────────────────┐
       │    │  user_settings   │       │ user_behavior_log  │
       │    ├──────────────────┤       ├────────────────────┤
       │    │ user_id (PK,FK)  │       │ id (PK)            │
       │    │ timezone         │       │ user_id (FK)       │
       │    │ daily_work_hours │       │ action_type        │
       │    │ work_days        │       │ target_type        │
       │    │ reminder_enabled │       │ target_id          │
       │    │ quiet_hours_start│       │ metadata (JSON)    │
       │    │ quiet_hours_end  │       │ ai_suggestion_id   │
       │    │ default_view     │       │ user_accepted      │
       │    │ theme            │       │ created_at         │
       │    └──────────────────┘       └────────────────────┘
       │
       ├──► ┌──────────────────┐       ┌────────────────────┐
       │    │ user_preference  │       │ ai_priority_cache  │
       │    ├──────────────────┤       ├────────────────────┤
       │    │ user_id (PK,FK)  │       │ task_id (PK,FK)    │
       │    │ active_hours     │       │ score              │
       │    │ productive_hours │       │ reason             │
       │    │ category_pref... │       │ calculated_at      │
       │    │ tag_preference   │       └────────────────────┘
       │    │ completion_speed │
       │    │ procrastination..│
       │    │ manual_overrides │
       │    │ days_of_data     │
       │    │ updated_at       │
       │    └──────────────────┘
       │
       └──────────────────────────────────────────────────────
```

### 12.3 Docker 部署架构

```yaml
# docker-compose.yml 概要
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    
  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - AI_BASE_URL=${AI_BASE_URL}
      - AI_API_KEY=${AI_API_KEY}
      - AI_MODEL_NAME=${AI_MODEL_NAME}
    depends_on:
      - mysql
    ports:
      - "8000:8000"
    
  frontend:
    build:
      context: .
      dockerfile: docker/Dockerfile.frontend
    depends_on:
      - backend
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - frontend
      - backend

volumes:
  mysql_data:
```

**Nginx 配置要点**:
- `/api/*` 反向代理到 `backend:8000`
- 其他路径 serve 前端静态文件（`/usr/share/nginx/html`）
- SPA fallback: `try_files $uri $uri/ /index.html`

---

**文档版本**: v1.0.0
**最后更新**: 2026-04-20
**审核状态**: 待评审

---

> **架构师声明**: 本设计文档覆盖 PRD 全部 13 个需求锚点（[REQ_TASK_MGMT_001] ~ [REQ_TASK_MGMT_013]），全部验收条件均已映射到具体设计实现与验证方法。未发现 [AMBIGUITY] 级歧义。未发现 [MISSING_REQ] 级遗漏。
