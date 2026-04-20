"""
行为日志与用户偏好模型 — [REQ_TASK_MGMT_010]
"""
from __future__ import annotations

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from . import Base, TimestampMixin


class UserBehaviorLog(Base):
    """用户行为日志表 — 记录所有关键行为用于习惯学习"""
    __tablename__ = "user_behavior_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
    )  # task_created / task_completed / task_modified / ai_accepted / ai_rejected
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)  # task / category / tag
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    ai_suggestion_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class UserPreference(Base, TimestampMixin):
    """AI 学习偏好表 — 存储聚合后的用户偏好参数"""
    __tablename__ = "user_preference"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    active_hours: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    productive_hours: Mapped[list | None] = mapped_column(JSON, nullable=True)  # e.g. ["09:00-11:00", "14:00-16:00"]
    category_preference: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"工作": 0.35, "学习": 0.25}
    tag_preference: Mapped[dict | None] = mapped_column(JSON, nullable=True)       # {"Python": 5, "报告": 3}
    completion_speed: Mapped[dict | None] = mapped_column(JSON, nullable=True)     # {"P0": 120, "P1": 480}
    procrastination_pattern: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"ahead": 0.3, "ontime": 0.4, "overdue": 0.3}
    manual_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)     # 用户手动修正值
    days_of_data: Mapped[int] = mapped_column(Integer, default=0, nullable=False)   # 累计学习天数
