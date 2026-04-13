'use client'

import { useState, useCallback } from 'react'
import { Plus, X, PenLine, FolderPlus } from 'lucide-react'

type FabVariant = 'default' | 'food' | 'wine' | 'social'

interface FabMenuItem {
  key: string
  icon: React.ReactNode
  label: string
  onClick: () => void
}

interface FabAddProps {
  variant?: FabVariant
  /** Speed Dial 메뉴 아이템들. 미제공 시 단일 버튼으로 동작 */
  menuItems?: FabMenuItem[]
  /** menuItems 미사용 시 단일 클릭 핸들러 */
  onClick?: () => void
  /** 선택 모드: FAB을 커스텀 버튼으로 대체 */
  selectMode?: { label: string; onClick: () => void }
}

const VARIANT_STYLES: Record<FabVariant, { bg: string; color: string }> = {
  default: { bg: 'rgba(248, 246, 243, 0.88)', color: 'var(--text)' },
  food: { bg: 'var(--accent-food)', color: '#FFFFFF' },
  wine: { bg: 'var(--accent-wine)', color: '#FFFFFF' },
  social: { bg: 'var(--accent-social)', color: '#FFFFFF' },
}

export function FabAdd({ variant = 'default', menuItems, onClick, selectMode }: FabAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const v = VARIANT_STYLES[variant]

  const handleToggle = useCallback(() => {
    if (menuItems) {
      setIsOpen((prev) => !prev)
    } else {
      onClick?.()
    }
  }, [menuItems, onClick])

  const handleMenuClick = useCallback((item: FabMenuItem) => {
    setIsOpen(false)
    item.onClick()
  }, [])

  // 선택 모드: FAB을 완전히 대체
  if (selectMode) {
    return (
      <button
        type="button"
        onClick={selectMode.onClick}
        className="fab-add"
        style={{ backgroundColor: v.bg, color: v.color, borderRadius: '28px', width: 'auto', paddingLeft: '20px', paddingRight: '20px', gap: '6px' }}
      >
        <FolderPlus size={18} />
        <span className="text-[14px] font-bold">{selectMode.label}</span>
      </button>
    )
  }

  return (
    <>
      {/* Dim overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[84]"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Speed Dial 메뉴 */}
      {isOpen && menuItems && (
        <div
          className="fixed z-[86] flex flex-col items-end gap-2"
          style={{ bottom: '78px', right: 'max(16px, calc(50% - 960px / 2 + 16px))' }}
        >
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleMenuClick(item)}
              className="flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-transform active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                border: '1px solid var(--border)',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* FAB 버튼 */}
      <button
        type="button"
        onClick={handleToggle}
        className="fab-add"
        style={{
          backgroundColor: isOpen ? 'var(--text)' : v.bg,
          color: isOpen ? 'var(--bg)' : v.color,
          transition: 'background-color 0.2s, color 0.2s, transform 0.15s',
        }}
      >
        {isOpen ? <X size={24} /> : <Plus size={26} />}
      </button>
    </>
  )
}
