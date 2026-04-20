"""
用户设置模型 — [REQ_TASK_MGMT_011]
"""
from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from . import Base, TimestampMixin


class UserSettings(Base, TimestampMixin):
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Shanghai", nullable=False)
    daily_work_hours: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    work_days: Mapped[str] = mapped_column(String(20), default="1,2,3,4,5", nullable=False)  # 逗号分隔的周一~周日
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    quiet_hours_start: Mapped[str] = mapped_column(String(5), default="22:00", nullable=False)
    quiet_hours_end: Mapped[str] = mapped_column(String(5), default="08:00", nullable=False)
    default_view: Mapped[str] = mapped_column(String(20), default="list", nullable=False)
    theme: Mapped[str] = mapped_column(String(20), default="light", nullable=False)
