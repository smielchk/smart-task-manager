"""
行为日志服务 — [REQ_TASK_MGMT_010]
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ..models.behavior import UserBehaviorLog

logger = logging.getLogger(__name__)


class BehaviorLogService:
    """用户行为日志服务 [AC-010-01]"""

    @staticmethod
    async def log(
        db: AsyncSession,
        user_id: int,
        action_type: str,
        target_type: str,
        target_id: int,
        metadata: dict | None = None,
        ai_suggestion_id: str | None = None,
        user_accepted: bool | None = None,
    ) -> None:
        """记录用户行为"""
        log = UserBehaviorLog(
            user_id=user_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            metadata_=metadata,
            ai_suggestion_id=ai_suggestion_id,
            user_accepted=user_accepted,
        )
        db.add(log)
