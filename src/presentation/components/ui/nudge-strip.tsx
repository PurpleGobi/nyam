'use client'

interface NudgeStripProps {
  icon?: React.ReactNode
  text: string
  actionLabel?: string
  onAction?: () => void
}

export function NudgeStrip({ icon, text, actionLabel, onAction }: NudgeStripProps) {
  return (
    <div className="nudge-strip">
      {icon && (
        <div style={{
          width: '28px', height: '28px', borderRadius: '6px',
          background: 'var(--accent-food)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', flex: 1 }}>{text}</span>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} style={{
          fontSize: '12px', fontWeight: 700,
          background: 'rgba(193,123,94,0.12)', color: 'var(--accent-food)',
          border: 'none', borderRadius: 'var(--r-xs)',
          padding: '4px 10px', cursor: 'pointer',
        }}>{actionLabel}</button>
      )}
    </div>
  )
}
