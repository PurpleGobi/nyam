import { createClient } from '@/infrastructure/supabase/client'
import type {
  RestaurantEnrichment,
  EnrichmentAiSummary,
  EnrichmentExternalRatings,
  EnrichmentSource,
  EnrichmentStatus,
} from '@/domain/entities/restaurant-enrichment'
import type { EnrichmentRepository } from '@/domain/repositories/enrichment-repository'

type DbRow = Record<string, unknown>

function toAiSummary(raw: unknown): EnrichmentAiSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    pros: Array.isArray(r.pros) ? (r.pros as EnrichmentAiSummary['pros']) : [],
    cons: Array.isArray(r.cons) ? (r.cons as EnrichmentAiSummary['cons']) : [],
    atmosphere: (r.atmosphere as EnrichmentAiSummary['atmosphere']) ?? null,
    priceRange: (r.priceRange as EnrichmentAiSummary['priceRange'])
      ?? (r.price_range as EnrichmentAiSummary['priceRange'])
      ?? null,
    signatures: Array.isArray(r.signatures) ? (r.signatures as EnrichmentAiSummary['signatures']) : [],
    overallNote: (r.overallNote as string | null) ?? (r.overall_note as string | null) ?? null,
  }
}

function toSources(raw: unknown): EnrichmentSource[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is Record<string, unknown> => s !== null && typeof s === 'object')
    .map((s) => ({
      id: Number(s.id),
      type: s.type as EnrichmentSource['type'],
      url: String(s.url ?? ''),
      title: String(s.title ?? ''),
      fetchedAt: String(s.fetchedAt ?? s.fetched_at ?? ''),
    }))
}

function toExternalRatings(raw: unknown): EnrichmentExternalRatings | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    naver: (r.naver as EnrichmentExternalRatings['naver']) ?? null,
    google: (r.google as EnrichmentExternalRatings['google']) ?? null,
  }
}

function toEntity(row: DbRow): RestaurantEnrichment {
  return {
    restaurantId: row.restaurant_id as string,
    sources: toSources(row.sources),
    aiSummary: toAiSummary(row.ai_summary),
    externalRatings: toExternalRatings(row.external_ratings),
    photoUrls: Array.isArray(row.photo_urls) ? (row.photo_urls as string[]) : [],
    photoAttributions: Array.isArray(row.photo_attributions) ? (row.photo_attributions as string[]) : [],
    status: row.status as EnrichmentStatus,
    errorMessage: (row.error_message as string | null) ?? null,
    enrichedAt: (row.enriched_at as string | null) ?? null,
    expiresAt: row.expires_at as string,
    sourceVersion: row.source_version as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export class SupabaseEnrichmentRepository implements EnrichmentRepository {
  private get supabase() { return createClient() }

  async findByRestaurantId(restaurantId: string): Promise<RestaurantEnrichment | null> {
    const { data, error } = await this.supabase
      .from('restaurant_enrichment')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    if (error) throw new Error(`restaurant_enrichment fetch failed: ${error.message}`)
    if (!data) return null
    return toEntity(data as DbRow)
  }

  async triggerEnrichment(restaurantId: string): Promise<void> {
    const { error } = await this.supabase.functions.invoke('enrich-restaurant', {
      body: { restaurant_id: restaurantId },
    })
    if (error) {
      throw new Error(`enrich-restaurant invoke failed: ${error.message}`)
    }
  }
}
