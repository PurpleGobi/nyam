'use client'

import { useState, useRef, useCallback } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import type { AccessLevel } from '@/domain/entities/follow'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface FollowButtonProps {
  accessLevel: AccessLevel
  onToggle: () => void
  isLoading: boolean
}

const CONFIG: Record<AccessLevel, { label: string; icon: typeof UserPlus; variant: 'cta' | 'muted' }> = {
  none: { label: '팔로우', icon: UserPlus, variant: 'cta' },
  following: { label: '팔로잉', icon: UserCheck, variant: 'muted' },
}

const VARIANT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  cta: { bg: 'var(--accent-social)', color: 'var(--text-inverse)', border: 'none' },
  muted: { bg: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' },
}

const LONG_PRESS_DURATION = 500

export function FollowButton({ accessLevel, onToggle, isLoading }: FollowButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const { label, icon: Icon, variant } = CONFIG[accessLevel]
  const style = VARIANT_STYLES[variant]
  const isFollowing = accessLevel === 'following'

  const handlePointerDown = useCallback(() => {
    if (!isFollowing) return
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      setShowConfirm(true)
    }, LONG_PRESS_DURATION)
  }, [isFollowing])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    if (didLongPress.current) {
      didLongPress.current = false
      return
    }
    onToggle()
  }, [onToggle])

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={isLoading}
        className="flex items-center gap-1.5 rounded-[10px] px-4 py-[9px] text-[13px] font-bold transition-opacity active:opacity-75 disabled:opacity-50"
        style={{
          backgroundColor: style.bg,
          color: style.color,
          border: style.border,
        }}
      >
        <Icon size={14} />
        {label}
      </button>

      {/* 언팔 확인 시트 */}
      <BottomSheet isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="팔로우 취소">
        <p className="text-center text-[14px]" style={{ color: 'var(--text-sub)' }}>
          이 사용자의 팔로우를 취소하시겠어요?
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="flex-1 rounded-xl py-3.5 text-[14px] font-semibold"
            style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              setShowConfirm(false)
              onToggle()
            }}
            className="flex-1 rounded-xl py-3.5 text-[14px] font-semibold"
            style={{ backgroundColor: 'var(--negative)', color: 'var(--text-inverse)' }}
          >
            팔로우 취소
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
