"""
全局配置管理 — REQ_TASK_MGMT_011, REQ_TASK_MGMT_012, REQ_TASK_MGMT_013
通过 pydantic-settings 从 .env 加载所有配置项。
"""
from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ========== 数据库配置 [REQ_TASK_MGMT_013] ==========
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "smart_task_manager"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DATABASE_URL_OVERRIDE: str = ""  # QA: 允许通过环境变量覆盖数据库连接

    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE:
            return self.DATABASE_URL_OVERRIDE
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    # ========== JWT 配置 [REQ_TASK_MGMT_011] ==========
    JWT_SECRET: str = "change_this_secret_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # ========== AI 模型配置 [REQ_TASK_MGMT_012] ==========
    AI_BASE_URL: str | None = None
    AI_API_KEY: str | None = None
    AI_MODEL_NAME: str = "glm-4"
    AI_REQUEST_TIMEOUT: int = 30
    AI_MAX_RETRIES: int = 2
    AI_RETRY_DELAY: int = 3

    # ========== CORS 配置 ==========
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [s.strip() for s in self.CORS_ORIGINS.split(",") if s.strip()]

    # ========== 提醒配置 [REQ_TASK_MGMT_005] ==========
    REMINDER_CHECK_INTERVAL_MINUTES: int = 15

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
