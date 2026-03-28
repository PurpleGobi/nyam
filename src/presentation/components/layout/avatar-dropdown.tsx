'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings } from 'lucide-react'
import { useDropdown } from '@/presentation/hooks/use-dropdown'

interface AvatarDropdownProps {
  nickname: string
  avatarUrl: string | null
  avatarColor: string | null
}

export function AvatarDropdown({ nickname, avatarUrl, avatarColor }: AvatarDropdownProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const { isOpen, toggle, close } = useDropdown(containerRef)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center justify-center rounded-full"
        style={{
          width: '30px',
          height: '30px',
          backgroundColor: avatarColor ?? 'var(--accent-food)',
          flexShrink: 0,
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>{nickname[0]}</span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 overflow-hidden"
          style={{
            top: 'calc(100% + 6px)',
            minWidth: '120px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            zIndex: 200,
          }}
        >
          <button type="button" onClick={() => { close(); router.push('/profile') }}
            className="flex w-full items-center text-left transition-colors active:bg-[var(--bg-page)]"
            style={{ gap: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
            <User size={16} /> 프로필
          </button>
          <button type="button" onClick={() => { close(); router.push('/settings') }}
            className="flex w-full items-center text-left transition-colors active:bg-[var(--bg-page)]"
            style={{ gap: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
            <Settings size={16} /> 설정
          </button>
        </div>
      )}
    </div>
  )
}
