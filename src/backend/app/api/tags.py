"""
标签 API — [REQ_TASK_MGMT_003]
"""
# from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import CurrentUser, DbSession
from ..services.tag_service import TagService
from .response import success_response, error_response

router = APIRouter()


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


class TagMergeRequest(BaseModel):
    source_id: int
    target_id: int


@router.get("")
async def list_tags(
    include_counts: bool = Query(False),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取标签列表"""
    items = await TagService.get_list(db, user.id, include_counts)
    return success_response(data=items)


@router.post("")
async def create_tag(
    data: TagCreate,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """创建标签"""
    tag = await TagService.create(db, user.id, data.name)
    await db.commit()
    return success_response(data={"id": tag.id, "name": tag.name})


@router.put("/{tag_id}")
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """更新标签"""
    tag = await TagService.update(db, tag_id, user.id, data.name)
    if tag is None:
        return error_response(code=404, message="标签不存在")
    await db.commit()
    return success_response(data={"id": tag.id, "name": tag.name})


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: int,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """删除标签"""
    ok = await TagService.delete(db, tag_id, user.id)
    if not ok:
        return error_response(code=404, message="标签不存在")
    await db.commit()
    return success_response(data={"message": "标签已删除"})


@router.post("/merge")
async def merge_tags(
    data: TagMergeRequest,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """合并标签 [AC-003-08]"""
    target = await TagService.merge_tags(db, data.source_id, data.target_id, user.id)
    if target is None:
        return error_response(code=404, message="标签不存在")
    await db.commit()
    return success_response(data={"id": target.id, "name": target.name})
