"""
偏好服务 — [REQ_TASK_MGMT_010]
习惯学习、偏好查询/修正/重置。
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.behavior import UserBehaviorLog, UserPreference
from ..models.task import Task, TaskStatus

logger = logging.getLogger(__name__)


class PreferenceService:
    """偏好学习服务 [REQ_TASK_MGMT_010]"""

    @staticmethod
    async def get_preference(db: AsyncSession, user_id: int) -> dict:
        """获取用户偏好（AI 学习值 + 手动修正值合并）[AC-010-04]"""
        result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        pref = result.scalar_one_or_none()

        if pref is None:
            return PreferenceService._default_preference()

        data = {
            "active_hours": pref.active_hours,
            "productive_hours": pref.productive_hours,
            "category_preference": pref.category_preference,
            "tag_preference": pref.tag_preference,
            "completion_speed": pref.completion_speed,
            "procrastination_pattern": pref.procrastination_pattern,
            "manual_overrides": pref.manual_overrides,
            "days_of_data": pref.days_of_data,
        }

        # 手动修正值优先
        if pref.manual_overrides:
            for key, value in pref.manual_overrides.items():
                if value is not None:
                    data[key] = value

        return data

    @staticmethod
    async def update_manual_override(
        db: AsyncSession, user_id: int, field: str, value: Any
    ) -> dict:
        """手动修正偏好参数 [AC-010-05]"""
        result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        pref = result.scalar_one_or_none()

        if pref is None:
            pref = UserPreference(user_id=user_id)
            db.add(pref)
            await db.flush()

        if pref.manual_overrides is None:
            pref.manual_overrides = {}

        pref.manual_overrides[field] = value
        await db.flush()

        return await PreferenceService.get_preference(db, user_id)

    @staticmethod
    async def reset_learning_data(db: AsyncSession, user_id: int) -> None:
        """清除所有 AI 学习数据 [AC-010-06]"""
        result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        pref = result.scalar_one_or_none()

        if pref:
            pref.active_hours = None
            pref.productive_hours = None
            pref.category_preference = None
            pref.tag_preference = None
            pref.completion_speed = None
            pref.procrastination_pattern = None
            pref.manual_overrides = None
            pref.days_of_data = 0

        await db.flush()

    @staticmethod
    async def run_daily_learning(db: AsyncSession, user_id: int) -> None:
        """
        每日学习分析 [AC-010-02, AC-010-07]
        聚合 user_behavior_log 原始数据，计算偏好参数。
        不足 7 天数据时使用系统默认值。
        """
        # 统计行为日志天数
        days_result = await db.execute(
            select(func.count(func.distinct(func.date(UserBehaviorLog.created_at))))
            .where(UserBehaviorLog.user_id == user_id)
        )
        days_of_data = days_result.scalar() or 0

        if days_of_data < 7:
            logger.info("用户 %d 行为数据不足 7 天 (%d 天)，跳过学习", user_id, days_of_data)
            # 确保偏好记录存在
            result = await db.execute(
                select(UserPreference).where(UserPreference.user_id == user_id)
            )
            pref = result.scalar_one_or_none()
            if pref is None:
                pref = UserPreference(user_id=user_id, days_of_data=0)
                db.add(pref)
            else:
                pref.days_of_data = days_of_data
            await db.flush()
            return

        # 1. 聚合活跃时段
        hour_result = await db.execute(
            select(func.hour(UserBehaviorLog.created_at), func.count())
            .where(
                UserBehaviorLog.user_id == user_id,
                UserBehaviorLog.created_at >= datetime.now(timezone.utc) - timedelta(days=30),
            )
            .group_by(func.hour(UserBehaviorLog.created_at))
            .order_by(func.count().desc())
        )
        hours = hour_result.all()
        active_hours = {str(h): c for h, c in hours}
        productive_hours = [f"{h:02d}:00-{h+1:02d}:00" for h, _ in hours[:3]]

        # 2. 聚合分类偏好
        from ..models.category import Category
        cat_result = await db.execute(
            select(Category.name, func.count(Task.id))
            .join(Task, Category.id == Task.category_id)
            .where(
                Task.user_id == user_id,
                Task.status == TaskStatus.COMPLETED,
                Task.deleted_at.is_(None),
            )
            .group_by(Category.id, Category.name)
        )
        cat_rows = cat_result.all()
        total_cat_tasks = sum(c for _, c in cat_rows) if cat_rows else 1
        category_preference = {name: round(count / total_cat_tasks, 2) for name, count in cat_rows}

        # 3. 聚合标签偏好
        from ..models.tag import Tag, task_tags
        tag_result = await db.execute(
            select(Tag.name, func.count(task_tags.c.task_id))
            .join(task_tags, Tag.id == task_tags.c.tag_id)
            .where(Tag.user_id == user_id)
            .group_by(Tag.id, Tag.name)
            .order_by(func.count(task_tags.c.task_id).desc())
        )
        tag_preference = {name: count for name, count in tag_result.all()}

        # 4. 聚合完成速度
        speed_result = await db.execute(
            select(Task.priority, func.avg(
                func.timestampdiff(func.text("MINUTE"), Task.created_at, Task.completed_at)
            ))
            .where(
                Task.user_id == user_id,
                Task.status == TaskStatus.COMPLETED,
                Task.completed_at.isnot(None),
            )
            .group_by(Task.priority)
        )
        completion_speed = {str(p): round(float(avg_min), 0) for p, avg_min in speed_result.all()}

        # 5. 聚合拖延模式
        procrastination_result = await db.execute(
            select(
                func.count().label("total"),
                func.sum(
                    case(
                        (Task.completed_at < Task.due_datetime, 1),
                        else_=0,
                    )
                ).label("ahead"),
                func.sum(
                    case(
                        (Task.completed_at >= Task.due_datetime, 1),
                        else_=0,
                    )
                ).label("ontime_overdue"),
            )
            .where(
                Task.user_id == user_id,
                Task.status == TaskStatus.COMPLETED,
                Task.completed_at.isnot(None),
                Task.due_datetime.isnot(None),
            )
        )
        row = procrastination_result.one()
        total = row.total or 1
        ahead = row.ahead or 0
        ontime_overdue = row.ontime_overdue or 0
        procrastination_pattern = {
            "ahead": round(ahead / total, 2),
            "ontime": round(ontime_overdue / total * 0.7, 2),
            "overdue": round(ontime_overdue / total * 0.3, 2),
        }

        # 更新偏好
        result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        pref = result.scalar_one_or_none()
        if pref is None:
            pref = UserPreference(user_id=user_id)
            db.add(pref)

        pref.active_hours = active_hours
        pref.productive_hours = productive_hours
        pref.category_preference = category_preference
        pref.tag_preference = tag_preference
        pref.completion_speed = completion_speed
        pref.procrastination_pattern = procrastination_pattern
        pref.days_of_data = days_of_data

        await db.flush()
        logger.info("用户 %d 每日学习分析完成，天数: %d", user_id, days_of_data)

    @staticmethod
    def _default_preference() -> dict:
        """系统默认偏好值"""
        return {
            "active_hours": None,
            "productive_hours": None,
            "category_preference": None,
            "tag_preference": None,
            "completion_speed": None,
            "procrastination_pattern": None,
            "manual_overrides": None,
            "days_of_data": 0,
        }
