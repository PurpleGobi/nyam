'use client'

import { useState } from 'react'
import { Info, ShieldCheck, Eye, Users, BarChart3, AlertTriangle, Share2 } from 'lucide-react'
import type { Bubble, BubbleContentVisibility, BubbleJoinPolicy, BubbleShareRule } from '@/domain/entities/bubble'
import { JoinPolicySelector } from '@/presentation/components/bubble/join-policy-selector'
import { BubbleDangerZone } from '@/presentation/components/bubble/bubble-danger-zone'
import { PendingApprovalList, type PendingMemberInfo } from '@/presentation/components/bubble/pending-approval-list'
import { BubbleStatsCard } from '@/presentation/components/bubble/bubble-stats-card'
import { ShareRuleEditor } from '@/presentation/components/bubble/share-rule-editor'

interface BubbleSettingsProps {
  bubble: Bubble
  onSave: (updates: Partial<Bubble>) => void
  onDelete: () => void
  isLoading: boolean
  // 멤버 관리
  pendingMembers: PendingMemberInfo[]
  onApproveJoin: (userId: string) => void
  onRejectJoin: (userId: string) => void
  onViewAllPending?: () => void
  // 공유 규칙
  shareRule?: BubbleShareRule | null
  onShareRuleChange?: (rule: BubbleShareRule | null) => void
  // 멤버 전용 모드 (owner 설정 섹션 숨김)
  memberOnly?: boolean
  // 통계
  stats: {
    weeklyRecordCount: number
    prevWeeklyRecordCount: number
    weeklyChartData: number[]
  }
}

export function BubbleSettings({
  bubble, onSave, onDelete, isLoading,
  pendingMembers, onApproveJoin, onRejectJoin, onViewAllPending,
  shareRule, onShareRuleChange, memberOnly,
  stats,
}: BubbleSettingsProps) {
  const [name, setName] = useState(bubble.name)
  const [description, setDescription] = useState(bubble.description ?? '')
  const [contentVisibility, setContentVisibility] = useState<BubbleContentVisibility>(bubble.contentVisibility)
  const [joinPolicy, setJoinPolicy] = useState<BubbleJoinPolicy>(bubble.joinPolicy)
  const [minRecords, setMinRecords] = useState(bubble.minRecords)
  const [minLevel, setMinLevel] = useState(bubble.minLevel)
  const [maxMembers, setMaxMembers] = useState(bubble.maxMembers)
  const [isSearchable, setIsSearchable] = useState(bubble.isSearchable)
  const [searchKeywords, setSearchKeywords] = useState<string[]>(bubble.searchKeywords ?? [])
  const [allowComments, setAllowComments] = useState(bubble.allowComments)
  const [allowExternalShare, setAllowExternalShare] = useState(bubble.allowExternalShare)
  const [showDanger, setShowDanger] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')

  const handleSave = () => {
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      contentVisibility,
      joinPolicy,
      minRecords,
      minLevel,
      maxMembers,
      isSearchable,
      searchKeywords: searchKeywords.length > 0 ? searchKeywords : null,
      allowComments,
      allowExternalShare,
    })
  }

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !searchKeywords.includes(kw)) {
      setSearchKeywords([...searchKeywords, kw])
      setKeywordInput('')
    }
  }

  const removeKeyword = (kw: string) => {
    setSearchKeywords(searchKeywords.filter((k) => k !== kw))
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      {!memberOnly && (
      <>
      {/* 1. 기본 정보 */}
      <Section title="기본 정보" icon={<Info size={16} style={{ color: 'var(--accent-social)' }} />}>
        <InputField label="버블 이름" value={name} onChange={setName} maxLength={30} />
        <InputField label="설명" value={description} onChange={setDescription} maxLength={100} multiline />
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[var(--text-sub)]">유형</span>
          <div className="flex gap-2">
            {([
              { value: 'rating_and_comment' as const, label: '양방향' },
              { value: 'rating_only' as const, label: '일방향' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setContentVisibility(value)}
                className="flex-1 rounded-xl py-2.5 text-center text-[13px] font-semibold"
                style={{
                  backgroundColor: contentVisibility === value ? 'var(--accent-social)' : 'var(--bg)',
                  color: contentVisibility === value ? '#FFFFFF' : 'var(--text-sub)',
                  border: `1px solid ${contentVisibility === value ? 'var(--accent-social)' : 'var(--border)'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* 2. 가입 조건 */}
      <Section title="가입 조건" icon={<ShieldCheck size={16} style={{ color: 'var(--accent-social)' }} />}>
        <JoinPolicySelector selected={joinPolicy} onChange={setJoinPolicy} />
        <div className="flex gap-2">
          <CompactNumberField label="최소 기록" value={minRecords} onChange={setMinRecords} min={0} suffix="개" />
          <CompactNumberField label="최소 레벨" value={minLevel} onChange={setMinLevel} min={0} suffix="Lv" />
          <CompactNumberField label="최대 인원" value={maxMembers ?? 0} onChange={(v) => setMaxMembers(v === 0 ? null : v)} min={0} suffix="명" placeholder="무제한" />
        </div>
      </Section>

      {/* 3. 검색 노출 */}
      <Section title="검색 노출" icon={<Eye size={16} style={{ color: 'var(--accent-social)' }} />}>
        <ToggleRow label="탐색에 노출" value={isSearchable} onChange={setIsSearchable} description="다른 사용자가 버블 탐색에서 발견 가능" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[var(--text-sub)]">검색 키워드</span>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              placeholder="키워드 입력"
              maxLength={20}
              className="nyam-input flex-1 text-[13px]"
            />
            <button
              type="button"
              onClick={addKeyword}
              disabled={!keywordInput.trim()}
              className="rounded-lg px-3 py-2 text-[12px] font-semibold transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
            >
              추가
            </button>
          </div>
          {searchKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {searchKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
                  style={{ backgroundColor: 'var(--accent-social-light, rgba(99,102,241,0.1))', color: 'var(--accent-social)' }}
                >
                  {kw}
                  <button type="button" onClick={() => removeKeyword(kw)} className="ml-0.5 text-[10px] opacity-60">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <ToggleRow label="댓글 허용" value={allowComments} onChange={setAllowComments} />
        <ToggleRow label="외부 공유 허용" value={allowExternalShare} onChange={setAllowExternalShare} />
      </Section>
      </>
      )}

      {/* 4. 내 공유 규칙 */}
      {shareRule !== undefined && onShareRuleChange && (
        <Section title="내 공유 규칙" icon={<Share2 size={16} style={{ color: 'var(--accent-social)' }} />}>
          <ShareRuleEditor
            value={shareRule}
            onChange={onShareRuleChange}
            focusType={bubble.focusType}
          />
          <p className="text-[11px] text-[var(--text-hint)]">
            규칙을 변경하면 기존 기록도 자동으로 재평가됩니다.
          </p>
        </Section>
      )}

      {!memberOnly && (
      <>
      {/* 5. 멤버 관리 */}
      <Section title="멤버 관리" icon={<Users size={16} style={{ color: 'var(--accent-social)' }} />}>
        <PendingApprovalList
          members={pendingMembers}
          onApprove={onApproveJoin}
          onReject={onRejectJoin}
          maxPreview={3}
          onViewAll={onViewAllPending}
        />
      </Section>

      {/* 6. 버블 통계 */}
      <Section title="버블 통계" icon={<BarChart3 size={16} style={{ color: 'var(--accent-social)' }} />}>
        <BubbleStatsCard
          recordCount={bubble.recordCount}
          memberCount={bubble.memberCount}
          weeklyRecordCount={stats.weeklyRecordCount}
          prevWeeklyRecordCount={stats.prevWeeklyRecordCount}
          avgSatisfaction={bubble.avgSatisfaction}
          weeklyChartData={stats.weeklyChartData}
        />
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

      {/* 7. 위험 영역 */}
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
      </>
      )}
    </div>
  )
}

/* ── 내부 헬퍼 컴포넌트 ── */

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[14px] font-bold text-[var(--text)]">{title}</span>
      </div>
      <div className="card flex flex-col gap-2.5 rounded-xl p-3">
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
        className="nyam-input text-[13px]"
        style={{ resize: 'none' }}
      />
    </div>
  )
}

function NumberField({ label, value, onChange, min, suffix, prefix }: { label: string; value: number; onChange: (v: number) => void; min: number; suffix?: string; prefix?: boolean }) {
  const display = prefix ? `${suffix}${value}` : `${value}${suffix ?? ''}`
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[var(--text)]">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[13px] text-[var(--text-sub)]">{display}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || 0))}
          min={min}
          className="nyam-input w-16 px-2 py-1.5 text-center text-[13px]"
        />
      </div>
    </div>
  )
}

function CompactNumberField({ label, value, onChange, min, suffix, placeholder }: { label: string; value: number; onChange: (v: number) => void; min: number; suffix?: string; placeholder?: string }) {
  const displayValue = value === 0 && placeholder ? '' : String(value)
  return (
    <div className="flex flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--text-hint)]">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={displayValue}
          onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || 0))}
          placeholder={placeholder ?? '0'}
          min={min}
          className="nyam-input w-full py-2 pr-8 text-center text-[13px]"
        />
        {suffix && (value > 0 || !placeholder) && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-hint)]">{suffix}</span>
        )}
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange, description }: { label: string; value: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[13px] text-[var(--text)]">{label}</span>
        {description && <span className="text-[11px] text-[var(--text-hint)]">{description}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`toggle${value ? ' on' : ''}`}
        style={value ? { background: 'var(--accent-social)' } : undefined}
      />
    </div>
  )
}
