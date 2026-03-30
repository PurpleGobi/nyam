'use client'

interface BubbleActivityRingProps {
  /** 0-100 활동량 비율 */
  progress: number
  size: number
  strokeWidth?: number
  children: React.ReactNode
}

export function BubbleActivityRing({
  progress,
  size,
  strokeWidth = 3,
  children,
}: BubbleActivityRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference
  const isActive = progress > 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* 배경 트랙 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          opacity={0.5}
        />
        {/* 프로그레스 아크 */}
        {isActive && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent-social)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="activity-ring-arc"
          />
        )}
      </svg>
      {/* 중앙 컨텐츠 */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: strokeWidth,
          left: strokeWidth,
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
        }}
      >
        {children}
      </div>
      {/* 100% 달성 시 글로우 */}
      {progress >= 100 && (
        <div
          className="activity-ring-glow absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 12px var(--accent-social), 0 0 4px var(--accent-social)',
            opacity: 0.4,
          }}
        />
      )}
    </div>
  )
}
