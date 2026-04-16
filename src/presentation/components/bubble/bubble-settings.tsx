'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Info, Lock, Eye, ShieldCheck, Zap, DoorOpen, Users, AlertTriangle, Share2, UserPlus, Crown, Shield, UserX, Loader2 } from 'lucide-react'
import type { Bubble, BubbleJoinPolicy, BubbleVisibility, BubbleShareRule, BubbleMemberRole, VisibilityOverride } from '@/domain/entities/bubble'
import type { EnrichedBubbleMember } from '@/application/hooks/use-bubble-members'
import { BubbleIcon, BUBBLE_ICON_MAP, BUBBLE_ICON_CATEGORIES } from '@/presentation/components/bubble/bubble-icon'
import { BubbleDangerZone } from '@/presentation/components/bubble/bubble-danger-zone'
import { PendingApprovalList, type PendingMemberInfo } from '@/presentation/components/bubble/pending-approval-list'
import type { PendingBubbleInvite } from '@/domain/repositories/notification-repository'
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
  { key: 'quadrant', label: '평가 사분면' },
  { key: 'bubbles', label: '소속 버블 목록' },
  { key: 'price', label: '가격 정보' },
]

const ALL_VISIBLE: VisibilityOverride = {
  score: true, comment: true, photos: true,
  level: true, quadrant: true, bubbles: true, price: true,
}

const COLOR_OPTIONS = [
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
  '#3B82F6', '#06B6D4', '#10B981', '#6B7280',
  '#F59E0B', '#84CC16', '#14B8A6', '#6366F1',
]

interface BubbleSettingsProps {
  bubble: Bubble
  myRole: BubbleMemberRole | null
  onAutoSave: (updates: Partial<Bubble>) => void
  onSavePhotos?: () => void
  onDelete: () => void
  isLoading: boolean
  activeMembers?: EnrichedBubbleMember[]
  isMembersLoading?: boolean
  onChangeRole?: (userId: string, newRole: BubbleMemberRole) => void
  onRemoveMember?: (userId: string) => void
  pendingMembers: PendingMemberInfo[]
  pendingInvites?: PendingBubbleInvite[]
  onCancelInvite?: (notificationId: string) => void
  onApproveJoin: (userId: string) => void
  onRejectJoin: (userId: string) => void
  onMemberClick?: (userId: string) => void
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
  onUploadPhoto?: (file: File) => Promise<string>
  /** 통합 사진/아이콘 섹션 */
  photoSlot?: React.ReactNode
  hasPhotos?: boolean
  allowComments?: boolean
  onToggleAllowComments?: () => void
}

export function BubbleSettings({
  bubble, myRole, onAutoSave, onSavePhotos, onDelete, isLoading,
  activeMembers, isMembersLoading, onChangeRole, onRemoveMember,
  pendingMembers, pendingInvites, onCancelInvite, onApproveJoin, onRejectJoin, onMemberClick, onViewAllPending,
  shareRule, onShareRuleChange,
  inviteSearchResults, isInviteSearching, isInviting, invitedIds,
  onInviteSearch, onInviteUser, existingMemberIds,
  visibilityOverride, onVisibilityChange,
  onUploadPhoto,
  photoSlot,
  hasPhotos,
  allowComments,
  onToggleAllowComments,
}: BubbleSettingsProps) {
  const [name, setName] = useState(bubble.name)
  const [description, setDescription] = useState(bubble.description ?? '')

  // 아이콘 상태
  const initIsPhoto = bubble.icon !== null && (bubble.icon.startsWith('http://') || bubble.icon.startsWith('https://'))
  const [selectedIcon, setSelectedIcon] = useState(bubble.icon ?? 'utensils-crossed')
  const [selectedColor, setSelectedColor] = useState(bubble.iconBgColor ?? '#F97316')
  const [coverMode, setCoverMode] = useState<'photo' | 'icon'>(
    bubble.coverPhotoUrl || (bubble.icon && (bubble.icon.startsWith('http://') || bubble.icon.startsWith('https://'))) ? 'photo' : 'icon',
  )
  const [photoPreview, setPhotoPreview] = useState<string | null>(initIsPhoto ? bubble.icon : null)
  const [uploadError, setUploadError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isPhoto = photoPreview !== null
  const [accessMode, setAccessMode] = useState<AccessMode>(
    resolveAccessMode(bubble.visibility, bubble.joinPolicy),
  )
  const [minRecords, setMinRecords] = useState(bubble.minRecords)
  const [minLevel, setMinLevel] = useState(bubble.minLevel)
  const [maxMembers, setMaxMembers] = useState(bubble.maxMembers)
  const [isSearchable, setIsSearchable] = useState(bubble.isSearchable)
  const [searchKeywords, setSearchKeywords] = useState<string[]>(bubble.searchKeywords ?? [])
  const [allowExternalShare, setAllowExternalShare] = useState(bubble.allowExternalShare)
  const [showDanger, setShowDanger] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')

  const handlePhotoSelect = async (file: File) => {
    if (!file.type.startsWith('image/') || !onUploadPhoto) return
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)
    setPendingFile(file)
    setUploadError(false)
    setIsUploading(true)
    try {
      const publicUrl = await onUploadPhoto(file)
      setSelectedIcon(publicUrl)
      setPendingFile(null)
      saveField({ icon: publicUrl, iconBgColor: '#6B7280' })
    } catch {
      setUploadError(true)
    } finally {
      setIsUploading(false)
    }
  }

  const retryUpload = async () => {
    if (!pendingFile || !onUploadPhoto) return
    setUploadError(false)
    setIsUploading(true)
    try {
      const publicUrl = await onUploadPhoto(pendingFile)
      setSelectedIcon(publicUrl)
      setPendingFile(null)
      saveField({ icon: publicUrl, iconBgColor: '#6B7280' })
    } catch {
      setUploadError(true)
    } finally {
      setIsUploading(false)
    }
  }

  const clearPhoto = () => {
    setPhotoPreview(null)
    setPendingFile(null)
    setUploadError(false)
    setSelectedIcon('utensils-crossed')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin'
  const showBubbleSettings = isOwner
  const showMemberManagement = isOwner || isAdmin
  const showDangerZone = isOwner

  // ── 자동 저장 헬퍼 ──
  const saveField = useCallback((updates: Partial<Bubble>) => {
    onAutoSave(updates)
  }, [onAutoSave])

  // 텍스트 필드 debounce (500ms)
  const nameRef = useRef(bubble.name)
  const descRef = useRef(bubble.description ?? '')

  useEffect(() => {
    if (name.trim() === nameRef.current) return
    const timer = setTimeout(() => {
      nameRef.current = name.trim()
      saveField({ name: name.trim() })
    }, 500)
    return () => clearTimeout(timer)
  }, [name, saveField])

  useEffect(() => {
    const trimmed = description.trim() || null
    const prev = descRef.current.trim() || null
    if (trimmed === prev) return
    const timer = setTimeout(() => {
      descRef.current = description
      saveField({ description: trimmed })
    }, 500)
    return () => clearTimeout(timer)
  }, [description, saveField])

  // 아이콘/색상 즉시 저장
  const handleIconChange = (iconName: string) => {
    setSelectedIcon(iconName)
    saveField({ icon: iconName, iconBgColor: selectedColor })
  }

  const handleColorChange = (color: string) => {
    setSelectedColor(color)
    saveField({ icon: selectedIcon, iconBgColor: color })
  }

  // 접근 모드 즉시 저장
  const handleAccessModeChange = (mode: AccessMode) => {
    setAccessMode(mode)
    const access = ACCESS_OPTIONS.find(o => o.value === mode)
    if (access) saveField({ visibility: access.visibility, joinPolicy: access.joinPolicy })
  }

  // 자동 승인 조건 즉시 저장
  const handleMinRecordsChange = (v: number) => { setMinRecords(v); saveField({ minRecords: v }) }
  const handleMinLevelChange = (v: number) => { setMinLevel(v); saveField({ minLevel: v }) }
  const handleMaxMembersChange = (v: number) => { const val = v === 0 ? null : v; setMaxMembers(val); saveField({ maxMembers: val }) }

  // 토글 즉시 저장
  const handleSearchableChange = (v: boolean) => { setIsSearchable(v); saveField({ isSearchable: v }) }
  const handleExternalShareChange = (v: boolean) => { setAllowExternalShare(v); saveField({ allowExternalShare: v }) }

  // 키워드 즉시 저장
  const saveKeywords = (kws: string[]) => saveField({ searchKeywords: kws.length > 0 ? kws : null })

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !searchKeywords.includes(kw)) {
      const next = [...searchKeywords, kw]
      setSearchKeywords(next)
      setKeywordInput('')
      saveKeywords(next)
    }
  }

  const removeKeyword = (kw: string) => {
    const next = searchKeywords.filter((k) => k !== kw)
    setSearchKeywords(next)
    saveKeywords(next)
  }

  // 정보 공개 범위: null=모두 공개, 객체=부분 공개
  const visFields = visibilityOverride ?? { ...ALL_VISIBLE }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">

      {/* ── Owner: 기본 정보 ── */}
      {showBubbleSettings && (
        <Section title="기본 정보" icon={<Info size={16} style={{ color: 'var(--accent-social)' }} />}>
          {/* 이름 + 설명 */}
          <div className="flex flex-col gap-1.5">
            <InputField label="버블 이름" value={name} onChange={setName} maxLength={30} />
            <InputField label="설명" value={description} onChange={setDescription} maxLength={100} multiline />
          </div>

          {/* 대표 이미지: 사진/아이콘 탭 */}
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>대표 이미지</p>
            <div className="flex gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {(['photo', 'icon'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCoverMode(mode)}
                  className="flex-1 rounded-md py-1.5 text-[12px] font-semibold transition-colors"
                  style={{
                    backgroundColor: coverMode === mode ? 'var(--accent-social-light)' : 'transparent',
                    color: coverMode === mode ? 'var(--accent-social)' : 'var(--text-hint)',
                  }}
                >
                  {mode === 'photo' ? '사진' : '아이콘'}
                </button>
              ))}
            </div>

            {coverMode === 'photo' && photoSlot && (
              <div>
                {photoSlot}
                {hasPhotos && (
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--accent-social)' }}>
                    첫 번째 사진이 대표 이미지로 사용됩니다
                  </p>
                )}
              </div>
            )}

            {coverMode === 'icon' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <BubbleIcon icon={selectedIcon} size={24} />
                  </div>
                  <span className="text-[12px]" style={{ color: 'var(--text-hint)' }}>아이콘과 색상을 선택하세요</span>
                </div>
                <div className="flex max-h-[180px] flex-col gap-2 overflow-y-auto rounded-xl p-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {BUBBLE_ICON_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <p className="mb-1 text-[10px] font-semibold text-[var(--text-hint)]">{cat.label}</p>
                      <div className="grid grid-cols-8 gap-1">
                        {cat.icons.map((iconName) => {
                          const Icon = BUBBLE_ICON_MAP[iconName]
                          if (!Icon) return null
                          const isActive = selectedIcon === iconName
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => handleIconChange(iconName)}
                              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                              style={{
                                backgroundColor: isActive ? 'var(--accent-social-light)' : 'transparent',
                                border: isActive ? '1.5px solid var(--accent-social)' : '1.5px solid transparent',
                              }}
                            >
                              <Icon size={16} style={{ color: isActive ? 'var(--accent-social)' : 'var(--text-sub)' }} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className="h-6 w-6 rounded-full transition-transform"
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
          </div>
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
                  onClick={() => handleAccessModeChange(value)}
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
              <CompactNumberField label="최소 기록" value={minRecords} onChange={handleMinRecordsChange} min={0} suffix="개" />
              <CompactNumberField label="최소 레벨" value={minLevel} onChange={handleMinLevelChange} min={0} suffix="Lv" />
              <CompactNumberField label="최대 인원" value={maxMembers ?? 0} onChange={handleMaxMembersChange} min={0} suffix="명" placeholder="무제한" />
            </div>
          )}

          {/* 검색·기타 토글 */}
          <div className="flex flex-col gap-1 border-t pt-1.5" style={{ borderColor: 'var(--border)' }}>
            <ToggleRow label="탐색에 노출" value={isSearchable} onChange={handleSearchableChange} description="다른 사용자가 버블 탐색에서 발견 가능" />
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
                    style={{ backgroundColor: 'var(--accent-social)', color: 'var(--text-inverse)' }}
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
            <ToggleRow label="댓글 허용" value={allowComments ?? true} onChange={() => onToggleAllowComments?.()} description="멤버가 기록에 댓글을 남길 수 있음" />
            <ToggleRow label="외부 공유 허용" value={allowExternalShare} onChange={handleExternalShareChange} />
          </div>
        </Section>
      )}

      {/* ── 모든 멤버: 목록 공유 방식 ── */}
      {shareRule !== undefined && onShareRuleChange && (
        <Section title="목록 공유 방식" icon={<Share2 size={16} style={{ color: 'var(--accent-social)' }} />}>
          <div className="flex flex-col gap-1">
            {[
              { auto: false, label: '수동 추가', desc: '직접 선택한 항목만 버블에 공유' },
              { auto: true, label: '자동 공유', desc: '조건에 맞는 기록을 자동으로 공유' },
            ].map(({ auto, label, desc }) => {
              const isActive = auto ? shareRule !== null : shareRule === null
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (auto) {
                      onShareRuleChange({ mode: 'all', rules: [], conjunction: 'and', enabledDomains: { restaurant: true, wine: true } })
                    } else {
                      onShareRuleChange(null)
                    }
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                  style={{ backgroundColor: isActive ? 'var(--accent-social-light)' : 'transparent' }}
                >
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
          {shareRule !== null && (
            <>
              <ShareRuleEditor
                value={shareRule}
                onChange={onShareRuleChange}
                focusType={bubble.focusType}
              />
              <p className="text-[10px] text-[var(--text-hint)]">
                규칙을 변경하면 기존 기록도 자동으로 재평가됩니다.
              </p>
            </>
          )}
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
                <div
                  key={key}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-[12px]" style={{ color: 'var(--text)' }}>{label}</span>
                  <button type="button" onClick={() => {
                    const next = { ...visFields, [key]: !on }
                    const allOn = VISIBILITY_FIELD_LABELS.every(f => next[f.key])
                    onVisibilityChange(allOn ? null : next)
                  }}>
                    <ToggleSwitchUI on={on} />
                  </button>
                </div>
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
            onMemberClick={onMemberClick}
            maxPreview={3}
            onViewAll={onViewAllPending}
            hideEmptyMessage={pendingInvites != null && pendingInvites.length > 0}
          />

          {/* 초대 수락 대기 */}
          {pendingInvites && pendingInvites.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-[var(--text)]">
                초대 수락 대기 ({pendingInvites.length})
              </p>
              {pendingInvites.map((inv) => (
                <div
                  key={inv.notificationId}
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  {inv.avatarUrl ? (
                    <Image
                      src={inv.avatarUrl}
                      alt={inv.nickname}
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                      style={{ backgroundColor: inv.avatarColor ?? 'var(--accent-social)', color: 'var(--primary-foreground)' }}
                    >
                      {inv.nickname.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                      {inv.nickname}
                    </p>
                    <p className="text-[11px] text-[var(--text-hint)]">
                      {formatRelativeTime(inv.invitedAt)} 초대됨
                    </p>
                  </div>
                  {onCancelInvite ? (
                    <button
                      type="button"
                      onClick={() => onCancelInvite(inv.notificationId)}
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-opacity active:opacity-70"
                      style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                    >
                      취소
                    </button>
                  ) : (
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
                    >
                      대기중
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 활성 멤버 목록 */}
          <ActiveMemberList
            members={activeMembers ?? []}
            isLoading={isMembersLoading ?? false}
            isOwner={isOwner}
            onChangeRole={onChangeRole}
            onRemoveMember={onRemoveMember}
            onMemberClick={onMemberClick}
          />
        </Section>
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
        className="h-3.5 w-3.5 rounded-full bg-elevated transition-transform"
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

const ROLE_LABELS: Record<BubbleMemberRole, string> = {
  owner: '오너',
  admin: '관리자',
  member: '멤버',
  follower: '팔로워',
}

function ActiveMemberList({
  members,
  isLoading,
  isOwner,
  onChangeRole,
  onRemoveMember,
  onMemberClick,
}: {
  members: EnrichedBubbleMember[]
  isLoading: boolean
  isOwner: boolean
  onChangeRole?: (userId: string, newRole: BubbleMemberRole) => void
  onRemoveMember?: (userId: string) => void
  onMemberClick?: (userId: string) => void
}) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-hint)' }} />
      </div>
    )
  }

  if (members.length === 0) return null

  // owner를 먼저, admin, member 순
  const sorted = [...members].sort((a, b) => {
    const order: Record<BubbleMemberRole, number> = { owner: 0, admin: 1, member: 2, follower: 3 }
    return order[a.role] - order[b.role]
  })

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-[var(--text)]">
        멤버 ({members.length})
      </p>
      {sorted.map((m) => {
        const isOwnerMember = m.role === 'owner'
        const isAdminMember = m.role === 'admin'
        const showControls = isOwner && !isOwnerMember
        const isConfirming = confirmRemoveId === m.userId

        return (
          <div
            key={m.userId}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            {/* 아바타 */}
            <button
              type="button"
              onClick={() => onMemberClick?.(m.userId)}
              className="shrink-0"
            >
              {m.avatarUrl ? (
                <Image
                  src={m.avatarUrl}
                  alt={m.nickname}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ backgroundColor: m.avatarColor ?? 'var(--accent-social)', color: 'var(--primary-foreground)' }}
                >
                  {m.nickname.charAt(0)}
                </div>
              )}
            </button>

            {/* 이름 + 역할 뱃지 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onMemberClick?.(m.userId)}
                  className="truncate text-[13px] font-semibold text-[var(--text)]"
                >
                  {m.nickname}
                </button>
                {isOwnerMember && <Crown size={12} style={{ color: 'var(--accent-social)', flexShrink: 0 }} />}
                {isAdminMember && <Shield size={12} style={{ color: 'var(--accent-social)', flexShrink: 0 }} />}
              </div>
              <p className="text-[11px] text-[var(--text-hint)]">
                {ROLE_LABELS[m.role]} · Lv.{m.level}
              </p>
            </div>

            {/* 오너만: 관리자 토글 + 추방 */}
            {showControls && (
              <div className="flex shrink-0 items-center gap-2">
                {/* 관리자 토글 스위치 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-hint)]">관리자</span>
                  <button type="button" onClick={() => onChangeRole?.(m.userId, isAdminMember ? 'member' : 'admin')}>
                    <ToggleSwitchUI on={isAdminMember} />
                  </button>
                </div>

                {/* 추방 */}
                {isConfirming ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveMember?.(m.userId)
                        setConfirmRemoveId(null)
                      }}
                      className="rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{ backgroundColor: 'var(--negative)', color: 'var(--text-inverse)' }}
                    >
                      확인
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      className="rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveId(m.userId)}
                    className="rounded-full p-1.5 transition-opacity active:opacity-70"
                    style={{ color: 'var(--text-hint)' }}
                    title="추방"
                  >
                    <UserX size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* 권한 안내 */}
      {isOwner && (
        <p className="text-[10px] text-[var(--text-hint)]">
          관리자는 멤버 초대가 가능합니다. 추방은 오너만 가능합니다.
        </p>
      )}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function ToggleRow({ label, value, onChange, description }: { label: string; value: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex flex-col">
        <span className="text-[12px] text-[var(--text)]">{label}</span>
        {description && <span className="text-[10px] text-[var(--text-hint)]">{description}</span>}
      </div>
      <button type="button" onClick={() => onChange(!value)}>
        <ToggleSwitchUI on={value} />
      </button>
    </div>
  )
}
