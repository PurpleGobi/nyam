"use client"

import { useRef } from "react"
import Image from "next/image"
import { Camera, ImagePlus, X } from "lucide-react"
import { cn } from "@/shared/utils/cn"

interface PhotoCaptureSheetProps {
  photos: File[]
  previews: string[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  maxPhotos?: number
}

export function PhotoCaptureSheet({
  photos,
  previews,
  onAdd,
  onRemove,
  maxPhotos = 8,
}: PhotoCaptureSheetProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = maxPhotos - photos.length
    onAdd(files.slice(0, remaining))
    e.target.value = ""
  }

  return (
    <div className="space-y-3">
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-xl">
              <Image
                src={preview}
                alt={`Photo ${index + 1}`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < maxPhotos && (
            <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 text-neutral-400">
              <span className="text-xs">{photos.length}/{maxPhotos}</span>
            </div>
          )}
        </div>
      )}

      {photos.length < maxPhotos && (
        <div className="flex gap-2">
          <label
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 py-3 text-sm text-neutral-600",
              "hover:bg-neutral-50 active:scale-[0.98] transition-all",
            )}
          >
            <Camera className="h-4 w-4" />
            <span>촬영</span>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <label
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 py-3 text-sm text-neutral-600",
              "hover:bg-neutral-50 active:scale-[0.98] transition-all",
            )}
          >
            <ImagePlus className="h-4 w-4" />
            <span>앨범</span>
            <input
              ref={albumRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  )
}
