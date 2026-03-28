'use client'

interface MapPinProps {
  score: number | null
  accentColor?: string
}

export function MapPin({ score, accentColor = 'var(--accent-food)' }: MapPinProps) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(-45deg)',
        backgroundColor: accentColor,
      }}
    >
      <span
        className="text-[10px] font-bold text-white"
        style={{ transform: 'rotate(45deg)' }}
      >
        {score ?? '·'}
      </span>
    </div>
  )
}

export function CurrentLocationDot() {
  return (
    <div
      style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent-social)',
        border: '2.5px solid #fff',
        boxShadow: '0 0 8px rgba(122,155,174,0.5)',
      }}
    />
  )
}
