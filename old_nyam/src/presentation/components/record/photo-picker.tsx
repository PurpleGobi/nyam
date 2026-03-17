'use client'

import { useRef } from 'react'
import { Camera, Plus, X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface PhotoPickerProps {
  photos: File[]
  onPhotosChange: (files: File[]) => void
  maxPhotos?: number
}

export function PhotoPicker({
  photos,
  onPhotosChange,
  maxPhotos = 5,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const remaining = maxPhotos - photos.length
    const newFiles = Array.from(files).slice(0, remaining)
    onPhotosChange([...photos, ...newFiles])
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-700">
          사진
        </span>
        <span className="text-xs text-neutral-400">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(file)}
              alt={`선택된 사진 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 size-5 flex items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'aspect-square rounded-lg border-2 border-dashed border-neutral-200',
              'flex flex-col items-center justify-center gap-1',
              'text-neutral-400 hover:border-neutral-300 transition-colors',
            )}
          >
            {photos.length === 0 ? (
              <Camera className="size-6" />
            ) : (
              <Plus className="size-6" />
            )}
            <span className="text-xs">추가</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
