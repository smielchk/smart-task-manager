"""
规则引擎降级算法 — [REQ_TASK_MGMT_004]
AI 不可用时的本地优先级评分算法。
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..models.task import Task, TaskStatus

logger = logging.getLogger(__name__)


def rule_based_priority_score(task: Task) -> tuple[float, str]:
    """
    基于规则的本地优先级评分算法（AI 不可用时的降级方案）。

    评分维度:
    - 截止时间紧迫度（0-40分）
    - 用户设定的优先级（P0=40, P1=30, P2=20, P3=10）
    - 任务状态（in_progress 加 5 分）

    返回 (score, reason)
    """
    score = 0.0
    reasons = []

    # 截止时间紧迫度
    if task.due_datetime:
        now = datetime.now(timezone.utc)
        due = task.due_datetime.replace(tzinfo=None) if task.due_datetime.tzinfo is None else task.due_datetime
        now = now.replace(tzinfo=None) if now.tzinfo else now

        hours_left = (due - now).total_seconds() / 3600
        if hours_left <= 0:
            score += 40
            reasons.append("已逾期")
        elif hours_left <= 24:
            score += 30
            reasons.append("24小时内到期")
        elif hours_left <= 72:
            score += 20
            reasons.append("3天内到期")
        elif hours_left <= 168:
            score += 10
            reasons.append("本周到期")
    else:
        reasons.append("无截止时间")

    # 用户优先级
    priority_scores = {"P0": 40, "P1": 30, "P2": 20, "P3": 10}
    score += priority_scores.get(task.priority.value, 20)
    reasons.append(f"优先级 {task.priority.value}")

    # 任务状态加分
    if task.status == TaskStatus.IN_PROGRESS:
        score += 5
        reasons.append("进行中")

    reason = "；".join(reasons)
    return (min(score, 100.0), reason)
