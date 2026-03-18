import { Sparkles } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import type { RecordType } from "@/infrastructure/supabase/types"
import { FOOD_CATEGORIES, COOKING_GENRES, WINE_TYPES } from "@/shared/constants/categories"
import { FLAVOR_TAGS, TEXTURE_TAGS } from "@/shared/constants/tags"
import { RESTAURANT_SCENES, WINE_SCENES, COOKING_SCENES } from "@/shared/constants/scenes"

interface AiResultCardProps {
  recordType: RecordType
  menuName: string
  genre: string
  flavorTags: string[]
  textureTags: string[]
  scene: string
  orderedItems?: string[]
  confidence?: number
  onMenuNameChange: (value: string) => void
  onGenreChange: (value: string) => void
  onFlavorTagsChange: (tags: string[]) => void
  onTextureTagsChange: (tags: string[]) => void
  onSceneChange: (value: string) => void
}

const inputClass =
  "h-11 w-full rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 px-3.5 text-sm outline-none transition-colors focus:border-[#FF6038]"

function ChipToggle({
  items,
  selected,
  onChange,
  variant,
}: {
  items: readonly string[]
  selected: string[]
  onChange: (next: string[]) => void
  variant: "flavor" | "texture" | "scene"
}) {
  const toggle = (item: string) => {
    onChange(
      selected.includes(item)
        ? selected.filter((t) => t !== item)
        : [...selected, item],
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item)
        return (
          <button
            key={item}
            type="button"
            onClick={() => toggle(item)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
              active
                ? variant === "flavor"
                  ? "bg-orange-500 text-white"
                  : variant === "texture"
                    ? "bg-green-500 text-white"
                    : "bg-[#FF6038] text-white"
                : variant === "flavor"
                  ? "bg-orange-50 text-orange-700"
                  : variant === "texture"
                    ? "bg-green-50 text-green-700"
                    : "bg-neutral-100 text-neutral-500",
            )}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}

export function AiResultCard({
  recordType,
  menuName,
  genre,
  flavorTags,
  textureTags,
  scene,
  orderedItems,
  confidence,
  onMenuNameChange,
  onGenreChange,
  onFlavorTagsChange,
  onTextureTagsChange,
  onSceneChange,
}: AiResultCardProps) {
  const genreOptions =
    recordType === "cooking"
      ? COOKING_GENRES
      : recordType === "wine"
        ? WINE_TYPES
        : FOOD_CATEGORIES

  const sceneOptions =
    recordType === "wine"
      ? WINE_SCENES
      : recordType === "cooking"
        ? COOKING_SCENES
        : RESTAURANT_SCENES

  const nameLabel =
    recordType === "wine" ? "와인명" : recordType === "cooking" ? "요리명" : "상호명 / 메뉴명"

  const genreLabel = recordType === "wine" ? "품종" : "장르"

  return (
    <div className="space-y-3 rounded-2xl bg-primary-50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary-500" />
        <span className="text-xs font-medium text-primary-500">AI 인식 결과</span>
        {confidence != null && confidence > 0 && (
          <span className="text-[10px] text-neutral-400">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>

      {/* Name input */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{nameLabel}</label>
        <input
          type="text"
          value={menuName}
          onChange={(e) => onMenuNameChange(e.target.value)}
          placeholder={nameLabel}
          className={inputClass}
        />
      </div>

      {/* Genre select */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{genreLabel}</label>
        <select
          value={genre}
          onChange={(e) => onGenreChange(e.target.value)}
          className={inputClass}
        >
          <option value="">선택</option>
          {genreOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ordered items (read-only reference) */}
      {orderedItems && orderedItems.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">메뉴 추정</label>
          <p className="text-xs text-neutral-500">{orderedItems.join(", ")}</p>
        </div>
      )}

      {/* Flavor tags */}
      {recordType !== "wine" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">맛 태그</label>
          <ChipToggle
            items={FLAVOR_TAGS}
            selected={flavorTags}
            onChange={onFlavorTagsChange}
            variant="flavor"
          />
        </div>
      )}

      {/* Texture tags */}
      {recordType !== "wine" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">식감 태그</label>
          <ChipToggle
            items={TEXTURE_TAGS}
            selected={textureTags}
            onChange={onTextureTagsChange}
            variant="texture"
          />
        </div>
      )}

      {/* Scene */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">상황</label>
        <div className="flex flex-wrap gap-1.5">
          {sceneOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSceneChange(scene === opt.value ? "" : opt.value)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                scene === opt.value
                  ? "bg-[#FF6038] text-white"
                  : "bg-neutral-100 text-neutral-500",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
