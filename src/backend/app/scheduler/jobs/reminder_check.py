"""
提醒检查任务 — [REQ_TASK_MGMT_005]
每 15 分钟检查提醒触发条件。
"""
from __future__ import annotations

import logging

from sqlalchemy import select

logger = logging.getLogger(__name__)


async def run(db_factory) -> None:
    """执行提醒检查"""
    from ..database import async_session_factory
    from ..models.user import User
    from ..services.reminder_service import ReminderService

    async with async_session_factory() as db:
        try:
            user_result = await db.execute(select(User))
            users = user_result.scalars().all()

            for user in users:
                reminders = await ReminderService.get_pending_reminders(db, user.id)
                if reminders:
                    logger.info(
                        "用户 %d: %d 条待推送提醒",
                        user.id, len(reminders),
                    )

        except Exception as e:
            logger.error("提醒检查任务异常: %s", e)
