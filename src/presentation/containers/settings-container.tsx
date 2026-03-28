'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, User, Bell, Shield, Palette, Trash2, LogOut, Info, ScrollText } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useSettings } from '@/application/hooks/use-settings'
import { DeleteAccountSheet } from '@/presentation/components/settings/delete-account-sheet'
import type { DeleteMode } from '@/domain/entities/settings'

export function SettingsContainer() {
  const router = useRouter()
  const { signOut } = useAuth()
  const {
    settings, isLoading, updateNotify, updatePreference,
    requestDeletion,
  } = useSettings()

  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false)

  if (isLoading || !settings) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* 네비게이션 */}
      <nav className="flex items-center px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span className="flex-1 text-center" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>설정</span>
        <div className="w-11" />
      </nav>

      <div className="flex flex-col gap-6 px-4 py-4 pb-20">
        {/* 계정 */}
        <SettingsSection icon={<User size={18} />} title="계정">
          <SettingsRow label="닉네임" value={settings.nickname} />
          <SettingsRow label="한줄 소개" value={settings.bio ?? '미설정'} />
        </SettingsSection>

        {/* 프라이버시 */}
        <SettingsSection icon={<Shield size={18} />} title="프라이버시">
          <SettingsRow label="프로필 공개" value={PRIVACY_LABELS[settings.privacyProfile]} />
          <SettingsRow label="기록 공개" value={settings.privacyRecords === 'all' ? '전체' : '공유만'} />
        </SettingsSection>

        {/* 알림 */}
        <SettingsSection icon={<Bell size={18} />} title="알림">
          <ToggleRow label="푸시 알림" checked={settings.notifyPush} onChange={(v) => updateNotify('notify_push', v)} />
          <ToggleRow label="레벨업 알림" checked={settings.notifyLevelUp} onChange={(v) => updateNotify('notify_level_up', v)} />
          <ToggleRow label="버블 가입" checked={settings.notifyBubbleJoin} onChange={(v) => updateNotify('notify_bubble_join', v)} />
          <ToggleRow label="팔로우" checked={settings.notifyFollow} onChange={(v) => updateNotify('notify_follow', v)} />
          <SettingsRow label="방해 금지" value={settings.dndStart ? `${settings.dndStart} ~ ${settings.dndEnd}` : '꺼짐'} />
        </SettingsSection>

        {/* 화면 디폴트 */}
        <SettingsSection icon={<Palette size={18} />} title="화면 디폴트">
          <SettingsRow label="랜딩 화면" value={settings.prefLanding} />
          <SettingsRow label="홈 시작 탭" value={settings.prefHomeTab} />
          <SettingsRow label="식당 서브탭" value={settings.prefRestaurantSub} />
          <SettingsRow label="와인 서브탭" value={settings.prefWineSub} />
          <SettingsRow label="버블 시작 탭" value={settings.prefBubbleTab} />
          <SettingsRow label="홈 보기 모드" value={settings.prefViewMode} />
        </SettingsSection>

        {/* 기능 디폴트 */}
        <SettingsSection icon={<Palette size={18} />} title="기능 디폴트">
          <SettingsRow label="기본 정렬" value={settings.prefDefaultSort} />
          <SettingsRow label="기록 시작" value={settings.prefRecordInput === 'camera' ? '카메라' : '검색'} />
          <SettingsRow label="버블 공유" value={SHARE_LABELS[settings.prefBubbleShare] ?? settings.prefBubbleShare} />
          <SettingsRow label="온도 단위" value={settings.prefTempUnit} />
        </SettingsSection>

        {/* 정보 */}
        <SettingsSection icon={<Info size={18} />} title="정보">
          <SettingsRow label="이용약관" value="" />
          <SettingsRow label="개인정보처리방침" value="" />
          <SettingsRow label="버전" value="1.0.0" />
        </SettingsSection>

        {/* 계정 관리 */}
        <div className="flex flex-col gap-3 mt-4">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3"
            style={{ border: '1px solid var(--border)', color: 'var(--text-sub)', fontSize: '14px', fontWeight: 600 }}
          >
            <LogOut size={16} />
            로그아웃
          </button>
          <button
            type="button"
            onClick={() => setDeleteSheetOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3"
            style={{ color: 'var(--negative)', fontSize: '14px', fontWeight: 600 }}
          >
            <Trash2 size={16} />
            계정 삭제
          </button>
        </div>
      </div>

      {/* Delete Account Sheet */}
      <DeleteAccountSheet
        isOpen={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        onConfirm={(mode: DeleteMode) => {
          requestDeletion(mode)
          setDeleteSheetOpen(false)
        }}
      />
    </div>
  )
}

const PRIVACY_LABELS: Record<string, string> = {
  public: '전체 공개',
  bubble_only: '버블 멤버만',
  private: '비공개',
}

const SHARE_LABELS: Record<string, string> = {
  ask: '매번 묻기',
  auto: '자동 공유',
  never: '안 함',
}

function SettingsSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span style={{ color: 'var(--text-sub)' }}>{icon}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '14px', color: 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-hint)' }}>{value || ''}</span>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '14px', color: 'var(--text)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-[26px] w-[44px] rounded-full transition-colors"
        style={{ backgroundColor: checked ? 'var(--accent-food)' : 'var(--border-bold)' }}
      >
        <div
          className="absolute top-[2px] h-[22px] w-[22px] rounded-full shadow-sm transition-transform"
          style={{ left: checked ? '20px' : '2px', backgroundColor: 'var(--bg-elevated)' }}
        />
      </button>
    </div>
  )
}
