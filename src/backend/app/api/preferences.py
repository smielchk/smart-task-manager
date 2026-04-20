"""
偏好 API — [REQ_TASK_MGMT_010]
"""
# from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import CurrentUser, DbSession
from ..services.preference_service import PreferenceService
from .response import success_response

router = APIRouter()


class PreferenceOverrideRequest(BaseModel):
    field: str
    value: Any


@router.get("")
async def get_preferences(
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取偏好摘要 [AC-010-04]"""
    pref = await PreferenceService.get_preference(db, user.id)
    return success_response(data=pref)


@router.put("")
async def update_preference(
    data: PreferenceOverrideRequest,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """手动修正偏好 [AC-010-05]"""
    pref = await PreferenceService.update_manual_override(db, user.id, data.field, data.value)
    await db.commit()
    return success_response(data=pref)


@router.post("/reset")
async def reset_preferences(
    db: DbSession = None,
    user: CurrentUser = None,
):
    """重置学习数据 [AC-010-06]"""
    await PreferenceService.reset_learning_data(db, user.id)
    await db.commit()
    return success_response(data={"message": "学习数据已重置"})
