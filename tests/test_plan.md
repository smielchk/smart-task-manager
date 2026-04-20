# 测试计划 (Test Plan): TASK_MGMT

## 0. 元信息
- **项目**: smart-task-manager
- **特性**: TASK_MGMT
- **版本**: v1.0.0
- **PRD**: `[REQ_TASK_MGMT_001]` ~ `[REQ_TASK_MGMT_013]`
- **日期**: 2026-04-20
- **审查级别**: M（注：代码规模实际为 S 级，后端 54 文件 3924 行 + 前端 55 文件 3451 行，按核心路径覆盖）
- **QA**: QA Agent (独立对抗性审查)
- **架构类型**: B/S (React + FastAPI + MySQL)

## 1. 需求与用例映射 (Traceability Matrix)

### 1.1 REQ → 测试用例映射

| TC ID | 标题 | 关联需求 | 关联 AC | 优先级 | 类型 |
|-------|------|----------|---------|--------|------|
| TC_001 | 创建任务-必填字段校验 | [REQ_TASK_MGMT_001] | AC-001-01 | P0 | 反向 |
| TC_002 | 创建任务-字段完整性 | [REQ_TASK_MGMT_001] | AC-001-02 | P0 | 正向 |
| TC_003 | 编辑任务-同步更新 | [REQ_TASK_MGMT_001] | AC-001-03 | P0 | 正向 |
| TC_004 | 软删除-回收站恢复 | [REQ_TASK_MGMT_001] | AC-001-04 | P1 | 正向 |
| TC_005 | 标记完成-自动填充时间 | [REQ_TASK_MGMT_001] | AC-001-05 | P0 | 正向 |
| TC_006 | 重新打开-清空完成时间 | [REQ_TASK_MGMT_001] | AC-001-06 | P1 | 正向 |
| TC_007 | 四种排序方式 | [REQ_TASK_MGMT_001] | AC-001-07 | P1 | 正向 |
| TC_008 | 组合筛选 | [REQ_TASK_MGMT_001] | AC-001-08 | P1 | 正向 |
| TC_009 | NLP 解析-截止时间 | [REQ_TASK_MGMT_002] | AC-002-01 | P0 | 正向 |
| TC_010 | NLP 解析-地点提取 | [REQ_TASK_MGMT_002] | AC-002-02 | P1 | 正向 |
| TC_011 | NLP 解析-紧急优先级 | [REQ_TASK_MGMT_002] | AC-002-03 | P1 | 正向 |
| TC_012 | 解析预览-可修改创建 | [REQ_TASK_MGMT_002] | AC-002-04 | P0 | 正向 |
| TC_013 | AI 失败降级提示 | [REQ_TASK_MGMT_002] | AC-002-05 | P0 | 反向 |
| TC_014 | 解析超时中断 | [REQ_TASK_MGMT_002] | AC-002-06 | P1 | 反向 |
| TC_015 | 无截止时间保留空 | [REQ_TASK_MGMT_002] | AC-002-07 | P0 | 正向 |
| TC_016 | 非任务语义提示 | [REQ_TASK_MGMT_002] | AC-002-08 | P2 | 边界 |
| TC_017 | 预设分类自动初始化 | [REQ_TASK_MGMT_003] | AC-003-01 | P0 | 正向 |
| TC_018 | AI 自动分类 | [REQ_TASK_MGMT_003] | AC-003-02 | P0 | 正向 |
| TC_019 | 低匹配度不强制分类 | [REQ_TASK_MGMT_003] | AC-003-03 | P1 | 边界 |
| TC_020 | 自定义分类 CRUD | [REQ_TASK_MGMT_003] | AC-003-04/05 | P1 | 正向 |
| TC_021 | 多标签关联 | [REQ_TASK_MGMT_003] | AC-003-06 | P1 | 正向 |
| TC_022 | AI 标签推荐 | [REQ_TASK_MGMT_003] | AC-003-07 | P2 | 正向 |
| TC_023 | 标签管理操作 | [REQ_TASK_MGMT_003] | AC-003-08 | P2 | 正向 |
| TC_024 | 默认 AI 智能排序 | [REQ_TASK_MGMT_004] | AC-004-01 | P0 | 正向 |
| TC_025 | 截止时间近排序靠前 | [REQ_TASK_MGMT_004] | AC-004-02 | P0 | 正向 |
| TC_026 | AI/手动排序切换 | [REQ_TASK_MGMT_004] | AC-004-03 | P1 | 正向 |
| TC_027 | 状态变更更新分数 | [REQ_TASK_MGMT_004] | AC-004-04 | P1 | 正向 |
| TC_028 | 排序偏好持久化 | [REQ_TASK_MGMT_004] | AC-004-05 | P2 | 正向 |
| TC_029 | 每日全量重算 | [REQ_TASK_MGMT_004] | AC-004-06 | P1 | 正向 |
| TC_030 | 截止日提醒推送 | [REQ_TASK_MGMT_005] | AC-005-01 | P0 | 正向 |
| TC_031 | 提前一天提醒 | [REQ_TASK_MGMT_005] | AC-005-02 | P0 | 正向 |
| TC_032 | 24h 防重复提醒 | [REQ_TASK_MGMT_005] | AC-005-03 | P1 | 正向 |
| TC_033 | 单任务提醒开关 | [REQ_TASK_MGMT_005] | AC-005-04 | P1 | 正向 |
| TC_034 | 免打扰时段 | [REQ_TASK_MGMT_005] | AC-005-05 | P1 | 正向 |
| TC_035 | 通知降级 | [REQ_TASK_MGMT_005] | AC-005-06 | P1 | 正向 |
| TC_036 | 紧急预警触发 | [REQ_TASK_MGMT_005] | AC-005-07 | P2 | 正向 |
| TC_037 | 习惯时段提醒 | [REQ_TASK_MGMT_005] | AC-005-08 | P2 | 正向 |
| TC_038 | 今日规划展示 | [REQ_TASK_MGMT_006] | AC-006-01 | P0 | 正向 |
| TC_039 | 时间段分配 | [REQ_TASK_MGMT_006] | AC-006-02 | P1 | 正向 |
| TC_040 | 工作量评估 | [REQ_TASK_MGMT_006] | AC-006-03 | P1 | 正向 |
| TC_041 | 过载预警 | [REQ_TASK_MGMT_006] | AC-006-04 | P1 | 正向 |
| TC_042 | 周视图时间轴 | [REQ_TASK_MGMT_006] | AC-006-05 | P2 | 正向 |
| TC_043 | 重新生成规划 | [REQ_TASK_MGMT_006] | AC-006-06 | P1 | 正向 |
| TC_044 | 看板三列展示 | [REQ_TASK_MGMT_007] | AC-007-01 | P0 | 正向 |
| TC_045 | 拖拽更新状态 | [REQ_TASK_MGMT_007] | AC-007-02 | P0 | 正向 |
| TC_046 | 列内 AI 排序 | [REQ_TASK_MGMT_007] | AC-007-03 | P1 | 正向 |
| TC_047 | 统计摘要 | [REQ_TASK_MGMT_007] | AC-007-04 | P1 | 正向 |
| TC_048 | 月视图展示 | [REQ_TASK_MGMT_008] | AC-008-01 | P0 | 正向 |
| TC_049 | 色块颜色映射 | [REQ_TASK_MGMT_008] | AC-008-02 | P1 | 正向 |
| TC_050 | 日期任务列表 | [REQ_TASK_MGMT_008] | AC-008-03 | P1 | 正向 |
| TC_051 | 统计指标展示 | [REQ_TASK_MGMT_009] | AC-009-01 | P1 | 正向 |
| TC_052 | 完成率环形图 | [REQ_TASK_MGMT_009] | AC-009-02 | P1 | 正向 |
| TC_053 | 趋势折线图 | [REQ_TASK_MGMT_009] | AC-009-03 | P1 | 正向 |
| TC_054 | 逾期率计算 | [REQ_TASK_MGMT_009] | AC-009-05 | P1 | 正向 |
| TC_055 | 行为日志记录 | [REQ_TASK_MGMT_010] | AC-010-01 | P1 | 正向 |
| TC_056 | 每日学习分析 | [REQ_TASK_MGMT_010] | AC-010-02 | P1 | 正向 |
| TC_057 | 不足7天用默认值 | [REQ_TASK_MGMT_010] | AC-010-07 | P1 | 正向 |
| TC_058 | 用户注册密码校验 | [REQ_TASK_MGMT_011] | AC-011-01 | P0 | 正向 |
| TC_059 | 登录获取 JWT | [REQ_TASK_MGMT_011] | AC-011-02 | P0 | 正向 |
| TC_060 | 设置修改保存 | [REQ_TASK_MGMT_011] | AC-011-04 | P1 | 正向 |
| TC_061 | AI 配置 .env 生效 | [REQ_TASK_MGMT_012] | AC-012-01 | P0 | 正向 |
| TC_062 | 未配置 AI 打印警告 | [REQ_TASK_MGMT_012] | AC-012-02 | P0 | 正向 |
| TC_063 | AI 不可用 CRUD 正常 | [REQ_TASK_MGMT_012] | AC-012-03 | P0 | 正向 |
| TC_064 | 健康检查接口 | [REQ_TASK_MGMT_012] | AC-012-04 | P1 | 正向 |
| TC_065 | 数据库连接配置 | [REQ_TASK_MGMT_013] | AC-013-01 | P0 | 正向 |
| TC_066 | 连接失败退出 | [REQ_TASK_MGMT_013] | AC-013-02 | P0 | 正向 |

### 1.2 REQ 覆盖率汇总

| REQ ID | AC 总数 | 已映射 TC 数 | 覆盖率 |
|--------|---------|-------------|--------|
| REQ_TASK_MGMT_001 | 8 | 8 | 100% |
| REQ_TASK_MGMT_002 | 8 | 8 | 100% |
| REQ_TASK_MGMT_003 | 8 | 7 | 87.5% (AC-003-08 合并到 TC_023) |
| REQ_TASK_MGMT_004 | 6 | 6 | 100% |
| REQ_TASK_MGMT_005 | 8 | 8 | 100% |
| REQ_TASK_MGMT_006 | 7 | 6 | 85.7% (AC-006-07 定时任务验证在 TC_029 类) |
| REQ_TASK_MGMT_007 | 5 | 4 | 80% (AC-007-05 P2 合并到 TC_044) |
| REQ_TASK_MGMT_008 | 5 | 3 | 60% (核心路径，AC-008-04/05 P2 降级) |
| REQ_TASK_MGMT_009 | 5 | 4 | 80% (AC-009-04 P2 降级) |
| REQ_TASK_MGMT_010 | 7 | 3 | 42.9% (M级核心路径，P2 用例降级) |
| REQ_TASK_MGMT_011 | 5 | 3 | 60% (AC-011-03/05 P1/P1 降级) |
| REQ_TASK_MGMT_012 | 5 | 4 | 80% (AC-012-05 P1 降级) |
| REQ_TASK_MGMT_013 | 2 | 2 | 100% |
| **合计** | **87** | **66** | **75.9%** |

> 注：M 级审查聚焦核心路径（P0+P1），P2 用例标记为降级（不阻塞签章），覆盖率计算仅含 P0+P1 AC。

### 1.3 Manifest 交叉验证结果

| 检查项 | 结果 |
|--------|------|
| 声明已实现源码文件 | 55/56 存在 |
| 缺失文件 | `backend/app/services/settings_service.py` — Design 声明但源码缺失。settings API 直接操作 ORM 模型，功能实现但违反分层设计 |
| 判定 | **[MINOR]** — 功能等效但架构不一致 |

## 2. 测试用例详情

> 详见 §5（运行时测试用例）和 §7（QA 六维度测试用例），此处不重复完整展开。
> 核心路径用例（P0）在 §5 以 curl 可执行命令形式详细描述。

## 3. 回归范围
> Standard 模式：**N/A**

## 4. 测试环境
- **运行时**: Python 3.x / Node.js 22.x
- **数据库**: SQLite 内存模式（快速通道降级，DOCKER_AVAILABLE=false，EXTRA_DEPS=空）
- **依赖服务**: 无外部服务（AI 功能测试标记为 [BLOCKED: 无 AI API Key]）
- **后端入口**: `app.main:app` (uvicorn)
- **测试端口**: localhost:18000

## 5. 运行时测试用例

> Python B/S 项目，M 级核心路径覆盖。共 18 个运行时用例。

### RT_TC_001: 用户注册-密码校验
- **关联 AC**: AC-011-01
- **关联 REQ**: [REQ_TASK_MGMT_011]
- **前置条件**: 服务已启动，数据库已初始化
- **优先级**: P0
- **类型**: 正向 + 反向

**输入构造**:
```bash
# 反向：短密码
curl -s -X POST http://localhost:18000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123"}'
# 预期: 422 或错误提示

# 反向：纯数字
curl -s -X POST http://localhost:18000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"12345678"}'

# 正向：合法密码
curl -s -X POST http://localhost:18000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test1234"}'
```

**预期输出**:
- 短密码: 422 Validation Error
- 纯数字: 422 或密码需含字母提示
- 合法密码: 200/201, 返回 user 对象 + token

### RT_TC_002: 用户登录-JWT 获取
- **关联 AC**: AC-011-02
- **关联 REQ**: [REQ_TASK_MGMT_011]
- **前置条件**: 已注册用户 testuser/test1234
- **优先级**: P0
- **类型**: 正向

**输入构造**:
```bash
# 登录
TOKEN_RESP=$(curl -s -X POST http://localhost:18000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test1234"}')
echo "$TOKEN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token','NO_TOKEN'))"
```

**预期输出**: 200, 返回有效 JWT Token（base64 编码，含 exp claim，7 天有效期）

### RT_TC_003: 创建任务-必填校验 + 正常创建
- **关联 AC**: AC-001-01, AC-001-02
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **前置条件**: 已登录，获取 JWT Token
- **优先级**: P0
- **类型**: 反向 + 正向

**输入构造**:
```bash
TOKEN="<从 RT_TC_002 获取>"

# 反向：缺标题
curl -s -X POST http://localhost:18000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description":"测试任务"}'
# 预期: 422

# 正向：完整创建
curl -s -X POST http://localhost:18000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title":"完成周报",
    "description":"整理本周工作",
    "priority":"P1",
    "status":"pending",
    "estimated_minutes":60
  }'
```

**预期输出**:
- 缺标题: 422 Validation Error
- 完整创建: 201, 返回含 id, title, description, priority, status, created_at, updated_at 的任务对象

### RT_TC_004: 编辑任务-同步更新
- **关联 AC**: AC-001-03
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **前置条件**: RT_TC_003 创建的任务 id=1
- **优先级**: P0
- **类型**: 正向

**输入构造**:
```bash
# 编辑
curl -s -X PUT http://localhost:18000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"完成月报","priority":"P0"}'

# 验证更新
curl -s http://localhost:18000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

**预期输出**: 更新后查询返回 title="完成月报", priority="P0"

### RT_TC_005: 标记完成-自动填充时间 + 重新打开
- **关联 AC**: AC-001-05, AC-001-06
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **前置条件**: 任务 id=1 状态 pending
- **优先级**: P0
- **类型**: 正向

**输入构造**:
```bash
# 标记完成
curl -s -X PATCH http://localhost:18000/api/tasks/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"completed"}'
# 预期: completed_at 非空

# 重新打开
curl -s -X PATCH http://localhost:18000/api/tasks/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"pending"}'
# 预期: completed_at 为 null
```

### RT_TC_006: 软删除 + 回收站
- **关联 AC**: AC-001-04
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **前置条件**: 存在任务 id=1
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
# 软删除
curl -s -X DELETE http://localhost:18000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"

# 默认列表不应包含
curl -s "http://localhost:18000/api/tasks?page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN"

# 回收站应包含
curl -s "http://localhost:18000/api/tasks?include_deleted=true" \
  -H "Authorization: Bearer $TOKEN"
```

**预期输出**: 软删除后默认列表不含该任务，include_deleted=true 时包含

### RT_TC_007: 任务列表排序
- **关联 AC**: AC-001-07
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **前置条件**: 已创建多个任务（含不同优先级/截止时间）
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
# 按优先级排序
curl -s "http://localhost:18000/api/tasks?sort=priority&sort_order=asc" \
  -H "Authorization: Bearer $TOKEN"

# 按创建时间排序
curl -s "http://localhost:18000/api/tasks?sort=created_at&sort_order=desc" \
  -H "Authorization: Bearer $TOKEN"

# AI 智能排序（默认）
curl -s "http://localhost:18000/api/tasks?sort=smart" \
  -H "Authorization: Bearer $TOKEN"
```

### RT_TC_008: 任务列表筛选
- **关联 AC**: AC-001-08
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **前置条件**: 已创建多个任务（不同状态/分类）
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
# 按状态筛选
curl -s "http://localhost:18000/api/tasks?status=pending" \
  -H "Authorization: Bearer $TOKEN"

# 按分类筛选
curl -s "http://localhost:18000/api/tasks?category_id=1" \
  -H "Authorization: Bearer $TOKEN"

# 关键词搜索
curl -s "http://localhost:18000/api/tasks?keyword=周报" \
  -H "Authorization: Bearer $TOKEN"
```

### RT_TC_009: 预设分类初始化
- **关联 AC**: AC-003-01
- **关联 REQ**: [REQ_TASK_MGMT_003]
- **前置条件**: 系统启动完成
- **优先级**: P0
- **类型**: 正向

**输入构造**:
```bash
curl -s http://localhost:18000/api/categories \
  -H "Authorization: Bearer $TOKEN"
```

**预期输出**: 返回 6 个预设分类（工作、生活、学习、健康、社交、财务），含 id, name, icon, is_default=true

### RT_TC_010: 分类 CRUD
- **关联 AC**: AC-003-04, AC-003-05
- **关联 REQ**: [REQ_TASK_MGMT_003]
- **前置条件**: 已登录
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
# 创建自定义分类
curl -s -X POST http://localhost:18000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"自定义分类","icon":"📁"}'

# 更新
curl -s -X PUT http://localhost:18000/api/categories/7 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"修改后的分类"}'

# 删除
curl -s -X DELETE http://localhost:18000/api/categories/7 \
  -H "Authorization: Bearer $TOKEN"
```

### RT_TC_011: 标签 CRUD + 多标签关联
- **关联 AC**: AC-003-06
- **关联 REQ**: [REQ_TASK_MGMT_003]
- **前置条件**: 已登录，有可用任务
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
# 创建标签
curl -s -X POST http://localhost:18000/api/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"紧急"}'

# 创建任务时关联标签
curl -s -X POST http://localhost:18000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"测试多标签","tag_ids":[1]}'
```

**预期输出**: 创建的任务 tags 数组包含关联的标签对象

### RT_TC_012: 认证保护-未登录访问
- **关联 REQ**: [REQ_TASK_MGMT_011] (安全需求)
- **前置条件**: 无 JWT Token
- **优先级**: P0
- **类型**: 反向

**输入构造**:
```bash
# 无 Token 访问任务列表
curl -s http://localhost:18000/api/tasks

# 无效 Token
curl -s http://localhost:18000/api/tasks \
  -H "Authorization: Bearer invalid_token"
```

**预期输出**: 401 Unauthorized

### RT_TC_013: AI 健康检查
- **关联 AC**: AC-012-04
- **关联 REQ**: [REQ_TASK_MGMT_012]
- **前置条件**: 服务已启动
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
# 系统健康
curl -s http://localhost:18000/api/health

# AI 健康
curl -s http://localhost:18000/api/health/ai
```

**预期输出**: /api/health 返回 status="ok"；/api/health/ai 返回 available=false（无 AI Key 配置时）或 available=true

### RT_TC_014: NLP 解析-AI 不可用降级
- **关联 AC**: AC-002-05
- **关联 REQ**: [REQ_TASK_MGMT_002]
- **前置条件**: 未配置 AI_API_KEY
- **优先级**: P0
- **类型**: 反向

**输入构造**:
```bash
curl -s -X POST http://localhost:18000/api/tasks/parse-nlp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"input":"下周三开会","timezone":"Asia/Shanghai"}'
```

**预期输出**: 200, data.ai_available=false, 含错误提示信息

### RT_TC_015: 统计接口
- **关联 AC**: AC-009-01
- **关联 REQ**: [REQ_TASK_MGMT_009]
- **前置条件**: 已创建若干任务，部分已完成
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
curl -s "http://localhost:18000/api/stats/summary?range=week" \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:18000/api/stats/trends?days=7" \
  -H "Authorization: Bearer $TOKEN"
```

### RT_TC_016: 规划接口
- **关联 AC**: AC-006-01
- **关联 REQ**: [REQ_TASK_MGMT_006]
- **前置条件**: 未配置 AI（降级模式）
- **优先级**: P0
- **类型**: 正向

**输入构造**:
```bash
curl -s "http://localhost:18000/api/planning/daily" \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:18000/api/planning/weekly" \
  -H "Authorization: Bearer $TOKEN"
```

### RT_TC_017: 设置 CRUD
- **关联 AC**: AC-011-04
- **关联 REQ**: [REQ_TASK_MGMT_011]
- **前置条件**: 已登录
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
# 获取设置
curl -s http://localhost:18000/api/settings \
  -H "Authorization: Bearer $TOKEN"

# 更新设置
curl -s -X PUT http://localhost:18000/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"timezone":"Asia/Shanghai","daily_work_hours":8,"theme":"dark"}'
```

### RT_TC_018: 偏好接口
- **关联 AC**: AC-010-07
- **关联 REQ**: [REQ_TASK_MGMT_010]
- **前置条件**: 已登录
- **优先级**: P1
- **类型**: 正向

**输入构造**:
```bash
# 获取偏好
curl -s http://localhost:18000/api/preferences \
  -H "Authorization: Bearer $TOKEN"

# 重置学习数据
curl -s -X POST http://localhost:18000/api/preferences/reset \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. 用例执行汇总
> 执行完成后填写。

| 用例 ID | 场景 | 优先级 | 关联 AC | 状态 | 偏差说明 |
|---------|------|--------|---------|------|---------|
| RT_TC_001 | 用户注册密码校验 | P0 | AC-011-01 | — | — |
| RT_TC_002 | 用户登录JWT | P0 | AC-011-02 | — | — |
| RT_TC_003 | 创建任务校验+正常创建 | P0 | AC-001-01/02 | — | — |
| RT_TC_004 | 编辑任务同步更新 | P0 | AC-001-03 | — | — |
| RT_TC_005 | 完成+重新打开 | P0 | AC-001-05/06 | — | — |
| RT_TC_006 | 软删除+回收站 | P1 | AC-001-04 | — | — |
| RT_TC_007 | 列表排序 | P1 | AC-001-07 | — | — |
| RT_TC_008 | 列表筛选 | P1 | AC-001-08 | — | — |
| RT_TC_009 | 预设分类初始化 | P0 | AC-003-01 | — | — |
| RT_TC_010 | 分类CRUD | P1 | AC-003-04/05 | — | — |
| RT_TC_011 | 标签CRUD+关联 | P1 | AC-003-06 | — | — |
| RT_TC_012 | 认证保护 | P0 | 安全 | — | — |
| RT_TC_013 | 健康检查 | P1 | AC-012-04 | — | — |
| RT_TC_014 | NLP降级 | P0 | AC-002-05 | — | — |
| RT_TC_015 | 统计接口 | P1 | AC-009-01 | — | — |
| RT_TC_016 | 规划接口 | P0 | AC-006-01 | — | — |
| RT_TC_017 | 设置CRUD | P1 | AC-011-04 | — | — |
| RT_TC_018 | 偏好接口 | P1 | AC-010-07 | — | — |

## 7. QA 独立测试用例（六维度）

### 维度覆盖总览

| 维度 | 缩写 | 优先级 | 用例数 | 状态 |
|------|------|--------|--------|------|
| 功能正确性 | FCT | P0 | 8 | ✅ |
| 边界与异常 | BND | P0 | 6 | ✅ |
| 安全性 | SEC | P0 | 5 | ✅ |
| 性能与负载 | PERF | P1 | 3 | ✅ |
| 可靠性与容错 | REL | P1 | 3 | ✅ |
| 数据完整性 | DAT | P1 | 4 | ✅ |
| **合计** | | | **29** | |

### FCT 维度用例

#### QA_FCT_001: 任务 CRUD 全生命周期
- **维度**: FCT
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **关联 AC**: AC-001-02, AC-001-03
- **优先级**: P0
- **测试**: 创建→查询→更新→验证更新→删除→验证删除

#### QA_FCT_002: 用户注册→登录→访问受保护资源
- **维度**: FCT
- **关联 REQ**: [REQ_TASK_MGMT_011]
- **关联 AC**: AC-011-01, AC-011-02
- **优先级**: P0
- **测试**: 注册→登录获取Token→携带Token访问任务API→成功

#### QA_FCT_003: 分类预设初始化 + 自定义增删
- **维度**: FCT
- **关联 REQ**: [REQ_TASK_MGMT_003]
- **关联 AC**: AC-003-01, AC-003-04, AC-003-05
- **优先级**: P0

#### QA_FCT_004: 标签创建 + 任务关联 + 删除
- **维度**: FCT
- **关联 REQ**: [REQ_TASK_MGMT_003]
- **关联 AC**: AC-003-06
- **优先级**: P0

#### QA_FCT_005: 任务状态流转完整链路
- **维度**: FCT
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **关联 AC**: AC-001-05, AC-001-06
- **优先级**: P0
- **测试**: pending→in_progress→completed（completed_at 非空）→pending（completed_at 清空）

#### QA_FCT_006: 设置修改持久化
- **维度**: FCT
- **关联 REQ**: [REQ_TASK_MGMT_011]
- **关联 AC**: AC-011-04
- **优先级**: P0

#### QA_FCT_007: 统计数据准确性
- **维度**: FCT
- **关联 REQ**: [REQ_TASK_MGMT_009]
- **关联 AC**: AC-009-01, AC-009-05
- **优先级**: P0

#### QA_FCT_008: 偏好重置回退默认
- **维度**: FCT
- **关联 REQ**: [REQ_TASK_MGMT_010]
- **关联 AC**: AC-010-06
- **优先级**: P0

### BND 维度用例

#### QA_BND_001: 超长标题截断
- **维度**: BND
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **测试**: title 超过 200 字符 → 应拒绝

#### QA_BND_002: 无效优先级值
- **维度**: BND
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **测试**: priority="P99" → 应返回 422

#### QA_BND_003: 空任务列表分页
- **维度**: BND
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **测试**: page=999 → 应返回空 items 数组

#### QA_BND_004: 不存在的任务 ID
- **维度**: BND
- **关联 REQ**: [REQ_TASK_MGMT_001]
- **测试**: GET /api/tasks/99999 → 应返回 404

#### QA_BND_005: 重复用户名注册
- **维度**: BND
- **关联 REQ**: [REQ_TASK_MGMT_011]
- **测试**: 同用户名二次注册 → 应返回错误

#### QA_BND_006: NLP 输入超长
- **维度**: BND
- **关联 REQ**: [REQ_TASK_MGMT_002]
- **测试**: input 超过 500 字符 → 应返回 422

### SEC 维度用例

#### QA_SEC_001: SQL 注入防护
- **维度**: SEC
- **关联 REQ**: 安全需求
- **测试**: keyword 包含 `' OR 1=1 --` → 不应泄露数据

#### QA_SEC_002: 无 Token/无效 Token 拒绝
- **维度**: SEC
- **关联 REQ**: [REQ_TASK_MGMT_011]
- **测试**: 无 Token/伪造 Token → 401

#### QA_SEC_003: 密码不明文存储
- **维度**: SEC
- **关联 REQ**: 安全需求
- **测试**: 检查 users 表 password_hash 字段非明文

#### QA_SEC_004: AI API Key 不暴露
- **维度**: SEC
- **关联 REQ**: [REQ_TASK_MGMT_012]
- **测试**: 检查任何 API 响应不应包含 AI_API_KEY

#### QA_SEC_005: CORS 配置检查
- **维度**: SEC
- **关联 REQ**: 安全需求
- **测试**: Origin: evil.com → 应被拒绝

### PERF 维度用例

#### QA_PERF_001: 任务 CRUD API 响应时间
- **维度**: PERF
- **性能阈值**: ≤ 200ms (P95)
- **工具**: hey

#### QA_PERF_002: 并发创建任务
- **维度**: PERF
- **工具**: hey, 50 并发, 100 请求
- **预期**: 无 500 错误

#### QA_PERF_003: 列表查询性能
- **维度**: PERF
- **工具**: hey, 100 请求
- **预期**: ≤ 200ms P95

### REL 维度用例

#### QA_REL_001: AI 不可用时基础功能正常
- **维度**: REL
- **关联 REQ**: [REQ_TASK_MGMT_012]
- **测试**: 不配置 AI Key → CRUD 全流程正常

#### QA_REL_002: 错误响应格式统一
- **维度**: REL
- **测试**: 各种 4xx/5xx 错误 → 统一 code/message 格式

#### QA_REL_003: 数据库连接异常处理
- **维度**: REL
- **关联 REQ**: [REQ_TASK_MGMT_013]
- **测试**: 配置错误 DB 参数 → 服务启动失败

### DAT 维度用例

#### QA_DAT_001: 软删除不物理删除
- **维度**: DAT
- **测试**: DELETE 后查询数据库 tasks 表 → 记录仍在，deleted_at 非空

#### QA_DAT_002: 任务多标签关联正确性
- **维度**: DAT
- **测试**: 创建任务关联 3 个标签 → task_tags 表 3 条记录

#### QA_DAT_003: 完成时间戳准确性
- **维度**: DAT
- **测试**: 标记完成 → completed_at 在当前时间 ±5 秒内

#### QA_DAT_004: created_at/updated_at 自动维护
- **维度**: DAT
- **测试**: 创建任务 → created_at 非空；更新任务 → updated_at > created_at

### QA 测试执行汇总
> Step 4 执行后填写。

| 维度 | 用例数 | PASS | FAIL | BLOCKED | 通过率 |
|------|--------|------|------|---------|--------|
| FCT | 8 | — | — | — | — |
| BND | 6 | — | — | — | — |
| SEC | 5 | — | — | — | — |
| PERF | 3 | — | — | — | — |
| REL | 3 | — | — | — | — |
| DAT | 4 | — | — | — | — |
| **合计** | **29** | — | — | — | — |
