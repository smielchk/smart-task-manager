"""
分类服务 — [REQ_TASK_MGMT_003]
预设分类初始化与分类 CRUD。
"""
from __future__ import annotations

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.category import Category

logger = logging.getLogger(__name__)

# 预设分类 [AC-003-01]
DEFAULT_CATEGORIES = [
    {"name": "工作", "icon": "💼", "sort_order": 0},
    {"name": "生活", "icon": "🏠", "sort_order": 1},
    {"name": "学习", "icon": "📚", "sort_order": 2},
    {"name": "健康", "icon": "💪", "sort_order": 3},
    {"name": "社交", "icon": "🤝", "sort_order": 4},
    {"name": "财务", "icon": "💰", "sort_order": 5},
]


class CategoryService:
    @staticmethod
    async def init_default_categories(db: AsyncSession, user_id: int) -> None:
        """初始化默认分类 [AC-003-01]"""
        for cat in DEFAULT_CATEGORIES:
            existing = await db.execute(
                select(Category).where(
                    Category.user_id == user_id,
                    Category.name == cat["name"],
                )
            )
            if existing.scalar_one_or_none() is None:
                db.add(Category(
                    user_id=user_id,
                    name=cat["name"],
                    icon=cat["icon"],
                    sort_order=cat["sort_order"],
                    is_default=True,
                ))

    @staticmethod
    async def get_list(db: AsyncSession, user_id: int, include_counts: bool = False) -> list[dict]:
        """获取分类列表"""
        result = await db.execute(
            select(Category)
            .where(Category.user_id == user_id)
            .order_by(Category.sort_order, Category.id)
        )
        categories = result.scalars().all()

        items = []
        for cat in categories:
            item = {
                "id": cat.id,
                "name": cat.name,
                "icon": cat.icon,
                "sort_order": cat.sort_order,
                "is_default": cat.is_default,
            }
            if include_counts:
                from sqlalchemy import func
                from ..models.task import Task

                count_result = await db.execute(
                    select(func.count())
                    .select_from(Task)
                    .where(Task.category_id == cat.id, Task.deleted_at.is_(None))
                )
                item["task_count"] = count_result.scalar()
            items.append(item)

        return items

    @staticmethod
    async def create(db: AsyncSession, user_id: int, name: str, icon: str = "📋") -> Category:
        """创建分类 [AC-003-04]"""
        cat = Category(user_id=user_id, name=name, icon=icon)
        db.add(cat)
        await db.flush()
        return cat

    @staticmethod
    async def update(db: AsyncSession, category_id: int, user_id: int, name: str | None = None, icon: str | None = None) -> Category | None:
        """更新分类 [AC-003-05]"""
        result = await db.execute(
            select(Category).where(Category.id == category_id, Category.user_id == user_id)
        )
        cat = result.scalar_one_or_none()
        if cat is None:
            return None
        if name is not None:
            cat.name = name
        if icon is not None:
            cat.icon = icon
        await db.flush()
        return cat

    @staticmethod
    async def delete(db: AsyncSession, category_id: int, user_id: int) -> bool:
        """删除分类 [AC-003-05]"""
        result = await db.execute(
            select(Category).where(Category.id == category_id, Category.user_id == user_id)
        )
        cat = result.scalar_one_or_none()
        if cat is None:
            return False
        # 清除关联任务的分类
        from ..models.task import Task

        tasks_result = await db.execute(
            select(Task).where(Task.category_id == category_id)
        )
        for task in tasks_result.scalars().all():
            task.category_id = None

        await db.delete(cat)
        await db.flush()
        return True
