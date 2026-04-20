"""
认证 API — [REQ_TASK_MGMT_011]
用户注册与登录，JWT Token 签发。
"""
# from __future__ import annotations

import re
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import create_access_token
from ..models.user import User
from ..models.settings import UserSettings
from ..services.category_service import CategoryService
from .response import success_response, error_response

logger = logging.getLogger(__name__)
router = APIRouter()


# ========== 请求/响应 Schema ==========

class RegisterRequest(BaseModel):
    """注册请求 [AC-011-01]"""
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v or len(v) < 2 or len(v) > 50:
            raise ValueError("用户名长度需在 2-50 个字符之间")
        if not re.match(r"^[a-zA-Z0-9_\u4e00-\u9fff]+$", v):
            raise ValueError("用户名只能包含字母、数字、下划线和中文")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("密码长度不能少于 8 位")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("密码需包含至少一个字母")
        if not re.search(r"\d", v):
            raise ValueError("密码需包含至少一个数字")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


# ========== 端点 ==========

@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    用户注册 [REQ_TASK_MGMT_011]
    单用户约束：已有账户时拒绝注册 [AC-011-03]
    """
    # 检查单用户约束
    count_result = await db.execute(select(func.count()).select_from(User))
    user_count = count_result.scalar()

    if user_count > 0:
        return error_response(code=409, message="系统仅允许一个注册账户")

    # 检查用户名唯一性
    existing = await db.execute(select(User).where(User.username == req.username))
    if existing.scalar_one_or_none():
        return error_response(code=409, message="用户名已存在")

    # 创建用户
    from passlib.hash import bcrypt

    user = User(
        username=req.username,
        password_hash=bcrypt.hash(req.password),
    )
    db.add(user)
    await db.flush()

    # 初始化用户设置
    user_settings = UserSettings(user_id=user.id)
    db.add(user_settings)
    await db.flush()

    # 初始化默认分类 [AC-003-01]
    await CategoryService.init_default_categories(db, user.id)

    await db.commit()
    await db.refresh(user)

    # 签发 JWT
    token = create_access_token(user.id)

    return success_response(data={
        "user": {"id": user.id, "username": user.username},
        "token": token,
    })


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录 [REQ_TASK_MGMT_011]"""
    from passlib.hash import bcrypt

    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if not user or not bcrypt.verify(req.password, user.password_hash):
        return error_response(code=401, message="用户名或密码错误")

    token = create_access_token(user.id)

    return success_response(data={
        "token": token,
    })


@router.get("/check")
async def check_registration(db: AsyncSession = Depends(get_db)):
    """
    检查是否已有注册账户 [AC-011-03]
    前端根据此接口决定是否显示注册入口。
    """
    count_result = await db.execute(select(func.count()).select_from(User))
    user_count = count_result.scalar()
    return success_response(data={"has_registered": user_count > 0})
