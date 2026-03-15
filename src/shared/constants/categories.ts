import {
  UtensilsCrossed,
  Fish,
  Soup,
  ChefHat,
  Coffee,
  Palmtree,
  Candy,
  Flame,
  Waves,
  Leaf,
  type LucideIcon,
} from 'lucide-react'

export interface FoodCategory {
  id: string
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
}

export const FOOD_CATEGORIES: readonly FoodCategory[] = [
  {
    id: 'korean',
    label: '한식',
    icon: UtensilsCrossed,
    color: '#C05621',
    bgColor: '#FFFAF0',
  },
  {
    id: 'japanese',
    label: '일식',
    icon: Fish,
    color: '#2B6CB0',
    bgColor: '#EBF8FF',
  },
  {
    id: 'chinese',
    label: '중식',
    icon: Soup,
    color: '#C53030',
    bgColor: '#FFF5F5',
  },
  {
    id: 'western',
    label: '양식',
    icon: ChefHat,
    color: '#2F855A',
    bgColor: '#F0FFF4',
  },
  {
    id: 'cafe-dessert',
    label: '카페/디저트',
    icon: Coffee,
    color: '#B7791F',
    bgColor: '#FFFFF0',
  },
  {
    id: 'southeast-asian',
    label: '동남아',
    icon: Palmtree,
    color: '#38A169',
    bgColor: '#F0FFF4',
  },
  {
    id: 'street-food',
    label: '분식/길거리',
    icon: Candy,
    color: '#DD6B20',
    bgColor: '#FFFAF0',
  },
  {
    id: 'meat-grill',
    label: '고기/구이',
    icon: Flame,
    color: '#9B2C2C',
    bgColor: '#FFF5F5',
  },
  {
    id: 'seafood',
    label: '해산물',
    icon: Waves,
    color: '#2C7A7B',
    bgColor: '#E6FFFA',
  },
  {
    id: 'vegetarian-healthy',
    label: '채식/건강식',
    icon: Leaf,
    color: '#276749',
    bgColor: '#F0FFF4',
  },
] as const
