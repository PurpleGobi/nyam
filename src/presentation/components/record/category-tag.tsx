import { cn } from "@/shared/utils/cn"

interface CategoryTagProps {
  label: string
  variant?: "flavor" | "texture" | "atmosphere" | "scene"
}

const VARIANT_CLASSES = {
  flavor: "bg-orange-50 text-orange-700",
  texture: "bg-green-50 text-green-700",
  atmosphere: "bg-purple-50 text-purple-700",
  scene: "bg-blue-50 text-blue-700",
} as const

export function CategoryTag({ label, variant = "flavor" }: CategoryTagProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium",
      VARIANT_CLASSES[variant],
    )}>
      {label}
    </span>
  )
}
