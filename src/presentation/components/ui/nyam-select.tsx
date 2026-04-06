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
  /** true면 배경/테두리 없는 인라인 텍스트 스타일. 탭하면 드롭다운 열림 */
  inline?: boolean
}

const EDGE_MARGIN = 8       // 화면 가장자리 여유
const GAP = 4               // 버튼-드롭다운 간격
const MIN_HEIGHT = 80       // 드롭다운 최소 높이
const ITEM_HEIGHT_EST = 38  // 항목 1개 예상 높이 (padding 포함)

export function NyamSelect({ options, value, onChange, placeholder, disabled = false, accentColor = 'var(--accent-food)', autoWidth = false, inline = false }: NyamSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const [maxH, setMaxH] = useState<number>(400)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
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

  /** 포탈 DOM이 마운트될 때 ref callback으로 즉시 위치 계산 */
  const positionDropdown = useCallback((dd: HTMLDivElement | null) => {
    if (!dd || !buttonRef.current) return
    const btn = buttonRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // 상하 방향 결정
    const spaceBelow = vh - btn.bottom - EDGE_MARGIN
    const spaceAbove = btn.top - EDGE_MARGIN
    const estTotal = options.length * ITEM_HEIGHT_EST + 8
    const dropUp = spaceBelow < Math.min(estTotal, MIN_HEIGHT) && spaceAbove > spaceBelow

    const availableH = dropUp ? spaceAbove : spaceBelow
    setMaxH(Math.max(MIN_HEIGHT, availableH - GAP))

    // 1차: 좌측 정렬로 임시 배치 (실제 너비 측정용)
    dd.style.position = 'fixed'
    dd.style.zIndex = '300'
    dd.style.width = 'max-content'
    dd.style.minWidth = `${btn.width}px`
    dd.style.left = `${btn.left}px`
    dd.style.visibility = 'hidden'

    if (dropUp) {
      dd.style.bottom = `${vh - btn.top + GAP}px`
      dd.style.top = 'auto'
    } else {
      dd.style.top = `${btn.bottom + GAP}px`
      dd.style.bottom = 'auto'
    }

    // 2차: 실제 너비 측정 후 좌우 보정
    const ddRect = dd.getBoundingClientRect()
    if (ddRect.right > vw - EDGE_MARGIN) {
      dd.style.left = `${Math.max(EDGE_MARGIN, vw - EDGE_MARGIN - ddRect.width)}px`
    }

    // 최종: 보이기
    dd.style.visibility = 'visible'
  }, [options.length])

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      // 포탈 내부 클릭도 무시 — 포탈은 body에 있으므로 data 속성으로 식별
      const portalEl = document.querySelector('[data-nyam-dropdown]')
      if (portalEl?.contains(target)) return
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
    <div ref={containerRef} className={inline ? 'nyam-select-wrap' : autoWidth ? 'nyam-select-wrap' : 'nyam-select-wrap min-w-0 flex-1'}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={inline
          ? `inline-flex items-center gap-0.5 border-0 bg-transparent p-0 text-[13px] font-medium outline-none ${disabled ? 'disabled' : ''}`
          : `nyam-select ${autoWidth ? 'w-auto' : 'w-full'} ${isOpen ? 'open' : ''} ${isWine ? 'wine' : ''} ${disabled ? 'disabled' : ''}`
        }
        style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      >
        <span className="truncate" style={!value && placeholder ? { color: 'var(--text-hint)' } : { color: 'var(--text)' }}>{selectedLabel}</span>
        {!inline && <ChevronDown size={12} className="nyam-select-arrow shrink-0" />}
      </button>

      {isOpen && createPortal(
        <div
          ref={positionDropdown}
          data-nyam-dropdown
          className="nyam-dropdown"
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
