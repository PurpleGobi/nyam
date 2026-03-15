/**
 * Food categories with associated colors from the design system.
 * Each category has a unique accent color for quick visual distinction.
 */

export interface FoodCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const FOOD_CATEGORIES: readonly FoodCategory[] = [
  {
    id: "korean",
    label: "한식",
    icon: "utensils",
    color: "#C05621",
    bgColor: "#FFFAF0",
  },
  {
    id: "japanese",
    label: "일식",
    icon: "fish",
    color: "#2B6CB0",
    bgColor: "#EBF8FF",
  },
  {
    id: "chinese",
    label: "중식",
    icon: "soup",
    color: "#C53030",
    bgColor: "#FFF5F5",
  },
  {
    id: "western",
    label: "양식",
    icon: "chef-hat",
    color: "#2F855A",
    bgColor: "#F0FFF4",
  },
  {
    id: "cafe-dessert",
    label: "카페/디저트",
    icon: "coffee",
    color: "#B7791F",
    bgColor: "#FFFFF0",
  },
  {
    id: "southeast-asian",
    label: "동남아",
    icon: "palm-tree",
    color: "#38A169",
    bgColor: "#F0FFF4",
  },
  {
    id: "street-food",
    label: "분식/길거리",
    icon: "candy",
    color: "#DD6B20",
    bgColor: "#FFFAF0",
  },
  {
    id: "meat-grill",
    label: "고기/구이",
    icon: "flame",
    color: "#9B2C2C",
    bgColor: "#FFF5F5",
  },
  {
    id: "seafood",
    label: "해산물",
    icon: "waves",
    color: "#2C7A7B",
    bgColor: "#E6FFFA",
  },
  {
    id: "vegetarian-healthy",
    label: "채식/건강식",
    icon: "leaf",
    color: "#276749",
    bgColor: "#F0FFF4",
  },
] as const;
