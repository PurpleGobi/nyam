'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings, LogOut } from 'lucide-react'
import { useDropdown } from '@/presentation/hooks/use-dropdown'

interface AvatarDropdownProps {
  nickname: string
  avatarUrl: string | null
  avatarColor: string | null
  onSignOut: () => void
}

export function AvatarDropdown({ nickname, avatarUrl, avatarColor, onSignOut }: AvatarDropdownProps) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { isOpen, toggle, close } = useDropdown(triggerRef)

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: avatarColor ?? 'var(--accent-food)' }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>{nickname[0]}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className="absolute right-0 top-full z-50 mt-2 w-[180px] overflow-hidden rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
          >
            <button type="button" onClick={() => { close(); router.push('/profile') }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--bg)]">
              <User size={16} style={{ color: 'var(--text-sub)' }} /> 프로필
            </button>
            <button type="button" onClick={() => { close(); router.push('/settings') }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--bg)]">
              <Settings size={16} style={{ color: 'var(--text-sub)' }} /> 설정
            </button>
            <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />
            <button type="button" onClick={() => { close(); onSignOut() }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-[var(--negative)] transition-colors hover:bg-[var(--bg)]">
              <LogOut size={16} /> 로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  )
}
