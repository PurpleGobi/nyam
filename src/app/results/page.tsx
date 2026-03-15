"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Heart,
  Star,
  MapPin,
  ChevronLeft,
  RefreshCw,
  UtensilsCrossed,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPriceRangeLabel, formatPrice } from "@/lib/filter"
import { loadResultsFromSession, saveResultsToSession, verifyRestaurant } from "@/lib/api"
import type { Restaurant } from "@/types"

function VerificationBadge({ status }: { status: Restaurant["verificationStatus"] }) {
  switch (status) {
    case "verified":
      return (
        <Badge variant="default" className="gap-1 bg-green-600 text-white text-xs">
          <ShieldCheck className="size-3" />
          검증됨
        </Badge>
      )
    case "unverified":
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <ShieldAlert className="size-3" />
          미검증
        </Badge>
      )
    case "closed":
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <XCircle className="size-3" />
          폐업
        </Badge>
      )
  }
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-500">
      <Star className="size-3.5 fill-orange-500 text-orange-500" />
      {rating.toFixed(1)}
    </span>
  )
}

function RestaurantCard({
  restaurant,
  onVerify,
  verifying,
}: {
  restaurant: Restaurant
  onVerify: (id: string) => void
  verifying: boolean
}) {
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg active:shadow-md">
      <Link href={`/restaurant/${restaurant.id}`}>
        <div className="relative h-40 bg-gradient-to-br from-orange-100 to-red-50 flex items-center justify-center">
          <UtensilsCrossed className="size-12 text-orange-300" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsFavorite(!isFavorite)
            }}
            className="absolute top-3 right-3 rounded-full bg-white/80 p-2 backdrop-blur-sm transition-colors hover:bg-white"
            aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          >
            <Heart
              className={`size-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"}`}
            />
          </button>
          {restaurant.verificationStatus === "closed" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-lg bg-black/60 px-4 py-2 text-lg font-bold text-white">
                폐업
              </span>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={`/restaurant/${restaurant.id}`}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold leading-tight">{restaurant.name}</h3>
              <VerificationBadge status={restaurant.verificationStatus} />
            </div>
            <RatingStars rating={restaurant.rating.average} />
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs font-normal">
              {restaurant.cuisine}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {getPriceRangeLabel(restaurant.priceRange)}
            </Badge>
          </div>

          <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {restaurant.shortAddress}
          </p>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {restaurant.representativeMenus.slice(0, 2).map((menu) => (
              <span
                key={menu.name}
                className="rounded-md bg-orange-50 px-2 py-0.5 text-xs text-orange-700"
              >
                {menu.name} {formatPrice(menu.price)}
              </span>
            ))}
          </div>
        </Link>

        {restaurant.verificationStatus === "unverified" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onVerify(restaurant.id)
            }}
            disabled={verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                검증 중...
              </>
            ) : (
              <>
                <Search className="size-3.5" />
                검증하기
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loaded, setLoaded] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  useEffect(() => {
    const data = loadResultsFromSession()
    if (!data || data.length === 0) {
      router.replace("/")
      return
    }
    setRestaurants(data)
    setLoaded(true)
  }, [router])

  const handleVerify = async (id: string) => {
    const restaurant = restaurants.find((r) => r.id === id)
    if (!restaurant) return

    setVerifyingId(id)
    setVerifyError(null)

    try {
      const result = await verifyRestaurant(restaurant.name, restaurant.address)
      const updatedRestaurants = restaurants.map((r) => {
        if (r.id !== id) return r
        return {
          ...r,
          verificationStatus: result.status === "closed"
            ? "closed" as const
            : result.verified
              ? "verified" as const
              : "unverified" as const,
          verifiedAt: new Date().toISOString().split("T")[0],
          rating: {
            ...r.rating,
            ...result.rating,
          },
        }
      })
      setRestaurants(updatedRestaurants)
      saveResultsToSession(updatedRestaurants)
    } catch {
      setVerifyError("검증에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setVerifyingId(null)
    }
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/")}
            aria-label="뒤로가기"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-bold">추천 결과</h1>
          <span className="ml-auto text-sm text-muted-foreground">
            {restaurants.length}곳
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        {verifyError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            {verifyError}
          </div>
        )}

        {restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <UtensilsCrossed className="size-16 text-muted-foreground/30" />
            <div>
              <p className="mb-1 text-lg font-semibold text-foreground">
                조건에 맞는 식당이 없어요
              </p>
              <p className="text-sm text-muted-foreground">
                필터를 조정해서 다시 검색해보세요
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="gap-2"
            >
              <RefreshCw className="size-4" />
              다시 추천받기
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {restaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onVerify={handleVerify}
                  verifying={verifyingId === restaurant.id}
                />
              ))}
            </div>

            <div className="mt-6 flex justify-center pb-8">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="gap-2"
              >
                <RefreshCw className="size-4" />
                다시 추천받기
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
