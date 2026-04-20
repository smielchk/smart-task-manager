"""
规划服务 — [REQ_TASK_MGMT_006]
日/周规划生成与缓存。
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..ai.client import ai_client
from ..ai.fallback_priority import rule_based_priority_score
from ..ai.planning_engine import PlanningEngine
from ..models.behavior import UserPreference
from ..models.settings import UserSettings
from ..models.task import Task, TaskStatus

logger = logging.getLogger(__name__)


class PlanningService:
    """规划业务逻辑 [REQ_TASK_MGMT_006]"""

    @staticmethod
    async def get_daily_plan(db: AsyncSession, user_id: int, date: str | None = None) -> dict:
        """
        获取今日/指定日期的规划 [AC-006-01, AC-006-02, AC-006-03, AC-006-04]
        """
        today = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 获取未完成任务
        result = await db.execute(
            select(Task)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
            )
            .order_by(Task.priority)
        )
        tasks = result.scalars().all()

        # 获取用户设置
        settings_result = await db.execute(
            select(UserSettings).where(UserSettings.user_id == user_id)
        )
        user_settings = settings_result.scalar_one_or_none()
        available_hours = user_settings.daily_work_hours if user_settings else 8
        work_days = user_settings.work_days if user_settings else "1,2,3,4,5"

        # 获取用户偏好
        pref_result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        user_pref = pref_result.scalar_one_or_none()
        preference = {
            "productive_hours": user_pref.productive_hours,
            "completion_speed": user_pref.completion_speed,
        } if user_pref else None

        # 构建任务 JSON
        tasks_list = []
        total_minutes = 0
        for task in tasks:
            tasks_list.append({
                "task_id": task.id,
                "title": task.title,
                "priority": task.priority.value,
                "due_datetime": task.due_datetime.isoformat() if task.due_datetime else None,
                "estimated_minutes": task.estimated_minutes,
            })
            if task.estimated_minutes:
                total_minutes += task.estimated_minutes

        available_minutes = available_hours * 60
        load_percentage = (total_minutes / available_minutes * 100) if available_minutes > 0 else 0
        is_overloaded = load_percentage > 80

        # AI 生成规划
        recommended_tasks = []
        if ai_client.is_available() and tasks_list:
            try:
                engine = PlanningEngine()
                plan = await engine.generate_plan(
                    json.dumps(tasks_list, ensure_ascii=False),
                    available_hours,
                    work_days,
                    preference,
                )
                recommended_tasks = plan.get("recommended_tasks", [])
                is_overloaded = plan.get("is_overloaded", is_overloaded)
            except Exception as e:
                logger.error("规划 AI 调用失败: %s", e)
                # 降级：基于规则排序
                for task in tasks:
                    if task.estimated_minutes:
                        hours = task.estimated_minutes // 60
                        mins = task.estimated_minutes % 60
                        recommended_tasks.append({
                            "task_id": task.id,
                            "suggested_slot": f"{hours:02d}:{mins:02d}",
                            "reason": f"优先级 {task.priority.value}",
                        })
        else:
            # AI 不可用时降级：简单排序
            for i, task in enumerate(tasks):
                if task.estimated_minutes:
                    start_min = sum(t.estimated_minutes or 0 for t in tasks[:i])
                    end_min = start_min + (task.estimated_minutes or 0)
                    recommended_tasks.append({
                        "task_id": task.id,
                        "suggested_slot": f"{start_min // 60:02d}:{start_min % 60:02d}-{end_min // 60:02d}:{end_min % 60:02d}",
                        "reason": f"优先级 {task.priority.value}",
                    })

        return {
            "date": today,
            "recommended_tasks": recommended_tasks,
            "total_estimated_minutes": total_minutes,
            "available_minutes": available_minutes,
            "load_percentage": round(load_percentage, 2),
            "is_overloaded": is_overloaded,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    async def get_weekly_plan(db: AsyncSession, user_id: int) -> dict:
        """获取本周规划 [AC-006-05]"""
        today = datetime.now(timezone.utc)
        week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
        week_end = (today + timedelta(days=6 - today.weekday())).strftime("%Y-%m-%d")

        result = await db.execute(
            select(Task)
            .where(
                Task.user_id == user_id,
                Task.deleted_at.is_(None),
                Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
            )
            .order_by(Task.due_datetime.asc().nulls_last())
        )
        tasks = result.scalars().all()

        tasks_by_day = {}
        for task in tasks:
            if task.due_datetime:
                day = task.due_datetime.strftime("%Y-%m-%d")
                if day not in tasks_by_day:
                    tasks_by_day[day] = []
                tasks_by_day[day].append({
                    "task_id": task.id,
                    "title": task.title,
                    "priority": task.priority.value,
                    "estimated_minutes": task.estimated_minutes,
                })

        return {
            "week_start": week_start,
            "week_end": week_end,
            "tasks_by_day": tasks_by_day,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
