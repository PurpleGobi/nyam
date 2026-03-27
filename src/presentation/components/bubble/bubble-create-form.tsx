'use client'

import { useState } from 'react'
import type { BubbleJoinPolicy, BubbleVisibility } from '@/domain/entities/bubble'
import { JoinPolicySelector } from '@/presentation/components/bubble/join-policy-selector'

interface BubbleCreateFormProps {
  onSubmit: (data: {
    name: string
    description: string
    visibility: BubbleVisibility
    joinPolicy: BubbleJoinPolicy
  }) => void
  isLoading: boolean
}

export function BubbleCreateForm({ onSubmit, isLoading }: BubbleCreateFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<BubbleVisibility>('private')
  const [joinPolicy, setJoinPolicy] = useState<BubbleJoinPolicy>('manual_approve')

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim(), visibility, joinPolicy })
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      {/* 이름 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[var(--text)]">버블 이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="버블 이름을 입력하세요"
          maxLength={30}
          className="rounded-xl px-4 py-3 text-[14px] text-[var(--text)] outline-none"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        />
        <span className="text-right text-[11px] text-[var(--text-hint)]">{name.length}/30</span>
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
          {(['private', 'public'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className="flex-1 rounded-xl py-2.5 text-center text-[13px] font-semibold transition-colors"
              style={{
                backgroundColor: visibility === v ? 'var(--accent-social)' : 'var(--bg-card)',
                color: visibility === v ? '#FFFFFF' : 'var(--text-sub)',
                border: `1px solid ${visibility === v ? 'var(--accent-social)' : 'var(--border)'}`,
              }}
            >
              {v === 'private' ? '비공개' : '공개'}
            </button>
          ))}
        </div>
      </div>

      {/* 가입 정책 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[var(--text)]">가입 정책</label>
        <JoinPolicySelector selected={joinPolicy} onChange={setJoinPolicy} />
      </div>

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
