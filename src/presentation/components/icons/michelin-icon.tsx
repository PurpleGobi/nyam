interface MichelinIconProps {
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

/** 미슐랭 원형 아이콘 — 빨간 원 안에 흰색 6-petal flower */
export function MichelinIcon({ size = 16, color = '#E2001A', className, style }: MichelinIconProps) {
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
        <ellipse cx="50" cy="30" rx="10" ry="16" />
        <ellipse cx="50" cy="30" rx="10" ry="16" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="30" rx="10" ry="16" transform="rotate(120 50 50)" />
        <ellipse cx="50" cy="30" rx="10" ry="16" transform="rotate(180 50 50)" />
        <ellipse cx="50" cy="30" rx="10" ry="16" transform="rotate(240 50 50)" />
        <ellipse cx="50" cy="30" rx="10" ry="16" transform="rotate(300 50 50)" />
      </g>
    </svg>
  )
}
