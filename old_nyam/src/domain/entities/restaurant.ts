/**
 * Restaurant domain entities
 * Aligned with: restaurants, restaurant_ratings tables
 */

/** Cuisine category for filtering */
export type CuisineCategory =
  | '한식'
  | '일식'
  | '중식'
  | '양식'
  | '카페'
  | '분식'
  | '치킨'
  | '피자'
  | '패스트푸드'
  | '아시안'
  | '멕시칸'
  | '기타';

/** Price range indicator */
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

/** Operating hours per day of week */
export interface OperatingHours {
  readonly mon?: string;
  readonly tue?: string;
  readonly wed?: string;
  readonly thu?: string;
  readonly fri?: string;
  readonly sat?: string;
  readonly sun?: string;
}

/** External rating source */
export type RatingSource = 'naver' | 'kakao' | 'google';

/** External rating data cached from third-party sources */
export interface RestaurantRating {
  readonly id: string;
  readonly restaurantId: string;
  readonly source: RatingSource;
  readonly rating: number | null;
  readonly reviewCount: number;
  readonly fetchedAt: string;
}

/** Core restaurant entity */
export interface Restaurant {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly shortAddress: string | null;
  readonly phone: string | null;
  readonly cuisine: string;
  readonly cuisineCategory: CuisineCategory;
  readonly priceRange: PriceRange | null;
  readonly hours: OperatingHours | null;
  readonly mood: readonly string[];
  readonly region: string | null;
  readonly imageUrl: string | null;
  readonly naverMapUrl: string | null;
  readonly kakaoMapUrl: string | null;
  readonly googleMapUrl: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Restaurant with verification summary attached */
export interface RestaurantWithSummary extends Restaurant {
  readonly verificationCount: number;
  readonly avgTaste: number | null;
  readonly avgValue: number | null;
  readonly avgService: number | null;
  readonly avgAmbiance: number | null;
  readonly verificationLevel: import('./verification').VerificationLevel;
  readonly ratings: readonly RestaurantRating[];
}
