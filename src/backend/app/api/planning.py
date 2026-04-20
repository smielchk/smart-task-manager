"""
规划 API — [REQ_TASK_MGMT_006]
"""
# from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import CurrentUser, DbSession
from ..services.planning_service import PlanningService
from .response import success_response

router = APIRouter()


class RegenerateRequest(BaseModel):
    type: str  # "daily" or "weekly"


@router.get("/daily")
async def get_daily_plan(
    date: str = Query(None, description="日期（YYYY-MM-DD）"),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取今日规划 [AC-006-01]"""
    plan = await PlanningService.get_daily_plan(db, user.id, date)
    return success_response(data=plan)


@router.get("/weekly")
async def get_weekly_plan(
    week_start: str = Query(None, description="周起始日期"),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取本周规划 [AC-006-05]"""
    plan = await PlanningService.get_weekly_plan(db, user.id)
    return success_response(data=plan)


@router.post("/regenerate")
async def regenerate_plan(
    data: RegenerateRequest,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """重新生成规划 [AC-006-06]"""
    if data.type == "daily":
        plan = await PlanningService.get_daily_plan(db, user.id)
    else:
        plan = await PlanningService.get_weekly_plan(db, user.id)
    return success_response(data=plan)
