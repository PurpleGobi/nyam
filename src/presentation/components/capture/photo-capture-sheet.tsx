'use client'

import { Camera, Image as ImageIcon, Plus, X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface PhotoCaptureSheetProps {
  photos: File[]
  maxPhotos?: number
  onPhotosAdd: (files: File[]) => void
  onPhotoRemove: (index: number) => void
}

export function PhotoCaptureSheet({
  photos,
  maxPhotos = 8,
  onPhotosAdd,
  onPhotoRemove,
}: PhotoCaptureSheetProps) {
  const canAdd = photos.length < maxPhotos

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      const remaining = maxPhotos - photos.length
      onPhotosAdd(files.slice(0, remaining))
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative aspect-square">
              <div className="w-full h-full rounded-xl overflow-hidden bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`사진 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onPhotoRemove(index)}
                  className="absolute top-1.5 right-1.5 size-6 flex items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}

          {canAdd && (
            <label
              className={cn(
                'aspect-square rounded-xl border-2 border-dashed border-neutral-200 cursor-pointer',
                'flex flex-col items-center justify-center gap-1.5',
                'text-neutral-400 hover:border-[#FF6038] hover:text-[#FF6038] transition-colors',
              )}
            >
              <Plus className="size-6" />
              <span className="text-[11px]">{photos.length}/{maxPhotos}</span>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>
      )}

      {canAdd && (
        <div className="grid grid-cols-2 gap-3">
          <label
            className={cn(
              'flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer',
              'border-2 border-dashed border-[#FF6038]/30 bg-[#FF6038]/5',
              'text-[#FF6038] hover:bg-[#FF6038]/10 transition-colors',
            )}
          >
            <Camera className="size-7" />
            <span className="text-sm font-medium">사진 촬영</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          </label>

          <label
            className={cn(
              'flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer',
              'border-2 border-dashed border-neutral-200',
              'text-neutral-500 hover:border-neutral-300 hover:text-neutral-600 transition-colors',
            )}
          >
            <ImageIcon className="size-7" />
            <span className="text-sm font-medium">앨범에서 선택</span>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      )}

      <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
        <p className="text-xs text-neutral-500 leading-relaxed">
          💡 <span className="font-medium text-neutral-600">간판, 메뉴판, 음식, 영수증</span> 사진이 있으면
          AI가 더 정확하게 분석합니다
        </p>
      </div>
    </div>
  )
}
