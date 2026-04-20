"""
Smart Task Manager — FastAPI 应用入口
[REQ_TASK_MGMT_011, REQ_TASK_MGMT_012, REQ_TASK_MGMT_013]
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.auth import router as auth_router
from .api.categories import router as categories_router
from .api.health import router as health_router
from .api.planning import router as planning_router
from .api.preferences import router as preferences_router
from .api.settings import router as settings_router
from .api.stats import router as stats_router
from .api.tags import router as tags_router
from .api.tasks import router as tasks_router
from .config import settings
from .database import close_db, init_db
from .middleware.auth import JWTAuthMiddleware
from .scheduler.app import create_scheduler

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """应用生命周期管理"""
    # 启动时
    logger.info("Smart Task Manager 启动中...")
    await init_db()  # [AC-013-01, AC-013-02]

    # 启动定时任务
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("定时任务已启动")

    yield

    # 关闭时
    scheduler.shutdown()
    logger.info("定时任务已停止")
    await close_db()
    logger.info("Smart Task Manager 已停止")


app = FastAPI(
    title="Smart Task Manager API",
    description="智能任务管理系统 API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 中间件 [REQ_TASK_MGMT_011]
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT 认证中间件 [REQ_TASK_MGMT_011]
app.add_middleware(JWTAuthMiddleware)

# 路由注册
app.include_router(auth_router, prefix="/api/auth", tags=["认证"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["任务"])
app.include_router(categories_router, prefix="/api/categories", tags=["分类"])
app.include_router(tags_router, prefix="/api/tags", tags=["标签"])
app.include_router(planning_router, prefix="/api/planning", tags=["规划"])
app.include_router(stats_router, prefix="/api/stats", tags=["统计"])
app.include_router(settings_router, prefix="/api/settings", tags=["设置"])
app.include_router(preferences_router, prefix="/api/preferences", tags=["偏好"])
app.include_router(health_router, prefix="/api/health", tags=["健康检查"])
