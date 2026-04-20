"""
每日优先级重算任务 — [REQ_TASK_MGMT_004]
每天 02:00 全量重算所有任务的优先级分数。
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def run(db_factory) -> None:
    """
    执行每日优先级重算 [AC-004-06]
    AI 可用时使用 AI 批量评分，不可用时使用规则引擎降级。
    """
    from ..database import async_session_factory
    from ..models.ai_cache import AIPriorityCache
    from ..models.behavior import UserPreference
    from ..models.task import Task, TaskStatus
    from ..ai.client import ai_client
    from ..ai.fallback_priority import rule_based_priority_score
    from ..ai.priority_engine import PriorityEngine

    async with async_session_factory() as db:
        try:
            # 获取所有用户（单用户但保持通用）
            from ..models.user import User

            user_result = await db.execute(select(User))
            users = user_result.scalars().all()

            for user in users:
                # 查询未完成未删除的任务
                task_result = await db.execute(
                    select(Task).where(
                        Task.user_id == user.id,
                        Task.deleted_at.is_(None),
                        Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
                    )
                )
                tasks = task_result.scalars().all()

                if not tasks:
                    continue

                # 获取用户偏好
                pref_result = await db.execute(
                    select(UserPreference).where(UserPreference.user_id == user.id)
                )
                pref = pref_result.scalar_one_or_none()
                preference = pref.__dict__ if pref else None

                if ai_client.is_available():
                    # AI 批量评分
                    try:
                        tasks_json = json.dumps([
                            {
                                "task_id": t.id,
                                "title": t.title,
                                "priority": t.priority.value,
                                "due_datetime": t.due_datetime.isoformat() if t.due_datetime else None,
                                "status": t.status.value,
                            }
                            for t in tasks
                        ], ensure_ascii=False)

                        engine = PriorityEngine()
                        scores = await engine.calculate_batch(tasks_json, preference)

                        for score in scores:
                            # Upsert 优先级缓存
                            existing = await db.execute(
                                select(AIPriorityCache).where(AIPriorityCache.task_id == score.task_id)
                            )
                            cache = existing.scalar_one_or_none()

                            if cache is None:
                                cache = AIPriorityCache(task_id=score.task_id)
                                db.add(cache)

                            cache.score = score.score
                            cache.reason = score.reason
                            cache.calculated_at = datetime.now(timezone.utc).isoformat()

                        logger.info("用户 %d: AI 优先级重算完成，处理 %d 个任务", user.id, len(scores))
                    except Exception as e:
                        logger.error("AI 优先级重算失败，降级到规则引擎: %s", e)
                        await _rule_based_recalc(db, tasks)
                else:
                    # 规则引擎降级
                    await _rule_based_recalc(db, tasks)
                    logger.info("用户 %d: 规则引擎优先级重算完成，处理 %d 个任务", user.id, len(tasks))

            await db.commit()
            logger.info("每日优先级重算任务执行完成")

        except Exception as e:
            logger.error("每日优先级重算任务异常: %s", e)
            await db.rollback()


async def _rule_based_recalc(db, tasks: list) -> None:
    """基于规则的本地优先级重算"""
    from ..models.ai_cache import AIPriorityCache
    from datetime import datetime, timezone

    for task in tasks:
        score, reason = rule_based_priority_score(task)

        existing = await db.execute(
            select(AIPriorityCache).where(AIPriorityCache.task_id == task.id)
        )
        cache = existing.scalar_one_or_none()

        if cache is None:
            cache = AIPriorityCache(task_id=task.id)
            db.add(cache)

        cache.score = score
        cache.reason = reason
        cache.calculated_at = datetime.now(timezone.utc).isoformat()
