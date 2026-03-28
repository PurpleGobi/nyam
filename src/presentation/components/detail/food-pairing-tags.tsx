'use client'

interface FoodPairingTagsProps {
  pairings: string[]
}

/** 영문→한글 매핑 (설계 스펙 14종) */
const PAIRING_LABELS: Record<string, string> = {
  steak: '스테이크',
  lamb: '양갈비',
  cheese: '치즈',
  dark_chocolate: '다크 초콜릿',
  seafood: '해산물',
  pasta: '파스타',
  mushroom: '버섯',
  truffle: '트러플',
  poultry: '가금류',
  pork: '돼지고기',
  salad: '샐러드',
  nuts: '견과류',
  fruit: '과일',
  spicy: '매운 음식',
}

export function FoodPairingTags({ pairings }: FoodPairingTagsProps) {
  if (pairings.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {pairings.map((pairing) => (
        <span
          key={pairing}
          style={{
            padding: '5px 12px',
            borderRadius: '20px',
            backgroundColor: 'var(--accent-wine-light)',
            border: '1px solid #DDD6E3',
            color: 'var(--accent-wine)',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          {PAIRING_LABELS[pairing] ?? pairing}
        </span>
      ))}
    </div>
  )
}
