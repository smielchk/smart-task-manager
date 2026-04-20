"""
AI 调用重试装饰器 — [REQ_TASK_MGMT_012]
"""
from __future__ import annotations

import asyncio
import logging
from functools import wraps

logger = logging.getLogger(__name__)


class AIError(Exception):
    """AI 调用错误基类"""
    pass


class AIDegradedError(AIError):
    """AI 降级错误（重试耗尽后）"""
    pass


def ai_retry(max_retries: int = 2, retry_delay: int = 3):
    """
    AI 调用自动重试装饰器 [REQ_TASK_MGMT_012]
    重试间隔 retry_delay 秒，重试耗尽后抛出 AIDegradedError。
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except AIError as e:
                    last_error = e
                    if attempt < max_retries:
                        logger.warning(
                            "AI 调用失败 (第 %d 次)，%ds 后重试: %s",
                            attempt + 1, retry_delay, e,
                        )
                        await asyncio.sleep(retry_delay)
            logger.error("AI 调用最终失败，已重试 %d 次: %s", max_retries, last_error)
            raise AIDegradedError(f"AI 服务暂时不可用: {last_error}")
        return wrapper
    return decorator
