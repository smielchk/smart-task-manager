import { useState } from 'react'
import { Segmented } from 'antd'
import DailyPlanView from './DailyPlan'
import WeeklyPlanView from './WeeklyPlan'

/**
 * 时间规划主页面 — [REQ_TASK_MGMT_006]
 * Tab 切换日/周规划。
 */
export default function PlanningView() {
  const [tab, setTab] = useState<string>('daily')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>时间规划</h2>
        <Segmented
          options={[
            { label: '📅 今日规划', value: 'daily' },
            { label: '📆 本周规划', value: 'weekly' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as string)}
        />
      </div>
      {tab === 'daily' ? <DailyPlanView /> : <WeeklyPlanView />}
    </div>
  )
}
