'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Pencil, MessageSquare, ImageIcon, Shield, Bell, Trophy, CircleDot, UserPlus,
  Moon, Home, Utensils, MapPin, Wine, LayoutGrid, ArrowUpDown, Camera, Share2,
  Thermometer, Upload, Download, Eraser, ScrollText, Info, LogOut, Trash2,
} from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useSettings } from '@/application/hooks/use-settings'
import { SettingsSection } from '@/presentation/components/settings/settings-section'
import { SettingsCard } from '@/presentation/components/settings/settings-card'
import { SettingsItem } from '@/presentation/components/settings/settings-item'
import { Toggle } from '@/presentation/components/settings/toggle'
import { SegmentControl } from '@/presentation/components/settings/segment-control'
import { PrivacyLayer } from '@/presentation/components/settings/privacy-layer'
import { PrivacySummary } from '@/presentation/components/settings/privacy-summary'
import { PrivacyNote } from '@/presentation/components/settings/privacy-note'
import { BubblePrivacySheet } from '@/presentation/components/settings/bubble-privacy-sheet'
import { DeleteAccountSheet } from '@/presentation/components/settings/delete-account-sheet'
import { EditFieldSheet } from '@/presentation/components/settings/edit-field-sheet'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { useReferrer } from '@/presentation/hooks/use-referrer'
import type { VisibilityConfig, DeleteMode, BubblePrivacyOverride } from '@/domain/entities/settings'

const PRIVACY_PROFILE_OPTIONS = [
  { value: 'public', label: '전체 공개' },
  { value: 'bubble_only', label: '버블만' },
  { value: 'private', label: '비공개' },
]

const PRIVACY_RECORDS_OPTIONS = [
  { value: 'all', label: '모든 기록' },
  { value: 'shared_only', label: '공유한 기록만' },
]

const LANDING_OPTIONS = [
  { value: 'last', label: '마지막 사용' },
  { value: 'home', label: '홈' },
  { value: 'bubbles', label: '버블' },
  { value: 'profile', label: '프로필' },
]

const HOME_TAB_OPTIONS = [
  { value: 'last', label: '마지막 사용' },
  { value: 'restaurant', label: '식당' },
  { value: 'wine', label: '와인' },
]

const RESTAURANT_SUB_OPTIONS = [
  { value: 'last', label: '마지막 사용' },
  { value: 'visited', label: '방문' },
  { value: 'wishlist', label: '찜' },
  { value: 'recommended', label: '추천' },
  { value: 'following', label: '팔로잉' },
]

const WINE_SUB_OPTIONS = [
  { value: 'last', label: '마지막 사용' },
  { value: 'tasted', label: '시음' },
  { value: 'wishlist', label: '찜' },
  { value: 'cellar', label: '셀러' },
]

const BUBBLE_TAB_OPTIONS = [
  { value: 'last', label: '마지막 사용' },
  { value: 'bubble', label: '버블' },
  { value: 'bubbler', label: '버블러' },
]

const VIEW_MODE_OPTIONS = [
  { value: 'last', label: '마지막 사용' },
  { value: 'card', label: '상세' },
  { value: 'list', label: '간단' },
  { value: 'calendar', label: '캘린더' },
]

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'score_high', label: '점수 높은순' },
  { value: 'score_low', label: '점수 낮은순' },
  { value: 'name', label: '이름순' },
  { value: 'visit_count', label: '방문 많은순' },
]

const RECORD_INPUT_OPTIONS = [
  { value: 'camera', label: '카메라 우선' },
  { value: 'search', label: '검색 우선' },
]

const BUBBLE_SHARE_OPTIONS = [
  { value: 'ask', label: '매번 물어보기' },
  { value: 'auto', label: '자동 공유' },
  { value: 'never', label: '공유 안 함' },
]

const TEMP_UNIT_OPTIONS = [
  { value: 'C', label: '\u00B0C' },
  { value: 'F', label: '\u00B0F' },
]

const VISIBILITY_FIELDS: { key: keyof VisibilityConfig; label: string }[] = [
  { key: 'score', label: '점수' },
  { key: 'comment', label: '코멘트' },
  { key: 'photos', label: '사진' },
  { key: 'level', label: '레벨' },
  { key: 'quadrant', label: '사분면' },
  { key: 'bubbles', label: '버블 목록' },
  { key: 'price', label: '가격' },
]

export function SettingsContainer() {
  const router = useRouter()
  const { referrerName, referrerPath } = useReferrer()
  const { signOut } = useAuth()
  const {
    settings, bubbleOverrides, isLoading,
    updatePrivacyProfile, updatePrivacyRecords,
    updateVisibilityPublic, updateVisibilityBubble,
    updateNotify, updatePreference,
    requestDeletion, updateBubbleVisibility,
    updateNickname, updateBio, updateAvatar, updateDndTime,
    exportData, importData, clearCache,
  } = useSettings()

  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false)
  const [activeBubbleSheet, setActiveBubbleSheet] = useState<BubblePrivacyOverride | null>(null)
  const [editField, setEditField] = useState<'nickname' | 'bio' | null>(null)
  const [dndSheetOpen, setDndSheetOpen] = useState(false)
  const [cacheSize, setCacheSize] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const bytes = est.usage ?? 0
        if (bytes < 1024 * 1024) {
          setCacheSize(`${(bytes / 1024).toFixed(1)} KB`)
        } else {
          setCacheSize(`${(bytes / (1024 * 1024)).toFixed(1)} MB`)
        }
      })
    }
  }, [])

  if (isLoading || !settings) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  const handleVisibilityToggle = (layer: 'public' | 'bubble', key: keyof VisibilityConfig) => {
    const config = layer === 'public' ? settings.visibilityPublic : settings.visibilityBubble
    const updated = { ...config, [key]: !config[key] }
    if (layer === 'public') {
      updateVisibilityPublic(updated)
    } else {
      updateVisibilityBubble(updated)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader variant="inner" title={referrerName} backHref={referrerPath ?? '/'} />

      <div className="flex-1 overflow-y-auto pb-20">
        {/* ── 계정 ── */}
        <SettingsSection icon={<Pencil size={16} />} title="계정">
          <SettingsCard>
            <SettingsItem icon={<Pencil size={16} />} label="닉네임" value={settings.nickname} showChevron onPress={() => setEditField('nickname')} />
            <SettingsItem icon={<MessageSquare size={16} />} label="한줄 소개" value={settings.bio ?? '미설정'} showChevron onPress={() => setEditField('bio')} />
            <SettingsItem icon={<ImageIcon size={16} />} label="아바타" showChevron onPress={() => avatarRef.current?.click()} />
          </SettingsCard>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) updateAvatar(file)
              e.target.value = ''
            }}
          />
        </SettingsSection>

        {/* ── 프라이버시 ── */}
        <SettingsSection icon={<Shield size={16} />} title="프라이버시">
          <SettingsCard>
            <div className="px-4 py-3">
              <SegmentControl
                options={PRIVACY_PROFILE_OPTIONS}
                value={settings.privacyProfile}
                onChange={(v) => updatePrivacyProfile(v as 'public' | 'bubble_only' | 'private')}
                variant="privacy"
              />
            </div>

            {settings.privacyProfile !== 'private' && (
              <div className="px-4 pb-3">
                <SegmentControl
                  options={PRIVACY_RECORDS_OPTIONS}
                  value={settings.privacyRecords}
                  onChange={(v) => updatePrivacyRecords(v as 'all' | 'shared_only')}
                />
              </div>
            )}

            <PrivacySummary
              privacyProfile={settings.privacyProfile}
              privacyRecords={settings.privacyRecords}
            />

            {/* 전체에게 보이는 항목 */}
            <PrivacyLayer
              visible={settings.privacyProfile === 'public'}
              dotColor="var(--positive)"
              title="전체에게 보이는 항목"
            >
              {VISIBILITY_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between py-2">
                  <span style={{ fontSize: '13px', color: field.key === 'price' ? 'var(--text-hint)' : 'var(--text)' }}>
                    {field.label}
                  </span>
                  {field.key === 'price' ? (
                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>버블에서만</span>
                  ) : (
                    <Toggle
                      checked={settings.visibilityPublic[field.key]}
                      onChange={() => handleVisibilityToggle('public', field.key)}
                    />
                  )}
                </div>
              ))}
            </PrivacyLayer>

            {/* 버블 멤버 기본 공개 */}
            <PrivacyLayer
              visible={settings.privacyProfile !== 'private'}
              dotColor="var(--accent-social)"
              title="버블 멤버 기본 공개"
            >
              {VISIBILITY_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between py-2">
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>{field.label}</span>
                  <Toggle
                    checked={settings.visibilityBubble[field.key]}
                    onChange={() => handleVisibilityToggle('bubble', field.key)}
                  />
                </div>
              ))}
            </PrivacyLayer>

            {/* 버블별 설정 */}
            <PrivacyLayer
              visible={settings.privacyProfile !== 'private'}
              dotColor="var(--caution)"
              title="버블별 설정"
            >
              {(bubbleOverrides ?? []).map((override) => (
                <div
                  key={override.bubbleId}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-full"
                      style={{ backgroundColor: override.bubbleAvatarColor ?? 'var(--accent-food)' }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>{override.bubbleName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveBubbleSheet(override)}
                    style={{ fontSize: '12px', color: 'var(--accent-social)' }}
                  >
                    {override.useDefault ? '기본값' : '커스텀'}
                  </button>
                </div>
              ))}
              {(!bubbleOverrides || bubbleOverrides.length === 0) && (
                <p style={{ fontSize: '12px', color: 'var(--text-hint)' }}>가입한 버블이 없습니다</p>
              )}
            </PrivacyLayer>

            <PrivacyNote />
          </SettingsCard>
        </SettingsSection>

        {/* ── 알림 ── */}
        <SettingsSection icon={<Bell size={16} />} title="알림">
          <SettingsCard>
            <SettingsItem
              icon={<Bell size={16} />}
              label="푸시 알림"
              rightElement={<Toggle checked={settings.notifyPush} onChange={(v) => updateNotify('notify_push', v)} />}
            />
            <SettingsItem
              icon={<Trophy size={16} />}
              label="레벨업 알림"
              rightElement={<Toggle checked={settings.notifyLevelUp} onChange={(v) => updateNotify('notify_level_up', v)} />}
            />
            <SettingsItem
              icon={<CircleDot size={16} />}
              label="버블 가입"
              rightElement={<Toggle checked={settings.notifyBubbleJoin} onChange={(v) => updateNotify('notify_bubble_join', v)} />}
            />
            <SettingsItem
              icon={<UserPlus size={16} />}
              label="팔로우"
              rightElement={<Toggle checked={settings.notifyFollow} onChange={(v) => updateNotify('notify_follow', v)} />}
            />
            <SettingsItem
              icon={<Moon size={16} />}
              label="방해 금지"
              value={settings.dndStart ? `${settings.dndStart} ~ ${settings.dndEnd}` : '꺼짐'}
              showChevron
              onPress={() => setDndSheetOpen(true)}
            />
          </SettingsCard>
        </SettingsSection>

        {/* ── 화면 디폴트 ── */}
        <SettingsSection icon={<Home size={16} />} title="화면 디폴트">
          <SettingsCard>
            <SettingsItem
              icon={<Home size={16} />}
              label="랜딩 화면"
              rightElement={<NyamSelect options={LANDING_OPTIONS} value={settings.prefLanding} onChange={(v) => updatePreference('pref_landing', v)} />}
            />
            <SettingsItem
              icon={<Utensils size={16} />}
              label="홈 시작 탭"
              rightElement={<NyamSelect options={HOME_TAB_OPTIONS} value={settings.prefHomeTab} onChange={(v) => updatePreference('pref_home_tab', v)} />}
            />
            <SettingsItem
              icon={<MapPin size={16} />}
              label="식당 서브탭"
              rightElement={<NyamSelect options={RESTAURANT_SUB_OPTIONS} value={settings.prefRestaurantSub} onChange={(v) => updatePreference('pref_restaurant_sub', v)} />}
            />
            <SettingsItem
              icon={<Wine size={16} />}
              label="와인 서브탭"
              rightElement={<NyamSelect options={WINE_SUB_OPTIONS} value={settings.prefWineSub} onChange={(v) => updatePreference('pref_wine_sub', v)} />}
            />
            <SettingsItem
              icon={<CircleDot size={16} />}
              label="버블 시작 탭"
              rightElement={<NyamSelect options={BUBBLE_TAB_OPTIONS} value={settings.prefBubbleTab} onChange={(v) => updatePreference('pref_bubble_tab', v)} />}
            />
            <SettingsItem
              icon={<LayoutGrid size={16} />}
              label="홈 보기 모드"
              rightElement={<NyamSelect options={VIEW_MODE_OPTIONS} value={settings.prefViewMode} onChange={(v) => updatePreference('pref_view_mode', v)} />}
            />
          </SettingsCard>
        </SettingsSection>

        {/* ── 기능 디폴트 ── */}
        <SettingsSection icon={<ArrowUpDown size={16} />} title="기능 디폴트">
          <SettingsCard>
            <SettingsItem
              icon={<ArrowUpDown size={16} />}
              label="기본 정렬"
              rightElement={<NyamSelect options={SORT_OPTIONS} value={settings.prefDefaultSort} onChange={(v) => updatePreference('pref_default_sort', v)} />}
            />
            <SettingsItem
              icon={<Camera size={16} />}
              label="기록 시 카메라"
              rightElement={<NyamSelect options={RECORD_INPUT_OPTIONS} value={settings.prefRecordInput} onChange={(v) => updatePreference('pref_record_input', v)} />}
            />
            <SettingsItem
              icon={<Share2 size={16} />}
              label="기록 후 버블 공유"
              rightElement={<NyamSelect options={BUBBLE_SHARE_OPTIONS} value={settings.prefBubbleShare} onChange={(v) => updatePreference('pref_bubble_share', v)} />}
            />
            <SettingsItem
              icon={<Thermometer size={16} />}
              label="와인 온도 단위"
              rightElement={<NyamSelect options={TEMP_UNIT_OPTIONS} value={settings.prefTempUnit} onChange={(v) => updatePreference('pref_temp_unit', v)} />}
            />
          </SettingsCard>
        </SettingsSection>

        {/* ── 데이터 ── */}
        <SettingsSection icon={<Upload size={16} />} title="데이터">
          <SettingsCard>
            <SettingsItem icon={<Upload size={16} />} label="데이터 내보내기" showChevron onPress={() => exportData('json')} />
            <SettingsItem icon={<Download size={16} />} label="데이터 가져오기" showChevron onPress={() => importRef.current?.click()} />
            <SettingsItem icon={<Eraser size={16} />} label="캐시 삭제" value={cacheSize ?? ''} showChevron onPress={async () => { await clearCache(); setCacheSize('0 KB') }} />
          </SettingsCard>
          <input
            ref={importRef}
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importData(file)
              e.target.value = ''
            }}
          />
        </SettingsSection>

        {/* ── 정보 ── */}
        <SettingsSection icon={<Info size={16} />} title="정보">
          <SettingsCard>
            <SettingsItem icon={<ScrollText size={16} />} label="이용약관" showChevron onPress={() => router.push('/terms')} />
            <SettingsItem icon={<Shield size={16} />} label="개인정보처리방침" showChevron onPress={() => router.push('/privacy')} />
            <SettingsItem icon={<Info size={16} />} label="버전" value="1.0.0" />
          </SettingsCard>
        </SettingsSection>

        {/* ── 계정 관리 ── */}
        <SettingsSection icon={<LogOut size={16} />} title="계정 관리">
          <SettingsCard>
            <SettingsItem icon={<LogOut size={16} />} label="로그아웃" onPress={signOut} showChevron />
            <SettingsItem icon={<Trash2 size={16} />} label="계정 삭제" danger onPress={() => setDeleteSheetOpen(true)} showChevron />
          </SettingsCard>
        </SettingsSection>
      </div>

      {/* Bubble Privacy Sheet */}
      <BubblePrivacySheet
        isOpen={activeBubbleSheet !== null}
        onClose={() => setActiveBubbleSheet(null)}
        bubble={activeBubbleSheet ? { id: activeBubbleSheet.bubbleId, name: activeBubbleSheet.bubbleName } : null}
        defaultConfig={settings.visibilityBubble}
        currentOverride={activeBubbleSheet?.visibilityOverride ?? null}
        onSave={(override) => {
          if (!activeBubbleSheet) return
          updateBubbleVisibility(activeBubbleSheet.bubbleId, override)
          setActiveBubbleSheet(null)
        }}
      />

      {/* Delete Account Sheet */}
      <DeleteAccountSheet
        isOpen={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        onConfirm={(mode: DeleteMode) => {
          requestDeletion(mode)
          setDeleteSheetOpen(false)
        }}
      />

      {/* Edit Field Sheet */}
      <EditFieldSheet
        isOpen={editField !== null}
        title={editField === 'nickname' ? '닉네임 변경' : '한줄 소개 변경'}
        initialValue={editField === 'nickname' ? (settings.nickname ?? '') : (settings.bio ?? '')}
        placeholder={editField === 'nickname' ? '닉네임을 입력하세요' : '한줄 소개를 입력하세요'}
        maxLength={editField === 'nickname' ? 20 : 50}
        onSave={(value) => {
          if (editField === 'nickname') updateNickname(value)
          else updateBio(value)
        }}
        onClose={() => setEditField(null)}
      />

      {/* DND Sheet */}
      {dndSheetOpen && (
        <DndSheet
          initialStart={settings.dndStart}
          initialEnd={settings.dndEnd}
          onSave={(start, end) => { updateDndTime(start, end); setDndSheetOpen(false) }}
          onClose={() => setDndSheetOpen(false)}
        />
      )}
    </div>
  )
}

function DndSheet({ initialStart, initialEnd, onSave, onClose }: {
  initialStart: string | null; initialEnd: string | null
  onSave: (start: string | null, end: string | null) => void; onClose: () => void
}) {
  const [start, setStart] = useState(initialStart ?? '23:00')
  const [end, setEnd] = useState(initialEnd ?? '08:00')
  const [enabled, setEnabled] = useState(initialStart !== null)

  return (
    <>
      <div className="fixed inset-0 z-[190]" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="fixed-in-shell fixed bottom-0 left-0 right-0 z-[200] rounded-t-2xl" style={{ backgroundColor: 'var(--bg-card)', padding: '20px 24px 32px' }}>
        <div className="mb-4 flex items-center justify-between">
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>방해 금지 설정</span>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>

        {enabled && (
          <div className="flex items-center gap-3">
            <label className="flex-1">
              <span className="mb-1 block" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>시작</span>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg px-3 py-2" style={{ fontSize: '14px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </label>
            <span style={{ fontSize: '14px', color: 'var(--text-hint)', marginTop: '18px' }}>~</span>
            <label className="flex-1">
              <span className="mb-1 block" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>종료</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg px-3 py-2" style={{ fontSize: '14px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </label>
          </div>
        )}

        <button
          type="button"
          onClick={() => onSave(enabled ? start : null, enabled ? end : null)}
          className="mt-5 w-full rounded-lg py-3"
          style={{ fontSize: '14px', fontWeight: 700, backgroundColor: 'var(--text)', color: '#FFFFFF' }}
        >
          저장
        </button>
      </div>
    </>
  )
}
