"""
NLP 自然语言解析器 — [REQ_TASK_MGMT_002]
将自然语言输入解析为结构化任务信息。
"""
from __future__ import annotations

import json
import logging
import re

from pydantic import BaseModel

from .client import ai_client
from .prompt_builder import PromptBuilder
from .retry import AIError, ai_retry

logger = logging.getLogger(__name__)


class ParsedTask(BaseModel):
    """NLP 解析结果"""
    title: str
    due_datetime: str | None = None
    location: str | None = None
    category: str | None = None
    priority: str = "P2"
    estimated_minutes: int | None = None


class NLPParser:
    """
    自然语言任务解析器 [REQ_TASK_MGMT_002]
    调用 AI 模型解析，失败时提供降级处理。
    """

    @ai_retry(max_retries=2, retry_delay=3)
    async def parse(self, user_input: str, timezone: str) -> ParsedTask:
        """
        解析自然语言输入为结构化任务。
        [AC-002-01, AC-002-02, AC-002-03, AC-002-07]
        """
        if not ai_client.is_available():
            raise AIError("AI 客户端未配置")

        prompt = PromptBuilder.build_nlp_prompt(user_input, timezone)
        response = await ai_client.chat(
            messages=[
                {"role": "system", "content": "你是一个任务解析助手，只返回 JSON 格式的结果。"},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        # 尝试解析 JSON（双重策略：优先 response_format，fallback 到正则提取）
        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            # 正则提取 JSON 块
            match = re.search(r'\{[\s\S]*\}', response)
            if match:
                data = json.loads(match.group())
            else:
                raise AIError(f"AI 返回内容无法解析为 JSON: {response[:200]}")

        # 校验并构建 ParsedTask
        parsed = ParsedTask(
            title=data.get("title") or user_input,  # 回退策略 [AC-002-07]
            due_datetime=data.get("due_datetime"),
            location=data.get("location"),
            category=data.get("category"),
            priority=data.get("priority", "P2"),
            estimated_minutes=data.get("estimated_minutes"),
        )

        logger.info("NLP 解析完成: title=%s, priority=%s", parsed.title, parsed.priority)
        return parsed
