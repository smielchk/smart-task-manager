-- Smart Task Manager — MySQL 初始化脚本
-- 数据库及用户已由 docker-compose 环境变量自动创建
-- 此脚本仅创建/初始化数据库 schema

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+08:00';

-- 确保使用正确的数据库
USE smart_task_manager;

-- ============================================================
-- 1. 用户表 users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. 任务分类表 categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    name        VARCHAR(50)  NOT NULL,
    icon        VARCHAR(50)  DEFAULT NULL,
    sort_order  INT          DEFAULT 0,
    is_default  TINYINT(1)   DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. 标签表 tags
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    name        VARCHAR(50)  NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_tag (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. 任务表 tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT          NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT         DEFAULT NULL,
    due_datetime        DATETIME     DEFAULT NULL,
    priority            ENUM('P0','P1','P2','P3') DEFAULT 'P2',
    status              ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
    category_id         INT          DEFAULT NULL,
    estimated_minutes   INT          DEFAULT NULL,
    location            VARCHAR(200) DEFAULT NULL,
    completed_at        DATETIME     DEFAULT NULL,
    ai_generated        TINYINT(1)   DEFAULT 0,
    reminder_enabled    TINYINT(1)   DEFAULT 1,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          DATETIME     DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_deleted (user_id, deleted_at),
    INDEX idx_due_datetime (due_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. 任务-标签多对多关联表 task_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS task_tags (
    task_id     INT NOT NULL,
    tag_id      INT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. 用户设置表 user_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id             INT          PRIMARY KEY,
    timezone            VARCHAR(50)  DEFAULT 'Asia/Shanghai',
    daily_work_hours    INT          DEFAULT 8,
    work_days           VARCHAR(20)  DEFAULT NULL,
    reminder_enabled    TINYINT(1)   DEFAULT 1,
    quiet_hours_start   VARCHAR(5)   DEFAULT NULL,
    quiet_hours_end     VARCHAR(5)   DEFAULT NULL,
    default_view        VARCHAR(20)  DEFAULT 'list',
    theme               VARCHAR(10)  DEFAULT 'light',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. 用户行为日志表 user_behavior_log
-- ============================================================
CREATE TABLE IF NOT EXISTS user_behavior_log (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT          NOT NULL,
    action_type         VARCHAR(50)  NOT NULL COMMENT 'task_created / task_completed / task_modified / ai_accepted / ai_rejected',
    target_type         VARCHAR(50)  NOT NULL DEFAULT 'task' COMMENT 'task / category / tag',
    target_id           INT          NOT NULL,
    metadata            JSON         DEFAULT NULL,
    ai_suggestion_id    VARCHAR(100) DEFAULT NULL,
    user_accepted       TINYINT(1)   DEFAULT NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. 用户偏好表 user_preference (AI 学习结果)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preference (
    user_id                 INT         PRIMARY KEY,
    active_hours            JSON        DEFAULT NULL,
    productive_hours        JSON        DEFAULT NULL COMMENT 'e.g. ["09:00-11:00", "14:00-16:00"]',
    category_preference     JSON        DEFAULT NULL COMMENT '{"工作": 0.35, "学习": 0.25}',
    tag_preference          JSON        DEFAULT NULL COMMENT '{"Python": 5, "报告": 3}',
    completion_speed        JSON        DEFAULT NULL COMMENT '{"P0": 120, "P1": 480} (minutes)',
    procrastination_pattern JSON        DEFAULT NULL COMMENT '{"ahead": 0.3, "ontime": 0.4, "overdue": 0.3}',
    manual_overrides        JSON        DEFAULT NULL,
    days_of_data            INT         DEFAULT 0,
    updated_at              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. AI 优先级缓存表 ai_priority_cache
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_priority_cache (
    task_id         INT          PRIMARY KEY,
    score           FLOAT        NOT NULL COMMENT '0.0 - 100.0',
    reason          VARCHAR(500) DEFAULT NULL,
    calculated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. 提醒日志表 reminder_log (防止重复推送)
-- ============================================================
CREATE TABLE IF NOT EXISTS reminder_log (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    task_id         INT          NOT NULL,
    reminder_type   VARCHAR(50)  NOT NULL COMMENT 'due_today / due_tomorrow / urgent / habit',
    pushed_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_user_task_type (user_id, task_id, reminder_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 初始化完成
-- ============================================================
