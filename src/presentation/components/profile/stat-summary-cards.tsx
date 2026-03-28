'use client'

interface StatCard {
  label: string
  value: string | number
  trend?: string
  color?: string
}

interface StatSummaryCardsProps {
  cards: StatCard[]
}

export function StatSummaryCards({ cards }: StatSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="card flex flex-col items-center rounded-xl px-2 py-3"
        >
          <span style={{ fontSize: '18px', fontWeight: 800, color: card.color ?? 'var(--text)' }}>
            {card.value}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '2px' }}>
            {card.label}
          </span>
          {card.trend && (
            <span style={{ fontSize: '10px', color: 'var(--positive)', marginTop: '2px' }}>
              {card.trend}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
