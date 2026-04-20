# BUG_007 修复方案: 注册后预设分类未初始化

## 严重级别: CRITICAL

## 问题描述
用户注册成功后 `GET /api/categories` 返回空列表，违反 AC-003-01 "系统预设 6 个默认分类：工作、学习、生活、健康、娱乐、其他"。

## 根因分析
`api/auth.py` 的 `register()` 函数创建了用户和默认设置，但未调用 `CategoryService` 初始化预设分类。

## 修复方案
在 `api/auth.py` 的 `register()` 函数中，用户创建成功后添加分类初始化：

```python
# auth.py register() 函数末尾，commit 之前
from ..services.category_service import CategoryService
await CategoryService.init_defaults(db, user.id)
```

确保 `CategoryService.init_defaults()` 方法检查是否已有分类，避免重复创建。
