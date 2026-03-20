"use client"

import Image from "next/image"
import type { PhotoCropData } from "@/domain/entities/record"

interface PhotoPickerProps {
  photos: Array<{ photoUrl: string; thumbnailUrl: string | null; cropData?: PhotoCropData | null }>
}

function cropStyle(cropData?: PhotoCropData | null): React.CSSProperties | undefined {
  if (!cropData) return undefined
  return {
    objectPosition: `${cropData.x}% ${cropData.y}%`,
    transform: `scale(${cropData.scale})`,
  }
}

export function PhotoPicker({ photos }: PhotoPickerProps) {
  if (photos.length === 0) return null

  if (photos.length === 1) {
    return (
      <div className="relative h-64 w-full overflow-hidden rounded-2xl">
        <Image
          src={photos[0].thumbnailUrl ?? photos[0].photoUrl}
          alt="기록 사진"
          fill
          className="object-cover"
          style={cropStyle(photos[0].cropData)}
        />
      </div>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
      {photos.map((photo, index) => (
        <div
          key={index}
          className="relative h-64 w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl"
        >
          <Image
            src={photo.thumbnailUrl ?? photo.photoUrl}
            alt={`기록 사진 ${index + 1}`}
            fill
            className="object-cover"
            style={cropStyle(photo.cropData)}
          />
        </div>
      ))}
    </div>
  )
}
