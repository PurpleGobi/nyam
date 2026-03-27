'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, User, Bell, Shield, Palette, Trash2 } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useSettings } from '@/application/hooks/use-settings'

export function SettingsContainer() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { settings, isLoading, updateSetting } = useSettings(user?.id ?? null)

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

      <div className="flex flex-col gap-6 px-4 py-4">
        {/* 프로필 */}
        <SettingsSection icon={<User size={18} />} title="프로필">
          <SettingsRow label="닉네임" value={settings.nickname} />
          <SettingsRow label="바이오" value={settings.bio ?? '미설정'} />
        </SettingsSection>

        {/* 프라이버시 */}
        <SettingsSection icon={<Shield size={18} />} title="프라이버시">
          <SettingsRow label="프로필 공개" value={PRIVACY_LABELS[settings.privacyProfile]} />
          <SettingsRow label="기록 공개" value={settings.privacyRecords === 'all' ? '전체' : '공유만'} />
        </SettingsSection>

        {/* 알림 */}
        <SettingsSection icon={<Bell size={18} />} title="알림">
          <ToggleRow label="푸시 알림" checked={settings.notifyPush} onChange={(v) => updateSetting('notify_push', v)} />
          <ToggleRow label="레벨업 알림" checked={settings.notifyLevelUp} onChange={(v) => updateSetting('notify_level_up', v)} />
          <ToggleRow label="버블 가입 알림" checked={settings.notifyBubbleJoin} onChange={(v) => updateSetting('notify_bubble_join', v)} />
          <ToggleRow label="팔로우 알림" checked={settings.notifyFollow} onChange={(v) => updateSetting('notify_follow', v)} />
        </SettingsSection>

        {/* 화면 설정 */}
        <SettingsSection icon={<Palette size={18} />} title="화면 설정">
          <SettingsRow label="기본 입력" value={settings.prefRecordInput === 'camera' ? '카메라' : '검색'} />
          <SettingsRow label="온도 단위" value={settings.prefTempUnit} />
        </SettingsSection>

        {/* 알림 - DND */}
        <SettingsSection icon={<Bell size={18} />} title="방해 금지">
          <SettingsRow label="시작" value={settings.dndStart ?? '23:00'} />
          <SettingsRow label="종료" value={settings.dndEnd ?? '08:00'} />
        </SettingsSection>

        {/* 화면 디폴트 */}
        <SettingsSection icon={<Palette size={18} />} title="화면 디폴트">
          <SettingsRow label="랜딩 화면" value={settings.prefLanding} />
          <SettingsRow label="홈 탭" value={settings.prefHomeTab} />
          <SettingsRow label="정렬" value={settings.prefDefaultSort} />
          <SettingsRow label="뷰 모드" value={settings.prefViewMode} />
        </SettingsSection>

        {/* 기능 디폴트 */}
        <SettingsSection icon={<Palette size={18} />} title="기능 디폴트">
          <SettingsRow label="버블 공유" value={settings.prefBubbleShare === 'ask' ? '매번 묻기' : settings.prefBubbleShare === 'auto' ? '자동' : '안 함'} />
        </SettingsSection>

        {/* 정보 */}
        <SettingsSection icon={<Shield size={18} />} title="정보">
          <SettingsRow label="버전" value="1.0.0" />
          <SettingsRow label="이용약관" value="" />
          <SettingsRow label="개인정보처리방침" value="" />
        </SettingsSection>

        {/* 위험 영역 */}
        <div className="mt-4">
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-xl py-3 text-center text-[14px] font-semibold"
            style={{ border: '1px solid var(--border)', color: 'var(--text-sub)' }}
          >
            로그아웃
          </button>
          <button
            type="button"
            className="mt-3 w-full rounded-xl py-3 text-center text-[14px] font-semibold"
            style={{ color: 'var(--negative)' }}
          >
            <Trash2 size={14} className="mr-1 inline" />
            계정 삭제
          </button>
        </div>
      </div>
    </div>
  )
}

const PRIVACY_LABELS: Record<string, string> = {
  public: '전체 공개',
  bubble_only: '버블 멤버만',
  private: '비공개',
}

function SettingsSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span style={{ color: 'var(--text-sub)' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      </div>
      <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '14px', color: 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{value}</span>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '14px', color: 'var(--text)' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative h-[26px] w-[44px] rounded-full transition-colors"
        style={{ backgroundColor: checked ? 'var(--accent-food)' : 'var(--border-bold)' }}
      >
        <div
          className="absolute top-[2px] h-[22px] w-[22px] rounded-full bg-[var(--bg-elevated)] transition-transform shadow-sm"
          style={{ left: checked ? '20px' : '2px' }}
        />
      </button>
    </div>
  )
}
