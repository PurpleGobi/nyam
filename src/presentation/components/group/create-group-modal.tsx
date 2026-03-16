'use client'

import { useState } from 'react'
import { X, Lock, Globe, Eye, Gem } from 'lucide-react'
import type { GroupType } from '@/domain/entities/group'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; description: string; type: GroupType }) => void
  isLoading: boolean
}

const GROUP_TYPE_OPTIONS: Array<{ value: GroupType; label: string; icon: typeof Lock; description: string }> = [
  { value: 'private', label: '비공개', icon: Lock, description: '초대된 멤버만 참여' },
  { value: 'public', label: '공개', icon: Globe, description: '누구나 참여 가능' },
  { value: 'viewonly', label: '열람 전용', icon: Eye, description: '기록 열람만 가능' },
  { value: 'paid', label: '유료', icon: Gem, description: '구독 후 참여 가능' },
]

export function CreateGroupModal({ isOpen, onClose, onSubmit, isLoading }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<GroupType>('private')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim(), type })
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg animate-slide-up rounded-t-2xl bg-white px-5 pb-8 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-neutral-800)]">
            새 그룹 만들기
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-neutral-500)] transition-colors hover:bg-[var(--color-neutral-100)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-name" className="text-sm font-medium text-[var(--color-neutral-700)]">
              그룹 이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="그룹 이름을 입력하세요"
              className="rounded-lg border border-[var(--color-neutral-200)] px-3 py-2.5 text-sm text-[var(--color-neutral-800)] outline-none placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:ring-1 focus:ring-[#FF6038]"
              required
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-description" className="text-sm font-medium text-[var(--color-neutral-700)]">
              설명
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="그룹에 대한 설명을 입력하세요"
              rows={3}
              className="resize-none rounded-lg border border-[var(--color-neutral-200)] px-3 py-2.5 text-sm text-[var(--color-neutral-800)] outline-none placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:ring-1 focus:ring-[#FF6038]"
              maxLength={200}
            />
          </div>

          {/* Type Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--color-neutral-700)]">
              공개 설정
            </span>
            <div className="grid grid-cols-2 gap-2">
              {GROUP_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = type === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-[#FF6038] bg-[#FFF5F2]'
                        : 'border-[var(--color-neutral-200)] bg-white hover:bg-[var(--color-neutral-50)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-[#FF6038]' : 'text-[var(--color-neutral-400)]'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-[#FF6038]' : 'text-[var(--color-neutral-700)]'}`}>
                        {option.label}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--color-neutral-400)]">
                      {option.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--color-neutral-200)] py-3 text-sm font-medium text-[var(--color-neutral-600)] transition-colors hover:bg-[var(--color-neutral-50)]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 rounded-xl bg-[#FF6038] py-3 text-sm font-medium text-white transition-colors hover:bg-[#e8552f] disabled:opacity-50"
            >
              {isLoading ? '생성 중...' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
