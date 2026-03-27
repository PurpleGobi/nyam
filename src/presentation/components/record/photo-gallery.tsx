'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { RecordPhoto } from '@/domain/entities/record-photo'

interface PhotoGalleryProps {
  photos: RecordPhoto[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null)

  if (photos.length === 0) return null

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setFullscreenIndex(i)}
            className="shrink-0 overflow-hidden rounded-lg"
            style={{ height: '192px', width: '192px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {fullscreenIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
        >
          <button
            type="button"
            onClick={() => setFullscreenIndex(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <X size={24} color="#FFFFFF" />
          </button>

          {fullscreenIndex > 0 && (
            <button
              type="button"
              onClick={() => setFullscreenIndex(fullscreenIndex - 1)}
              className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </button>
          )}

          {fullscreenIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={() => setFullscreenIndex(fullscreenIndex + 1)}
              className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ChevronRight size={24} color="#FFFFFF" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[fullscreenIndex].url}
            alt=""
            className="max-h-[80vh] max-w-[90vw] object-contain"
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[14px] text-white">
            {fullscreenIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  )
}
