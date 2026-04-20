"""
提醒服务 — [REQ_TASK_MGMT_005]
提醒策略判断与待推送提醒查询。
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.behavior import UserPreference
from ..models.reminder_log import ReminderLog
from ..models.settings import UserSettings
from ..models.task import Task, TaskStatus

logger = logging.getLogger(__name__)


class ReminderService:
    """提醒策略服务 [REQ_TASK_MGMT_005]"""

    @staticmethod
    async def get_pending_reminders(db: AsyncSession, user_id: int) -> list[dict]:
        """
        获取待推送提醒列表。
        实现多层提醒策略：
        - 层1: 截止日提醒
        - 层2: 提前一天提醒
        - 层3: 紧急预警
        """
        now = datetime.now(timezone.utc)
        # 查询 24 小时内已推送的提醒（去重）[AC-005-03, H-005]
        cutoff = now - timedelta(hours=24)
        recent_logs = await db.execute(
            select(ReminderLog).where(
                ReminderLog.user_id == user_id,
                ReminderLog.pushed_at >= cutoff,
            )
        )
        recent_set = {
            (log.task_id, log.reminder_type)
            for log in recent_logs.scalars().all()
        }

        reminders = []
        new_logs = []

        # 获取用户设置（时区、免打扰）
        result = await db.execute(
            select(UserSettings).where(UserSettings.user_id == user_id)
        )
        user_settings = result.scalar_one_or_none()

        if user_settings and not user_settings.reminder_enabled:
            return reminders

        # 查询候选任务: 未完成 + 未删除 + 未取消 + 提醒已启用
        query = (
            select(Task)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
                Task.reminder_enabled == True,
            )
        )
        result = await db.execute(query)
        tasks = result.scalars().all()

        for task in tasks:
            if not task.due_datetime:
                continue

            due = task.due_datetime.replace(tzinfo=None) if task.due_datetime.tzinfo is None else task.due_datetime
            now_naive = now.replace(tzinfo=None)

            # 层1: 截止日当天提醒 [AC-005-01]
            due_date = due.date() if hasattr(due, 'date') else due.date()
            today_date = now_naive.date()
            if due_date == today_date:
                reminder_type = "due_today"
                if (task.id, reminder_type) not in recent_set:
                    reminders.append({
                        "task_id": task.id,
                        "task_title": task.title,
                        "type": reminder_type,
                        "message": f"📋 [{task.title}] 今天到期",
                        "priority": task.priority.value,
                        "due_datetime": task.due_datetime.isoformat() if task.due_datetime else None,
                    })
                    new_logs.append(ReminderLog(
                        user_id=user_id, task_id=task.id, reminder_type=reminder_type
                    ))

            # 层2: 提前一天提醒 [AC-005-02]
            tomorrow = today_date + timedelta(days=1)
            if due_date == tomorrow:
                reminder_type = "due_tomorrow"
                if (task.id, reminder_type) not in recent_set:
                    reminders.append({
                        "task_id": task.id,
                        "task_title": task.title,
                        "type": reminder_type,
                        "message": f"⚡ [{task.title}] 明天到期，请做好准备",
                        "priority": task.priority.value,
                        "due_datetime": task.due_datetime.isoformat() if task.due_datetime else None,
                    })
                    new_logs.append(ReminderLog(
                        user_id=user_id, task_id=task.id, reminder_type=reminder_type
                    ))

            # 层3: 已逾期预警
            if due_date < today_date:
                reminder_type = "overdue"
                if (task.id, reminder_type) not in recent_set:
                    reminders.append({
                        "task_id": task.id,
                        "task_title": task.title,
                        "type": reminder_type,
                        "message": f"🔴 [{task.title}] 已逾期，请尽快处理",
                        "priority": task.priority.value,
                        "due_datetime": task.due_datetime.isoformat() if task.due_datetime else None,
                    })
                    new_logs.append(ReminderLog(
                        user_id=user_id, task_id=task.id, reminder_type=reminder_type
                    ))

        # 批量写入提醒日志
        for log in new_logs:
            db.add(log)

        return reminders
