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
    <div className="flex flex-col gap-2.5">
      {genres.map((genre) => {
        const widthPercent = (genre.count / maxCount) * 100

        return (
          <div key={genre.name} className="flex items-center gap-3">
            <span
              className="w-[72px] shrink-0 text-right text-[12px]"
              style={{ color: 'var(--text-sub)' }}
            >
              {genre.name}
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
                  backgroundColor: 'var(--accent-food)',
                  opacity: 0.8,
                }}
              />
            </div>
            <span
              className="w-[28px] shrink-0 text-right text-[11px] font-medium"
              style={{ color: 'var(--text)' }}
            >
              {genre.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
