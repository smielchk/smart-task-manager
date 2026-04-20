"""
AI 优先级缓存模型 — [REQ_TASK_MGMT_004]
"""
from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class AIPriorityCache(Base):
    __tablename__ = "ai_priority_cache"

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), primary_key=True)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    reason: Mapped[str] = mapped_column(String(500), nullable=True, default="")
    calculated_at: Mapped[str] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # 关系
    task: Mapped["Task"] = relationship(back_populates="priority_cache")  # noqa: F821
