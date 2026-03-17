'use client'

import { Loader2, Pencil } from 'lucide-react'

interface MenuItem {
  name: string
  price: number | null
}

interface AiResultCardProps {
  restaurantName: string | null
  menuItems: MenuItem[]
  orderedItems: string[]
  totalCost: number | null
  perPersonCost: number | null
  companionCount: number | null
  category: string | null
  isLoading: boolean
  onRestaurantEdit: () => void
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원'
}

export function AiResultCard({
  restaurantName,
  menuItems,
  orderedItems,
  totalCost,
  perPersonCost,
  companionCount,
  category,
  isLoading,
  onRestaurantEdit,
}: AiResultCardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl bg-white shadow-sm border border-neutral-100">
        <Loader2 className="size-8 text-[#FF6038] animate-spin" />
        <span className="text-sm text-neutral-500">AI 분석 중...</span>
      </div>
    )
  }

  if (!restaurantName) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 rounded-xl bg-white shadow-sm border border-neutral-100">
        <p className="text-sm text-neutral-500">
          식당을 인식하지 못했습니다
        </p>
        <button
          type="button"
          onClick={onRestaurantEdit}
          className="px-4 py-2 rounded-lg bg-[#FF6038] text-sm font-medium text-white hover:bg-[#FF6038]/90 transition-colors"
        >
          직접 선택
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-white shadow-sm border border-neutral-100">
      {/* Restaurant name */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-800">
          {restaurantName}
        </h3>
        <button
          type="button"
          onClick={onRestaurantEdit}
          className="size-8 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors"
          aria-label="식당 수정"
        >
          <Pencil className="size-4" />
        </button>
      </div>

      {/* Category badge */}
      {category && (
        <span className="self-start px-2.5 py-1 rounded-full bg-[#FF6038]/10 text-xs font-medium text-[#FF6038]">
          {category}
        </span>
      )}

      {/* Menu items */}
      {menuItems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-500">메뉴</span>
          <div className="flex flex-wrap gap-1.5">
            {menuItems.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-xs text-neutral-700"
              >
                {item.name}
                {item.price !== null && (
                  <span className="text-neutral-400">
                    {formatPrice(item.price)}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ordered items */}
      {orderedItems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-500">
            주문한 메뉴
          </span>
          <div className="flex flex-wrap gap-1.5">
            {orderedItems.map((item) => (
              <span
                key={item}
                className="px-2.5 py-1 rounded-full bg-[#FF6038]/10 text-xs font-medium text-[#FF6038]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cost info */}
      {(totalCost !== null || perPersonCost !== null) && (
        <div className="flex items-center gap-3 pt-2 border-t border-neutral-100 text-sm text-neutral-600">
          {totalCost !== null && (
            <span>
              총 <span className="font-semibold text-neutral-800">{formatPrice(totalCost)}</span>
            </span>
          )}
          {companionCount !== null && totalCost !== null && (
            <span className="text-neutral-300">|</span>
          )}
          {perPersonCost !== null && companionCount !== null && (
            <span>
              {companionCount + 1}명 · 인당{' '}
              <span className="font-semibold text-neutral-800">
                {formatPrice(perPersonCost)}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
