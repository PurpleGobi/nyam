"use client"

import { cn } from "@/shared/utils/cn"

interface LoginButtonsProps {
  disabled: boolean
  onLogin: (provider: "google" | "kakao" | "apple" | "naver") => void
}

const PROVIDERS = [
  {
    id: "kakao" as const,
    label: "카카오로 시작하기",
    bg: "bg-[#FEE500]",
    text: "text-[#191919]",
  },
  {
    id: "naver" as const,
    label: "네이버로 시작하기",
    bg: "bg-[#03C75A]",
    text: "text-white",
  },
  {
    id: "google" as const,
    label: "Google로 시작하기",
    bg: "bg-white border border-neutral-200",
    text: "text-neutral-700",
  },
  {
    id: "apple" as const,
    label: "Apple로 시작하기",
    bg: "bg-black",
    text: "text-white",
  },
]

export function LoginButtons({ disabled, onLogin }: LoginButtonsProps) {
  return (
    <div className="flex flex-col gap-3">
      {PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={disabled}
          onClick={() => onLogin(provider.id)}
          className={cn(
            "flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all",
            "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
            provider.bg,
            provider.text,
          )}
        >
          {provider.label}
        </button>
      ))}
    </div>
  )
}
