'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Pencil, AtSign, MessageSquare, ImageIcon, Bell, Trophy, CircleDot, UserPlus,
  Moon, Home, Utensils, MapPin, Wine, LayoutGrid, ArrowUpDown, Camera, Share2,
  Thermometer, Upload, Download, Eraser, ScrollText, Shield, Info, LogOut, Trash2,
  Star, MessageCircle, Award, ScatterChart, Wallet, ChevronRight, Globe, Map, FileSpreadsheet, Wand2,
} from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useSettings } from '@/application/hooks/use-settings'
import { useToast } from '@/presentation/components/ui/toast'
import { useNaverImport } from '@/application/hooks/use-naver-import'
import { SettingsSection } from '@/presentation/components/settings/settings-section'
import { SettingsCard } from '@/presentation/components/settings/settings-card'
import { SettingsItem } from '@/presentation/components/settings/settings-item'
import { Toggle } from '@/presentation/components/settings/toggle'
import { PrivacyLayer } from '@/presentation/components/settings/privacy-layer'
import { PrivacySummary } from '@/presentation/components/settings/privacy-summary'
import { PrivacyNote } from '@/presentation/components/settings/privacy-note'
import { BubblePrivacySheet } from '@/presentation/components/settings/bubble-privacy-sheet'
import { DeleteAccountSheet } from '@/presentation/components/settings/delete-account-sheet'
import { EditFieldSheet } from '@/presentation/components/settings/edit-field-sheet'
import { NaverImportSheet } from '@/presentation/components/settings/naver-import-sheet'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import type { VisibilityConfig, DeleteMode, BubblePrivacyOverride } from '@/domain/entities/settings'
import { TIMEZONE_OPTIONS, detectBrowserTimezone } from '@/shared/utils/date-format'

const FOLLOW_POLICY_OPTIONS = [
  { value: 'blocked', label: '차단' },
  { value: 'auto_approve', label: '자동 승인' },
  { value: 'manual_approve', label: '승인제' },
  { value: 'conditional', label: '조건부' },
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
  { value: 'following', label: '팔로잉' },
]

const WINE_SUB_OPTIONS = [
  { value: 'last', label: '마지막 사용' },
  { value: 'tasted', label: '시음' },
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

const VISIBILITY_ICONS: Record<keyof VisibilityConfig, React.ReactNode> = {
  score: <Star size={18} />,
  comment: <MessageCircle size={18} />,
  photos: <ImageIcon size={18} />,
  level: <Award size={18} />,
  quadrant: <ScatterChart size={18} />,
  bubbles: <CircleDot size={18} />,
  price: <Wallet size={18} />,
}

const VISIBILITY_LABELS: Record<keyof VisibilityConfig, string> = {
  score: '점수',
  comment: '한줄평',
  photos: '사진',
  level: '레벨 뱃지',
  quadrant: '사분면',
  bubbles: '소속 버블',
  price: '가격 정보',
}

const VISIBILITY_KEYS: (keyof VisibilityConfig)[] = [
  'score', 'comment', 'photos', 'level', 'quadrant', 'bubbles', 'price',
]

export function SettingsContainer() {
  const router = useRouter()
  const { signOut, user } = useAuth()
  const {
    settings, bubbleOverrides, isLoading,
    updateIsPublic, updateFollowPolicy, updateFollowConditions,
    updateVisibilityPublic, updateVisibilityBubble,
    updateNotify, updatePreference,
    requestDeletion, updateBubbleVisibility,
    updateNickname, updateHandle, updateBio, updateAvatar, updateDndTime,
    exportData, importData, downloadTemplate, autoFillFile, clearCache,
  } = useSettings()

  const { showToast } = useToast()
  const naverImport = useNaverImport(user?.id ?? null)
  const [naverImportSheetOpen, setNaverImportSheetOpen] = useState(false)
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false)
  const [activeBubbleSheet, setActiveBubbleSheet] = useState<BubblePrivacyOverride | null>(null)
  const [editField, setEditField] = useState<'nickname' | 'handle' | 'bio' | null>(null)
  const [dndSheetOpen, setDndSheetOpen] = useState(false)
  const [cacheSize, setCacheSize] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const autoFillRef = useRef<HTMLInputElement>(null)
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

  // 타임존 미설정 시 브라우저 timezone 자동 감지하여 저장
  useEffect(() => {
    if (settings && settings.prefTimezone === null && user?.id) {
      const detected = detectBrowserTimezone()
      updatePreference('pref_timezone', detected)
    }
  }, [settings, user?.id, updatePreference])

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
    <div className="content-detail flex min-h-dvh flex-col" style={{ background: 'var(--bg)' }}>
      <AppHeader />
      <FabBack />

      <div className="flex-1 overflow-y-auto pb-10">
        {/* ── 계정 ── */}
        <SettingsSection title="계정">
          <SettingsCard>
            <SettingsItem icon={<Pencil size={18} />} label="닉네임 변경" value={settings.nickname} showChevron onPress={() => setEditField('nickname')} />
            <SettingsItem icon={<AtSign size={18} />} label="핸들 변경" value={settings.handle ? `@${settings.handle}` : '미설정'} showChevron onPress={() => setEditField('handle')} />
            <SettingsItem icon={<MessageSquare size={18} />} label="한줄 소개 변경" showChevron onPress={() => setEditField('bio')} />
            <SettingsItem icon={<ImageIcon size={18} />} label="아바타 변경" showChevron onPress={() => avatarRef.current?.click()} />
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
        <SettingsSection title="프라이버시">
          <SettingsCard padding>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
              공개 범위
            </div>
            <SettingsItem
              icon={<Globe size={18} />}
              label="전체 공개"
              rightElement={<Toggle checked={settings.isPublic} onChange={(v) => updateIsPublic(v)} />}
            />

            {!settings.isPublic && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '8px' }}>
                  팔로우 허용 정책
                </div>
                <NyamSelect
                  options={FOLLOW_POLICY_OPTIONS}
                  value={settings.followPolicy}
                  onChange={(v) => updateFollowPolicy(v as 'blocked' | 'auto_approve' | 'manual_approve' | 'conditional')}
                />

                {settings.followPolicy === 'conditional' && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                    <label className="flex-1">
                      <span className="mb-1 block" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>최소 기록 수</span>
                      <input
                        type="number"
                        min={0}
                        value={settings.followMinRecords ?? ''}
                        placeholder="제한 없음"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value)
                          updateFollowConditions(val, settings.followMinLevel)
                        }}
                        className="w-full rounded-lg px-3 py-2"
                        style={{ fontSize: '14px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      />
                    </label>
                    <label className="flex-1">
                      <span className="mb-1 block" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>최소 레벨</span>
                      <input
                        type="number"
                        min={0}
                        value={settings.followMinLevel ?? ''}
                        placeholder="제한 없음"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value)
                          updateFollowConditions(settings.followMinRecords, val)
                        }}
                        className="w-full rounded-lg px-3 py-2"
                        style={{ fontSize: '14px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <PrivacySummary
              isPublic={settings.isPublic}
              followPolicy={settings.followPolicy}
            />
          </SettingsCard>
        </SettingsSection>

        {/* 전체에게 보이는 항목 (전체 공개일 때만) */}
        <PrivacyLayer
          visible={settings.isPublic}
          dotColor="var(--positive)"
          title="전체에게 보이는 항목"
          note="프로필 방문자·검색 결과 등에서 모든 사용자에게 보이는 범위"
        >
          {VISIBILITY_KEYS.map((key) => (
            <div key={key} style={key === 'price' ? { opacity: 0.5 } : undefined}>
              <SettingsItem
                icon={VISIBILITY_ICONS[key]}
                label={VISIBILITY_LABELS[key]}
                rightElement={
                  key === 'price' ? (
                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>버블에서만</span>
                  ) : (
                    <Toggle
                      checked={settings.visibilityPublic[key]}
                      onChange={() => handleVisibilityToggle('public', key)}
                    />
                  )
                }
              />
            </div>
          ))}
        </PrivacyLayer>

        {/* 버블 멤버 기본 공개 (항상 표시 -- 비공개여도 버블 공유 허용) */}
        <PrivacyLayer
          visible={true}
          dotColor="var(--accent-social)"
          title="버블 멤버 기본 공개"
          note="모든 버블의 기본값입니다. 아래에서 버블별로 다르게 설정할 수 있습니다."
        >
          {VISIBILITY_KEYS.map((key) => (
            <SettingsItem
              key={key}
              icon={VISIBILITY_ICONS[key]}
              label={VISIBILITY_LABELS[key]}
              rightElement={
                <Toggle
                  checked={settings.visibilityBubble[key]}
                  onChange={() => handleVisibilityToggle('bubble', key)}
                />
              }
            />
          ))}
        </PrivacyLayer>

        {/* 버블별 설정 (항상 표시 -- 비공개여도 버블 공유 허용) */}
        <PrivacyLayer
          visible={true}
          dotColor="var(--caution)"
          title="버블별 설정"
        >
          {(bubbleOverrides ?? []).map((override, idx) => (
            <div
              key={override.bubbleId}
              className="flex cursor-pointer items-center gap-3"
              style={{ padding: '12px 16px', borderBottom: idx < (bubbleOverrides?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}
              onClick={() => setActiveBubbleSheet(override)}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-[10px]"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: override.bubbleAvatarColor ?? 'var(--accent-food-light)',
                  fontSize: '14px',
                }}
              />
              <span className="flex-1" style={{ fontSize: '14px', color: 'var(--text)' }}>
                {override.bubbleName}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 500,
                  background: override.useDefault ? 'var(--bg-page)' : 'var(--accent-food-light)',
                  color: override.useDefault ? 'var(--text-hint)' : 'var(--accent-food)',
                }}
              >
                {override.useDefault ? '기본값' : '커스텀'}
              </span>
              <ChevronRight size={16} style={{ color: 'var(--border-bold)' }} />
            </div>
          ))}
          {(!bubbleOverrides || bubbleOverrides.length === 0) && (
            <p style={{ fontSize: '12px', color: 'var(--text-hint)', padding: '12px 16px' }}>
              가입한 버블이 없습니다
            </p>
          )}
        </PrivacyLayer>

        {/* 프라이버시 안내 (항상 표시) */}
        {(
          <div style={{ padding: '8px 24px 0' }}>
            <PrivacyNote />
          </div>
        )}

        {/* ── 알림 ── */}
        <SettingsSection title="알림">
          <SettingsCard>
            <SettingsItem
              icon={<Bell size={18} />}
              label="푸시 알림"
              rightElement={<Toggle checked={settings.notifyPush} onChange={(v) => updateNotify('notify_push', v)} />}
            />
            <SettingsItem
              icon={<Trophy size={18} />}
              label="레벨업 알림"
              rightElement={<Toggle checked={settings.notifyLevelUp} onChange={(v) => updateNotify('notify_level_up', v)} />}
            />
            <SettingsItem
              icon={<CircleDot size={18} />}
              label="버블 가입 알림"
              rightElement={<Toggle checked={settings.notifyBubbleJoin} onChange={(v) => updateNotify('notify_bubble_join', v)} />}
            />
            <SettingsItem
              icon={<UserPlus size={18} />}
              label="팔로우 알림"
              rightElement={<Toggle checked={settings.notifyFollow} onChange={(v) => updateNotify('notify_follow', v)} />}
            />
            <SettingsItem
              icon={<Moon size={18} />}
              label="방해 금지"
              value={settings.dndStart ? `${settings.dndStart}–${settings.dndEnd}` : '꺼짐'}
              showChevron
              onPress={() => setDndSheetOpen(true)}
            />
          </SettingsCard>
        </SettingsSection>

        {/* ── 화면 디폴트 ── */}
        <SettingsSection title="화면 디폴트">
          <SettingsCard>
            <SettingsItem
              icon={<Home size={18} />}
              label="랜딩 화면"
              hint="앱 실행 시 첫 화면"
              rightElement={<NyamSelect options={LANDING_OPTIONS} value={settings.prefLanding} onChange={(v) => updatePreference('pref_landing', v)} />}
            />
            <SettingsItem
              icon={<Utensils size={18} />}
              label="홈 시작 탭"
              hint="홈 진입 시 식당/와인"
              rightElement={<NyamSelect options={HOME_TAB_OPTIONS} value={settings.prefHomeTab} onChange={(v) => updatePreference('pref_home_tab', v)} />}
            />
            <SettingsItem
              icon={<MapPin size={18} />}
              label="식당 서브탭"
              hint="식당 탭 진입 시 기본 필터"
              rightElement={<NyamSelect options={RESTAURANT_SUB_OPTIONS} value={settings.prefRestaurantSub} onChange={(v) => updatePreference('pref_restaurant_sub', v)} />}
            />
            <SettingsItem
              icon={<Wine size={18} />}
              label="와인 서브탭"
              hint="와인 탭 진입 시 기본 필터"
              rightElement={<NyamSelect options={WINE_SUB_OPTIONS} value={settings.prefWineSub} onChange={(v) => updatePreference('pref_wine_sub', v)} />}
            />
            <SettingsItem
              icon={<CircleDot size={18} />}
              label="버블 시작 탭"
              hint="버블 페이지 진입 시 탭"
              rightElement={<NyamSelect options={BUBBLE_TAB_OPTIONS} value={settings.prefBubbleTab} onChange={(v) => updatePreference('pref_bubble_tab', v)} />}
            />
            <SettingsItem
              icon={<LayoutGrid size={18} />}
              label="홈 보기 모드"
              hint="리스트 간단/상세"
              rightElement={<NyamSelect options={VIEW_MODE_OPTIONS} value={settings.prefViewMode} onChange={(v) => updatePreference('pref_view_mode', v)} />}
            />
          </SettingsCard>
        </SettingsSection>

        {/* ── 기능 디폴트 ── */}
        <SettingsSection title="기능 디폴트">
          <SettingsCard>
            <SettingsItem
              icon={<ArrowUpDown size={18} />}
              label="기본 정렬"
              rightElement={<NyamSelect options={SORT_OPTIONS} value={settings.prefDefaultSort} onChange={(v) => updatePreference('pref_default_sort', v)} />}
            />
            <SettingsItem
              icon={<Camera size={18} />}
              label="기록 시 카메라"
              rightElement={<NyamSelect options={RECORD_INPUT_OPTIONS} value={settings.prefRecordInput} onChange={(v) => updatePreference('pref_record_input', v)} />}
            />
            <SettingsItem
              icon={<Share2 size={18} />}
              label="기록 후 버블 공유"
              rightElement={<NyamSelect options={BUBBLE_SHARE_OPTIONS} value={settings.prefBubbleShare} onChange={(v) => updatePreference('pref_bubble_share', v)} />}
            />
            <SettingsItem
              icon={<Thermometer size={18} />}
              label="와인 온도 단위"
              rightElement={<NyamSelect options={TEMP_UNIT_OPTIONS} value={settings.prefTempUnit} onChange={(v) => updatePreference('pref_temp_unit', v)} />}
            />
            <SettingsItem
              icon={<Globe size={18} />}
              label="타임존"
              hint="날짜·시간 표시 기준"
              rightElement={<NyamSelect options={TIMEZONE_OPTIONS} value={settings.prefTimezone ?? detectBrowserTimezone()} onChange={(v) => updatePreference('pref_timezone', v)} />}
            />
          </SettingsCard>
        </SettingsSection>

        {/* ── 데이터 ── */}
        <SettingsSection title="데이터">
          <SettingsCard>
            <SettingsItem icon={<Map size={18} />} label="네이버 지도 가져오기" value="저장 목록" showChevron onPress={() => setNaverImportSheetOpen(true)} />
            <SettingsItem icon={<FileSpreadsheet size={18} />} label="입력 템플릿 다운로드" value="식당 / 와인 시트 포함" showChevron onPress={downloadTemplate} />
            <SettingsItem icon={<Wand2 size={18} />} label="엑셀 자동 채우기" value="이름만 입력 → 나머지 자동" showChevron onPress={() => autoFillRef.current?.click()} />
            <SettingsItem icon={<Upload size={18} />} label="데이터 내보내기" value="JSON / CSV" showChevron onPress={() => exportData('json')} />
            <SettingsItem icon={<Download size={18} />} label="데이터 가져오기" value="JSON / CSV / Excel" showChevron onPress={() => importRef.current?.click()} />
            <SettingsItem icon={<Eraser size={18} />} label="캐시 삭제" value={cacheSize ?? ''} showChevron onPress={async () => { await clearCache(); setCacheSize('0 KB') }} />
          </SettingsCard>
          <input
            ref={autoFillRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) autoFillFile(file)
              e.target.value = ''
            }}
          />
          <input
            ref={importRef}
            type="file"
            accept=".json,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importData(file)
              e.target.value = ''
            }}
          />
        </SettingsSection>

        {/* ── 정보 ── */}
        <SettingsSection title="정보">
          <SettingsCard>
            <SettingsItem icon={<ScrollText size={18} />} label="이용약관" showChevron onPress={() => router.push('/terms')} />
            <SettingsItem icon={<Shield size={18} />} label="개인정보처리방침" showChevron onPress={() => router.push('/privacy')} />
            <SettingsItem icon={<Info size={18} />} label="버전" value="1.0.0" />
          </SettingsCard>
        </SettingsSection>

        {/* ── 계정 관리 ── */}
        <SettingsSection title="계정 관리">
          <SettingsCard>
            <SettingsItem icon={<LogOut size={18} />} label="로그아웃" onPress={signOut} showChevron />
            <SettingsItem
              icon={<Trash2 size={18} />}
              label="계정 삭제"
              subText="30일 유예 후 영구 삭제"
              danger
              onPress={() => setDeleteSheetOpen(true)}
              showChevron
            />
          </SettingsCard>
        </SettingsSection>
      </div>

      {/* Naver Import Sheet */}
      <NaverImportSheet
        isOpen={naverImportSheetOpen}
        onClose={() => setNaverImportSheetOpen(false)}
        status={naverImport.status}
        folderName={naverImport.folderName}
        places={naverImport.places}
        result={naverImport.result}
        errorMessage={naverImport.errorMessage}
        onFetch={naverImport.fetchPlaces}
        onImport={naverImport.importPlaces}
        onReset={naverImport.reset}
      />

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
        title={editField === 'nickname' ? '닉네임 변경' : editField === 'handle' ? '핸들 변경' : '한줄 소개 변경'}
        initialValue={
          editField === 'nickname' ? (settings.nickname ?? '')
            : editField === 'handle' ? (settings.handle ?? '')
              : (settings.bio ?? '')
        }
        placeholder={
          editField === 'nickname' ? '닉네임을 입력하세요'
            : editField === 'handle' ? 'my_handle'
              : '한줄 소개를 입력하세요'
        }
        maxLength={editField === 'nickname' ? 20 : editField === 'handle' ? 20 : 50}
        prefix={editField === 'handle' ? '@' : undefined}
        description={editField === 'handle' ? '영문 소문자, 숫자, 밑줄(_)만 사용 가능. 2자 이상.' : undefined}
        inputFilter={editField === 'handle' ? (v: string) => v.toLowerCase().replace(/[^a-z0-9_]/g, '') : undefined}
        onSave={async (value) => {
          if (editField === 'nickname') {
            updateNickname(value)
          } else if (editField === 'handle') {
            if (value.length < 2) {
              showToast('핸들은 2자 이상이어야 합니다', 3000)
              return
            }
            const result = await updateHandle(value)
            if (!result.success) {
              showToast(result.error === 'duplicate' ? '이미 사용 중인 핸들입니다' : '핸들 변경에 실패했습니다', 3000)
            }
          } else {
            updateBio(value)
          }
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
      <div className="fixed inset-0 z-[190]" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[200] rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg-elevated)', padding: '20px 20px 40px' }}
      >
        <div
          className="mx-auto mb-4"
          style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-bold)' }}
        />
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
          className="mt-5 w-full rounded-xl py-3.5"
          style={{ fontSize: '15px', fontWeight: 600, backgroundColor: 'var(--text)', color: '#FFFFFF' }}
        >
          저장
        </button>
      </div>
    </>
  )
}
