"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Clock,
  Heart,
  MapPinCheck,
  Trash2,
  Users,
  MapPin,
  Utensils,
  Star,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getHistory,
  deleteHistory,
  getFavorites,
  getVisited,
  getRestaurantsFromHistory,
  toggleFavorite,
  toggleVisited,
} from "@/lib/storage"
import type { RecommendationHistory, Restaurant } from "@/types"

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        <Icon className="h-8 w-8 text-orange-400" />
      </div>
      <p className="text-lg font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function FilterSummary({ filters }: { filters: RecommendationHistory["filters"] }) {
  const tags: string[] = []
  if (filters.areas.length > 0) tags.push(...filters.areas)
  if (filters.cuisines.length > 0) tags.push(...filters.cuisines)
  if (filters.partySize) tags.push(`${filters.partySize}명`)
  if (filters.moods.length > 0) tags.push(...filters.moods)

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 5).map((tag) => (
        <Badge key={tag} variant="secondary" className="text-xs">
          {tag}
        </Badge>
      ))}
      {tags.length > 5 && (
        <Badge variant="outline" className="text-xs">
          +{tags.length - 5}
        </Badge>
      )}
    </div>
  )
}

function HistoryCard({
  entry,
  onDelete,
}: {
  entry: RecommendationHistory
  onDelete: (id: string) => void
}) {
  const date = new Date(entry.createdAt)
  const dateStr = date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  })
  const timeStr = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="text-xs">
              {dateStr} {timeStr}
            </CardDescription>
            <CardTitle className="mt-1 text-sm">
              {entry.results.length}곳 추천
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <FilterSummary filters={entry.filters} />
        <div className="mt-2 space-y-1">
          {entry.results.slice(0, 3).map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Utensils className="h-3 w-3 shrink-0" />
              <span className="truncate">{r.name}</span>
              {r.rating.average > 0 && (
                <span className="ml-auto flex items-center gap-0.5 text-xs text-orange-500">
                  <Star className="h-3 w-3 fill-current" />
                  {r.rating.average.toFixed(1)}
                </span>
              )}
            </div>
          ))}
          {entry.results.length > 3 && (
            <p className="text-xs text-muted-foreground">
              외 {entry.results.length - 3}곳
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RestaurantCard({
  restaurant,
  isFav,
  isVis,
  onToggleFav,
  onToggleVis,
}: {
  restaurant: Restaurant
  isFav: boolean
  isVis: boolean
  onToggleFav: (id: string) => void
  onToggleVis: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">{restaurant.name}</CardTitle>
            <CardDescription className="mt-0.5 flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{restaurant.address}</span>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFav(restaurant.id)}
            >
              <Heart
                className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleVis(restaurant.id)}
            >
              <MapPinCheck
                className={`h-4 w-4 ${isVis ? "text-green-500" : "text-muted-foreground"}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {restaurant.cuisine}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {restaurant.priceRange}
          </Badge>
          {restaurant.rating.average > 0 && (
            <span className="ml-auto flex items-center gap-0.5 text-xs font-medium text-orange-500">
              <Star className="h-3 w-3 fill-current" />
              {restaurant.rating.average.toFixed(1)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function HistoryPage() {
  const [history, setHistory] = useState<RecommendationHistory[]>([])
  const [favIds, setFavIds] = useState<string[]>([])
  const [visIds, setVisIds] = useState<string[]>([])
  const [favRestaurants, setFavRestaurants] = useState<Restaurant[]>([])
  const [visRestaurants, setVisRestaurants] = useState<Restaurant[]>([])

  const refresh = useCallback(() => {
    const h = getHistory()
    const f = getFavorites()
    const v = getVisited()
    setHistory(h)
    setFavIds(f)
    setVisIds(v)
    setFavRestaurants(getRestaurantsFromHistory(f))
    setVisRestaurants(getRestaurantsFromHistory(v))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleDelete = (id: string) => {
    deleteHistory(id)
    refresh()
  }

  const handleToggleFav = (id: string) => {
    toggleFavorite(id)
    refresh()
  }

  const handleToggleVis = (id: string) => {
    toggleVisited(id)
    refresh()
  }

  return (
    <div className="px-4 py-4">
      <Tabs defaultValue="history">
        <TabsList className="w-full">
          <TabsTrigger value="history" className="flex-1 gap-1">
            <Clock className="h-4 w-4" />
            추천 기록
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1 gap-1">
            <Heart className="h-4 w-4" />
            즐겨찾기
          </TabsTrigger>
          <TabsTrigger value="visited" className="flex-1 gap-1">
            <MapPinCheck className="h-4 w-4" />
            방문한 곳
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4 space-y-3">
          {history.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="추천 기록이 없어요"
              description="맛집을 추천받으면 여기에 기록돼요"
            />
          ) : (
            history.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onDelete={handleDelete}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4 space-y-3">
          {favRestaurants.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="즐겨찾기가 비어있어요"
              description="마음에 드는 맛집에 하트를 눌러보세요"
            />
          ) : (
            favRestaurants.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                isFav={favIds.includes(r.id)}
                isVis={visIds.includes(r.id)}
                onToggleFav={handleToggleFav}
                onToggleVis={handleToggleVis}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="visited" className="mt-4 space-y-3">
          {visRestaurants.length === 0 ? (
            <EmptyState
              icon={MapPinCheck}
              title="방문한 곳이 없어요"
              description="방문한 맛집을 체크해보세요"
            />
          ) : (
            visRestaurants.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                isFav={favIds.includes(r.id)}
                isVis={visIds.includes(r.id)}
                onToggleFav={handleToggleFav}
                onToggleVis={handleToggleVis}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
