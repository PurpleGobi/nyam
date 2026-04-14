'use client'

import { useState } from 'react'
import { Lock, Eye, ShieldCheck, Zap, DoorOpen } from 'lucide-react'
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
  isLoading: boolean
  /** 통합 사진 섹션 (PhotoPicker) */
  photoSlot?: React.ReactNode
  /** 사진첩에 사진이 있는지 여부 — 있으면 첫 번째 사진이 대표 */
  hasPhotos?: boolean
  /** 사진첩 첫 번째 사진 프리뷰 URL */
  firstPhotoPreview?: string | null
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

type CoverMode = 'photo' | 'icon'

export function BubbleCreateForm({ onSubmit, isLoading, photoSlot, hasPhotos, firstPhotoPreview }: BubbleCreateFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [accessMode, setAccessMode] = useState<AccessMode>('manual_approve')
  const [minRecords, setMinRecords] = useState(0)
  const [minLevel, setMinLevel] = useState(0)
  const [maxMembers, setMaxMembers] = useState<number | null>(null)
  const [selectedIcon, setSelectedIcon] = useState('utensils-crossed')
  const [selectedColor, setSelectedColor] = useState('#F97316')
  const [coverMode, setCoverMode] = useState<CoverMode>('photo')
  const [isAutoShare, setIsAutoShare] = useState(false)
  const [shareRule, setShareRule] = useState<BubbleShareRule | null>(null)
  const [visibilityFields, setVisibilityFields] = useState<VisibilityOverride>({ ...ALL_VISIBLE })

  const usePhotoAsCover = coverMode === 'photo' && hasPhotos && firstPhotoPreview

  const allOn = VISIBILITY_FIELD_LABELS.every(f => visibilityFields[f.key])
  const buildPrivacy = (): BubblePrivacySettings => ({
    shareRule,
    visibilityOverride: allOn ? null : visibilityFields,
  })

  const handleSubmit = () => {
    if (!name.trim()) return
    const privacy = buildPrivacy()
    const access = ACCESS_OPTIONS.find(o => o.value === accessMode)
    const vis = access?.visibility ?? 'public'
    const jp = access?.joinPolicy ?? 'manual_approve'
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      visibility: vis,
      joinPolicy: jp,
      // 사진 대표가 있으면 나중에 컨테이너에서 첫 번째 사진 URL로 덮어씀
      icon: selectedIcon,
      iconBgColor: selectedColor,
      minRecords,
      minLevel,
      maxMembers,
      privacy,
    })
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">

      {/* ━━ 대표 이미지 (사진 / 아이콘 탭) ━━ */}
      <div className="flex flex-col gap-2">
        <SectionHeader num={1} label="대표 이미지" />
        {/* 탭 전환 */}
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

        {/* 사진 모드 */}
        {coverMode === 'photo' && photoSlot && (
          <div>
            {photoSlot}
            {hasPhotos && (
              <p className="mt-1 text-[10px]" style={{ color: 'var(--accent-social)' }}>
                첫 번째 사진이 대표 이미지로 사용됩니다 · 드래그로 순서 변경
              </p>
            )}
          </div>
        )}

        {/* 아이콘 모드 */}
        {coverMode === 'icon' && (
          <div className="flex flex-col gap-2">
            {/* 프리뷰 */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                style={{ backgroundColor: selectedColor }}
              >
                <BubbleIcon icon={selectedIcon} size={28} />
              </div>
              <span className="text-[12px]" style={{ color: 'var(--text-hint)' }}>
                아이콘과 색상을 선택하세요
              </span>
            </div>
            {/* 아이콘 그리드 */}
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
            {/* 색상 */}
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}
      </div>

      {/* ━━ 이름 + 설명 ━━ */}
      <div className="flex flex-col gap-1.5">
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

      {/* ━━ 섹션 2: 공개 · 가입 정책 ━━ */}
      <div className="flex flex-col gap-1.5">
        <SectionHeader num={2} label="공개 · 가입 정책" />
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

        {accessMode === 'auto_approve' && (
          <div className="flex gap-2 px-1 pt-1">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-medium text-[var(--text-hint)]">최소 기록</span>
              <input type="number" value={minRecords || ''} onChange={(e) => setMinRecords(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0" min={0} className="nyam-input w-full py-1.5 text-center text-[12px]" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-medium text-[var(--text-hint)]">최소 레벨</span>
              <input type="number" value={minLevel || ''} onChange={(e) => setMinLevel(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0" min={0} className="nyam-input w-full py-1.5 text-center text-[12px]" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-medium text-[var(--text-hint)]">최대 인원</span>
              <input type="number" value={maxMembers ?? ''} onChange={(e) => { const v = parseInt(e.target.value) || 0; setMaxMembers(v === 0 ? null : v) }} placeholder="∞" min={0} className="nyam-input w-full py-1.5 text-center text-[12px]" />
            </div>
          </div>
        )}
      </div>

      {/* ━━ 섹션 3: 목록 공유 방식 ━━ */}
      <div className="flex flex-col gap-1.5">
        <SectionHeader num={3} label="목록 공유 방식" />
        <div
          className="flex flex-col gap-1 rounded-xl p-2.5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {[
            { value: false, label: '수동 추가', desc: '직접 선택한 항목만 버블에 공유' },
            { value: true, label: '자동 공유', desc: '조건에 맞는 기록을 자동으로 공유' },
          ].map(({ value, label, desc }) => {
            const isActive = isAutoShare === value
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setIsAutoShare(value)
                  if (!value) setShareRule(null)
                  else setShareRule({ mode: 'all', rules: [], conjunction: 'and', enabledDomains: { restaurant: true, wine: true } })
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
        {isAutoShare && <ShareRuleEditor value={shareRule} onChange={setShareRule} />}
      </div>

      {/* ━━ 섹션 4: 정보 공개 범위 ━━ */}
      <div className="flex flex-col gap-1.5">
        <SectionHeader num={4} label="정보 공개 범위" />
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
        disabled={!name.trim() || isLoading}
        className="mt-1 rounded-xl py-3 text-center text-[14px] font-bold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
      >
        {isLoading ? '생성 중...' : '버블 만들기'}
      </button>

    </div>
  )
}
