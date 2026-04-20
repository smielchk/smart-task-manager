"""
统计服务 — [REQ_TASK_MGMT_009]
任务完成情况统计聚合。
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.category import Category
from ..models.task import Task, TaskStatus

logger = logging.getLogger(__name__)


class StatsService:
    """统计服务 [REQ_TASK_MGMT_009]"""

    @staticmethod
    async def get_summary(
        db: AsyncSession,
        user_id: int,
        range_type: str = "week",
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict:
        """
        获取统计摘要 [AC-009-01]
        包含: 本周完成数、本月完成数、完成率、分类分布、逾期率、平均完成耗时
        """
        now = datetime.now(timezone.utc)

        # 时间范围计算
        if range_type == "week":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif range_type == "month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif range_type == "quarter":
            quarter_start = ((now.month - 1) // 3) * 3 + 1
            start = now.replace(month=quarter_start, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now - timedelta(days=30)

        # 总任务数（未删除）
        total_result = await db.execute(
            select(func.count())
            .select_from(Task)
            .where(Task.user_id == user_id, Task.deleted_at.is_(None))
        )
        total = total_result.scalar() or 0

        # 已完成数
        completed_result = await db.execute(
            select(func.count())
            .select_from(Task)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.status == TaskStatus.COMPLETED,
            )
        )
        completed = completed_result.scalar() or 0

        # 完成率 [AC-009-02]
        completion_rate = round((completed / total * 100), 1) if total > 0 else 0.0

        # 本周完成数
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_completed_result = await db.execute(
            select(func.count())
            .select_from(Task)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.status == TaskStatus.COMPLETED,
                Task.completed_at >= week_start,
            )
        )
        week_completed = week_completed_result.scalar() or 0

        # 本月完成数
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_completed_result = await db.execute(
            select(func.count())
            .select_from(Task)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.status == TaskStatus.COMPLETED,
                Task.completed_at >= month_start,
            )
        )
        month_completed = month_completed_result.scalar() or 0

        # 逾期率 [AC-009-05]
        now_naive = now.replace(tzinfo=None)
        due_tasks_result = await db.execute(
            select(func.count())
            .select_from(Task)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.due_datetime.isnot(None),
                Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
            )
        )
        due_tasks = due_tasks_result.scalar() or 0

        overdue_result = await db.execute(
            select(func.count())
            .select_from(Task)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.due_datetime.isnot(None),
                Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
                Task.due_datetime < now_naive,
            )
        )
        overdue = overdue_result.scalar() or 0
        overdue_rate = round((overdue / due_tasks * 100), 1) if due_tasks > 0 else 0.0

        # 分类分布
        cat_dist_result = await db.execute(
            select(Category.name, func.count(Task.id))
            .outerjoin(Task, Category.id == Task.category_id)
            .where(Category.user_id == user_id, Task.deleted_at.is_(None))
            .group_by(Category.id, Category.name)
        )
        category_distribution = [
            {"name": name, "count": count}
            for name, count in cat_dist_result.all()
        ]

        # 平均完成耗时 — 纯 Python 计算以兼容 SQLite/MySQL [BUG_004]
        completed_tasks_result = await db.execute(
            select(Task.created_at, Task.completed_at)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.status == TaskStatus.COMPLETED,
                Task.completed_at.isnot(None),
            )
        )
        completed_rows = completed_tasks_result.all()
        if completed_rows:
            deltas = []
            for created_at, completed_at in completed_rows:
                delta = completed_at - created_at
                deltas.append(delta.total_seconds())
            avg_seconds = sum(deltas) / len(deltas)
            avg_completion_hours = round(avg_seconds / 3600, 1)
        else:
            avg_completion_hours = 0.0

        return {
            "total": total,
            "completed": completed,
            "completion_rate": completion_rate,
            "week_completed": week_completed,
            "month_completed": month_completed,
            "overdue": overdue,
            "overdue_rate": overdue_rate,
            "category_distribution": category_distribution,
            "avg_completion_hours": avg_completion_hours,
        }

    @staticmethod
    async def get_trends(db: AsyncSession, user_id: int, days: int = 7) -> list[dict]:
        """
        获取每日完成趋势 [AC-009-03]
        返回过去 N 天每日完成数。
        """
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        result = await db.execute(
            select(
                func.date(Task.completed_at).label("date"),
                func.count().label("count"),
            )
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.status == TaskStatus.COMPLETED,
                Task.completed_at >= start_date,
            )
            .group_by(func.date(Task.completed_at))
            .order_by(func.date(Task.completed_at))
        )

        # 填充空白日期
        trend_map = {str(row.date): row.count for row in result.all()}
        trends = []
        for i in range(days):
            date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            trends.append({"date": date, "count": trend_map.get(date, 0)})

        return trends
