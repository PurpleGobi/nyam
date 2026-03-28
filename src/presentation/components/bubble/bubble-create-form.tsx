'use client'

import { useState } from 'react'
import { Lock, Globe, UtensilsCrossed, Wine, Coffee, Home, MapPin, Flame, Heart, Star, Users, BookOpen, Music, Camera } from 'lucide-react'
import type { BubbleJoinPolicy, BubbleVisibility } from '@/domain/entities/bubble'
import type { InviteExpiry } from '@/application/hooks/use-bubble-create'
import { JoinPolicySelector } from '@/presentation/components/bubble/join-policy-selector'

interface BubbleCreateFormProps {
  onSubmit: (data: {
    name: string
    description: string
    visibility: BubbleVisibility
    joinPolicy: BubbleJoinPolicy
    icon: string
    iconBgColor: string
    inviteExpiry: InviteExpiry
  }) => void
  isLoading: boolean
}

const ICON_OPTIONS = [
  { name: 'utensils-crossed', Icon: UtensilsCrossed },
  { name: 'wine', Icon: Wine },
  { name: 'coffee', Icon: Coffee },
  { name: 'home', Icon: Home },
  { name: 'map-pin', Icon: MapPin },
  { name: 'flame', Icon: Flame },
  { name: 'heart', Icon: Heart },
  { name: 'star', Icon: Star },
  { name: 'users', Icon: Users },
  { name: 'book-open', Icon: BookOpen },
  { name: 'music', Icon: Music },
  { name: 'camera', Icon: Camera },
]

const COLOR_OPTIONS = [
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
  '#3B82F6', '#06B6D4', '#10B981', '#6B7280',
]

const EXPIRY_OPTIONS: { value: InviteExpiry; label: string }[] = [
  { value: '1d', label: '1일' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'unlimited', label: '무제한' },
]

export function BubbleCreateForm({ onSubmit, isLoading }: BubbleCreateFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<BubbleVisibility>('public')
  const [joinPolicy, setJoinPolicy] = useState<BubbleJoinPolicy>('manual_approve')
  const [selectedIcon, setSelectedIcon] = useState('utensils-crossed')
  const [selectedColor, setSelectedColor] = useState('#F97316')
  const [inviteExpiry, setInviteExpiry] = useState<InviteExpiry>('30d')
  const [showIconPicker, setShowIconPicker] = useState(false)

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      visibility,
      joinPolicy: visibility === 'private' ? 'invite_only' : joinPolicy,
      icon: selectedIcon,
      iconBgColor: selectedColor,
      inviteExpiry,
    })
  }

  const CurrentIcon = ICON_OPTIONS.find((i) => i.name === selectedIcon)?.Icon ?? UtensilsCrossed

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      {/* 아이콘 선택 */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setShowIconPicker(!showIconPicker)}
          className="flex h-[44px] w-[44px] items-center justify-center rounded-full"
          style={{ backgroundColor: selectedColor }}
        >
          <CurrentIcon size={22} color="#FFFFFF" />
        </button>
        <span className="text-[11px] text-[var(--text-hint)]">아이콘 변경</span>
      </div>

      {/* 아이콘 피커 */}
      {showIconPicker && (
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map(({ name: iconName, Icon }) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setSelectedIcon(iconName)}
                className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                style={{
                  backgroundColor: selectedIcon === iconName ? 'var(--accent-social-light)' : 'transparent',
                  border: selectedIcon === iconName ? '1.5px solid var(--accent-social)' : '1.5px solid transparent',
                }}
              >
                <Icon size={20} style={{ color: selectedIcon === iconName ? 'var(--accent-social)' : 'var(--text-sub)' }} />
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className="h-7 w-7 rounded-full transition-transform"
                style={{
                  backgroundColor: color,
                  border: selectedColor === color ? '2px solid var(--text)' : '2px solid transparent',
                  transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 이름 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[var(--text)]">버블 이름 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="버블 이름을 입력하세요"
          maxLength={20}
          className="rounded-xl px-4 py-3 text-[14px] text-[var(--text)] outline-none"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        />
        <span className="text-right text-[11px] text-[var(--text-hint)]">{name.length}/20</span>
      </div>

      {/* 설명 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[var(--text)]">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="버블에 대한 설명을 입력하세요"
          maxLength={100}
          rows={3}
          className="resize-none rounded-xl px-4 py-3 text-[14px] text-[var(--text)] outline-none"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        />
        <span className="text-right text-[11px] text-[var(--text-hint)]">{description.length}/100</span>
      </div>

      {/* 공개 설정 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[var(--text)]">공개 설정</label>
        <div className="flex gap-2">
          {([
            { value: 'private' as const, label: '비공개', icon: Lock, desc: '초대받은\n사람만 접근' },
            { value: 'public' as const, label: '공개', icon: Globe, desc: '누구나 검색\n팔로우 가능' },
          ]).map(({ value, label, icon: VIcon, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-colors"
              style={{
                backgroundColor: visibility === value ? 'var(--accent-social)' : 'var(--bg-card)',
                color: visibility === value ? '#FFFFFF' : 'var(--text-sub)',
                border: `1.5px solid ${visibility === value ? 'var(--accent-social)' : 'var(--border)'}`,
              }}
            >
              <VIcon size={20} />
              <span className="text-[13px] font-semibold">{label}</span>
              <span className="whitespace-pre-line text-center text-[11px] opacity-70">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 초대 링크 만료 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[var(--text)]">초대 링크 만료</label>
        <div className="flex gap-2">
          {EXPIRY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setInviteExpiry(value)}
              className="flex-1 rounded-lg py-2 text-center text-[12px] font-semibold transition-colors"
              style={{
                backgroundColor: inviteExpiry === value ? 'var(--accent-social)' : 'var(--bg-card)',
                color: inviteExpiry === value ? '#FFFFFF' : 'var(--text-sub)',
                border: `1px solid ${inviteExpiry === value ? 'var(--accent-social)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 가입 정책 (공개 시에만 표시) */}
      {visibility === 'public' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-[var(--text)]">가입 정책</label>
          <JoinPolicySelector selected={joinPolicy} onChange={setJoinPolicy} />
        </div>
      )}

      {/* 생성 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || isLoading}
        className="mt-2 rounded-xl py-3.5 text-center text-[15px] font-bold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
      >
        {isLoading ? '생성 중...' : '버블 만들기'}
      </button>
    </div>
  )
}
