/**
 * Supabase implementation of RestaurantRepository
 */

import { createClient } from '../supabase/client';
import type { Row } from '../supabase/types';
import type { Database } from '../supabase/types';
import type { Restaurant, RestaurantWithSummary, CuisineCategory, PriceRange, OperatingHours } from '@/domain/entities/restaurant';
import type { VerificationLevel } from '@/domain/entities/verification';
import type {
  RestaurantRepository,
  RestaurantFilter,
  PaginationOptions,
  PaginatedResult,
} from '@/domain/repositories/restaurant-repository';

type RestaurantRow = Row<'restaurants'>;
type SummaryRow = Database['public']['Views']['restaurant_verification_summary']['Row'];

/** Map a Supabase restaurant row to the domain entity */
function toRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    shortAddress: row.short_address,
    phone: row.phone,
    cuisine: row.cuisine,
    cuisineCategory: row.cuisine_category as CuisineCategory,
    priceRange: row.price_range as PriceRange | null,
    hours: row.hours as OperatingHours | null,
    mood: row.mood,
    region: row.region,
    imageUrl: row.image_url,
    naverMapUrl: row.naver_map_url,
    kakaoMapUrl: row.kakao_map_url,
    googleMapUrl: row.google_map_url,
    latitude: row.latitude,
    longitude: row.longitude,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map a restaurant row + summary row to RestaurantWithSummary */
function toRestaurantWithSummary(
  row: RestaurantRow,
  summary: SummaryRow | null,
): RestaurantWithSummary {
  return {
    ...toRestaurant(row),
    verificationCount: summary?.verification_count ?? 0,
    avgTaste: summary?.avg_taste ?? null,
    avgValue: summary?.avg_value ?? null,
    avgService: summary?.avg_service ?? null,
    avgAmbiance: summary?.avg_ambiance ?? null,
    verificationLevel: (summary?.verification_level ?? 'unverified') as VerificationLevel,
    ratings: [],
  };
}

export const supabaseRestaurantRepository: RestaurantRepository = {
  async findById(id: string): Promise<RestaurantWithSummary | null> {
    const supabase = createClient();

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch restaurant: ${error.message}`);
    }

    const { data: summary } = await supabase
      .from('restaurant_verification_summary')
      .select('*')
      .eq('restaurant_id', id)
      .single();

    return toRestaurantWithSummary(restaurant, summary ?? null);
  },

  async findMany(
    filter?: RestaurantFilter,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<RestaurantWithSummary>> {
    const supabase = createClient();
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('restaurants').select('*', { count: 'exact' });

    if (filter?.cuisineCategory) {
      query = query.eq('cuisine_category', filter.cuisineCategory);
    }
    if (filter?.region) {
      query = query.eq('region', filter.region);
    }
    if (filter?.query) {
      query = query.ilike('name', `%${filter.query}%`);
    }
    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }

    const { data: restaurants, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch restaurants: ${error.message}`);
    }

    const total = count ?? 0;
    const restaurantRows = restaurants ?? [];

    // Fetch summaries for the returned restaurants
    const ids = restaurantRows.map(r => r.id);
    let summaries: SummaryRow[] = [];
    if (ids.length > 0) {
      const { data: summaryData } = await supabase
        .from('restaurant_verification_summary')
        .select('*')
        .in('restaurant_id', ids);
      summaries = summaryData ?? [];
    }

    const summaryMap = new Map(summaries.map(s => [s.restaurant_id, s]));

    return {
      data: restaurantRows.map(r =>
        toRestaurantWithSummary(r, summaryMap.get(r.id) ?? null),
      ),
      total,
      page,
      limit,
      hasMore: from + restaurantRows.length < total,
    };
  },

  async search(
    query: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Restaurant>> {
    const supabase = createClient();
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact' })
      .ilike('name', `%${query}%`)
      .eq('is_active', true)
      .order('name')
      .range(from, to);

    if (error) {
      throw new Error(`Failed to search restaurants: ${error.message}`);
    }

    const total = count ?? 0;
    const rows = data ?? [];

    return {
      data: rows.map(toRestaurant),
      total,
      page,
      limit,
      hasMore: from + rows.length < total,
    };
  },
};
