'use client'

/**
 * GaugeSlider — 디자인 시스템 공용 바 게이지 슬라이더
 *
 * 용도: 와인 구조 평가(복합성/여운/균형), 만족도, 기타 0~100 범위 입력
 * 스타일: 14px 두꺼운 라운드 바, thumb 없음, fill로 위치 표현
 */

interface GaugeSliderProps {
  /** 0~100 */
  value: number
  onChange: (value: number) => void
  /** 트랙/fill 색상 CSS variable (예: '--accent-wine') */
  accentVar?: string
  /** 슬라이더 비활성화 */
  disabled?: boolean
  /** 바 안에 표시할 구간 라벨 (예: ['짧음', '보통', '긴']) */
  inlineMarks?: string[]
}

export function GaugeSlider({
  value,
  onChange,
  accentVar = '--accent-wine',
  disabled = false,
  inlineMarks,
}: GaugeSliderProps) {
  const pct = Math.min(100, Math.max(0, value))
  const accent = `var(${accentVar})`

  return (
    <div className="relative" style={{ height: '28px' }}>
      {/* Track background */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: '0px',
          height: '28px',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-elevated)',
        }}
      />
      {/* Active fill — 값에 비례하는 진하기 */}
      <div
        className="absolute left-0"
        style={{
          top: '0px',
          height: '28px',
          borderRadius: '14px',
          width: `max(28px, ${pct}%)`,
          backgroundColor: accent,
          opacity: 0.1 + (pct / 100) * 0.75,
          transition: 'width 0.05s ease-out, opacity 0.05s ease-out',
        }}
      />
      {/* Inline marks (바 안에 텍스트) */}
      {inlineMarks && inlineMarks.length > 0 && (
        <div className="absolute left-0 right-0 top-0 flex h-[28px] items-center justify-between px-3" style={{ pointerEvents: 'none' }}>
          {inlineMarks.map((m, i) => (
            <span key={i} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)' }}>
              {m}
            </span>
          ))}
        </div>
      )}
      {/* Invisible native range input */}
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute left-0 top-0 h-full w-full cursor-pointer opacity-0"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
    </div>
  )
}

/**
 * LabeledGaugeSlider — 라벨 + 값 표시 + 바 안 구간 라벨
 */
interface LabeledGaugeSliderProps extends GaugeSliderProps {
  /** 좌측 라벨 (예: '복합성') */
  label: string
  /** 우측 값 텍스트 (예: '85', '8초+') */
  valueLabel: string
  /** 하단 구간 라벨 → 바 안에 표시됨 */
  marks?: string[]
}

export function LabeledGaugeSlider({
  label,
  valueLabel,
  marks,
  ...sliderProps
}: LabeledGaugeSliderProps) {
  const accent = `var(${sliderProps.accentVar ?? '--accent-wine'})`

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', minWidth: '42px' }}>{label}</span>
      <div className="flex-1">
        <GaugeSlider {...sliderProps} inlineMarks={marks} />
      </div>
      <span className="shrink-0 text-right" style={{ fontSize: '15px', fontWeight: 800, color: accent, minWidth: '40px' }}>{valueLabel}</span>
    </div>
  )
}

/**
 * GaugeBar — 읽기 전용 두꺼운 라운드 바 (상세보기용)
 */
interface GaugeBarProps {
  label: string
  value: number
  valueLabel: string
  accentVar?: string
}

export function GaugeBar({ label, value, valueLabel, accentVar = '--accent-wine' }: GaugeBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  const accent = `var(${accentVar})`

  return (
    <div className="flex items-center gap-3">
      <span className="w-[52px] shrink-0" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
        {label}
      </span>
      <div className="relative flex-1" style={{ height: '14px', borderRadius: '7px', backgroundColor: 'var(--bg-elevated)' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '14px',
            borderRadius: '7px',
            width: `max(14px, ${pct}%)`,
            backgroundColor: accent,
            opacity: 0.1 + (pct / 100) * 0.75,
            transition: 'width 0.3s ease-out, opacity 0.3s ease-out',
          }}
        />
      </div>
      <span className="w-[48px] shrink-0 text-right" style={{ fontSize: '14px', fontWeight: 700, color: accent }}>
        {valueLabel}
      </span>
    </div>
  )
}
