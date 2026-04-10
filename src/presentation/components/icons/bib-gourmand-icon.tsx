interface BibGourmandIconProps {
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

/** 빕 구르망 원형 아이콘 — 오렌지 원 안에 흰색 포크+나이프 (미슐랭 스타와 차별화) */
export function BibGourmandIcon({ size = 16, color = '#E8590C', className, style }: BibGourmandIconProps) {
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
      {/* 포크 (왼쪽) */}
      <g fill="#fff">
        <rect x="32" y="22" width="3" height="28" rx="1.5" />
        <rect x="38" y="22" width="3" height="28" rx="1.5" />
        <rect x="44" y="22" width="3" height="28" rx="1.5" />
        <rect x="31" y="48" width="17" height="5" rx="2.5" />
        <rect x="37" y="48" width="5" height="28" rx="2.5" />
      </g>
      {/* 나이프 (오른쪽) */}
      <g fill="#fff">
        <path d="M62 22 C62 22 68 22 68 40 L68 48 L58 48 L58 40 C58 22 62 22 62 22Z" />
        <rect x="60.5" y="48" width="5" height="28" rx="2.5" />
      </g>
    </svg>
  )
}
