"""
分类 API — [REQ_TASK_MGMT_003]
"""
# from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import CurrentUser, DbSession
from ..services.category_service import CategoryService
from .response import success_response, error_response

router = APIRouter()


class CategoryCreate(BaseModel):
    name: str
    icon: str = "📋"


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None


@router.get("")
async def list_categories(
    include_counts: bool = Query(False),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取分类列表"""
    items = await CategoryService.get_list(db, user.id, include_counts)
    return success_response(data=items)


@router.post("")
async def create_category(
    data: CategoryCreate,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """创建分类 [AC-003-04]"""
    cat = await CategoryService.create(db, user.id, data.name, data.icon)
    await db.commit()
    return success_response(data={
        "id": cat.id,
        "name": cat.name,
        "icon": cat.icon,
        "sort_order": cat.sort_order,
    })


@router.put("/{category_id}")
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """更新分类 [AC-003-05]"""
    cat = await CategoryService.update(db, category_id, user.id, data.name, data.icon)
    if cat is None:
        return error_response(code=404, message="分类不存在")
    await db.commit()
    return success_response(data={"id": cat.id, "name": cat.name, "icon": cat.icon})


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """删除分类 [AC-003-05]"""
    ok = await CategoryService.delete(db, category_id, user.id)
    if not ok:
        return error_response(code=404, message="分类不存在")
    await db.commit()
    return success_response(data={"message": "分类已删除"})
