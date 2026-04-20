"""
任务 API — [REQ_TASK_MGMT_001, REQ_TASK_MGMT_002, REQ_TASK_MGMT_004, REQ_TASK_MGMT_005]
任务 CRUD、NLP 解析、智能排序、提醒查询。
"""
# from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import CurrentUser, DbSession
from ..models.task import TaskStatus
from ..services.task_service import StatusUpdate, TaskCreate, TaskFilter, TaskService, TaskUpdate
from .response import error_response, paginated_response, success_response

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_tasks(
    sort: str = Query("smart", description="排序方式: smart/created_at/due_datetime/priority"),
    sort_order: str = Query("desc", description="排序方向: asc/desc"),
    status: str = Query(None, description="状态筛选，逗号分隔"),
    category_id: int = Query(None, description="分类筛选"),
    tag_id: int = Query(None, description="标签筛选"),
    keyword: str = Query(None, description="关键词搜索"),
    include_deleted: bool = Query(False, description="包含已删除任务"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取任务列表 [REQ_TASK_MGMT_001] [AC-001-07, AC-001-08]"""
    status_list = status.split(",") if status else None
    filters = TaskFilter(
        status=status_list,
        category_id=category_id,
        tag_id=tag_id,
        keyword=keyword,
        include_deleted=include_deleted,
    )

    items, total = await TaskService.get_task_list(
        db, user.id, filters, sort, sort_order, page, page_size
    )

    return success_response(data=paginated_response(items, total, page, page_size))


@router.post("")
async def create_task(
    data: TaskCreate,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """创建任务 [REQ_TASK_MGMT_001] [AC-001-01, AC-001-02]"""
    # 必填字段校验
    if not data.title or not data.title.strip():
        return error_response(code=422, message="任务标题不能为空")

    task = await TaskService.create_task(db, data, user.id)
    await db.commit()
    task_dict = await TaskService._task_to_dict(db, task)
    return success_response(data=task_dict)


class NLPParseRequest(BaseModel):
    input_text: str
    timezone: str = "Asia/Shanghai"


@router.post("/parse-nlp")
async def parse_nlp(
    data: NLPParseRequest,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """
    NLP 自然语言解析 [REQ_TASK_MGMT_002]
    将自然语言解析为结构化任务信息。
    [AC-002-01, AC-002-02, AC-002-03, AC-002-07]
    """
    from ..ai.nlp_parser import NLPParser
    from ..config import settings

    if not settings.AI_BASE_URL or not settings.AI_API_KEY:
        return success_response(data={"ai_available": False, "parsed_task": None})

    try:
        parser = NLPParser()
        parsed = await parser.parse(data.input_text, data.timezone)
        return success_response(data={
            "ai_available": True,
            "parsed_task": parsed.model_dump(),
        })
    except Exception as e:
        logger.error("NLP 解析失败: %s", e)
        return error_response(code=504, message=f"AI 解析失败: {str(e)}")


@router.get("/smart-sort")
async def smart_sort(
    category_id: int | None = Query(None),
    status: str | None = Query(None),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取 AI 智能排序结果 [REQ_TASK_MGMT_004]"""
    from ..models.ai_cache import AIPriorityCache
    from ..models.task import Task
    from sqlalchemy import select

    query = (
        select(Task, AIPriorityCache.score, AIPriorityCache.reason)
        .outerjoin(AIPriorityCache, Task.id == AIPriorityCache.task_id)
        .where(Task.user_id == user.id, Task.deleted_at.is_(None))
    )

    if category_id:
        query = query.where(Task.category_id == category_id)
    if status:
        query = query.where(Task.status == status)

    query = query.order_by(AIPriorityCache.score.desc().nulls_last())

    result = await db.execute(query)
    rows = result.all()

    items = []
    for task, score, reason in rows:
        items.append({
            "task_id": task.id,
            "title": task.title,
            "score": score,
            "reason": reason,
        })

    return success_response(data=items)


@router.get("/pending-reminders")
async def pending_reminders(
    timestamp: str | None = Query(None, description="当前时间戳（ISO格式）"),
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取待推送提醒 [REQ_TASK_MGMT_005]"""
    from ..services.reminder_service import ReminderService

    reminders = await ReminderService.get_pending_reminders(db, user.id)
    return success_response(data=reminders)


@router.get("/{task_id}")
async def get_task(
    task_id: int,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """获取任务详情 [REQ_TASK_MGMT_001]"""
    task = await TaskService.get_task(db, task_id, user.id)
    if task is None:
        return error_response(code=404, message="任务不存在")
    return success_response(data=task)


@router.put("/{task_id}")
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """更新任务 [AC-001-03]"""
    task = await TaskService.update_task(db, task_id, data, user.id)
    if task is None:
        return error_response(code=404, message="任务不存在")
    await db.commit()
    await db.refresh(task)
    task_dict = await TaskService._task_to_dict(db, task)
    return success_response(data=task_dict)


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """软删除任务 [AC-001-04]"""
    task = await TaskService.soft_delete(db, task_id, user.id)
    if task is None:
        return error_response(code=404, message="任务不存在")
    await db.commit()
    return success_response(data={"message": "任务已删除"})


@router.patch("/{task_id}/status")
async def update_status(
    task_id: int,
    data: StatusUpdate,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """更新任务状态 [AC-001-05, AC-001-06]"""
    task = await TaskService.update_status(db, task_id, data.status, user.id)
    if task is None:
        return error_response(code=404, message="任务不存在")
    await db.commit()
    await db.refresh(task)
    task_dict = await TaskService._task_to_dict(db, task)
    return success_response(data=task_dict)


@router.post("/{task_id}/restore")
async def restore_task(
    task_id: int,
    db: DbSession = None,
    user: CurrentUser = None,
):
    """恢复已删除任务 [AC-001-04]"""
    task = await TaskService.restore(db, task_id, user.id)
    if task is None:
        return error_response(code=404, message="任务不存在或未被删除")
    await db.commit()
    await db.refresh(task)
    task_dict = await TaskService._task_to_dict(db, task)
    return success_response(data=task_dict)
