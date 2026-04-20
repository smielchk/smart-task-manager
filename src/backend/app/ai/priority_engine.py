"""
优先级引擎 — [REQ_TASK_MGMT_004]
AI 综合评估任务优先级分数。
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


class PriorityScore(BaseModel):
    """单个任务的优先级评分结果"""
    task_id: int
    score: float
    reason: str


class PriorityEngine:
    """优先级引擎 [REQ_TASK_MGMT_004]"""

    @ai_retry(max_retries=2, retry_delay=3)
    async def calculate_batch(
        self,
        tasks_json: str,
        user_preference: dict | None = None,
    ) -> list[PriorityScore]:
        """
        批量计算任务优先级分数 [AC-004-01, AC-004-02]
        """
        if not ai_client.is_available():
            raise AIError("AI 客户端未配置")

        prompt = PromptBuilder.build_priority_prompt(tasks_json, user_preference)
        response = await ai_client.chat(
            messages=[
                {"role": "system", "content": "你是一个任务优先级评估助手，只返回 JSON。"},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            match = re.search(r'\{[\s\S]*\}', response)
            if match:
                data = json.loads(match.group())
            else:
                raise AIError(f"AI 优先级响应无法解析: {response[:200]}")

        scores = []
        for item in data.get("scores", []):
            scores.append(PriorityScore(
                task_id=int(item["task_id"]),
                score=float(item["score"]),
                reason=str(item.get("reason", "")),
            ))

        return scores
