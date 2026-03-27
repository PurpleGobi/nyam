'use client'

import { useState } from 'react'
import { Lock, Globe, Users, Search, BarChart3, AlertTriangle } from 'lucide-react'
import type { Bubble, BubbleVisibility, BubbleJoinPolicy } from '@/domain/entities/bubble'
import { JoinPolicySelector } from '@/presentation/components/bubble/join-policy-selector'
import { BubbleDangerZone } from '@/presentation/components/bubble/bubble-danger-zone'

interface BubbleSettingsProps {
  bubble: Bubble
  onSave: (updates: Partial<Bubble>) => void
  onDelete: () => void
  isLoading: boolean
}

export function BubbleSettings({ bubble, onSave, onDelete, isLoading }: BubbleSettingsProps) {
  const [name, setName] = useState(bubble.name)
  const [description, setDescription] = useState(bubble.description ?? '')
  const [visibility, setVisibility] = useState<BubbleVisibility>(bubble.visibility)
  const [joinPolicy, setJoinPolicy] = useState<BubbleJoinPolicy>(bubble.joinPolicy)
  const [minRecords, setMinRecords] = useState(bubble.minRecords)
  const [minLevel, setMinLevel] = useState(bubble.minLevel)
  const [maxMembers, setMaxMembers] = useState(bubble.maxMembers)
  const [isSearchable, setIsSearchable] = useState(bubble.isSearchable)
  const [allowComments, setAllowComments] = useState(bubble.allowComments)
  const [showDanger, setShowDanger] = useState(false)

  const handleSave = () => {
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      visibility,
      joinPolicy,
      minRecords,
      minLevel,
      maxMembers,
      isSearchable,
      allowComments,
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      {/* 1. 기본 정보 */}
      <Section title="기본 정보" icon={<Globe size={16} style={{ color: 'var(--accent-social)' }} />}>
        <InputField label="이름" value={name} onChange={setName} maxLength={30} />
        <InputField label="설명" value={description} onChange={setDescription} maxLength={100} multiline />
      </Section>

      {/* 2. 가입 조건 */}
      <Section title="가입 조건" icon={<Users size={16} style={{ color: 'var(--accent-social)' }} />}>
        <NumberField label="최소 기록 수" value={minRecords} onChange={setMinRecords} min={0} />
        <NumberField label="최소 레벨" value={minLevel} onChange={setMinLevel} min={0} />
        <NumberField label="최대 멤버 (0=무제한)" value={maxMembers ?? 0} onChange={(v) => setMaxMembers(v === 0 ? null : v)} min={0} />
        <JoinPolicySelector selected={joinPolicy} onChange={setJoinPolicy} />
      </Section>

      {/* 3. 검색 노출 */}
      <Section title="검색" icon={<Search size={16} style={{ color: 'var(--accent-social)' }} />}>
        <ToggleRow label="검색에 노출" value={isSearchable} onChange={setIsSearchable} />
      </Section>

      {/* 4. 공개 설정 */}
      <Section title="공개 설정" icon={<Lock size={16} style={{ color: 'var(--accent-social)' }} />}>
        <div className="flex gap-2">
          {(['private', 'public'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className="flex-1 rounded-xl py-2.5 text-center text-[13px] font-semibold"
              style={{
                backgroundColor: visibility === v ? 'var(--accent-social)' : 'var(--bg)',
                color: visibility === v ? '#FFFFFF' : 'var(--text-sub)',
                border: `1px solid ${visibility === v ? 'var(--accent-social)' : 'var(--border)'}`,
              }}
            >
              {v === 'private' ? '비공개' : '공개'}
            </button>
          ))}
        </div>
      </Section>

      {/* 5. 멤버 & 통계 */}
      <Section title="활동" icon={<BarChart3 size={16} style={{ color: 'var(--accent-social)' }} />}>
        <ToggleRow label="댓글 허용" value={allowComments} onChange={setAllowComments} />
      </Section>

      {/* 저장 */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isLoading || !name.trim()}
        className="rounded-xl py-3.5 text-center text-[15px] font-bold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
      >
        {isLoading ? '저장 중...' : '설정 저장'}
      </button>

      {/* 6. 위험 영역 */}
      <Section title="위험 영역" icon={<AlertTriangle size={16} style={{ color: 'var(--negative)' }} />}>
        <button
          type="button"
          onClick={() => setShowDanger(true)}
          className="w-full rounded-xl py-3 text-center text-[13px] font-semibold"
          style={{ color: 'var(--negative)', border: '1px solid var(--negative)' }}
        >
          버블 삭제
        </button>
      </Section>

      {showDanger && (
        <BubbleDangerZone
          bubbleName={bubble.name}
          onConfirm={onDelete}
          onCancel={() => setShowDanger(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[14px] font-bold text-[var(--text)]">{title}</span>
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, maxLength, multiline }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number; multiline?: boolean }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-[var(--text-sub)]">{label}</span>
      <Tag
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={multiline ? 2 : undefined}
        className="rounded-lg px-3 py-2 text-[13px] text-[var(--text)] outline-none"
        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', resize: 'none' }}
      />
    </div>
  )
}

function NumberField({ label, value, onChange, min }: { label: string; value: number; onChange: (v: number) => void; min: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[var(--text-sub)]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || 0))}
        min={min}
        className="w-20 rounded-lg px-2 py-1.5 text-center text-[13px] text-[var(--text)] outline-none"
        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
      />
    </div>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[var(--text-sub)]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="h-6 w-10 rounded-full transition-colors"
        style={{ backgroundColor: value ? 'var(--accent-social)' : 'var(--border)' }}
      >
        <div
          className="h-5 w-5 rounded-full bg-[var(--bg-elevated)] transition-transform"
          style={{ transform: value ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  )
}
