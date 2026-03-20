"use client"

import { useCallback, useRef, useState } from "react"
import Image from "next/image"
import { Crosshair, ZoomIn } from "lucide-react"
import { Slider } from "@/presentation/components/ui/slider"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/presentation/components/ui/sheet"
import { Button } from "@/presentation/components/ui/button"
import type { PhotoCropData } from "@/domain/entities/record"

interface PhotoCropEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  photoUrl: string
  initialCrop: PhotoCropData | null
  onApply: (cropData: PhotoCropData) => void
}

const DEFAULT_CROP: PhotoCropData = { x: 50, y: 50, scale: 1 }

export function PhotoCropEditor({
  open,
  onOpenChange,
  photoUrl,
  initialCrop,
  onApply,
}: PhotoCropEditorProps) {
  const [crop, setCrop] = useState<PhotoCropData>(initialCrop ?? DEFAULT_CROP)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setCrop((prev) => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }))
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.changedTouches.length === 0) return
    const touch = e.changedTouches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((touch.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((touch.clientY - rect.top) / rect.height) * 100)
    setCrop((prev) => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }))
  }, [])

  const handleScaleChange = useCallback((value: number | readonly number[]) => {
    const v = Array.isArray(value) ? value[0] : value
    setCrop((prev) => ({ ...prev, scale: v / 100 }))
  }, [])

  const handleApply = useCallback(() => {
    onApply(crop)
    onOpenChange(false)
  }, [crop, onApply, onOpenChange])

  const handleReset = useCallback(() => {
    setCrop(DEFAULT_CROP)
  }, [])

  // Reset state when sheet opens
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setCrop(initialCrop ?? DEFAULT_CROP)
    }
    onOpenChange(nextOpen)
  }, [initialCrop, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl px-4 pb-6">
        <SheetHeader className="px-0">
          <SheetTitle>크롭 조정</SheetTitle>
        </SheetHeader>

        {/* Full photo with focal point indicator */}
        <div className="space-y-4">
          <div
            ref={containerRef}
            className="relative mx-auto aspect-square w-full max-w-[320px] cursor-crosshair overflow-hidden rounded-xl bg-neutral-100"
            onClick={handleImageClick}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={photoUrl}
              alt=""
              fill
              className="object-contain pointer-events-none select-none"
              draggable={false}
            />
            {/* Focal point indicator */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${crop.x}%`, top: `${crop.y}%` }}
            >
              <Crosshair className="h-6 w-6 text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]" />
            </div>
          </div>

          {/* Crop preview */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-neutral-500">미리보기</span>
            <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-neutral-100">
              <Image
                src={photoUrl}
                alt=""
                fill
                className="object-cover pointer-events-none select-none"
                style={{
                  objectPosition: `${crop.x}% ${crop.y}%`,
                  transform: `scale(${crop.scale})`,
                }}
                draggable={false}
              />
            </div>
            <div className="relative h-20 w-32 overflow-hidden rounded-xl bg-neutral-100">
              <Image
                src={photoUrl}
                alt=""
                fill
                className="object-cover pointer-events-none select-none"
                style={{
                  objectPosition: `${crop.x}% ${crop.y}%`,
                  transform: `scale(${crop.scale})`,
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* Scale slider */}
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-neutral-400" />
            <Slider
              min={100}
              max={200}
              step={5}
              value={[Math.round(crop.scale * 100)]}
              onValueChange={handleScaleChange}
            />
            <span className="w-10 text-right text-xs text-neutral-500">{Math.round(crop.scale * 100)}%</span>
          </div>

          <p className="text-center text-[10px] text-neutral-400">
            사진을 탭하여 초점 위치를 지정하세요
          </p>
        </div>

        <SheetFooter className="flex-row gap-2 px-0">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            초기화
          </Button>
          <Button onClick={handleApply} className="flex-1">
            적용
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
