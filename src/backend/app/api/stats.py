"""
统计 API — [REQ_TASK_MGMT_009]
"""
# from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import CurrentUser, DbSession
from ..services.stats_service import StatsService
from .response import success_response

router = APIRouter()


@router.get("/summary")
async def get_summary(
    range: str = Query("week", description="时间范围: week/month/quarter"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取统计摘要 [AC-009-01, AC-009-04]"""
    summary = await StatsService.get_summary(db, user.id, range, start_date, end_date)
    return success_response(data=summary)


@router.get("/trends")
async def get_trends(
    days: int = Query(7, description="天数: 7/30"),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取趋势数据 [AC-009-03]"""
    trends = await StatsService.get_trends(db, user.id, days)
    return success_response(data=trends)
