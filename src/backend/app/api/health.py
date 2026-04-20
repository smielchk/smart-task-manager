"""
健康检查 API — [REQ_TASK_MGMT_012]
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter

from ..config import settings
from .response import success_response

logger = logging.getLogger(__name__)
router = APIRouter(tags=["健康检查"])


@router.get("")
async def health_check():
    """系统健康检查"""
    return success_response(data={
        "status": "ok",
        "version": "1.0.0",
    })


@router.get("/ai")
async def ai_health_check():
    """AI 连接状态检查 [AC-012-04]"""
    ai_available = settings.AI_BASE_URL and settings.AI_API_KEY

    if not ai_available:
        return success_response(data={
            "available": False,
            "model": None,
            "base_url": None,
            "latency_ms": None,
            "reason": "AI_BASE_URL or AI_API_KEY not configured",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        })

    # 尝试连接 AI 模型
    try:
        from ..ai.client import ai_client

        start = time.time()
        is_ok = await ai_client.check_connection()
        latency_ms = int((time.time() - start) * 1000) if is_ok else None

        return success_response(data={
            "available": is_ok,
            "model": settings.AI_MODEL_NAME,
            "base_url": settings.AI_BASE_URL,
            "latency_ms": latency_ms,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error("AI 健康检查失败: %s", e)
        return success_response(data={
            "available": False,
            "model": settings.AI_MODEL_NAME,
            "base_url": settings.AI_BASE_URL,
            "latency_ms": None,
            "reason": str(e),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        })
