"""
APScheduler 初始化 — [REQ_TASK_MGMT_004, REQ_TASK_MGMT_005, REQ_TASK_MGMT_006, REQ_TASK_MGMT_010]
"""
from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from ..config import settings
from ..database import async_session_factory
from .jobs import daily_learning, daily_plan_refresh, daily_priority_recalc, reminder_check

logger = logging.getLogger(__name__)


def create_scheduler() -> AsyncIOScheduler:
    """创建并配置定时任务调度器"""
    scheduler = AsyncIOScheduler()

    # 每日 02:00 全量重算优先级 [AC-004-06]
    scheduler.add_job(
        daily_priority_recalc.run,
        CronTrigger(hour=2, minute=0),
        id="daily_priority_recalc",
        replace_existing=True,
        kwargs={"db_factory": async_session_factory},
    )

    # 每日 03:00 习惯学习分析 [AC-010-02]
    scheduler.add_job(
        daily_learning.run,
        CronTrigger(hour=3, minute=0),
        id="daily_learning",
        replace_existing=True,
        kwargs={"db_factory": async_session_factory},
    )

    # 每日 08:00 刷新当日规划 [AC-006-07]
    scheduler.add_job(
        daily_plan_refresh.run,
        CronTrigger(hour=8, minute=0),
        id="daily_plan_refresh",
        replace_existing=True,
        kwargs={"db_factory": async_session_factory},
    )

    # 每 15 分钟检查提醒 [AC-005-01, AC-005-02]
    scheduler.add_job(
        reminder_check.run,
        IntervalTrigger(minutes=settings.REMINDER_CHECK_INTERVAL_MINUTES),
        id="reminder_check",
        replace_existing=True,
        kwargs={"db_factory": async_session_factory},
    )

    logger.info("定时任务调度器已配置: 4 个任务")
    return scheduler
