'use client'

import { useState } from 'react'
import { Info, ShieldCheck, Eye, EyeOff, Users, BarChart3, AlertTriangle, Share2 } from 'lucide-react'
import type { Bubble, BubbleContentVisibility, BubbleJoinPolicy, BubbleShareRule, BubbleMemberRole, VisibilityOverride } from '@/domain/entities/bubble'
import { JoinPolicySelector } from '@/presentation/components/bubble/join-policy-selector'
import { BubbleDangerZone } from '@/presentation/components/bubble/bubble-danger-zone'
import { PendingApprovalList, type PendingMemberInfo } from '@/presentation/components/bubble/pending-approval-list'
import { BubbleStatsCard } from '@/presentation/components/bubble/bubble-stats-card'
import { ShareRuleEditor } from '@/presentation/components/bubble/share-rule-editor'

interface BubbleSettingsProps {
  bubble: Bubble
  myRole: BubbleMemberRole | null
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
  // 정보 공개 범위
  visibilityOverride?: VisibilityOverride | null
  onVisibilityChange?: (override: VisibilityOverride | null) => void
  // 통계
  stats: {
    weeklyRecordCount: number
    prevWeeklyRecordCount: number
    weeklyChartData: number[]
  }
}

export function BubbleSettings({
  bubble, myRole, onSave, onDelete, isLoading,
  pendingMembers, onApproveJoin, onRejectJoin, onViewAllPending,
  shareRule, onShareRuleChange,
  visibilityOverride, onVisibilityChange,
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

  // 역할별 표시 범위
  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin'
  const showBubbleSettings = isOwner          // 기본정보, 가입조건, 검색노출
  const showMemberManagement = isOwner || isAdmin  // 멤버 관리
  const showStats = isOwner || isAdmin        // 통계
  const showDangerZone = isOwner              // 삭제

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
      {/* ── Owner 전용: 버블 설정 ── */}
      {showBubbleSettings && (
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

      {/* ── 모든 멤버: 내 공유 규칙 ── */}
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

      {/* ── 모든 멤버: 정보 공개 범위 ── */}
      {visibilityOverride !== undefined && onVisibilityChange && (
        <VisibilitySection
          value={visibilityOverride}
          onChange={onVisibilityChange}
        />
      )}

      {/* ── Owner + Admin: 멤버 관리 ── */}
      {showMemberManagement && (
        <Section title="멤버 관리" icon={<Users size={16} style={{ color: 'var(--accent-social)' }} />}>
          <PendingApprovalList
            members={pendingMembers}
            onApprove={onApproveJoin}
            onReject={onRejectJoin}
            maxPreview={3}
            onViewAll={onViewAllPending}
          />
        </Section>
      )}

      {/* ── Owner + Admin: 통계 ── */}
      {showStats && (
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
      )}

      {/* ── Owner 전용: 저장 버튼 ── */}
      {showBubbleSettings && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || !name.trim()}
          className="rounded-xl py-3.5 text-center text-[15px] font-bold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
        >
          {isLoading ? '저장 중...' : '설정 저장'}
        </button>
      )}

      {/* ── Owner 전용: 위험 영역 ── */}
      {showDangerZone && (
        <>
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

const VISIBILITY_FIELD_LABELS: { key: keyof VisibilityOverride; label: string }[] = [
  { key: 'score', label: '점수 (만족도)' },
  { key: 'comment', label: '한줄평' },
  { key: 'photos', label: '사진' },
  { key: 'level', label: '레벨 뱃지' },
  { key: 'quadrant', label: '맛 사분면' },
  { key: 'bubbles', label: '소속 버블 목록' },
  { key: 'price', label: '가격 정보' },
]

const ALL_VISIBLE: VisibilityOverride = {
  score: true, comment: true, photos: true,
  level: true, quadrant: true, bubbles: true, price: true,
}

const PARTIAL_DEFAULT: VisibilityOverride = {
  score: true, comment: true, photos: true,
  level: true, quadrant: false, bubbles: false, price: false,
}

function VisibilitySection({ value, onChange }: { value: VisibilityOverride | null; onChange: (v: VisibilityOverride | null) => void }) {
  const isAll = value === null
  const fields = value ?? { ...ALL_VISIBLE }

  return (
    <Section title="정보 공개 범위" icon={<Eye size={16} style={{ color: 'var(--accent-social)' }} />}>
      <div className="flex gap-2">
        {([
          { mode: 'all' as const, label: '모두 공개', icon: Eye, desc: '점수·한줄평·사진\n레벨 등 전체 공개' },
          { mode: 'partial' as const, label: '부분 공개', icon: EyeOff, desc: '공개할 정보를\n직접 선택' },
        ]).map(({ mode, label, icon: Icon, desc }) => {
          const active = mode === 'all' ? isAll : !isAll
          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (mode === 'all') onChange(null)
                else onChange({ ...PARTIAL_DEFAULT })
              }}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent-social)' : 'var(--bg)',
                color: active ? '#FFFFFF' : 'var(--text-sub)',
                border: `1.5px solid ${active ? 'var(--accent-social)' : 'var(--border)'}`,
              }}
            >
              <Icon size={18} />
              <span className="text-[12px] font-semibold">{label}</span>
              <span className="whitespace-pre-line text-center text-[10px] opacity-70">{desc}</span>
            </button>
          )
        })}
      </div>

      {!isAll && (
        <div className="mt-1 flex flex-col gap-0.5 rounded-xl p-2" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
          {VISIBILITY_FIELD_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...fields, [key]: !fields[key] })}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
              style={{ backgroundColor: fields[key] ? 'var(--accent-social-light)' : 'transparent' }}
            >
              <span className="text-[13px]" style={{ color: 'var(--text)' }}>{label}</span>
              <div
                className="flex h-5 w-9 items-center rounded-full px-0.5 transition-colors"
                style={{ backgroundColor: fields[key] ? 'var(--accent-social)' : 'var(--border)' }}
              >
                <div
                  className="h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ transform: fields[key] ? 'translateX(14px)' : 'translateX(0)' }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </Section>
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
