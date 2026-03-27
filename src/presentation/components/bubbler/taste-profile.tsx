'use client'

interface CategoryStat {
  name: string
  percentage: number
}

interface ScoreTendency {
  avgSatisfaction: number
  totalRecords: number
}

interface TasteProfileProps {
  categories: CategoryStat[]
  scoreTendency: ScoreTendency
  topRegions: string[]
}

export function TasteProfile({ categories, scoreTendency, topRegions }: TasteProfileProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>취향 프로필</h3>

      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>카테고리 비중</span>
          {categories.slice(0, 5).map((cat) => (
            <div key={cat.name} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[12px]" style={{ color: 'var(--text)' }}>{cat.name}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, cat.percentage)}%`,
                    backgroundColor: 'var(--accent-food)',
                  }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[11px] font-semibold" style={{ color: 'var(--text-sub)' }}>
                {cat.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        <div>
          <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>평균 만족도</span>
          <p className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>
            {scoreTendency.avgSatisfaction > 0 ? scoreTendency.avgSatisfaction.toFixed(0) : '-'}
          </p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>총 기록</span>
          <p className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>
            {scoreTendency.totalRecords}
          </p>
        </div>
      </div>

      {topRegions.length > 0 && (
        <div>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>주요 지역</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {topRegions.map((region) => (
              <span
                key={region}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                {region}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
