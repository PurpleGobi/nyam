import {
  Users,
  Home,
  Beer,
  Briefcase,
  Map,
  Wine,
  Sparkles,
  Gem,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Bubble icon name -> Lucide component mapping.
 * The bubble.icon field stores a lucide icon name string (e.g. 'users', 'home').
 * When no icon is set (null), we fall back to the Users icon.
 */
const BUBBLE_ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  home: Home,
  beer: Beer,
  briefcase: Briefcase,
  map: Map,
  wine: Wine,
  sparkles: Sparkles,
  gem: Gem,
}

const DefaultIcon = Users

interface BubbleIconProps {
  icon: string | null
  size: number
}

export function BubbleIcon({ icon, size }: BubbleIconProps) {
  if (!icon || !BUBBLE_ICON_MAP[icon]) {
    return <DefaultIcon size={size} />
  }
  const Icon = BUBBLE_ICON_MAP[icon]
  return <Icon size={size} />
}
