import { Spin } from 'antd'

/**
 * AI 调用加载遮罩 — [REQ_TASK_MGMT_012]
 * AI 功能调用中时展示全屏加载遮罩。
 */
export default function LoadingOverlay({ visible, text = 'AI 正在思考中...' }: { visible: boolean; text?: string }) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.15)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
      }}
    >
      <Spin size="large" tip={text}>
        <div style={{ padding: 50 }} />
      </Spin>
    </div>
  )
}
