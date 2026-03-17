'use client'

import { X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface Place {
  externalId: string
  name: string
  address: string
  categoryName: string
}

interface NearbyRestaurantPickerProps {
  places: Place[]
  isLoading: boolean
  selected: string | null
  onSelect: (externalId: string) => void
  onClose: () => void
}

function SkeletonItem() {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 animate-pulse">
      <div className="h-4 w-32 rounded bg-neutral-200" />
      <div className="h-3 w-48 rounded bg-neutral-100" />
    </div>
  )
}

export function NearbyRestaurantPicker({
  places,
  isLoading,
  selected,
  onSelect,
  onClose,
}: NearbyRestaurantPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
      />

      {/* Bottom sheet */}
      <div className="relative w-full max-h-[70vh] flex flex-col rounded-t-2xl bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <h3 className="text-base font-bold text-neutral-800">근처 식당</h3>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors"
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col divide-y divide-neutral-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonItem key={i} />
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-neutral-400">
                근처에 식당이 없습니다
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-100">
              {places.map((place) => {
                const isSelected = selected === place.externalId

                return (
                  <button
                    key={place.externalId}
                    type="button"
                    onClick={() => onSelect(place.externalId)}
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors',
                      isSelected
                        ? 'border-l-[3px] border-l-[#FF6038] bg-[#FF6038]/5'
                        : 'border-l-[3px] border-l-transparent hover:bg-neutral-50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'font-medium text-sm',
                          isSelected ? 'text-[#FF6038]' : 'text-neutral-800',
                        )}
                      >
                        {place.name}
                      </p>
                      {place.categoryName && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-500">
                          {place.categoryName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {place.address}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
