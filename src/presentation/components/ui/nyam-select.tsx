'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface NyamSelectOption {
  value: string
  label: string
}

interface NyamSelectProps {
  options: NyamSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  accentColor?: string
  /** true면 선택된 값 텍스트 폭에 맞춤 (Notion 스타일) */
  autoWidth?: boolean
}

const EDGE_MARGIN = 8       // 화면 가장자리 여유
const GAP = 4               // 버튼-드롭다운 간격
const MIN_HEIGHT = 80       // 드롭다운 최소 높이
const ITEM_HEIGHT_EST = 38  // 항목 1개 예상 높이 (padding 포함)

export function NyamSelect({ options, value, onChange, placeholder, disabled = false, accentColor = 'var(--accent-food)', autoWidth = false }: NyamSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [maxH, setMaxH] = useState<number>(400)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const matched = options.find((o) => o.value === value)
  const selectedLabel = matched ? matched.label : (value || placeholder || '')
  const isWine = accentColor === 'var(--accent-wine)'

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollUp(el.scrollTop > 4)
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }, [])

  // 드롭다운 위치·크기 계산
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return
    const btn = buttonRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // ── 상하 방향 결정 ──
    const spaceBelow = vh - btn.bottom - EDGE_MARGIN
    const spaceAbove = btn.top - EDGE_MARGIN
    // 항목 전체가 아래에 들어가는지 체크, 안 되면 더 넓은 쪽 선택
    const estTotal = options.length * ITEM_HEIGHT_EST + 8 // padding
    const dropUp = spaceBelow < Math.min(estTotal, MIN_HEIGHT) && spaceAbove > spaceBelow

    const availableH = dropUp ? spaceAbove : spaceBelow
    const computedMaxH = Math.max(MIN_HEIGHT, availableH - GAP)
    setMaxH(computedMaxH)

    // ── 좌우 정렬 ──
    // 원칙: 좌측 정렬. 오른쪽이 잘릴 때만 우측 정렬
    // 드롭다운 예상 폭: 항목 최대 길이 기반이지만 렌더 전엔 모르므로 넉넉히 추정
    // max-content로 렌더되니, 일단 left로 놓고 렌더 후 보정
    const pos: React.CSSProperties = {
      position: 'fixed',
      zIndex: 300,
      width: 'max-content',
      minWidth: btn.width,
    }

    if (dropUp) {
      pos.bottom = vh - btn.top + GAP
    } else {
      pos.top = btn.bottom + GAP
    }

    // 좌측 정렬 기본
    pos.left = btn.left

    setStyle(pos)

    // 렌더 후 우측 오버플로 보정
    requestAnimationFrame(() => {
      const dd = dropdownRef.current
      if (!dd) return
      const ddRect = dd.getBoundingClientRect()

      // 우측으로 넘치면 → 오른쪽 끝을 화면에 맞춤
      if (ddRect.right > vw - EDGE_MARGIN) {
        const correctedLeft = Math.max(EDGE_MARGIN, vw - EDGE_MARGIN - ddRect.width)
        setStyle((prev) => ({ ...prev, left: correctedLeft }))
      }

      checkScroll()
    })
  }, [isOpen, options.length, checkScroll])

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={autoWidth ? 'nyam-select-wrap' : 'nyam-select-wrap min-w-0 flex-1'}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`nyam-select ${autoWidth ? 'w-auto' : 'w-full'} ${isOpen ? 'open' : ''} ${isWine ? 'wine' : ''} ${disabled ? 'disabled' : ''}`}
        style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      >
        <span className="truncate" style={!value && placeholder ? { color: 'var(--text-hint)' } : undefined}>{selectedLabel}</span>
        <ChevronDown size={12} className="nyam-select-arrow shrink-0" />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="nyam-dropdown"
          style={style}
        >
          {canScrollUp && (
            <div className="nyam-dropdown-scroll-hint top">
              <ChevronUp size={14} />
            </div>
          )}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="nyam-dropdown-scroll"
            style={{ maxHeight: maxH }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`nyam-dropdown-item w-full text-left ${option.value === value ? 'selected' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {canScrollDown && (
            <div className="nyam-dropdown-scroll-hint bottom">
              <ChevronDown size={14} />
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
