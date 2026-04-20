"""
每日习惯学习任务 — [REQ_TASK_MGMT_010]
每天 03:00 运行习惯学习分析。
"""
from __future__ import annotations

import logging

from sqlalchemy import select

logger = logging.getLogger(__name__)


async def run(db_factory) -> None:
    """执行每日习惯学习分析 [AC-010-02]"""
    from ..database import async_session_factory
    from ..models.user import User
    from ..services.preference_service import PreferenceService

    async with async_session_factory() as db:
        try:
            user_result = await db.execute(select(User))
            users = user_result.scalars().all()

            for user in users:
                await PreferenceService.run_daily_learning(db, user.id)

            await db.commit()
            logger.info("每日习惯学习任务执行完成")

        except Exception as e:
            logger.error("每日习惯学习任务异常: %s", e)
            await db.rollback()
