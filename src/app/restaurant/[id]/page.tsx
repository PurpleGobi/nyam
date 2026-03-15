"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronLeft,
  Star,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  ExternalLink,
  Loader2,
  Search,
  AlertCircle,
  UtensilsCrossed,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/filter"
import {
  getRestaurantFromSession,
  verifyRestaurant,
  loadResultsFromSession,
  saveResultsToSession,
} from "@/lib/api"
import type { Restaurant } from "@/types"

function VerificationBadge({ status }: { status: Restaurant["verificationStatus"] }) {
  switch (status) {
    case "verified":
      return (
        <Badge variant="default" className="gap-1 bg-green-600 text-white">
          <ShieldCheck className="size-3" />
          검증됨
        </Badge>
      )
    case "unverified":
      return (
        <Badge variant="secondary" className="gap-1">
          <ShieldAlert className="size-3" />
          미검증
        </Badge>
      )
    case "closed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="size-3" />
          폐업
        </Badge>
      )
  }
}

function RatingBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-orange-500"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium">{value.toFixed(1)}</span>
    </div>
  )
}

export default function RestaurantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  useEffect(() => {
    const data = getRestaurantFromSession(id)
    if (!data) {
      router.replace("/")
      return
    }
    setRestaurant(data)
    setLoaded(true)
  }, [id, router])

  const handleVerify = async () => {
    if (!restaurant) return
    setVerifying(true)
    setVerifyError(null)

    try {
      const result = await verifyRestaurant(restaurant.name, restaurant.address)
      const updated: Restaurant = {
        ...restaurant,
        verificationStatus: result.status === "closed"
          ? "closed"
          : result.verified
            ? "verified"
            : "unverified",
        verifiedAt: new Date().toISOString().split("T")[0],
        rating: {
          ...restaurant.rating,
          ...result.rating,
        },
      }
      setRestaurant(updated)

      // Sync back to sessionStorage
      const results = loadResultsFromSession()
      if (results) {
        const synced = results.map((r) => (r.id === id ? updated : r))
        saveResultsToSession(synced)
      }
    } catch {
      setVerifyError("검증에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setVerifying(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!restaurant) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.back()}
            aria-label="뒤로가기"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="truncate text-lg font-bold">{restaurant.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Hero */}
        <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-orange-100 to-red-50">
          <UtensilsCrossed className="size-16 text-orange-300" />
          {restaurant.verificationStatus === "closed" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-lg bg-black/60 px-6 py-3 text-xl font-bold text-white">
                폐업
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Name + Verification */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-xl font-bold">{restaurant.name}</h2>
                <VerificationBadge status={restaurant.verificationStatus} />
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs">{restaurant.cuisine}</Badge>
                <span className="flex items-center gap-1 text-sm font-semibold text-orange-500">
                  <Star className="size-4 fill-orange-500 text-orange-500" />
                  {restaurant.rating.average.toFixed(1)}
                </span>
              </div>
            </div>
            {restaurant.verificationStatus === "unverified" && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handleVerify}
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
          </div>

          {verifyError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              {verifyError}
            </div>
          )}

          {/* Info */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{restaurant.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <span>{restaurant.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 shrink-0 text-muted-foreground" />
                <span>{restaurant.hours}</span>
              </div>
            </CardContent>
          </Card>

          {/* Ratings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">평점</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingBar label="Naver" value={restaurant.rating.naver} />
              <RatingBar label="Kakao" value={restaurant.rating.kakao} />
              <RatingBar label="Google" value={restaurant.rating.google} />
            </CardContent>
          </Card>

          {/* Menu */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">메뉴</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {restaurant.menu.map((item, i) => (
                <div key={item.name}>
                  {i > 0 && <Separator className="my-2" />}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-medium text-orange-600">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reviews */}
          {restaurant.recentReviews.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">최근 리뷰</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {restaurant.recentReviews.map((review, i) => (
                  <div key={`${review.source}-${review.date}`}>
                    {i > 0 && <Separator className="my-3" />}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{review.source}</Badge>
                          <span className="text-xs font-medium">{review.author}</span>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs text-orange-500">
                          <Star className="size-3 fill-orange-500" />
                          {review.rating}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.content}</p>
                      <p className="text-xs text-muted-foreground/60">{review.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Map Links */}
          <div className="flex gap-2 pb-8">
            <a
              href={restaurant.naverMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <ExternalLink className="size-3.5" />
              네이버 지도
            </a>
            <a
              href={restaurant.kakaoMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <ExternalLink className="size-3.5" />
              카카오 지도
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
