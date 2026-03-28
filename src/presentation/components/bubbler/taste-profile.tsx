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

function getScoreTendencyLabel(avg: number): string {
  if (avg === 0) return '-'
  if (avg >= 85) return '후한 편'
  if (avg >= 75) return '조금 후한 편'
  if (avg >= 65) return '보통'
  if (avg >= 55) return '조금 까다로운 편'
  return '까다로운 편'
}

export function TasteProfile({ categories, scoreTendency, topRegions }: TasteProfileProps) {
  const tendencyPct = scoreTendency.avgSatisfaction > 0
    ? Math.min(100, Math.max(0, scoreTendency.avgSatisfaction))
    : 50

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>취향 프로필</h3>

      {/* 카테고리 비중 */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>카테고리 비중</span>
          {categories.slice(0, 5).map((cat) => (
            <div key={cat.name} className="flex items-center gap-2">
              <span className="w-[52px] shrink-0 text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{cat.name}</span>
              <div className="relative h-[6px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, cat.percentage)}%`,
                    backgroundColor: 'var(--accent-food)',
                  }}
                />
              </div>
              <span className="w-7 shrink-0 text-right text-[11px] font-semibold" style={{ color: 'var(--text-sub)' }}>
                {cat.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 점수 성향 스케일 */}
      {scoreTendency.avgSatisfaction > 0 && (
        <div className="rounded-xl px-3.5 py-2.5" style={{ backgroundColor: 'var(--bg-section)' }}>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>점수 성향</span>
          <div className="relative mt-2 h-[6px] overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--positive), var(--caution))' }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
              style={{
                left: `${tendencyPct}%`,
                transform: `translateX(-50%) translateY(-50%)`,
                backgroundColor: 'var(--caution)',
                border: '2px solid #fff',
              }}
            />
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-[9px]" style={{ color: 'var(--text-hint)' }}>까다로운 편</span>
            <span className="text-[9px]" style={{ color: 'var(--text-hint)' }}>후한 편</span>
          </div>
          <p className="mt-1 text-center text-[11px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            {getScoreTendencyLabel(scoreTendency.avgSatisfaction)} · 평균 {scoreTendency.avgSatisfaction}점
          </p>
        </div>
      )}

      {/* 기존 통계 */}
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

      {/* 주요 지역 */}
      {topRegions.length > 0 && (
        <div>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>주요 지역</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {topRegions.map((region, i) => (
              <span
                key={region}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: i === 0 ? 'var(--accent-food-light)' : 'var(--bg-elevated)',
                  color: i === 0 ? 'var(--accent-food)' : 'var(--text-sub)',
                  border: i === 0 ? 'none' : '1px solid var(--border)',
                }}
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
