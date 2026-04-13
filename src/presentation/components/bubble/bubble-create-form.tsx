'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Lock, Eye, ShieldCheck, Zap, DoorOpen, ImagePlus, X } from 'lucide-react'
import type { BubbleJoinPolicy, BubbleVisibility, VisibilityOverride, BubbleShareRule } from '@/domain/entities/bubble'
import { BubbleIcon, BUBBLE_ICON_MAP, BUBBLE_ICON_CATEGORIES } from '@/presentation/components/bubble/bubble-icon'
import { ShareRuleEditor } from '@/presentation/components/bubble/share-rule-editor'

export interface BubblePrivacySettings {
  shareRule: BubbleShareRule | null
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

/** 공개+가입 정책 통합 옵션. 하나만 선택하면 visibility+joinPolicy 동시 결정 */
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

const COLOR_OPTIONS = [
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
  '#3B82F6', '#06B6D4', '#10B981', '#6B7280',
  '#F59E0B', '#84CC16', '#14B8A6', '#6366F1',
]

function ToggleSwitch({ on, accent = 'var(--accent-social)' }: { on: boolean; accent?: string }) {
  return (
    <div
      className="flex h-[18px] w-8 shrink-0 items-center rounded-full px-0.5 transition-colors"
      style={{ backgroundColor: on ? accent : 'var(--border)' }}
    >
      <div
        className="h-3.5 w-3.5 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(13px)' : 'translateX(0)' }}
      />
    </div>
  )
}

function SectionHeader({ num, label }: { num: number; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
      >
        {num}
      </span>
      <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{label}</span>
    </div>
  )
}

export function BubbleCreateForm({ onSubmit, onUploadPhoto, isLoading }: BubbleCreateFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [accessMode, setAccessMode] = useState<AccessMode>('manual_approve')
  const [minRecords, setMinRecords] = useState(0)
  const [minLevel, setMinLevel] = useState(0)
  const [maxMembers, setMaxMembers] = useState<number | null>(null)
  const [selectedIcon, setSelectedIcon] = useState('utensils-crossed')
  const [selectedColor, setSelectedColor] = useState('#F97316')
  const [showIconPicker, setShowIconPicker] = useState(false)
  // 공유 규칙 (자동 동기화)
  const [shareRule, setShareRule] = useState<BubbleShareRule | null>({
    mode: 'all', rules: [], conjunction: 'and',
    includeBookmarks: true,
    enabledDomains: { restaurant: true, wine: true },
  })
  // 정보 공개 범위 (디폴트 모두 ON, 원하지 않는 항목만 OFF)
  const [visibilityFields, setVisibilityFields] = useState<VisibilityOverride>({ ...ALL_VISIBLE })
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

  const allOn = VISIBILITY_FIELD_LABELS.every(f => visibilityFields[f.key])
  const buildPrivacy = (): BubblePrivacySettings => ({
    shareRule,
    visibilityOverride: allOn ? null : visibilityFields,
  })

  const handleSubmit = async () => {
    if (!name.trim()) return
    const privacy = buildPrivacy()
    const access = ACCESS_OPTIONS.find(o => o.value === accessMode)
    const vis = access?.visibility ?? 'public'
    const jp = access?.joinPolicy ?? 'manual_approve'
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
          visibility: vis,
          joinPolicy: jp,
          icon: publicUrl,
          iconBgColor: '#6B7280',
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
      visibility: vis,
      joinPolicy: jp,
      icon: selectedIcon,
      iconBgColor: isPhoto ? '#6B7280' : selectedColor,
      minRecords,
      minLevel,
      maxMembers,
      privacy,
    })
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">

      {/* ━━ 아이콘(좌) + 이름/설명(우) 2컬럼 ━━ */}
      <div className="flex gap-3">
        {/* 좌: 아이콘 */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="flex items-center justify-center overflow-hidden rounded-full"
            style={{ width: 72, height: 72, backgroundColor: isPhoto ? 'transparent' : selectedColor }}
          >
            {isPhoto ? (
              <Image src={photoPreview ?? selectedIcon} alt="icon" width={72} height={72} className="h-full w-full object-cover" />
            ) : (
              <BubbleIcon icon={selectedIcon} size={32} />
            )}
          </button>
          <span className="text-[10px]" style={{ color: uploadError ? 'var(--destructive)' : 'var(--text-hint)' }}>
            {isUploading ? '...' : uploadError ? (
              <button type="button" onClick={retryUpload} className="underline">재시도</button>
            ) : '변경'}
          </span>
        </div>

        {/* 우: 이름 + 설명 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="버블 이름 *"
              maxLength={20}
              className="nyam-input w-full text-[14px] font-semibold"
            />
            <span className="block text-right text-[10px] text-[var(--text-hint)]">{name.length}/20</span>
          </div>
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="한줄 설명 (선택)"
              maxLength={100}
              rows={2}
              className="nyam-input w-full resize-none text-[12px]"
            />
            <span className="block text-right text-[10px] text-[var(--text-hint)]">{description.length}/100</span>
          </div>
        </div>
      </div>

      {/* 아이콘 피커 (펼침) */}
      {showIconPicker && (
        <div className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {/* 사진 업로드 */}
          <div className="mb-2 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhotoSelect(file) }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-colors"
              style={{
                backgroundColor: isPhoto ? 'var(--accent-social)' : 'var(--bg-elevated)',
                color: isPhoto ? '#FFFFFF' : 'var(--text-sub)',
                border: `1px solid ${isPhoto ? 'var(--accent-social)' : 'var(--border)'}`,
              }}
            >
              <ImagePlus size={14} />
              사진 업로드
            </button>
            {isPhoto && (
              <button
                type="button"
                onClick={clearPhoto}
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <X size={14} style={{ color: 'var(--text-sub)' }} />
              </button>
            )}
          </div>

          {/* 아이콘 그리드 */}
          {!isPhoto && (
            <div className="flex max-h-[200px] flex-col gap-2 overflow-y-auto">
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
                          onClick={() => setSelectedIcon(iconName)}
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
          )}

          {/* 색상 */}
          {!isPhoto && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="h-6 w-6 rounded-full transition-transform"
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

      {/* ━━ 섹션 1: 공개 · 가입 정책 ━━ */}
      <div className="flex flex-col gap-1.5">
        <SectionHeader num={1} label="공개 · 가입 정책" />
        <div
          className="flex flex-col gap-0.5 rounded-xl p-1.5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
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
          <div className="flex gap-2 px-1 pt-1">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-medium text-[var(--text-hint)]">최소 기록</span>
              <div className="relative">
                <input
                  type="number"
                  value={minRecords || ''}
                  onChange={(e) => setMinRecords(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  min={0}
                  className="nyam-input w-full py-1.5 pr-6 text-center text-[12px]"
                />
                {minRecords > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-hint)]">개</span>}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-medium text-[var(--text-hint)]">최소 레벨</span>
              <div className="relative">
                <input
                  type="number"
                  value={minLevel || ''}
                  onChange={(e) => setMinLevel(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  min={0}
                  className="nyam-input w-full py-1.5 pr-6 text-center text-[12px]"
                />
                {minLevel > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-hint)]">Lv</span>}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-medium text-[var(--text-hint)]">최대 인원</span>
              <div className="relative">
                <input
                  type="number"
                  value={maxMembers ?? ''}
                  onChange={(e) => { const v = parseInt(e.target.value) || 0; setMaxMembers(v === 0 ? null : v) }}
                  placeholder="∞"
                  min={0}
                  className="nyam-input w-full py-1.5 pr-6 text-center text-[12px]"
                />
                {maxMembers && maxMembers > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-hint)]">명</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ━━ 섹션 2: 목록 공개 범위 ━━ */}
      <div className="flex flex-col gap-1.5">
        <SectionHeader num={2} label="목록 공개 범위" />
        <ShareRuleEditor value={shareRule} onChange={setShareRule} />
      </div>

      {/* ━━ 섹션 3: 정보 공개 범위 ━━ */}
      <div className="flex flex-col gap-1.5">
        <SectionHeader num={3} label="정보 공개 범위" />
        <p className="text-[10px] text-[var(--text-hint)]" style={{ marginTop: -4 }}>
          동반자·개인 메모 등 개인정보는 항상 비공개
        </p>
        <div
          className="flex flex-col gap-0.5 rounded-xl p-1.5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {VISIBILITY_FIELD_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setVisibilityFields((prev) => ({ ...prev, [key]: !prev[key] }))}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors"
              style={{ backgroundColor: visibilityFields[key] ? 'var(--accent-social-light)' : 'transparent' }}
            >
              <span className="text-[12px]" style={{ color: 'var(--text)' }}>{label}</span>
              <ToggleSwitch on={visibilityFields[key]} />
            </button>
          ))}
        </div>
      </div>

      {/* ━━ 생성 버튼 ━━ */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || isLoading || isUploading}
        className="mt-1 rounded-xl py-3 text-center text-[14px] font-bold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
      >
        {isLoading ? '생성 중...' : '버블 만들기'}
      </button>

    </div>
  )
}

