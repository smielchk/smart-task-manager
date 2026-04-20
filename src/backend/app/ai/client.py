"""
AI 统一客户端 — [REQ_TASK_MGMT_012]
兼容所有 OpenAI API 协议的国产模型（GLM-4, 通义千问等）。
"""
from __future__ import annotations

import logging

from openai import AsyncOpenAI

from ..config import settings

logger = logging.getLogger(__name__)


class AIClient:
    """统一 AI 模型客户端"""

    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=settings.AI_BASE_URL,
            api_key=settings.AI_API_KEY,
        ) if self.is_available() else None
        self.model = settings.AI_MODEL_NAME
        self.timeout = settings.AI_REQUEST_TIMEOUT
        self.max_retries = settings.AI_MAX_RETRIES

    def is_available(self) -> bool:
        """检查 AI 配置是否完整"""
        return bool(settings.AI_BASE_URL and settings.AI_API_KEY)

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        response_format: dict | None = None,
    ) -> str:
        """
        调用 AI 模型，带自动重试。
        """
        if self.client is None:
            raise RuntimeError("AI 客户端未配置")

        kwargs: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_retries": self.max_retries,
            "timeout": self.timeout,
        }
        if response_format:
            kwargs["response_format"] = response_format

        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    async def check_connection(self) -> bool:
        """检查 AI 连接是否可用"""
        try:
            await self.chat(
                messages=[{"role": "user", "content": "ping"}],
                temperature=0,
            )
            return True
        except Exception:
            return False


# 全局单例
ai_client = AIClient()

if not ai_client.is_available():
    logger.warning(
        "AI 功能不可用: AI_BASE_URL 或 AI_API_KEY 未配置。"
        "基础 CRUD 功能不受影响，AI 相关功能已自动降级。"
    )
