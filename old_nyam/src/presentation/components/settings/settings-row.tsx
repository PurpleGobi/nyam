import { ChevronRight } from "lucide-react"
import { cn } from "@/shared/utils/cn"

interface SettingsRowProps {
  icon: React.ReactNode
  label: string
  description?: string
  value?: string
  onClick?: () => void
  trailing?: React.ReactNode
  danger?: boolean
}

export function SettingsRow({ icon, label, description, value, onClick, trailing, danger }: SettingsRowProps) {
  const Comp = onClick ? "button" : "div"

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        onClick && "hover:bg-neutral-50 dark:hover:bg-neutral-200/50 active:bg-neutral-100 dark:active:bg-neutral-200",
      )}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        danger ? "bg-red-50 text-red-500 dark:bg-red-500/10" : "bg-neutral-100 dark:bg-neutral-200 text-neutral-500",
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          danger ? "text-red-500" : "text-neutral-800",
        )}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
        )}
      </div>
      {trailing ?? (
        <>
          {value && <span className="text-xs text-neutral-400 shrink-0">{value}</span>}
          {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />}
        </>
      )}
    </Comp>
  )
}
