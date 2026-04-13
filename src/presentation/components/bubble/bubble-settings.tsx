'use client'

import { useState } from 'react'
import { Info, Lock, Eye, ShieldCheck, Zap, DoorOpen, Users, BarChart3, AlertTriangle, Share2, UserPlus } from 'lucide-react'
import type { Bubble, BubbleJoinPolicy, BubbleVisibility, BubbleShareRule, BubbleMemberRole, VisibilityOverride } from '@/domain/entities/bubble'
import { BubbleDangerZone } from '@/presentation/components/bubble/bubble-danger-zone'
import { PendingApprovalList, type PendingMemberInfo } from '@/presentation/components/bubble/pending-approval-list'
import { BubbleStatsCard } from '@/presentation/components/bubble/bubble-stats-card'
import { ShareRuleEditor } from '@/presentation/components/bubble/share-rule-editor'
import { MemberInviteSection } from '@/presentation/components/bubble/member-invite-section'
import type { SearchUserResult } from '@/domain/repositories/bubble-repository'

/* ── 공개·가입 통합 옵션 (create와 동일) ── */
type AccessMode = 'private' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'

const ACCESS_OPTIONS: {
  value: AccessMode
  visibility: BubbleVisibility
  joinPolicy: BubbleJoinPolicy
  label: string
  description: string
  icon: typeof Lock
}[] = [
  { value: 'private', visibility: 'private', joinPolicy: 'invite_only', label: '비공개 (초대만)', description: '초대 링크로만 가입 가능', icon: Lock },
  { value: 'closed', visibility: 'public', joinPolicy: 'closed', label: '공개 · 팔로우만', description: '가입 안 받음. 팔로워는 이름+점수만 열람', icon: Eye },
  { value: 'manual_approve', visibility: 'public', joinPolicy: 'manual_approve', label: '공개 · 승인 가입', description: '가입 신청 → 프로필 보고 승인/거절', icon: ShieldCheck },
  { value: 'auto_approve', visibility: 'public', joinPolicy: 'auto_approve', label: '공개 · 자동 승인', description: '조건 충족 시 자동 가입', icon: Zap },
  { value: 'open', visibility: 'public', joinPolicy: 'open', label: '공개 · 자유 가입', description: '누구나 바로 가입 가능', icon: DoorOpen },
]

function resolveAccessMode(visibility: BubbleVisibility, joinPolicy: BubbleJoinPolicy): AccessMode {
  if (visibility === 'private') return 'private'
  const found = ACCESS_OPTIONS.find(o => o.visibility === visibility && o.joinPolicy === joinPolicy)
  return found?.value ?? 'manual_approve'
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

interface BubbleSettingsProps {
  bubble: Bubble
  myRole: BubbleMemberRole | null
  onSave: (updates: Partial<Bubble>) => void
  onDelete: () => void
  isLoading: boolean
  pendingMembers: PendingMemberInfo[]
  onApproveJoin: (userId: string) => void
  onRejectJoin: (userId: string) => void
  onViewAllPending?: () => void
  shareRule?: BubbleShareRule | null
  onShareRuleChange?: (rule: BubbleShareRule | null) => void
  visibilityOverride?: VisibilityOverride | null
  onVisibilityChange?: (override: VisibilityOverride | null) => void
  inviteSearchResults?: SearchUserResult[]
  isInviteSearching?: boolean
  isInviting?: boolean
  invitedIds?: Set<string>
  onInviteSearch?: (query: string, excludeIds: string[]) => void
  onInviteUser?: (userId: string) => void
  existingMemberIds?: string[]
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
  inviteSearchResults, isInviteSearching, isInviting, invitedIds,
  onInviteSearch, onInviteUser, existingMemberIds,
  visibilityOverride, onVisibilityChange,
  stats,
}: BubbleSettingsProps) {
  const [name, setName] = useState(bubble.name)
  const [description, setDescription] = useState(bubble.description ?? '')
  const [accessMode, setAccessMode] = useState<AccessMode>(
    resolveAccessMode(bubble.visibility, bubble.joinPolicy),
  )
  const [minRecords, setMinRecords] = useState(bubble.minRecords)
  const [minLevel, setMinLevel] = useState(bubble.minLevel)
  const [maxMembers, setMaxMembers] = useState(bubble.maxMembers)
  const [isSearchable, setIsSearchable] = useState(bubble.isSearchable)
  const [searchKeywords, setSearchKeywords] = useState<string[]>(bubble.searchKeywords ?? [])
  const [allowComments, setAllowComments] = useState(bubble.allowComments)
  const [allowExternalShare, setAllowExternalShare] = useState(bubble.allowExternalShare)
  const [showDanger, setShowDanger] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')

  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin'
  const showBubbleSettings = isOwner
  const showMemberManagement = isOwner || isAdmin
  const showStats = isOwner || isAdmin
  const showDangerZone = isOwner

  const handleSave = () => {
    const access = ACCESS_OPTIONS.find(o => o.value === accessMode)
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      visibility: access?.visibility ?? 'public',
      joinPolicy: access?.joinPolicy ?? 'manual_approve',
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

  // 정보 공개 범위: null=모두 공개, 객체=부분 공개
  const visFields = visibilityOverride ?? { ...ALL_VISIBLE }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">

      {/* ── Owner: 기본 정보 ── */}
      {showBubbleSettings && (
        <Section title="기본 정보" icon={<Info size={16} style={{ color: 'var(--accent-social)' }} />}>
          <InputField label="버블 이름" value={name} onChange={setName} maxLength={30} />
          <InputField label="설명" value={description} onChange={setDescription} maxLength={100} multiline />
        </Section>
      )}

      {/* ── Owner: 공개 · 가입 정책 ── */}
      {showBubbleSettings && (
        <Section title="공개 · 가입 정책" icon={<ShieldCheck size={16} style={{ color: 'var(--accent-social)' }} />}>
          <div className="flex flex-col gap-0.5">
            {ACCESS_OPTIONS.map(({ value, label, description: desc, icon: Icon }) => {
              const isActive = accessMode === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAccessMode(value)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                  style={{ backgroundColor: isActive ? 'var(--accent-social-light)' : 'transparent' }}
                >
                  <Icon size={16} style={{ color: isActive ? 'var(--accent-social)' : 'var(--text-hint)', flexShrink: 0 }} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[12px] font-semibold" style={{ color: isActive ? 'var(--accent-social)' : 'var(--text)' }}>
                      {label}
                    </span>
                    <span className="ml-1.5 text-[10px] text-[var(--text-hint)]">{desc}</span>
                  </div>
                  <div
                    className="h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors"
                    style={{
                      borderColor: isActive ? 'var(--accent-social)' : 'var(--border)',
                      backgroundColor: isActive ? 'var(--accent-social)' : 'transparent',
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* 자동 승인 조건 */}
          {accessMode === 'auto_approve' && (
            <div className="flex gap-2 pt-1">
              <CompactNumberField label="최소 기록" value={minRecords} onChange={setMinRecords} min={0} suffix="개" />
              <CompactNumberField label="최소 레벨" value={minLevel} onChange={setMinLevel} min={0} suffix="Lv" />
              <CompactNumberField label="최대 인원" value={maxMembers ?? 0} onChange={(v) => setMaxMembers(v === 0 ? null : v)} min={0} suffix="명" placeholder="무제한" />
            </div>
          )}

          {/* 검색·기타 토글 */}
          <div className="mt-1 flex flex-col gap-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
            <ToggleRow label="탐색에 노출" value={isSearchable} onChange={setIsSearchable} description="다른 사용자가 버블 탐색에서 발견 가능" />
            {isSearchable && (
              <div className="flex flex-col gap-1.5 pl-1">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="검색 키워드"
                    maxLength={20}
                    className="nyam-input flex-1 text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    disabled={!keywordInput.trim()}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
                  >
                    추가
                  </button>
                </div>
                {searchKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {searchKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px]"
                        style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
                      >
                        {kw}
                        <button type="button" onClick={() => removeKeyword(kw)} className="ml-0.5 opacity-60">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <ToggleRow label="댓글 허용" value={allowComments} onChange={setAllowComments} />
            <ToggleRow label="외부 공유 허용" value={allowExternalShare} onChange={setAllowExternalShare} />
          </div>
        </Section>
      )}

      {/* ── 모든 멤버: 목록 공개 범위 ── */}
      {shareRule !== undefined && onShareRuleChange && (
        <Section title="목록 공개 범위" icon={<Share2 size={16} style={{ color: 'var(--accent-social)' }} />}>
          <ShareRuleEditor
            value={shareRule}
            onChange={onShareRuleChange}
            focusType={bubble.focusType}
          />
          <p className="text-[10px] text-[var(--text-hint)]">
            규칙을 변경하면 기존 기록도 자동으로 재평가됩니다.
          </p>
        </Section>
      )}

      {/* ── 모든 멤버: 정보 공개 범위 ── */}
      {visibilityOverride !== undefined && onVisibilityChange && (
        <Section title="정보 공개 범위" icon={<Eye size={16} style={{ color: 'var(--accent-social)' }} />}>
          <p className="text-[10px] text-[var(--text-hint)]" style={{ marginTop: -4 }}>
            동반자·개인 메모 등 개인정보는 항상 비공개
          </p>
          <div className="flex flex-col gap-0.5">
            {VISIBILITY_FIELD_LABELS.map(({ key, label }) => {
              const on = visFields[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const next = { ...visFields, [key]: !on }
                    const allOn = VISIBILITY_FIELD_LABELS.every(f => next[f.key])
                    onVisibilityChange(allOn ? null : next)
                  }}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors"
                  style={{ backgroundColor: on ? 'var(--accent-social-light)' : 'transparent' }}
                >
                  <span className="text-[12px]" style={{ color: 'var(--text)' }}>{label}</span>
                  <ToggleSwitchUI on={on} />
                </button>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Owner + Admin: 멤버 초대 ── */}
      {showMemberManagement && onInviteSearch && onInviteUser && (
        <Section title="멤버 초대" icon={<UserPlus size={16} style={{ color: 'var(--accent-social)' }} />}>
          <MemberInviteSection
            searchResults={inviteSearchResults ?? []}
            isSearching={isInviteSearching ?? false}
            isInviting={isInviting ?? false}
            invitedIds={invitedIds ?? new Set()}
            onSearch={onInviteSearch}
            onInvite={onInviteUser}
            existingMemberIds={existingMemberIds ?? []}
          />
        </Section>
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

      {/* ── Owner: 저장 ── */}
      {showBubbleSettings && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || !name.trim()}
          className="rounded-xl py-3 text-center text-[14px] font-bold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
        >
          {isLoading ? '저장 중...' : '설정 저장'}
        </button>
      )}

      {/* ── Owner: 위험 영역 ── */}
      {showDangerZone && (
        <>
          <Section title="위험 영역" icon={<AlertTriangle size={16} style={{ color: 'var(--negative)' }} />}>
            <button
              type="button"
              onClick={() => setShowDanger(true)}
              className="w-full rounded-xl py-2.5 text-center text-[12px] font-semibold"
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

/* ── 헬퍼 컴포넌트 (모듈 레벨) ── */

function ToggleSwitchUI({ on }: { on: boolean }) {
  return (
    <div
      className="flex h-[18px] w-8 shrink-0 items-center rounded-full px-0.5 transition-colors"
      style={{ backgroundColor: on ? 'var(--accent-social)' : 'var(--border)' }}
    >
      <div
        className="h-3.5 w-3.5 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(13px)' : 'translateX(0)' }}
      />
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[13px] font-bold text-[var(--text)]">{title}</span>
      </div>
      <div className="card flex flex-col gap-2 rounded-xl p-2.5">
        {children}
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, maxLength, multiline }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number; multiline?: boolean }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-[var(--text-sub)]">{label}</span>
      <Tag
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={multiline ? 2 : undefined}
        className="nyam-input text-[12px]"
        style={{ resize: 'none' }}
      />
    </div>
  )
}

function CompactNumberField({ label, value, onChange, min, suffix, placeholder }: { label: string; value: number; onChange: (v: number) => void; min: number; suffix?: string; placeholder?: string }) {
  const displayValue = value === 0 && placeholder ? '' : String(value)
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span className="text-[10px] font-medium text-[var(--text-hint)]">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={displayValue}
          onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || 0))}
          placeholder={placeholder ?? '0'}
          min={min}
          className="nyam-input w-full py-1.5 pr-6 text-center text-[12px]"
        />
        {suffix && (value > 0 || !placeholder) && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-hint)]">{suffix}</span>
        )}
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange, description }: { label: string; value: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-lg px-2.5 py-2"
    >
      <div className="flex flex-col">
        <span className="text-[12px] text-[var(--text)]">{label}</span>
        {description && <span className="text-[10px] text-[var(--text-hint)]">{description}</span>}
      </div>
      <ToggleSwitchUI on={value} />
    </button>
  )
}
