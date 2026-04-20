"""
统一响应格式工具
"""
from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse


def success_response(data: Any = None, message: str = "ok") -> dict:
    """成功响应"""
    return {"code": 0, "message": message, "data": data}


def error_response(code: int, message: str, data: Any = None) -> dict:
    """错误响应"""
    return {"code": code, "message": message, "data": data}


def paginated_response(items: list, total: int, page: int, page_size: int) -> dict:
    """分页响应"""
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
