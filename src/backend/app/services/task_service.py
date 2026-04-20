"""
任务服务 — [REQ_TASK_MGMT_001]
任务 CRUD、软删除、状态更新、列表查询。
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.ai_cache import AIPriorityCache
from ..models.behavior import UserBehaviorLog
from ..models.category import Category
from ..models.tag import Tag, task_tags
from ..models.task import Priority, Task, TaskStatus

logger = logging.getLogger(__name__)

MAX_TITLE_LENGTH = 200


def _parse_datetime(value: str | None) -> datetime | None:
    """将 str 转为 naive datetime (UTC)，供 SQLAlchemy DateTime 字段使用。"""
    if value is None:
        return None
    # ISO format with optional timezone
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


# ========== Pydantic Schema ==========

class TaskCreate(BaseModel):
    """创建任务请求体"""
    title: str
    description: str | None = None
    due_datetime: str | None = None
    priority: Priority = Priority.P2
    status: TaskStatus = TaskStatus.PENDING
    category_id: int | None = None
    tag_ids: list[int] = []
    estimated_minutes: int | None = None
    location: str | None = None
    ai_generated: bool = False


class TaskUpdate(BaseModel):
    """更新任务请求体"""
    title: str | None = None
    description: str | None = None
    due_datetime: str | None = None
    priority: Priority | None = None
    category_id: int | None = None
    tag_ids: list[int] | None = None
    estimated_minutes: int | None = None
    location: str | None = None
    reminder_enabled: bool | None = None


class StatusUpdate(BaseModel):
    """状态更新请求体"""
    status: TaskStatus


class TaskFilter(BaseModel):
    """任务筛选参数"""
    status: list[str] | None = None
    category_id: int | None = None
    tag_id: int | None = None
    keyword: str | None = None
    include_deleted: bool = False


class TaskOut(BaseModel):
    """任务输出 Schema"""
    def __init__(self, **data: Any):
        super().__init__(**data)

    class Config:
        from_attributes = True


class TaskService:
    """任务业务逻辑 [REQ_TASK_MGMT_001]"""

    @staticmethod
    async def create_task(db: AsyncSession, data: TaskCreate, user_id: int) -> Task:
        """
        创建任务 [AC-001-02]
        1. 写入 tasks 表
        2. 关联标签
        3. 记录行为日志
        """
        # BUG_006: 标题长度校验
        if len(data.title) > MAX_TITLE_LENGTH:
            raise HTTPException(status_code=422, detail=f"任务标题不能超过 {MAX_TITLE_LENGTH} 个字符")

        task = Task(
            user_id=user_id,
            title=data.title,
            description=data.description,
            due_datetime=_parse_datetime(data.due_datetime),
            priority=data.priority,
            status=data.status,
            category_id=data.category_id,
            estimated_minutes=data.estimated_minutes,
            location=data.location,
            ai_generated=data.ai_generated,
        )
        db.add(task)
        await db.flush()

        # 关联标签 [AC-003-06]
        if data.tag_ids:
            await db.execute(
                task_tags.insert(),
                [{"task_id": task.id, "tag_id": tid} for tid in data.tag_ids],
            )

        # 记录行为日志 [AC-010-01]
        log = UserBehaviorLog(
            user_id=user_id,
            action_type="task_created",
            target_type="task",
            target_id=task.id,
            metadata_={"ai_generated": data.ai_generated} if data.ai_generated else None,
        )
        db.add(log)

        await db.flush()
        return task

    @staticmethod
    async def update_task(db: AsyncSession, task_id: int, data: TaskUpdate, user_id: int) -> Task | None:
        """更新任务 [AC-001-03]"""
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id, Task.deleted_at.is_(None))
        )
        task = result.scalar_one_or_none()
        if task is None:
            return None

        update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})
        for field, value in update_data.items():
            # BUG_001/003: str → datetime 转换
            if field == "due_datetime" and value is not None:
                value = _parse_datetime(value)
            # BUG_006: 标题长度校验
            if field == "title" and len(value) > MAX_TITLE_LENGTH:
                raise HTTPException(status_code=422, detail=f"任务标题不能超过 {MAX_TITLE_LENGTH} 个字符")
            setattr(task, field, value)

        # 更新标签关联
        if data.tag_ids is not None:
            await db.execute(task_tags.delete().where(task_tags.c.task_id == task_id))
            if data.tag_ids:
                await db.execute(
                    task_tags.insert(),
                    [{"task_id": task_id, "tag_id": tid} for tid in data.tag_ids],
                )

        # 记录行为日志 [AC-010-01]
        log = UserBehaviorLog(
            user_id=user_id,
            action_type="task_modified",
            target_type="task",
            target_id=task_id,
        )
        db.add(log)

        await db.flush()
        return task

    @staticmethod
    async def update_status(db: AsyncSession, task_id: int, status: TaskStatus, user_id: int) -> Task | None:
        """
        更新任务状态 [AC-001-05, AC-001-06]
        completed → 设置 completed_at
        pending/in_progress → 清空 completed_at
        """
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id, Task.deleted_at.is_(None))
        )
        task = result.scalar_one_or_none()
        if task is None:
            return None

        old_status = task.status
        task.status = status

        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
            # 记录完成行为日志
            log = UserBehaviorLog(
                user_id=user_id,
                action_type="task_completed",
                target_type="task",
                target_id=task_id,
            )
            db.add(log)
        else:
            task.completed_at = None

        await db.flush()
        return task

    @staticmethod
    async def soft_delete(db: AsyncSession, task_id: int, user_id: int) -> Task | None:
        """软删除任务 [AC-001-04]"""
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id, Task.deleted_at.is_(None))
        )
        task = result.scalar_one_or_none()
        if task is None:
            return None

        task.deleted_at = datetime.utcnow()
        await db.flush()
        return task

    @staticmethod
    async def restore(db: AsyncSession, task_id: int, user_id: int) -> Task | None:
        """从回收站恢复任务 [AC-001-04]"""
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()
        if task is None or task.deleted_at is None:
            return None

        task.deleted_at = None
        await db.flush()
        return task

    @staticmethod
    async def get_task(db: AsyncSession, task_id: int, user_id: int) -> dict | None:
        """获取任务详情（含分类名和标签列表）"""
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id, Task.deleted_at.is_(None))
        )
        task = result.scalar_one_or_none()
        if task is None:
            return None

        return await TaskService._task_to_dict(db, task)

    @staticmethod
    async def get_task_list(
        db: AsyncSession,
        user_id: int,
        filters: TaskFilter,
        sort: str = "smart",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        """
        获取任务列表 [AC-001-07, AC-001-08]
        支持 4 种排序 + 组合筛选 + 分页。
        """
        query = select(Task).where(Task.user_id == user_id)

        # 软删除过滤
        # BUG_005: include_deleted=true 应返回所有任务（含已删除），而非仅已删除的
        if not filters.include_deleted:
            query = query.where(Task.deleted_at.is_(None))

        # 状态筛选
        if filters.status:
            query = query.where(Task.status.in_(filters.status))

        # 分类筛选
        if filters.category_id:
            query = query.where(Task.category_id == filters.category_id)

        # 标签筛选
        if filters.tag_id:
            query = query.where(
                Task.id.in_(
                    select(task_tags.c.task_id).where(task_tags.c.tag_id == filters.tag_id)
                )
            )

        # 关键词搜索（模糊匹配标题+描述）
        if filters.keyword:
            query = query.where(
                or_(
                    Task.title.contains(filters.keyword),
                    Task.description.contains(filters.keyword),
                )
            )

        # 排序 [AC-001-07]
        if sort == "smart":
            # AI 智能排序：关联 ai_priority_cache
            query = query.outerjoin(AIPriorityCache, Task.id == AIPriorityCache.task_id)
            order_col = AIPriorityCache.score if sort_order == "desc" else AIPriorityCache.score.desc()
            query = query.order_by(order_col.nulls_last(), Task.created_at.desc())
        elif sort == "created_at":
            query = query.order_by(Task.created_at.desc() if sort_order == "desc" else Task.created_at.asc())
        elif sort == "due_datetime":
            query = query.order_by(
                Task.due_datetime.desc().nullslast() if sort_order == "desc"
                else Task.due_datetime.asc().nullsfirst()
            )
        elif sort == "priority":
            from sqlalchemy import case as sa_case
            priority_case = sa_case(
                (Task.priority == "P0", 0),
                (Task.priority == "P1", 1),
                (Task.priority == "P2", 2),
                (Task.priority == "P3", 3),
            )
            query = query.order_by(
                priority_case.asc() if sort_order == "asc" else priority_case.desc()
            )

        # 分页
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar()

        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        tasks = result.scalars().all()

        items = []
        for task in tasks:
            items.append(await TaskService._task_to_dict(db, task))

        return items, total

    @staticmethod
    async def _task_to_dict(db: AsyncSession, task: Task) -> dict:
        """将 Task ORM 对象转为字典（含分类名、标签列表、优先级分数）"""
        # 查询分类名
        category_name = None
        if task.category_id:
            cat_result = await db.execute(
                select(Category.name).where(Category.id == task.category_id)
            )
            category_name = cat_result.scalar()

        # 查询标签列表
        tags_result = await db.execute(
            select(Tag).where(Tag.id.in_(
                select(task_tags.c.tag_id).where(task_tags.c.task_id == task.id)
            ))
        )
        tags = [{"id": t.id, "name": t.name} for t in tags_result.scalars().all()]

        # 查询优先级分数
        priority_score = None
        priority_reason = None
        cache_result = await db.execute(
            select(AIPriorityCache).where(AIPriorityCache.task_id == task.id)
        )
        cache = cache_result.scalar_one_or_none()
        if cache:
            priority_score = cache.score
            priority_reason = cache.reason

        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "due_datetime": task.due_datetime.isoformat() if task.due_datetime else None,
            "priority": task.priority.value,
            "status": task.status.value,
            "category_id": task.category_id,
            "category_name": category_name,
            "tags": tags,
            "estimated_minutes": task.estimated_minutes,
            "location": task.location,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "ai_generated": task.ai_generated,
            "reminder_enabled": task.reminder_enabled,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None,
            "priority_score": priority_score,
            "priority_reason": priority_reason,
        }
