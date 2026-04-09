interface BlueRibbonIconProps {
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

/** 블루리본 원형 아이콘 — 파란 원 안에 흰색 리본 */
export function BlueRibbonIcon({ size = 16, color = '#1B4B94', className, style }: BlueRibbonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <circle cx="50" cy="50" r="50" fill={color} />
      <g fill="#fff">
        {/* Left loop */}
        <path d="M50 44 C40 30, 12 14, 14 38 C16 54, 40 58, 50 48Z" />
        {/* Right loop */}
        <path d="M50 44 C60 30, 88 14, 86 38 C84 54, 60 58, 50 48Z" />
        {/* Left tail */}
        <path d="M48 54 C38 60, 18 82, 26 84 C32 85, 42 68, 48 58Z" />
        {/* Right tail */}
        <path d="M52 54 C62 60, 82 82, 74 84 C68 85, 58 68, 52 58Z" />
        {/* Center knot */}
        <circle cx="50" cy="50" r="7" />
      </g>
    </svg>
  )
}
