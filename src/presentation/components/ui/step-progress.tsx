'use client'

interface StepProgressProps {
  current: number
  total: number
}

export function StepProgress({ current, total }: StepProgressProps) {
  return (
    <div className="step-progress">
      {Array.from({ length: total }, (_, i) => {
        const cls = i < current ? 'step-bar complete' : i === current ? 'step-bar current' : 'step-bar'
        return <div key={i} className={cls} />
      })}
    </div>
  )
}
