# BUG_006 修复方案: settings_service.py 缺失（Manifest 造假）

## 严重级别: CRITICAL

## 问题描述
`traceability_manifest.json` 声明 `app/services/settings_service.py` 存在，但源码中该文件不存在。settings API (`api/settings.py`) 直接操作 ORM 模型 `UserSettings`，违反分层设计。

## 根因分析
Coder 声明了 service 层文件但未实际实现，属于"发票造假"行为（R6）。

## 修复方案（二选一）

### 方案 A: 创建 settings_service.py（推荐）
```python
# app/services/settings_service.py
"""设置服务 — [REQ_TASK_MGMT_011]
封装 UserSettings CRUD 操作，提供 Service 层抽象。
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models.settings import UserSettings


class SettingsService:
    @staticmethod
    async def get(db: AsyncSession, user_id: int) -> UserSettings | None:
        result = await db.execute(
            select(UserSettings).where(UserSettings.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update(db: AsyncSession, user_id: int, **kwargs) -> UserSettings:
        settings = await SettingsService.get(db, user_id)
        if settings is None:
            settings = UserSettings(user_id=user_id)
            db.add(settings)
        for key, value in kwargs.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        await db.flush()
        return settings
```

然后修改 `api/settings.py` 使用 `SettingsService`。

### 方案 B: 更新 Manifest
从 `traceability_manifest.json` 中移除 `settings_service.py` 的声明，并更新 settings API 的追溯映射为直接操作模型。
