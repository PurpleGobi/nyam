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
        className="header-avatar"
        style={avatarColor ? { backgroundColor: avatarColor } : undefined}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{nickname[0]}</span>
        )}
      </button>

      {isOpen && (
        <div className="avatar-menu">
          <button type="button" onClick={() => { close(); router.push('/profile') }} className="avatar-menu-item">
            <User size={16} /> 프로필
          </button>
          <button type="button" onClick={() => { close(); router.push('/settings') }} className="avatar-menu-item">
            <Settings size={16} /> 설정
          </button>
        </div>
      )}
    </div>
  )
}
