"""
AI 降级混入 — [REQ_TASK_MGMT_012]
所有 AI 调用的统一降级处理。
"""
from __future__ import annotations

import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)


class AIDegradationMixin:
    """AI 降级混入：所有 AI 调用的统一降级处理"""

    async def call_with_fallback(
        self,
        ai_func: Callable,
        fallback_func: Callable,
        error_context: str,
    ) -> Any:
        """
        尝试调用 AI 函数，失败时自动降级到 fallback。
        所有异常统一捕获，不向上层传播。
        """
        from .client import ai_client

        if not ai_client.is_available():
            logger.warning("AI 不可用，降级执行: %s", error_context)
            return await fallback_func()

        try:
            return await ai_func()
        except Exception as e:
            logger.error("AI 调用失败 [%s]: %s", error_context, e)
            return await fallback_func()
