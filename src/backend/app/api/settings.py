"""
设置 API — [REQ_TASK_MGMT_011]
"""
# from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import CurrentUser, DbSession
from ..models.settings import UserSettings
from .response import success_response, error_response

router = APIRouter()


class SettingsUpdate(BaseModel):
    timezone: str | None = None
    daily_work_hours: int | None = None
    work_days: str | None = None
    reminder_enabled: bool | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    default_view: str | None = None
    theme: str | None = None


@router.get("")
async def get_settings(
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取用户设置 [AC-011-04]"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        return success_response(data=UserSettings(user_id=user.id).__dict__)

    return success_response(data={
        "timezone": settings.timezone,
        "daily_work_hours": settings.daily_work_hours,
        "work_days": settings.work_days,
        "reminder_enabled": settings.reminder_enabled,
        "quiet_hours_start": settings.quiet_hours_start,
        "quiet_hours_end": settings.quiet_hours_end,
        "default_view": settings.default_view,
        "theme": settings.theme,
    })


@router.put("")
async def update_settings(
    data: SettingsUpdate,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """更新用户设置 [AC-011-04]"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        settings = UserSettings(user_id=user.id)
        db.add(settings)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    await db.commit()
    return success_response(data={
        "timezone": settings.timezone,
        "daily_work_hours": settings.daily_work_hours,
        "work_days": settings.work_days,
        "reminder_enabled": settings.reminder_enabled,
        "quiet_hours_start": settings.quiet_hours_start,
        "quiet_hours_end": settings.quiet_hours_end,
        "default_view": settings.default_view,
        "theme": settings.theme,
    })
