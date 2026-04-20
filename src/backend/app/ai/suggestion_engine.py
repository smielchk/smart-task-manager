"""
标签推荐引擎 — [REQ_TASK_MGMT_003]
AI 基于任务内容推荐标签。
"""
from __future__ import annotations

import json
import logging
import re

from .client import ai_client
from .prompt_builder import PromptBuilder
from .retry import AIError, ai_retry

logger = logging.getLogger(__name__)


class SuggestionEngine:
    """标签推荐引擎 [AC-003-07]"""

    @ai_retry(max_retries=2, retry_delay=3)
    async def suggest_tags(
        self,
        title: str,
        description: str | None = None,
        existing_tags: list[str] | None = None,
    ) -> list[str]:
        """
        推荐标签 [AC-003-07]
        返回最多 3 个推荐标签名称。
        """
        if not ai_client.is_available():
            raise AIError("AI 客户端未配置")

        prompt = PromptBuilder.build_tag_suggest_prompt(title, description, existing_tags)
        response = await ai_client.chat(
            messages=[
                {"role": "system", "content": "你是一个标签推荐助手，只返回 JSON。"},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            match = re.search(r'\{[\s\S]*\}', response)
            if match:
                data = json.loads(match.group())
            else:
                raise AIError(f"AI 标签推荐响应无法解析: {response[:200]}")

        tags = data.get("tags", [])
        # 限制最多 3 个
        return tags[:3] if tags else []
