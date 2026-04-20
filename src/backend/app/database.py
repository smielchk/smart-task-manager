"""
数据库连接管理 — REQ_TASK_MGMT_013
SQLAlchemy 异步引擎 + 会话工厂。
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings

logger = logging.getLogger(__name__)

# 异步引擎
_engine_kwargs = {}
_url = settings.DATABASE_URL
if _url.startswith("sqlite"):
    # SQLite 不支持连接池参数
    pass
else:
    _engine_kwargs = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 3600,
        "pool_pre_ping": True,
    }

engine = create_async_engine(
    _url,
    echo=False,
    **_engine_kwargs,
)

# 异步会话工厂
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """初始化数据库连接，验证连接可用 [AC-013-01]"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda _: None)  # 验证连接
        logger.info("数据库连接成功: %s:%d/%s", settings.DB_HOST, settings.DB_PORT, settings.DB_NAME)

        # QA: 自动建表（开发/测试环境）
        from .models import Base  # noqa: F811
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("数据库表已创建/验证")
    except Exception as e:
        logger.critical("数据库连接失败: %s", e)
        raise SystemExit(1)  # [AC-013-02]


async def close_db() -> None:
    """关闭数据库连接"""
    await engine.dispose()
    logger.info("数据库连接已关闭")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依赖注入：获取数据库会话"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
