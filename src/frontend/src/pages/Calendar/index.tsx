import { useState } from 'react'
import { Segmented } from 'antd'
import MonthView from './MonthView'
import WeekView from './WeekView'

/**
 * 日历主页面 — [REQ_TASK_MGMT_008]
 * 支持月视图/周视图切换。
 */
export default function CalendarView() {
  const [view, setView] = useState<string>('month')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>日历视图</h2>
        <Segmented
          options={[
            { label: '月视图', value: 'month' },
            { label: '周视图', value: 'week' },
          ]}
          value={view}
          onChange={(v) => setView(v as string)}
        />
      </div>
      {view === 'month' ? <MonthView /> : <WeekView />}
    </div>
  )
}
