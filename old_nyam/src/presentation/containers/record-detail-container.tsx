"use client"

import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useState, useRef } from "react"
import {
  ArrowLeft,
  Star,
  MapPin,
  Calendar,
  Tag,
  MessageSquare,
  Eye,
  EyeOff,
  Users,
  UtensilsCrossed,
  Wine,
  ChefHat,
  MoreHorizontal,
  Pencil,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Heart,
  ThumbsUp,
  Sparkles,
  Share2,
  NotebookPen,
  CheckCircle2,
} from "lucide-react"
import { useRecordDetail } from "@/application/hooks/use-record-detail"
import { useRecordActions } from "@/application/hooks/use-record-actions"
import { useBookmarks } from "@/application/hooks/use-bookmarks"
import { useBookmarkActions } from "@/application/hooks/use-bookmark-actions"
import { useReactions } from "@/application/hooks/use-reactions"
import { useReactionActions } from "@/application/hooks/use-reaction-actions"
import { useShareCard } from "@/application/hooks/use-share-card"
import { useProfile } from "@/application/hooks/use-profile"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { ShareCard } from "@/presentation/components/record/share-card"
import type { Reaction } from "@/application/hooks/use-reactions"
import type { FoodRecord, RecordType, RestaurantRatings, WineRatings, CookingRatings } from "@/domain/entities/record"

const REACTION_CONFIG = [
  { type: 'like', label: '좋아요', icon: Heart },
  { type: 'useful', label: '유용해요', icon: ThumbsUp },
  { type: 'yummy', label: '맛있겠다', icon: Sparkles },
] as const

const RECORD_TYPE_CONFIG: Record<RecordType, { label: string; icon: typeof UtensilsCrossed }> = {
  restaurant: { label: '외식', icon: UtensilsCrossed },
  wine: { label: '와인', icon: Wine },
  cooking: { label: '요리', icon: ChefHat },
}

const RESTAURANT_RATING_LABELS: Record<keyof RestaurantRatings, string> = {
  taste: '맛',
  value: '가성비',
  service: '서비스',
  atmosphere: '분위기',
  cleanliness: '청결',
  portion: '양',
}

const WINE_RATING_LABELS: Record<keyof WineRatings, string> = {
  aroma: '향',
  body: '바디감',
  acidity: '산미',
  finish: '여운',
  balance: '밸런스',
  value: '가성비',
}

const COOKING_RATING_LABELS: Record<keyof CookingRatings, string> = {
  taste: '맛',
  difficulty: '난이도',
  timeSpent: '소요시간',
  reproducibility: '재현성',
  plating: '플레이팅',
  value: '재료비',
}

const VISIBILITY_CONFIG: Record<string, { label: string; icon: typeof Eye }> = {
  private: { label: '나만 보기', icon: EyeOff },
  group: { label: '버블 공개', icon: Users },
  public: { label: '전체 공개', icon: Eye },
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  situation: { bg: 'bg-blue-50', text: 'text-blue-700' },
  flavor: { bg: 'bg-orange-50', text: 'text-orange-700' },
  texture: { bg: 'bg-green-50', text: 'text-green-700' },
  atmosphere: { bg: 'bg-purple-50', text: 'text-purple-700' },
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.min(value, 100)
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs text-[var(--color-neutral-600)]">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-[var(--color-neutral-100)]">
        <div
          className="h-2 rounded-full bg-[#FF6038] transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-medium text-[var(--color-neutral-700)]">
        {value}
      </span>
    </div>
  )
}

function getRatingEntries(record: FoodRecord): Array<{ label: string; value: number }> {
  const { recordType, ratings } = record

  if (recordType === 'wine') {
    const r = ratings as WineRatings
    return Object.entries(WINE_RATING_LABELS).map(([key, label]) => ({
      label,
      value: r[key as keyof WineRatings],
    }))
  }

  if (recordType === 'cooking') {
    const r = ratings as CookingRatings
    return Object.entries(COOKING_RATING_LABELS).map(([key, label]) => ({
      label,
      value: r[key as keyof CookingRatings],
    }))
  }

  const r = ratings as RestaurantRatings
  return Object.entries(RESTAURANT_RATING_LABELS).map(([key, label]) => ({
    label,
    value: r[key as keyof RestaurantRatings],
  }))
}

function TagChips({ tags, colorKey }: { tags: string[]; colorKey: string }) {
  if (tags.length === 0) return null
  const color = TAG_COLORS[colorKey] ?? TAG_COLORS.situation
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${color.bg} ${color.text}`}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

function PhotoCarousel({ photos }: { photos: NonNullable<FoodRecord['photos']> }) {
  if (photos.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {photos
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((photo) => (
          <div
            key={photo.id}
            className="relative h-64 w-full shrink-0 overflow-hidden rounded-2xl bg-[var(--color-neutral-100)]"
            style={{ minWidth: photos.length > 1 ? '85%' : '100%' }}
          >
            <Image
              src={photo.photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 85vw, 400px"
            />
          </div>
        ))}
    </div>
  )
}

export function RecordDetailContainer() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : undefined

  const { record, restaurant, isLoading } = useRecordDetail(id)
  const { deleteRecord } = useRecordActions()
  const { user: authUser } = useAuthContext()
  const { user: profileUser } = useProfile(authUser?.id)
  const { generateAndShare, isGenerating } = useShareCard()
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [showShareCard, setShowShareCard] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const { bookmarkedIds, mutate: mutateBookmarks } = useBookmarks(authUser?.id)
  const { toggleBookmark, isLoading: bookmarkLoading } = useBookmarkActions()
  const { reactions, mutate: mutateReactions } = useReactions(id)
  const { toggleReaction, isLoading: reactionLoading } = useReactionActions()

  const isOwner = authUser?.id != null && record?.userId === authUser.id
  const isBookmarked = id ? bookmarkedIds.has(id) : false

  const handleToggleBookmark = async () => {
    if (!id || !authUser?.id || bookmarkLoading) return
    await toggleBookmark(id, authUser.id, isBookmarked)
    await mutateBookmarks()
  }

  const handleToggleReaction = async (reactionType: string) => {
    if (!id || !authUser?.id || reactionLoading) return
    const existing = reactions.find(
      (r: Reaction) => r.userId === authUser.id && r.reactionType === reactionType,
    )
    await toggleReaction(id, authUser.id, reactionType, existing?.id ?? null)
    await mutateReactions()
  }

  const getReactionCount = (reactionType: string): number =>
    reactions.filter((r: Reaction) => r.reactionType === reactionType).length

  const hasUserReacted = (reactionType: string): boolean =>
    reactions.some(
      (r: Reaction) => r.userId === authUser?.id && r.reactionType === reactionType,
    )

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) return
    setMenuOpen(false)
    const success = await deleteRecord(id)
    if (success) {
      router.replace('/')
    }
  }

  const handleEdit = () => {
    if (!id) return
    setMenuOpen(false)
    router.push(`/records/${id}/edit`)
  }

  const handleShare = async () => {
    if (!record) return
    setShowShareCard(true)
    // Wait for the card to render in the DOM
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        if (shareCardRef.current) {
          await generateAndShare(shareCardRef.current, record.menuName)
        }
        setShowShareCard(false)
      })
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-neutral-100)]" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-[var(--color-neutral-100)]" />
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--color-neutral-100)]" />
        <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-neutral-100)]" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-[var(--color-neutral-100)]" />
          ))}
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 pt-20">
        <p className="text-sm text-[var(--color-neutral-500)]">기록을 찾을 수 없습니다</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-[#FF6038]"
        >
          돌아가기
        </button>
      </div>
    )
  }

  const photos = record.photos ?? []
  const typeConfig = RECORD_TYPE_CONFIG[record.recordType]
  const TypeIcon = typeConfig.icon
  const visConfig = VISIBILITY_CONFIG[record.visibility]
  const VisIcon = visConfig.icon
  const ratingEntries = getRatingEntries(record)
  const formattedDate = new Date(record.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const hasAnyTags =
    record.tags.length > 0 ||
    record.flavorTags.length > 0 ||
    record.textureTags.length > 0 ||
    record.atmosphereTags.length > 0

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neutral-50)]"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-neutral-700)]" />
        </button>
        <h1 className="flex-1 truncate text-base font-semibold text-[var(--color-neutral-800)]">
          기록 상세
        </h1>
        <button
          type="button"
          onClick={handleShare}
          disabled={isGenerating}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neutral-50)] disabled:opacity-50"
          aria-label="공유 카드 생성"
        >
          <Share2 className="h-5 w-5 text-[var(--color-neutral-700)]" />
        </button>
        {authUser && (
          <button
            type="button"
            onClick={handleToggleBookmark}
            disabled={bookmarkLoading}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neutral-50)]"
            aria-label={isBookmarked ? '북마크 해제' : '북마크'}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 text-[#FF6038]" />
            ) : (
              <Bookmark className="h-5 w-5 text-[var(--color-neutral-700)]" />
            )}
          </button>
        )}
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-neutral-50)] px-2.5 py-1">
          <VisIcon className="h-3.5 w-3.5 text-[var(--color-neutral-500)]" />
          <span className="text-xs text-[var(--color-neutral-500)]">{visConfig.label}</span>
        </div>
        {isOwner && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neutral-50)]"
              aria-label="더보기"
            >
              <MoreHorizontal className="h-5 w-5 text-[var(--color-neutral-700)]" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-[var(--color-neutral-200)] bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]"
                  >
                    <Pencil className="h-4 w-4" />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="px-4">
          <PhotoCarousel photos={photos} />
        </div>
      )}

      {/* Title & Meta */}
      <div className="flex flex-col gap-2 px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-[var(--color-neutral-800)]">
            {record.menuName}
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-[#FF6038]/10 px-2.5 py-0.5">
            <TypeIcon className="h-3.5 w-3.5 text-[#FF6038]" />
            <span className="text-xs font-medium text-[#FF6038]">{typeConfig.label}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--color-neutral-500)]">
          {record.category && (
            <span>{record.category}{record.subCategory ? ` / ${record.subCategory}` : ''}</span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Restaurant Info */}
      {restaurant && record.restaurantId && (
        <div className="px-4">
          <Link
            href={`/restaurants/${record.restaurantId}`}
            className="flex items-center gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-neutral-50)]">
              <MapPin className="h-5 w-5 text-[#FF6038]" />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium text-[var(--color-neutral-800)]">
                {restaurant.name}
              </span>
              <span className="text-xs text-[var(--color-neutral-500)]">
                {restaurant.address}
              </span>
            </div>
            <ArrowLeft className="h-4 w-4 rotate-180 text-[var(--color-neutral-400)]" />
          </Link>
        </div>
      )}

      {/* Overall Rating */}
      <div className="px-4">
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
          <Star className="h-7 w-7 text-[#FF6038]" />
          <span className="text-3xl font-bold text-[var(--color-neutral-800)]">
            {Math.round(record.ratingOverall)}
          </span>
          <span className="text-sm text-[var(--color-neutral-400)]">/ 100</span>
        </div>
      </div>

      {/* Rating Bars */}
      <div className="px-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
          <span className="text-sm font-semibold text-[var(--color-neutral-700)]">
            세부 평가
          </span>
          <div className="flex flex-col gap-2.5">
            {ratingEntries.map((entry) => (
              <RatingBar key={entry.label} label={entry.label} value={entry.value} />
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      {hasAnyTags && (
        <div className="px-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
            <div className="flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-[var(--color-neutral-500)]" />
              <span className="text-sm font-semibold text-[var(--color-neutral-700)]">
                태그
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {record.tags.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-neutral-400)]">상황</span>
                  <TagChips tags={record.tags} colorKey="situation" />
                </div>
              )}
              {record.flavorTags.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-neutral-400)]">맛</span>
                  <TagChips tags={record.flavorTags} colorKey="flavor" />
                </div>
              )}
              {record.textureTags.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-neutral-400)]">식감</span>
                  <TagChips tags={record.textureTags} colorKey="texture" />
                </div>
              )}
              {record.atmosphereTags.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-neutral-400)]">분위기</span>
                  <TagChips tags={record.atmosphereTags} colorKey="atmosphere" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comment */}
      {record.comment && (
        <div className="px-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-[var(--color-neutral-500)]" />
              <span className="text-sm font-semibold text-[var(--color-neutral-700)]">
                코멘트
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-neutral-600)]">
              {record.comment}
            </p>
          </div>
        </div>
      )}

      {/* Phase 2 CTA */}
      {isOwner && record.phaseStatus < 2 && (
        <div className="px-4">
          <Link
            href={`/records/${id}/complete`}
            className="flex items-center justify-between rounded-2xl border border-[#FF6038]/20 bg-[#FF6038]/5 p-4 transition-colors hover:bg-[#FF6038]/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6038]/10">
                <NotebookPen className="h-5 w-5 text-[#FF6038]" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
                  AI 블로그 리뷰 작성하기
                </span>
                <span className="text-xs text-[var(--color-neutral-500)]">
                  질문에 답하면 AI가 블로그를 만들어드려요 · +15 XP
                </span>
              </div>
            </div>
            <ArrowLeft className="h-4 w-4 rotate-180 text-[#FF6038]" />
          </Link>
        </div>
      )}

      {/* Phase 2 completed badge */}
      {record.phaseStatus >= 2 && (
        <div className="px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">AI 블로그 리뷰 완료</span>
          </div>
        </div>
      )}

      {/* Reactions */}
      <div className="px-4">
        <div className="flex items-center gap-2">
          {REACTION_CONFIG.map(({ type, label, icon: Icon }) => {
            const count = getReactionCount(type)
            const active = hasUserReacted(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleToggleReaction(type)}
                disabled={!authUser || reactionLoading}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-[#FF6038]/30 bg-[#FF6038]/10 text-[#FF6038]'
                    : 'border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]'
                }`}
                aria-label={label}
              >
                <Icon className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
                {count > 0 && (
                  <span className="text-xs font-medium">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hidden share card for image capture */}
      {showShareCard && (
        <div
          style={{ position: 'absolute', left: -9999, top: 0, opacity: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <ShareCard
            ref={shareCardRef}
            record={record}
            restaurant={restaurant}
            userName={profileUser?.nickname ?? 'nyam 유저'}
          />
        </div>
      )}
    </div>
  )
}
