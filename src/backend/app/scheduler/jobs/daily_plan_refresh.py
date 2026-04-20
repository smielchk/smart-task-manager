"""
每日规划刷新任务 — [REQ_TASK_MGMT_006]
每天 08:00 刷新当日规划。
"""
from __future__ import annotations

import logging

from sqlalchemy import select

logger = logging.getLogger(__name__)


async def run(db_factory) -> None:
    """执行每日规划刷新 [AC-006-07]"""
    from ..database import async_session_factory
    from ..models.user import User
    from ..services.planning_service import PlanningService

    async with async_session_factory() as db:
        try:
            user_result = await db.execute(select(User))
            users = user_result.scalars().all()

            for user in users:
                plan = await PlanningService.get_daily_plan(db, user.id)
                logger.info(
                    "用户 %d 每日规划已刷新: %d 个推荐任务, 负载 %.1f%%",
                    user.id,
                    len(plan.get("recommended_tasks", [])),
                    plan.get("load_percentage", 0),
                )

            logger.info("每日规划刷新任务执行完成")

        except Exception as e:
            logger.error("每日规划刷新任务异常: %s", e)
