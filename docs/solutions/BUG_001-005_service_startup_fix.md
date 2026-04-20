# BUG_001~005 修复方案: 服务启动阻断性缺陷

## 严重级别: CRITICAL

## 问题描述
原始代码在 FastAPI 0.110.0 环境下 uvicorn 完全无法启动，共 5 个阻断性缺陷。

## 缺陷清单

### BUG_001: `from __future__ import annotations` 不兼容
- **文件**: api/categories.py, api/planning.py, api/preferences.py, api/settings.py, api/stats.py, api/tags.py, api/tasks.py, api/auth.py
- **根因**: Python `from __future__ import annotations` 使所有类型注解变为字符串，FastAPI 0.110 在装饰器阶段无法解析 `Annotated` 类型别名 `DbSession` / `CurrentUser`
- **修复**: 删除所有 `from __future__ import annotations` 行

### BUG_002: 路由参数类型注解错误
- **文件**: api/*.py (29 处)
- **根因**: `db: AsyncSession = DbSession` 将 `DbSession`（`Annotated[AsyncSession, Depends(get_db)]`）作为默认值而非类型注解
- **修复**: 全部改为 `db: DbSession`

### BUG_003: middleware 导入路径错误
- **文件**: middleware/__init__.py:24
- **根因**: 同级导入 `.config` 不存在，应为上级 `..config`
- **修复**: `from .config import settings` → `from ..config import settings`

### BUG_004: middleware/auth.py 循环导入
- **文件**: middleware/auth.py:2
- **根因**: `from .auth import JWTAuthMiddleware` 从自身导入
- **修复**: `from .auth import JWTAuthMiddleware` → `from . import JWTAuthMiddleware`

### BUG_005: APScheduler job 注册参数缺失
- **文件**: scheduler/app.py:22-47
- **根因**: 4 个 `scheduler.add_job()` 调用未传递 job 函数的必需参数 `db_factory`
- **修复**: 每个 add_job 添加 `kwargs={"db_factory": async_session_factory}`，并在文件顶部 `from ..database import async_session_factory`

## 环境依赖修复
- passlib + bcrypt 5.0 不兼容 → 降级 `pip install "bcrypt<4.1"` 或升级 passlib
