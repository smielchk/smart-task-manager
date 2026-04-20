export interface Task {
  id: number
  title: string
  description: string | null
  due_datetime: string | null
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  category_id: number | null
  category_name: string | null
  tags: { id: number; name: string }[]
  estimated_minutes: number | null
  location: string | null
  completed_at: string | null
  ai_generated: boolean
  reminder_enabled: boolean
  created_at: string | null
  updated_at: string | null
  priority_score: number | null
  priority_reason: string | null
}

export interface TaskCreate {
  title: string
  description?: string
  due_datetime?: string
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
  status?: string
  category_id?: number
  tag_ids?: number[]
  estimated_minutes?: number
  location?: string
  ai_generated?: boolean
}

export interface TaskUpdate {
  title?: string
  description?: string
  due_datetime?: string
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
  category_id?: number
  tag_ids?: number[]
  estimated_minutes?: number
  location?: string
  reminder_enabled?: boolean
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface ParsedTask {
  title: string
  due_datetime: string | null
  location: string | null
  category: string | null
  priority: string
  estimated_minutes: number | null
}

export interface Category {
  id: number
  name: string
  icon: string
  sort_order: number
  is_default: boolean
  task_count?: number
}

export interface Tag {
  id: number
  name: string
  task_count?: number
}

export interface UserSettings {
  timezone: string
  daily_work_hours: number
  work_days: string
  reminder_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  default_view: string
  theme: string
}

export interface StatsSummary {
  total: number
  completed: number
  completion_rate: number
  week_completed: number
  month_completed: number
  overdue: number
  overdue_rate: number
  category_distribution: { name: string; count: number }[]
  avg_completion_hours: number
}

export interface DailyPlan {
  date: string
  recommended_tasks: {
    task_id: number
    suggested_slot: string
    reason: string
  }[]
  total_estimated_minutes: number
  available_minutes: number
  load_percentage: number
  is_overloaded: boolean
  generated_at: string
}
