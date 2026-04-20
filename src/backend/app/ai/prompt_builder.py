"""
Prompt 模板管理 — [REQ_TASK_MGMT_002]
"""
from __future__ import annotations


class PromptBuilder:
    """AI Prompt 模板构建器"""

    @staticmethod
    def build_nlp_prompt(user_input: str, timezone: str) -> str:
        """
        构建 NLP 解析 Prompt [REQ_TASK_MGMT_002]
        输出 JSON 格式，便于前端预览卡片直接使用。
        """
        return f"""你是一个任务解析助手。请将用户的自然语言描述解析为结构化任务信息。

用户时区: {timezone}
当前参考时间: 请基于"今天"来解析相对时间

用户输入: "{user_input}"

请严格按照以下 JSON 格式返回（不要返回任何其他内容）:
{{
  "title": "任务标题（从输入中提取核心任务内容，如无法识别则使用整条输入）",
  "due_datetime": "ISO 8601 格式的日期时间（包含时区偏移），如无法解析则为 null",
  "location": "地点信息（如"会议室A"、"超市"），如无则为 null",
  "category": "最匹配的预设分类名称（工作/生活/学习/健康/社交/财务），匹配度低则为 null",
  "priority": "P0/P1/P2/P3（P0=紧急，P1=高，P2=中，P3=低），根据紧急程度推断",
  "estimated_minutes": "估计耗时（分钟，整数），如用户未提及则为 null"
}}

优先级判断规则:
- P0: 包含"赶紧"、"马上"、"立刻"、"紧急"等紧急用词
- P1: 包含"尽快"、"尽快完成"、"今天必须"等
- P2: 无特殊紧急程度表述
- P3: 包含"有空再"、"不急"、"闲时"等

注意:
- 只返回 JSON，不要包含 markdown 标记或解释文字
- 如输入不含任务语义（如打招呼），title 设为输入原文
- 如果是中文输入，请使用中文的 category"""

    @staticmethod
    def build_classify_prompt(title: str, description: str | None) -> str:
        """构建分类 Prompt [REQ_TASK_MGMT_003]"""
        desc = description or ""
        return f"""你是一个任务分类助手。请判断以下任务最适合归入哪个预设分类。

任务标题: {title}
任务描述: {desc}

可选分类:
- 工作
- 生活
- 学习
- 健康
- 社交
- 财务

请严格按照以下 JSON 格式返回:
{{"category": "分类名称", "confidence": 0.0至1.0之间的匹配度分数}}

只返回 JSON。"""

    @staticmethod
    def build_tag_suggest_prompt(title: str, description: str | None, existing_tags: list[str] | None = None) -> str:
        """构建标签推荐 Prompt [REQ_TASK_MGMT_003]"""
        desc = description or ""
        existing = f"\n用户已有标签: {', '.join(existing_tags)}" if existing_tags else ""
        return f"""你是一个任务标签推荐助手。请为以下任务推荐最多3个相关标签。

任务标题: {title}
任务描述: {desc}{existing}

请严格按照以下 JSON 格式返回:
{{"tags": ["标签1", "标签2", "标签3"]}}

标签要求:
- 每个标签不超过5个字
- 优先从用户已有标签中选择
- 推荐与任务内容相关的标签
- 只返回 JSON"""

    @staticmethod
    def build_priority_prompt(tasks_json: str, user_preference: dict | None = None) -> str:
        """构建优先级评估 Prompt [REQ_TASK_MGMT_004]"""
        pref = ""
        if user_preference:
            pref = f"\n用户偏好:\n- 完成速度: {user_preference.get('completion_speed', {})}\n- 拖延模式: {user_preference.get('procrastination_pattern', {})}"

        return f"""你是一个任务优先级评估助手。请为以下任务列表计算优先级分数。

任务列表:
{tasks_json}
{pref}

评分规则:
- 综合考虑截止时间紧迫度、用户设定优先级、任务重要性
- 分数范围: 0.0 - 100.0
- 越紧急分越高

请严格按照以下 JSON 格式返回:
{{"scores": [{{"task_id": 1, "score": 85.5, "reason": "一句话排序理由"}}, ...]}}

只返回 JSON。"""

    @staticmethod
    def build_planning_prompt(tasks_json: str, available_hours: int, work_days: str, preference: dict | None = None) -> str:
        """构建规划 Prompt [REQ_TASK_MGMT_006]"""
        pref = ""
        if preference:
            pref = f"\n用户偏好:\n- 高效时段: {preference.get('productive_hours', '未知')}\n- 完成速度: {preference.get('completion_speed', '未知')}"

        return f"""你是一个任务规划助手。请为用户生成每日/每周任务规划建议。

待办任务:
{tasks_json}

用户配置:
- 每日可用工作时间: {available_hours} 小时
- 每周工作日: {work_days}
{pref}

请严格按照以下 JSON 格式返回:
{{
  "recommended_tasks": [
    {{
      "task_id": 1,
      "suggested_slot": "09:00-10:30",
      "reason": "推荐理由"
    }},
    ...
  ],
  "total_estimated_minutes": 总预估耗时（分钟）,
  "is_overloaded": false
}}

要求:
- 时间段不重叠
- 按优先级从高到低排列
- 超过 80% 负载时 is_overloaded 设为 true
- 只返回 JSON"""

    @staticmethod
    def build_reminder_prompt(task_title: str, due_datetime: str | None, priority: str, status: str, procrastination_pattern: dict | None = None) -> str:
        """构建提醒评估 Prompt [REQ_TASK_MGMT_005]"""
        pattern = ""
        if procrastination_pattern:
            pattern = f"\n用户拖延模式: {procrastination_pattern}"

        return f"""评估以下任务的拖延风险。

任务标题: {task_title}
截止时间: {due_datetime or "无"}
当前优先级: {priority}
当前状态: {status}{pattern}

请严格按照以下 JSON 格式返回:
{{"risk_level": "low/medium/high", "reason": "一句话风险评估理由"}}

只返回 JSON。"""
