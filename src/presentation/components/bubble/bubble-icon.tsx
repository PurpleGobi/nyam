import {
  Users,
  Home,
  Beer,
  Briefcase,
  Map,
  Wine,
  Sparkles,
  Gem,
  UtensilsCrossed,
  Coffee,
  MapPin,
  Flame,
  Heart,
  Star,
  BookOpen,
  Music,
  Camera,
  Pizza,
  Cake,
  IceCreamCone,
  Soup,
  CookingPot,
  Salad,
  Beef,
  Fish,
  Egg,
  Cherry,
  Apple,
  Grape,
  Citrus,
  TreePalm,
  Mountain,
  Tent,
  Plane,
  Ship,
  Car,
  Bike,
  Trophy,
  Medal,
  Crown,
  Zap,
  Sun,
  Moon,
  CloudSun,
  Palette,
  Gamepad2,
  Headphones,
  Mic,
  Clapperboard,
  Volleyball,
  Dumbbell,
  ShoppingBag,
  Gift,
  PartyPopper,
  Laugh,
  Dog,
  Cat,
  Bird,
  Leaf,
  Flower2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Bubble icon name -> Lucide component mapping.
 * The bubble.icon field stores a lucide icon name string (e.g. 'users', 'home')
 * or an image URL (starts with 'http'). When no icon is set (null), we fall back
 * to the Users icon.
 */
export const BUBBLE_ICON_MAP: Record<string, LucideIcon> = {
  // Food & Drink
  'utensils-crossed': UtensilsCrossed,
  wine: Wine,
  coffee: Coffee,
  beer: Beer,
  pizza: Pizza,
  cake: Cake,
  'ice-cream-cone': IceCreamCone,
  soup: Soup,
  'cooking-pot': CookingPot,
  salad: Salad,
  beef: Beef,
  fish: Fish,
  egg: Egg,
  // Fruits
  cherry: Cherry,
  apple: Apple,
  grape: Grape,
  citrus: Citrus,
  // Travel & Places
  home: Home,
  'map-pin': MapPin,
  map: Map,
  'tree-palm': TreePalm,
  mountain: Mountain,
  tent: Tent,
  plane: Plane,
  ship: Ship,
  car: Car,
  bike: Bike,
  // People & Social
  users: Users,
  heart: Heart,
  star: Star,
  flame: Flame,
  sparkles: Sparkles,
  gem: Gem,
  crown: Crown,
  trophy: Trophy,
  medal: Medal,
  zap: Zap,
  'party-popper': PartyPopper,
  laugh: Laugh,
  gift: Gift,
  // Nature & Weather
  sun: Sun,
  moon: Moon,
  'cloud-sun': CloudSun,
  leaf: Leaf,
  flower2: Flower2,
  // Activity & Entertainment
  music: Music,
  headphones: Headphones,
  mic: Mic,
  gamepad2: Gamepad2,
  clapperboard: Clapperboard,
  volleyball: Volleyball,
  dumbbell: Dumbbell,
  palette: Palette,
  // Objects
  camera: Camera,
  'book-open': BookOpen,
  briefcase: Briefcase,
  'shopping-bag': ShoppingBag,
}

/** Category groups for icon picker UI */
export const BUBBLE_ICON_CATEGORIES: { label: string; icons: string[] }[] = [
  {
    label: '음식·음료',
    icons: ['utensils-crossed', 'wine', 'coffee', 'beer', 'pizza', 'cake', 'ice-cream-cone', 'soup', 'cooking-pot', 'salad', 'beef', 'fish', 'egg', 'cherry', 'apple', 'grape', 'citrus'],
  },
  {
    label: '여행·장소',
    icons: ['home', 'map-pin', 'map', 'tree-palm', 'mountain', 'tent', 'plane', 'ship', 'car', 'bike'],
  },
  {
    label: '소셜·감정',
    icons: ['users', 'heart', 'star', 'flame', 'sparkles', 'gem', 'crown', 'trophy', 'medal', 'zap', 'party-popper', 'laugh', 'gift'],
  },
  {
    label: '자연·날씨',
    icons: ['sun', 'moon', 'cloud-sun', 'leaf', 'flower2'],
  },
  {
    label: '활동·취미',
    icons: ['music', 'headphones', 'mic', 'gamepad2', 'clapperboard', 'volleyball', 'dumbbell', 'palette'],
  },
  {
    label: '사물',
    icons: ['camera', 'book-open', 'briefcase', 'shopping-bag'],
  },
]

const DefaultIcon = Users

function isImageUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

interface BubbleIconProps {
  icon: string | null
  size: number
}

export function BubbleIcon({ icon, size }: BubbleIconProps) {
  if (!icon) return <DefaultIcon size={size} />

  if (isImageUrl(icon)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt="bubble icon"
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  const Icon = BUBBLE_ICON_MAP[icon] ?? DefaultIcon
  return <Icon size={size} />
}
