export const RESTAURANT_SCENES = [
  { value: "혼밥", label: "혼밥" },
  { value: "데이트", label: "데이트" },
  { value: "비즈니스", label: "비즈니스" },
  { value: "가족", label: "가족" },
  { value: "친구모임", label: "친구모임" },
  { value: "술자리", label: "술자리" },
  { value: "브런치", label: "브런치" },
  { value: "간단점심", label: "간단점심" },
] as const

export type RestaurantScene = (typeof RESTAURANT_SCENES)[number]["value"]

export const WINE_SCENES = [
  { value: "혼술", label: "혼술" },
  { value: "데이트", label: "데이트" },
  { value: "페어링", label: "페어링" },
  { value: "파티", label: "파티" },
  { value: "테이스팅", label: "테이스팅" },
] as const

export type WineScene = (typeof WINE_SCENES)[number]["value"]

export const COOKING_SCENES = [
  { value: "일상식사", label: "일상식사" },
  { value: "밀프렙", label: "밀프렙" },
  { value: "손님초대", label: "손님초대" },
  { value: "도시락", label: "도시락" },
  { value: "다이어트", label: "다이어트" },
] as const

export type CookingScene = (typeof COOKING_SCENES)[number]["value"]
