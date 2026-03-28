'use client'

interface SceneData {
  scene: string
  label: string
  count: number
  color: string
}

interface SceneChartProps {
  scenes: SceneData[]
}

export function SceneChart({ scenes }: SceneChartProps) {
  const maxCount = Math.max(...scenes.map((s) => s.count), 1)

  return (
    <div className="flex flex-col gap-[8px]">
      {scenes.map((scene) => {
        const widthPercent = (scene.count / maxCount) * 100
        const opacity = 0.4 + (scene.count / maxCount) * 0.6

        return (
          <div key={scene.scene} className="flex items-center gap-[8px]">
            <span
              className="w-[78px] shrink-0 text-right text-[12px] font-semibold"
              style={{ color: 'var(--text)' }}
            >
              {scene.label}
            </span>
            <div
              className="relative h-[16px] flex-1 overflow-hidden rounded-[3px]"
              style={{ backgroundColor: 'var(--bg-page)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-[3px]"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: scene.color,
                  opacity,
                }}
              />
            </div>
            <span
              className="w-[20px] shrink-0 text-right text-[11px]"
              style={{ fontWeight: 800, color: scene.color }}
            >
              {scene.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
