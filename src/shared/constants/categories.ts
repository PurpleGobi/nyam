export const FOOD_CATEGORIES = [
  { value: "korean", label: "한식" },
  { value: "chinese", label: "중식" },
  { value: "japanese", label: "일식" },
  { value: "western", label: "양식" },
  { value: "chicken", label: "치킨" },
  { value: "pizza", label: "피자" },
  { value: "burger", label: "버거" },
  { value: "snack", label: "분식" },
  { value: "jokbal", label: "족발/보쌈" },
  { value: "stew", label: "찌개/탕" },
  { value: "katsu", label: "돈까스" },
  { value: "bbq", label: "고기/구이" },
  { value: "seafood", label: "해산물" },
  { value: "asian", label: "아시안" },
  { value: "cafe", label: "카페/디저트" },
  { value: "salad", label: "샐러드" },
  { value: "lunchbox", label: "도시락" },
] as const

export type FoodCategory = (typeof FOOD_CATEGORIES)[number]["value"]

export const COOKING_GENRES = [
  { value: "korean", label: "한식" },
  { value: "western", label: "양식" },
  { value: "chinese", label: "중식" },
  { value: "japanese", label: "일식" },
  { value: "baking", label: "베이킹" },
  { value: "dessert", label: "디저트" },
  { value: "beverage", label: "음료" },
] as const

export type CookingGenre = (typeof COOKING_GENRES)[number]["value"]

export const WINE_TYPES = [
  { value: "red", label: "레드" },
  { value: "white", label: "화이트" },
  { value: "sparkling", label: "스파클링" },
  { value: "rose", label: "로제" },
  { value: "orange", label: "오렌지" },
  { value: "natural", label: "내추럴" },
] as const

export type WineType = (typeof WINE_TYPES)[number]["value"]
