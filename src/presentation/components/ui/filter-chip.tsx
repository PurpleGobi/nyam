'use client'

import { forwardRef, useRef, useCallback, useImperativeHandle } from 'react'

interface FilterChipProps {
  active?: boolean
  variant?: 'food' | 'wine' | 'social'
  count?: number
  children: React.ReactNode
  onClick?: () => void
}

export function FilterChip({ active, variant = 'food', count, children, onClick }: FilterChipProps) {
  const cls = [
    'filter-chip',
    active ? 'active' : '',
    active && variant !== 'food' ? variant : '',
  ].filter(Boolean).join(' ')

  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
      {count !== undefined && <span className="filter-chip-count">{count}</span>}
    </button>
  )
}

interface FilterChipGroupProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const FilterChipGroup = forwardRef<HTMLDivElement, FilterChipGroupProps>(
  function FilterChipGroup({ children, className = '', style }, ref) {
    const innerRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => innerRef.current ?? document.createElement('div'))

    const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false })

    const onMouseDown = useCallback((e: React.MouseEvent) => {
      const el = innerRef.current
      if (!el) return
      dragState.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false }
      el.style.cursor = 'grabbing'
    }, [])

    const onMouseMove = useCallback((e: React.MouseEvent) => {
      if (!dragState.current.isDown) return
      const el = innerRef.current
      if (!el) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      const walk = x - dragState.current.startX
      if (Math.abs(walk) > 3) dragState.current.moved = true
      el.scrollLeft = dragState.current.scrollLeft - walk
    }, [])

    const onMouseUp = useCallback(() => {
      dragState.current.isDown = false
      const el = innerRef.current
      if (el) el.style.cursor = ''
    }, [])

    return (
      <div
        ref={innerRef}
        className={`flex gap-2 overflow-x-auto scrollbar-hide ${className}`}
        style={{ ...style, cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {children}
      </div>
    )
  }
)
