"""
JWT 认证中间件 — [REQ_TASK_MGMT_011]
排除 auth 和 health 路由。
"""
from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from ..config import settings

logger = logging.getLogger(__name__)

# 不需要 JWT 认证的路径前缀
EXCLUDED_PATHS = {"/api/auth", "/api/health"}


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """JWT 认证中间件：验证所有业务 API 的 Token"""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        # 排除不需要认证的路径
        if any(path.startswith(p) for p in EXCLUDED_PATHS):
            return await call_next(request)

        # 排除 OPTIONS 预检请求
        if request.method == "OPTIONS":
            return await call_next(request)

        # 检查 Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"code": 401, "message": "未提供有效的认证凭据", "data": None},
            )

        token = auth_header.split(" ", 1)[1]
        try:
            from jose import JWTError, jwt

            jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM],
            )
        except JWTError as e:
            logger.warning("JWT 中间件认证失败: %s", e)
            return JSONResponse(
                status_code=401,
                content={"code": 401, "message": "Token 已过期或无效", "data": None},
            )

        return await call_next(request)
