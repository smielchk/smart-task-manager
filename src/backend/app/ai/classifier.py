"""
自动分类器 — [REQ_TASK_MGMT_003]
AI 根据任务内容自动归类。
"""
from __future__ import annotations

import json
import logging
import re

from .client import ai_client
from .prompt_builder import PromptBuilder
from .retry import AIError, ai_retry

logger = logging.getLogger(__name__)

# 匹配度阈值 [AC-003-03]
CLASSIFICATION_THRESHOLD = 0.7

# 预设分类
PRESET_CATEGORIES = ["工作", "生活", "学习", "健康", "社交", "财务"]


class Classifier:
    """自动分类器 [REQ_TASK_MGMT_003]"""

    @ai_retry(max_retries=2, retry_delay=3)
    async def classify(self, title: str, description: str | None = None) -> dict:
        """
        对任务进行自动分类 [AC-003-02, AC-003-03]
        返回 {"category": str | None, "confidence": float}
        """
        if not ai_client.is_available():
            raise AIError("AI 客户端未配置")

        prompt = PromptBuilder.build_classify_prompt(title, description)
        response = await ai_client.chat(
            messages=[
                {"role": "system", "content": "你是一个任务分类助手，只返回 JSON。"},
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
                raise AIError(f"AI 分类响应无法解析: {response[:200]}")

        category = data.get("category")
        confidence = float(data.get("confidence", 0))

        # 低于阈值不强制分类 [AC-003-03]
        if confidence < CLASSIFICATION_THRESHOLD or category not in PRESET_CATEGORIES:
            return {"category": None, "confidence": confidence}

        return {"category": category, "confidence": confidence}
