'use client'

interface GenreData {
  name: string
  count: number
}

interface GenreChartProps {
  genres: GenreData[]
}

export function GenreChart({ genres }: GenreChartProps) {
  const maxCount = Math.max(...genres.map((g) => g.count), 1)

  return (
    <div className="flex flex-col gap-[8px]">
      {genres.map((genre) => {
        const widthPercent = (genre.count / maxCount) * 100
        const opacity = 0.3 + (genre.count / maxCount) * 0.7

        return (
          <div key={genre.name} className="flex items-center gap-[8px]">
            <span
              className="w-[78px] shrink-0 text-right text-[12px] font-semibold"
              style={{ color: 'var(--text)' }}
            >
              {genre.name}
            </span>
            <div
              className="relative h-[16px] flex-1 overflow-hidden rounded-[3px]"
              style={{ backgroundColor: 'var(--bg-page)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-[3px]"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: 'var(--accent-food)',
                  opacity,
                }}
              />
            </div>
            <span
              className="w-[20px] shrink-0 text-right text-[11px]"
              style={{ fontWeight: 800, color: 'var(--accent-food)' }}
            >
              {genre.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
