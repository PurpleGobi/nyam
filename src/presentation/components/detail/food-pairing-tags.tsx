'use client'

interface FoodPairingTagsProps {
  pairings: string[]
}

export function FoodPairingTags({ pairings }: FoodPairingTagsProps) {
  if (pairings.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {pairings.map((pairing) => (
        <span
          key={pairing}
          className="rounded-full"
          style={{
            padding: '5px 12px',
            backgroundColor: 'var(--accent-wine-light)',
            border: '1px solid var(--accent-wine-dim)',
            color: 'var(--accent-wine)',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          {pairing}
        </span>
      ))}
    </div>
  )
}
