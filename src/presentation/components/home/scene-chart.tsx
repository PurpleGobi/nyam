'use client'

interface SceneData {
  name: string
  count: number
  color: string
}

interface SceneChartProps {
  scenes: SceneData[]
}

export function SceneChart({ scenes }: SceneChartProps) {
  const maxCount = Math.max(...scenes.map((s) => s.count), 1)

  return (
    <div className="flex flex-col gap-2.5">
      {scenes.map((scene) => {
        const widthPercent = (scene.count / maxCount) * 100

        return (
          <div key={scene.name} className="flex items-center gap-3">
            <span
              className="w-[72px] shrink-0 text-right text-[12px]"
              style={{ color: 'var(--text-sub)' }}
            >
              {scene.name}
            </span>
            <div className="relative h-[20px] flex-1">
              <div
                className="absolute inset-0 rounded"
                style={{ backgroundColor: 'var(--bg)' }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: scene.color,
                  opacity: 0.8,
                }}
              />
            </div>
            <span
              className="w-[28px] shrink-0 text-right text-[11px] font-medium"
              style={{ color: 'var(--text)' }}
            >
              {scene.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
