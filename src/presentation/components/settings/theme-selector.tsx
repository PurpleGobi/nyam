"use client"

import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "@/presentation/providers/theme-provider"
import { cn } from "@/shared/utils/cn"

const THEME_OPTIONS = [
  { value: "light" as const, icon: Sun, label: "라이트" },
  { value: "dark" as const, icon: Moon, label: "다크" },
  { value: "system" as const, icon: Monitor, label: "시스템" },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2 px-4 py-3">
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-all",
            theme === value
              ? "bg-primary-500 text-white shadow-md"
              : "bg-neutral-50 dark:bg-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-300",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </div>
  )
}
