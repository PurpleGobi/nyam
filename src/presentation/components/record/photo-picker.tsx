"use client"

import Image from "next/image"

interface PhotoPickerProps {
  photos: Array<{ photoUrl: string; thumbnailUrl: string | null }>
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
          />
        </div>
      ))}
    </div>
  )
}
