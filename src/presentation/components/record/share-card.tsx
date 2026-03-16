'use client'

import { forwardRef } from 'react'
import { Star, MapPin } from 'lucide-react'
import type { FoodRecord, RecordType } from '@/domain/entities/record'
import type { Restaurant } from '@/domain/entities/restaurant'

interface ShareCardProps {
  record: FoodRecord
  restaurant?: Restaurant | null
  userName: string
}

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  restaurant: '외식',
  wine: '와인',
  cooking: '요리',
}

/**
 * Visual card component rendered off-screen, then captured as a PNG
 * for sharing via Web Share API or download.
 *
 * Uses inline styles where possible for html-to-image compatibility.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ record, restaurant, userName }, ref) {
    const formattedDate = new Date(record.createdAt).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const typeLabel = RECORD_TYPE_LABELS[record.recordType]
    const categoryText = record.category
      ? `${record.category}${record.subCategory ? ` / ${record.subCategory}` : ''}`
      : null

    const flavorChips = record.flavorTags.slice(0, 4)

    return (
      <div
        ref={ref}
        style={{
          width: 390,
          height: 520,
          background: 'linear-gradient(160deg, #FF6038 0%, #FF8F70 100%)',
          borderRadius: 24,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        />

        {/* Top section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: -0.5,
              }}
            >
              nyam
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 500,
              }}
            >
              by {userName}
            </span>
          </div>

          {/* Menu name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.2,
                margin: 0,
                wordBreak: 'keep-all',
              }}
            >
              {record.menuName}
            </h2>

            {/* Category + Type badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {categoryText && (
                <span
                  style={{
                    fontSize: 13,
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontWeight: 500,
                  }}
                >
                  {categoryText}
                </span>
              )}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#FF6038',
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '3px 10px',
                }}
              >
                {typeLabel}
              </span>
            </div>
          </div>

          {/* Overall rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star
              style={{ width: 28, height: 28, color: '#FFF', fill: '#FFF' }}
            />
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {Math.round(record.ratingOverall)}
            </span>
            <span
              style={{
                fontSize: 14,
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 500,
                alignSelf: 'flex-end',
                paddingBottom: 4,
              }}
            >
              / 100
            </span>
          </div>
        </div>

        {/* Middle section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, zIndex: 1 }}>
          {/* Restaurant info */}
          {restaurant && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <MapPin
                style={{
                  width: 16,
                  height: 16,
                  color: 'rgba(255, 255, 255, 0.8)',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#FFFFFF',
                  }}
                >
                  {restaurant.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  {restaurant.address}
                </span>
              </div>
            </div>
          )}

          {/* Flavor tags */}
          {flavorChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {flavorChips.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 20,
                    padding: '4px 12px',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.55)',
              fontWeight: 500,
            }}
          >
            {formattedDate}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.45)',
              fontWeight: 500,
            }}
          >
            nyam -- Real People. Real Taste.
          </span>
        </div>
      </div>
    )
  },
)
