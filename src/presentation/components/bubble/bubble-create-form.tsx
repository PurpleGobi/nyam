'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Lock, Globe, ImagePlus, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import type { BubbleJoinPolicy, BubbleVisibility, VisibilityOverride } from '@/domain/entities/bubble'
import type { PrivacyRecords } from '@/domain/entities/user'
import type { InviteExpiry } from '@/application/hooks/use-bubble-create'
import { JoinPolicySelector } from '@/presentation/components/bubble/join-policy-selector'
import { BubbleIcon, BUBBLE_ICON_MAP, BUBBLE_ICON_CATEGORIES } from '@/presentation/components/bubble/bubble-icon'

export interface BubblePrivacySettings {
  privacyRecords: PrivacyRecords
  visibilityOverride: VisibilityOverride | null
}

interface BubbleCreateFormProps {
  onSubmit: (data: {
    name: string
    description: string
    visibility: BubbleVisibility
    joinPolicy: BubbleJoinPolicy
    icon: string
    iconBgColor: string
    inviteExpiry: InviteExpiry
    minRecords: number
    minLevel: number
    maxMembers: number | null
    privacy: BubblePrivacySettings
  }) => void
  onUploadPhoto: (file: File) => Promise<string>
  isLoading: boolean
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

const COLOR_OPTIONS = [
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
  '#3B82F6', '#06B6D4', '#10B981', '#6B7280',
  '#F59E0B', '#84CC16', '#14B8A6', '#6366F1',
]

const EXPIRY_OPTIONS: { value: InviteExpiry; label: string }[] = [
  { value: '1d', label: '1일' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'unlimited', label: '무제한' },
]

export function BubbleCreateForm({ onSubmit, onUploadPhoto, isLoading }: BubbleCreateFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<BubbleVisibility>('public')
  const [joinPolicy, setJoinPolicy] = useState<BubbleJoinPolicy>('manual_approve')
  const [minRecords, setMinRecords] = useState(0)
  const [minLevel, setMinLevel] = useState(0)
  const [maxMembers, setMaxMembers] = useState<number | null>(null)
  const [selectedIcon, setSelectedIcon] = useState('utensils-crossed')
  const [selectedColor, setSelectedColor] = useState('#F97316')
  const [inviteExpiry, setInviteExpiry] = useState<InviteExpiry>('30d')
  const [showIconPicker, setShowIconPicker] = useState(false)
  // 공개 설정
  const [privacyRecords, setPrivacyRecords] = useState<PrivacyRecords>('shared_only')
  const [infoScope, setInfoScope] = useState<'all' | 'partial'>('all')
  const [visibilityFields, setVisibilityFields] = useState<VisibilityOverride>({ ...ALL_VISIBLE })
  const [showFieldDetail, setShowFieldDetail] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPhoto = photoPreview !== null

  const handlePhotoSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) return

    // 즉시 프리뷰 표시
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)
    setPendingFile(file)
    setUploadError(false)
    setIsUploading(true)

    try {
      const publicUrl = await onUploadPhoto(file)
      setSelectedIcon(publicUrl)
      setPendingFile(null)
    } catch {
      setUploadError(true)
      // 프리뷰는 유지, 아이콘은 프리뷰 URL 사용 (submit 시 재시도)
    } finally {
      setIsUploading(false)
    }
  }

  const retryUpload = async () => {
    if (!pendingFile) return
    setUploadError(false)
    setIsUploading(true)
    try {
      const publicUrl = await onUploadPhoto(pendingFile)
      setSelectedIcon(publicUrl)
      setPendingFile(null)
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

  const buildPrivacy = (): BubblePrivacySettings => ({
    privacyRecords,
    visibilityOverride: infoScope === 'all' ? null : visibilityFields,
  })

  const handleSubmit = async () => {
    if (!name.trim()) return
    const privacy = buildPrivacy()
    // 업로드 실패 상태에서 submit → 재시도
    if (pendingFile) {
      setIsUploading(true)
      try {
        const publicUrl = await onUploadPhoto(pendingFile)
        setSelectedIcon(publicUrl)
        setPendingFile(null)
        setUploadError(false)
        onSubmit({
          name: name.trim(),
          description: description.trim(),
          visibility,
          joinPolicy: visibility === 'private' ? 'invite_only' : joinPolicy,
          icon: publicUrl,
          iconBgColor: '#6B7280',
          inviteExpiry,
          minRecords,
          minLevel,
          maxMembers,
          privacy,
        })
      } catch {
        setUploadError(true)
      } finally {
        setIsUploading(false)
      }
      return
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      visibility,
      joinPolicy: visibility === 'private' ? 'invite_only' : joinPolicy,
      icon: selectedIcon,
      iconBgColor: isPhoto ? '#6B7280' : selectedColor,
      inviteExpiry,
      minRecords,
      minLevel,
      maxMembers,
      privacy,
    })
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      {/* 아이콘 선택 */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setShowIconPicker(!showIconPicker)}
          className="flex items-center justify-center rounded-full overflow-hidden"
          style={{
            width: 64,
            height: 64,
            backgroundColor: isPhoto ? 'transparent' : selectedColor,
          }}
        >
          {isPhoto ? (
            <Image src={photoPreview ?? selectedIcon} alt="icon" width={64} height={64} className="h-full w-full object-cover" />
          ) : (
            <BubbleIcon icon={selectedIcon} size={30} />
          )}
        </button>
        <span className="text-[11px]" style={{ color: uploadError ? '#EF4444' : 'var(--text-hint)' }}>
          {isUploading ? '업로드 중...' : uploadError ? (
            <button type="button" onClick={retryUpload} className="underline">업로드 실패 — 재시도</button>
          ) : '아이콘 변경'}
        </span>
      </div>

      {/* 아이콘 피커 */}
      {showIconPicker && (
        <div className="card rounded-xl p-3">
          {/* 사진 업로드 */}
          <div className="mb-3 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handlePhotoSelect(file)
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold transition-colors"
              style={{
                backgroundColor: isPhoto ? 'var(--accent-social)' : 'var(--bg-elevated)',
                color: isPhoto ? '#FFFFFF' : 'var(--text-sub)',
                border: `1.5px solid ${isPhoto ? 'var(--accent-social)' : 'var(--border)'}`,
              }}
            >
              <ImagePlus size={16} />
              사진으로 설정
            </button>
            {isPhoto && (
              <button
                type="button"
                onClick={clearPhoto}
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1.5px solid var(--border)' }}
              >
                <X size={16} style={{ color: 'var(--text-sub)' }} />
              </button>
            )}
          </div>

          {/* 카테고리별 아이콘 그리드 */}
          {!isPhoto && (
            <div className="flex max-h-[240px] flex-col gap-3 overflow-y-auto">
              {BUBBLE_ICON_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-hint)]">{cat.label}</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {cat.icons.map((iconName) => {
                      const Icon = BUBBLE_ICON_MAP[iconName]
                      if (!Icon) return null
                      const isActive = selectedIcon === iconName
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setSelectedIcon(iconName)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                          style={{
                            backgroundColor: isActive ? 'var(--accent-social-light)' : 'transparent',
                            border: isActive ? '1.5px solid var(--accent-social)' : '1.5px solid transparent',
                          }}
                        >
                          <Icon size={18} style={{ color: isActive ? 'var(--accent-social)' : 'var(--text-sub)' }} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 색상 선택 (사진일 때는 숨김) */}
          {!isPhoto && (
            <div className="mt-3 flex flex-wrap gap-2">
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
          )}
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
          className="nyam-input"
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
          className="nyam-input resize-none"
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

          {/* 자동 승인 시 가입 조건 */}
          {joinPolicy === 'auto_approve' && (
            <div className="mt-1 flex gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] font-medium text-[var(--text-hint)]">최소 기록</span>
                <div className="relative">
                  <input
                    type="number"
                    value={minRecords || ''}
                    onChange={(e) => setMinRecords(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    min={0}
                    className="nyam-input w-full py-2 pr-7 text-center text-[13px]"
                  />
                  {minRecords > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-hint)]">개</span>}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] font-medium text-[var(--text-hint)]">최소 레벨</span>
                <div className="relative">
                  <input
                    type="number"
                    value={minLevel || ''}
                    onChange={(e) => setMinLevel(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    min={0}
                    className="nyam-input w-full py-2 pr-7 text-center text-[13px]"
                  />
                  {minLevel > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-hint)]">Lv</span>}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] font-medium text-[var(--text-hint)]">최대 인원</span>
                <div className="relative">
                  <input
                    type="number"
                    value={maxMembers ?? ''}
                    onChange={(e) => { const v = parseInt(e.target.value) || 0; setMaxMembers(v === 0 ? null : v) }}
                    placeholder="무제한"
                    min={0}
                    className="nyam-input w-full py-2 pr-7 text-center text-[13px]"
                  />
                  {maxMembers && maxMembers > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-hint)]">명</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 내 목록 공개 설정 ── */}
      <div className="flex flex-col gap-3">
        <label className="text-[13px] font-semibold text-[var(--text)]">내 식당·와인 목록 공개</label>
        <p className="text-[11px] text-[var(--text-hint)]" style={{ marginTop: -8 }}>
          동반자, 개인 메모 등 개인정보는 항상 비공개입니다.
        </p>

        {/* 1. 공개목록의 범위 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--text-sub)]">공개 목록의 범위</span>
          <div className="flex gap-2">
            {([
              { value: 'all' as const, label: '모두 공개', icon: Eye, desc: '내 모든 기록이\n버블에 공개' },
              { value: 'shared_only' as const, label: '부분 공개', icon: EyeOff, desc: '공유한 기록만\n버블에 공개' },
            ]).map(({ value, label, icon: VIcon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPrivacyRecords(value)}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-colors"
                style={{
                  backgroundColor: privacyRecords === value ? 'var(--accent-social)' : 'var(--bg-card)',
                  color: privacyRecords === value ? '#FFFFFF' : 'var(--text-sub)',
                  border: `1.5px solid ${privacyRecords === value ? 'var(--accent-social)' : 'var(--border)'}`,
                }}
              >
                <VIcon size={18} />
                <span className="text-[12px] font-semibold">{label}</span>
                <span className="whitespace-pre-line text-center text-[10px] opacity-70">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. 정보공개의 범위 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--text-sub)]">정보 공개의 범위</span>
          <div className="flex gap-2">
            {([
              { value: 'all' as const, label: '모두 공개', desc: '점수·한줄평·사진\n레벨 등 전체 공개' },
              { value: 'partial' as const, label: '부분 공개', desc: '공개할 정보를\n직접 선택' },
            ]).map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setInfoScope(value)
                  if (value === 'all') {
                    setVisibilityFields({ ...ALL_VISIBLE })
                    setShowFieldDetail(false)
                  } else {
                    setVisibilityFields({ ...PARTIAL_DEFAULT })
                    setShowFieldDetail(true)
                  }
                }}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-colors"
                style={{
                  backgroundColor: infoScope === value ? 'var(--accent-social)' : 'var(--bg-card)',
                  color: infoScope === value ? '#FFFFFF' : 'var(--text-sub)',
                  border: `1.5px solid ${infoScope === value ? 'var(--accent-social)' : 'var(--border)'}`,
                }}
              >
                {value === 'all' ? <Eye size={18} /> : <EyeOff size={18} />}
                <span className="text-[12px] font-semibold">{label}</span>
                <span className="whitespace-pre-line text-center text-[10px] opacity-70">{desc}</span>
              </button>
            ))}
          </div>

          {/* 부분 공개 시 필드 토글 */}
          {infoScope === 'partial' && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setShowFieldDetail(!showFieldDetail)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-medium"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                <span>공개 항목 설정 ({VISIBILITY_FIELD_LABELS.filter(f => visibilityFields[f.key]).length}/{VISIBILITY_FIELD_LABELS.length})</span>
                {showFieldDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showFieldDetail && (
                <div className="mt-1.5 flex flex-col gap-0.5 rounded-xl p-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {VISIBILITY_FIELD_LABELS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setVisibilityFields((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                      style={{ backgroundColor: visibilityFields[key] ? 'var(--accent-social-light)' : 'transparent' }}
                    >
                      <span className="text-[13px]" style={{ color: 'var(--text)' }}>{label}</span>
                      <div
                        className="flex h-5 w-9 items-center rounded-full px-0.5 transition-colors"
                        style={{ backgroundColor: visibilityFields[key] ? 'var(--accent-social)' : 'var(--border)' }}
                      >
                        <div
                          className="h-4 w-4 rounded-full bg-white transition-transform"
                          style={{ transform: visibilityFields[key] ? 'translateX(14px)' : 'translateX(0)' }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || isLoading || isUploading}
        className="mt-2 rounded-xl py-3.5 text-center text-[15px] font-bold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
      >
        {isLoading ? '생성 중...' : '버블 만들기'}
      </button>
    </div>
  )
}

