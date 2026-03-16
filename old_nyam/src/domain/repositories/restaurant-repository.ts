/**
 * Restaurant repository interface
 * Infrastructure layer implements this with Supabase
 */

import type { Restaurant, RestaurantWithSummary, CuisineCategory } from '../entities/restaurant';

/** Filter options for restaurant queries */
export interface RestaurantFilter {
  readonly cuisineCategory?: CuisineCategory;
  readonly region?: string;
  readonly query?: string;
  readonly isActive?: boolean;
}

/** Pagination options */
export interface PaginationOptions {
  readonly page: number;
  readonly limit: number;
}

/** Paginated result */
export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

export interface RestaurantRepository {
  /** Find a single restaurant by ID */
  findById(id: string): Promise<RestaurantWithSummary | null>;

  /** Find restaurants with optional filters and pagination */
  findMany(
    filter?: RestaurantFilter,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<RestaurantWithSummary>>;

  /** Full-text search by name */
  search(
    query: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Restaurant>>;
}
