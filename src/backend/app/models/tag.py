"""
标签模型 — [REQ_TASK_MGMT_003]
TaskTag 多对多关联表。
"""
from __future__ import annotations

from sqlalchemy import ForeignKey, String, Table, Column, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base, TimestampMixin


# 任务-标签多对多关联表
task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base, TimestampMixin):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(30), nullable=False)

    # 关系
    tasks: Mapped[list["Task"]] = relationship(secondary=task_tags, back_populates="tags")  # noqa: F821
