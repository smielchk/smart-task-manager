"""
标签服务 — [REQ_TASK_MGMT_003]
标签 CRUD 与合并功能。
"""
from __future__ import annotations

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.tag import Tag, task_tags

logger = logging.getLogger(__name__)


class TagService:
    @staticmethod
    async def get_list(db: AsyncSession, user_id: int, include_counts: bool = False) -> list[dict]:
        """获取标签列表"""
        result = await db.execute(
            select(Tag)
            .where(Tag.user_id == user_id)
            .order_by(Tag.name)
        )
        tags = result.scalars().all()

        items = []
        for tag in tags:
            item = {
                "id": tag.id,
                "name": tag.name,
            }
            if include_counts:
                from sqlalchemy import func

                count_result = await db.execute(
                    select(func.count())
                    .select_from(task_tags)
                    .where(task_tags.c.tag_id == tag.id)
                )
                item["task_count"] = count_result.scalar()
            items.append(item)

        return items

    @staticmethod
    async def create(db: AsyncSession, user_id: int, name: str) -> Tag:
        """创建标签"""
        tag = Tag(user_id=user_id, name=name.strip())
        db.add(tag)
        await db.flush()
        return tag

    @staticmethod
    async def update(db: AsyncSession, tag_id: int, user_id: int, name: str) -> Tag | None:
        """更新标签"""
        result = await db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        )
        tag = result.scalar_one_or_none()
        if tag is None:
            return None
        tag.name = name.strip()
        await db.flush()
        return tag

    @staticmethod
    async def delete(db: AsyncSession, tag_id: int, user_id: int) -> bool:
        """删除标签"""
        result = await db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        )
        tag = result.scalar_one_or_none()
        if tag is None:
            return False
        await db.delete(tag)
        await db.flush()
        return True

    @staticmethod
    async def merge_tags(db: AsyncSession, source_id: int, target_id: int, user_id: int) -> Tag | None:
        """
        合并标签 [AC-003-08]
        将 source 标签的所有任务关联迁移到 target 标签，然后删除 source。
        """
        # 验证两个标签都存在且属于当前用户
        source_result = await db.execute(
            select(Tag).where(Tag.id == source_id, Tag.user_id == user_id)
        )
        source_tag = source_result.scalar_one_or_none()
        if source_tag is None:
            return None

        target_result = await db.execute(
            select(Tag).where(Tag.id == target_id, Tag.user_id == user_id)
        )
        target_tag = target_result.scalar_one_or_none()
        if target_tag is None:
            return None

        # 迁移关联：将 source_tag 的关联改为 target_tag
        from sqlalchemy import update

        await db.execute(
            update(task_tags)
            .where(task_tags.c.tag_id == source_id)
            .values(tag_id=target_id)
        )

        # 删除 source 标签
        await db.delete(source_tag)
        await db.flush()
        return target_tag
