"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  Bell,
  BellOff,
  Lock,
  Eye,
  EyeOff,
  Palette,
  Globe,
  Shield,
  FileText,
  HelpCircle,
  MessageSquare,
  LogOut,
  Trash2,
  Download,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useProfile } from "@/application/hooks/use-profile"
import { SettingsSection } from "@/presentation/components/settings/settings-section"
import { SettingsRow } from "@/presentation/components/settings/settings-row"
import { ThemeSelector } from "@/presentation/components/settings/theme-selector"
import { ToggleSwitch } from "@/presentation/components/settings/toggle-switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/presentation/components/ui/dialog"
import { ROUTES } from "@/shared/constants/routes"

const DELETION_REASONS = [
  "더 이상 사용하지 않아요",
  "다른 서비스를 이용해요",
  "원하는 기능이 없어요",
  "개인정보가 걱정돼요",
  "기타",
] as const

export function SettingsContainer() {
  const router = useRouter()
  const { user: authUser, signOut } = useAuthContext()
  const { user } = useProfile(authUser?.id)

  // Local toggle states (persisted in localStorage)
  const [pushEnabled, setPushEnabled] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("nyam-push") !== "false"
  })
  const [weeklyReport, setWeeklyReport] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("nyam-weekly-report") !== "false"
  })
  const [defaultVisibility, setDefaultVisibility] = useState<"private" | "group">(() => {
    if (typeof window === "undefined") return "private"
    return (localStorage.getItem("nyam-default-visibility") as "private" | "group") ?? "private"
  })

  // Deletion dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Logout dialog
  const [logoutOpen, setLogoutOpen] = useState(false)

  const handleTogglePush = useCallback((v: boolean) => {
    setPushEnabled(v)
    localStorage.setItem("nyam-push", String(v))
    toast.success(v ? "알림이 켜졌어요" : "알림이 꺼졌어요")
  }, [])

  const handleToggleWeeklyReport = useCallback((v: boolean) => {
    setWeeklyReport(v)
    localStorage.setItem("nyam-weekly-report", String(v))
  }, [])

  const handleToggleVisibility = useCallback(() => {
    const next = defaultVisibility === "private" ? "group" : "private"
    setDefaultVisibility(next)
    localStorage.setItem("nyam-default-visibility", next)
    toast.success(next === "private" ? "기본 공개 범위: 나만 보기" : "기본 공개 범위: 그룹 공개")
  }, [defaultVisibility])

  const handleLogout = useCallback(async () => {
    await signOut()
    router.push(ROUTES.LOGIN)
  }, [signOut, router])

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== "탈퇴합니다") return
    setIsDeleting(true)
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: deleteReason,
          reasonCategory: deleteReason,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("계정이 비활성화되었습니다. 30일 내 로그인하면 복구됩니다.")
      await signOut()
      router.push(ROUTES.LOGIN)
    } catch {
      toast.error("탈퇴 처리에 실패했어요. 다시 시도해주세요.")
    } finally {
      setIsDeleting(false)
    }
  }, [deleteConfirmText, deleteReason, signOut, router])

  const providerLabel = {
    kakao: "카카오",
    naver: "네이버",
    google: "Google",
    apple: "Apple",
  }[user?.authProvider ?? "google"] ?? user?.authProvider

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => router.back()} className="text-neutral-500 hover:text-neutral-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-800">설정</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-2">
        {/* Account Section */}
        <SettingsSection title="계정">
          <SettingsRow
            icon={<User className="h-4 w-4" />}
            label={user?.nickname ?? "사용자"}
            description={user?.email}
          />
          <SettingsRow
            icon={<Globe className="h-4 w-4" />}
            label="연결된 계정"
            value={providerLabel}
          />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title="화면">
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-200 text-neutral-500">
                <Palette className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-neutral-800">테마</p>
            </div>
          </div>
          <ThemeSelector />
        </SettingsSection>

        {/* Notification Section */}
        <SettingsSection title="알림">
          <SettingsRow
            icon={pushEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            label="푸시 알림"
            description="기록 리마인더, 그룹 활동"
            trailing={<ToggleSwitch checked={pushEnabled} onChange={handleTogglePush} />}
          />
          <SettingsRow
            icon={<FileText className="h-4 w-4" />}
            label="주간 리포트"
            description="매주 월요일 이번 주 요약"
            trailing={<ToggleSwitch checked={weeklyReport} onChange={handleToggleWeeklyReport} />}
          />
        </SettingsSection>

        {/* Privacy Section */}
        <SettingsSection title="개인정보 및 보안">
          <SettingsRow
            icon={defaultVisibility === "private" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            label="기본 공개 범위"
            description={defaultVisibility === "private" ? "나만 보기" : "그룹 공개"}
            onClick={handleToggleVisibility}
          />
          <SettingsRow
            icon={<Lock className="h-4 w-4" />}
            label="프로필 검색 허용"
            description="다른 사용자가 닉네임으로 검색"
            trailing={<ToggleSwitch checked={true} onChange={() => toast("준비 중인 기능이에요")} />}
          />
          <SettingsRow
            icon={<Download className="h-4 w-4" />}
            label="내 데이터 내보내기"
            description="기록, 사진, DNA 데이터"
            onClick={() => toast("준비 중인 기능이에요")}
          />
        </SettingsSection>

        {/* Info Section */}
        <SettingsSection title="정보">
          <SettingsRow
            icon={<Shield className="h-4 w-4" />}
            label="이용약관"
            onClick={() => router.push(ROUTES.TERMS_SERVICE)}
          />
          <SettingsRow
            icon={<Lock className="h-4 w-4" />}
            label="개인정보처리방침"
            onClick={() => router.push(ROUTES.TERMS_PRIVACY)}
          />
          <SettingsRow
            icon={<HelpCircle className="h-4 w-4" />}
            label="도움말 및 FAQ"
            onClick={() => toast("준비 중인 기능이에요")}
          />
          <SettingsRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="문의하기"
            onClick={() => toast("준비 중인 기능이에요")}
          />
          <SettingsRow
            icon={<Info className="h-4 w-4" />}
            label="앱 버전"
            value="0.2.0"
          />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="계정 관리">
          <SettingsRow
            icon={<LogOut className="h-4 w-4" />}
            label="로그아웃"
            onClick={() => setLogoutOpen(true)}
            danger
          />
          <SettingsRow
            icon={<Trash2 className="h-4 w-4" />}
            label="계정 탈퇴"
            description="30일 이내 로그인 시 복구 가능"
            onClick={() => setDeleteOpen(true)}
            danger
          />
        </SettingsSection>

        <p className="text-center text-[10px] text-neutral-300 pb-2">
          nyam — AI-powered food diary
        </p>
      </div>

      {/* Logout Confirmation */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>로그아웃</DialogTitle>
            <DialogDescription>정말 로그아웃하시겠어요?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setLogoutOpen(false)}
              className="flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-200 py-2.5 text-sm font-medium text-neutral-600"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white"
            >
              로그아웃
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-red-500">계정 탈퇴</DialogTitle>
            <DialogDescription>
              탈퇴 시 계정이 즉시 비활성화됩니다. 30일 이내에 다시 로그인하면 복구할 수 있습니다.
              30일 이후에는 모든 데이터가 영구 삭제됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-neutral-600">탈퇴 사유 (선택)</p>
            <div className="flex flex-wrap gap-1.5">
              {DELETION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDeleteReason(deleteReason === reason ? null : reason)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    deleteReason === reason
                      ? "bg-red-500 text-white"
                      : "bg-neutral-100 dark:bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-600 mb-1.5">
                확인을 위해 &quot;탈퇴합니다&quot;를 입력해주세요
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="탈퇴합니다"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-300 bg-card dark:bg-neutral-100 px-3 py-2.5 text-sm outline-none focus:border-red-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(false)
                setDeleteConfirmText("")
                setDeleteReason(null)
              }}
              className="flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-200 py-2.5 text-sm font-medium text-neutral-600"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "탈퇴합니다" || isDeleting}
              className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {isDeleting ? "처리 중..." : "탈퇴하기"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
