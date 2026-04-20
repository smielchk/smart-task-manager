"""
时间规划引擎 — [REQ_TASK_MGMT_006]
AI 生成每日/每周任务规划建议。
"""
from __future__ import annotations

import json
import logging
import re

from .client import ai_client
from .prompt_builder import PromptBuilder
from .retry import AIError, ai_retry

logger = logging.getLogger(__name__)


class PlanningEngine:
    """时间规划引擎 [REQ_TASK_MGMT_006]"""

    @ai_retry(max_retries=2, retry_delay=3)
    async def generate_plan(
        self,
        tasks_json: str,
        available_hours: int,
        work_days: str,
        preference: dict | None = None,
    ) -> dict:
        """
        生成规划建议 [AC-006-01, AC-006-02, AC-006-04]
        """
        if not ai_client.is_available():
            raise AIError("AI 客户端未配置")

        prompt = PromptBuilder.build_planning_prompt(tasks_json, available_hours, work_days, preference)
        response = await ai_client.chat(
            messages=[
                {"role": "system", "content": "你是一个任务规划助手，只返回 JSON。"},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            match = re.search(r'\{[\s\S]*\}', response)
            if match:
                data = json.loads(match.group())
            else:
                raise AIError(f"AI 规划响应无法解析: {response[:200]}")

        return data
