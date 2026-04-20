"""
提醒引擎 — [REQ_TASK_MGMT_005]
AI 拖延风险评估。
"""
from __future__ import annotations

import json
import logging
import re

from .client import ai_client
from .prompt_builder import PromptBuilder
from .retry import AIError, ai_retry

logger = logging.getLogger(__name__)


class ReminderEngine:
    """提醒引擎 [REQ_TASK_MGMT_005]"""

    @ai_retry(max_retries=2, retry_delay=3)
    async def assess_procrastination_risk(
        self,
        task_title: str,
        due_datetime: str | None,
        priority: str,
        status: str,
        procrastination_pattern: dict | None = None,
    ) -> dict:
        """
        评估任务拖延风险 [AC-005-07]
        返回 {"risk_level": "low/medium/high", "reason": str}
        """
        if not ai_client.is_available():
            raise AIError("AI 客户端未配置")

        prompt = PromptBuilder.build_reminder_prompt(
            task_title, due_datetime, priority, status, procrastination_pattern
        )
        response = await ai_client.chat(
            messages=[
                {"role": "system", "content": "你是一个风险评估助手，只返回 JSON。"},
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
                raise AIError(f"AI 提醒评估响应无法解析: {response[:200]}")

        return data
