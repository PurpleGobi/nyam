'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'

interface PhotoCropEditorProps {
  /** 원본 이미지 blob URL */
  imageUrl: string
  /** 편집 완료 시 새 File 반환 */
  onDone: (croppedFile: File) => void
  onCancel: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const CROP_SIZE_RATIO = 0.82 // 팝업 내 크롭 영역 비율

export function PhotoCropEditor({ imageUrl, onDone, onCancel }: PhotoCropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // 이미지 natural 크기
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  // 크롭 영역 (정사각형) px
  const [cropSize, setCropSize] = useState(260)

  // 변환 상태
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)

  // 드래그 상태
  const dragState = useRef<{
    active: boolean
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
  } | null>(null)

  // 핀치 상태
  const pinchState = useRef<{
    initialDist: number
    initialScale: number
  } | null>(null)

  // 크롭 영역 크기 → ref로 관리
  const computedCropSize = useRef(260)

  // 이미지 로드 + 초기 스케일 계산
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const size = Math.floor(Math.min(rect.width, rect.height) * CROP_SIZE_RATIO)
      computedCropSize.current = size
      setCropSize(size)
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })

      const cs = computedCropSize.current
      const fitScale = cs / Math.min(img.naturalWidth, img.naturalHeight)
      setScale(fitScale)
      setOffset({ x: 0, y: 0 })
    }
    img.src = imageUrl
  }, [imageUrl])

  // ── 클램프 ──
  const clampOffset = useCallback(
    (ox: number, oy: number, s: number) => {
      if (naturalSize.w === 0) return { x: ox, y: oy }
      const halfCrop = cropSize / 2
      const imgW = naturalSize.w * s
      const imgH = naturalSize.h * s
      const maxX = Math.max(0, imgW / 2 - halfCrop)
      const maxY = Math.max(0, imgH / 2 - halfCrop)
      return {
        x: Math.max(-maxX, Math.min(maxX, ox)),
        y: Math.max(-maxY, Math.min(maxY, oy)),
      }
    },
    [naturalSize, cropSize],
  )

  // ── 드래그 ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      dragState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [offset],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current?.active) return
      const dx = e.clientX - dragState.current.startX
      const dy = e.clientY - dragState.current.startY
      setOffset(
        clampOffset(
          dragState.current.startOffsetX + dx,
          dragState.current.startOffsetY + dy,
          scale,
        ),
      )
    },
    [scale, clampOffset],
  )

  const handlePointerUp = useCallback(() => {
    if (dragState.current) dragState.current.active = false
  }, [])

  // ── 핀치 줌 ──
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        pinchState.current = { initialDist: dist, initialScale: scale }
      }
    },
    [scale],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchState.current) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        const ratio = dist / pinchState.current.initialDist
        const fitScale = cropSize / Math.min(naturalSize.w, naturalSize.h)
        const minScale = Math.max(MIN_SCALE, fitScale)
        const newScale = Math.max(minScale, Math.min(MAX_SCALE, pinchState.current.initialScale * ratio))
        setScale(newScale)
        setOffset((prev) => clampOffset(prev.x, prev.y, newScale))
      }
    },
    [naturalSize, cropSize, clampOffset],
  )

  const handleTouchEnd = useCallback(() => {
    pinchState.current = null
  }, [])

  // ── 줌 버튼 ──
  const adjustScale = useCallback(
    (delta: number) => {
      const fitScale = cropSize / Math.min(naturalSize.w || 1, naturalSize.h || 1)
      const minScale = Math.max(MIN_SCALE, fitScale)
      setScale((prev) => {
        const next = Math.max(minScale, Math.min(MAX_SCALE, prev + delta))
        setOffset((o) => clampOffset(o.x, o.y, next))
        return next
      })
    },
    [naturalSize, cropSize, clampOffset],
  )

  // ── 회전 ──
  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
    setOffset({ x: 0, y: 0 })
  }, [])

  // ── 완료: Canvas 크롭 ──
  const handleDone = useCallback(() => {
    const img = imgRef.current
    if (!img) return

    const canvas = document.createElement('canvas')
    const outputSize = Math.min(PHOTO_CONSTANTS.MAX_WIDTH, cropSize / scale * (window.devicePixelRatio || 1))
    canvas.width = outputSize
    canvas.height = outputSize

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = img.naturalWidth / 2 - offset.x / scale
    const centerY = img.naturalHeight / 2 - offset.y / scale
    const cropPixels = cropSize / scale

    ctx.save()
    ctx.translate(outputSize / 2, outputSize / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-outputSize / 2, -outputSize / 2)

    ctx.drawImage(
      img,
      centerX - cropPixels / 2,
      centerY - cropPixels / 2,
      cropPixels,
      cropPixels,
      0,
      0,
      outputSize,
      outputSize,
    )
    ctx.restore()

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'cropped.webp', { type: 'image/webp' })
        onDone(file)
      },
      PHOTO_CONSTANTS.OUTPUT_FORMAT,
      PHOTO_CONSTANTS.QUALITY,
    )
  }, [scale, offset, rotation, cropSize, onDone])

  // 이미지 표시 크기 (비율 고정)
  const displayW = naturalSize.w * scale
  const displayH = naturalSize.h * scale

  return (
    /* 배경 딤 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
    >
      {/* 플로팅 팝업 카드 */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: 'min(92vw, 400px)',
          maxHeight: '85dvh',
          borderRadius: '20px',
          backgroundColor: 'var(--bg-card, #1a1a1a)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button type="button" onClick={onCancel} className="p-1" style={{ color: 'var(--text-hint, #999)' }}>
            <X size={20} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text, #fff)' }}>사진 편집</span>
          <button
            type="button"
            onClick={handleDone}
            className="rounded-full px-3 py-1"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor: 'var(--accent-food, #f97316)',
            }}
          >
            완료
          </button>
        </div>

        {/* 크롭 영역 */}
        <div
          ref={containerRef}
          className="relative flex touch-none items-center justify-center overflow-hidden"
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            backgroundColor: '#000',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 이미지 */}
          {naturalSize.w > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              crossOrigin="anonymous"
              draggable={false}
              style={{
                width: `${displayW}px`,
                height: `${displayH}px`,
                minWidth: `${displayW}px`,
                minHeight: `${displayH}px`,
                flexShrink: 0,
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* 크롭 오버레이 */}
          <div className="pointer-events-none absolute inset-0">
            {/* 상 */}
            <div
              className="absolute left-0 right-0 top-0"
              style={{ height: `calc(50% - ${cropSize / 2}px)`, backgroundColor: 'rgba(0,0,0,0.5)' }}
            />
            {/* 하 */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{ height: `calc(50% - ${cropSize / 2}px)`, backgroundColor: 'rgba(0,0,0,0.5)' }}
            />
            {/* 좌 */}
            <div
              className="absolute left-0"
              style={{
                top: `calc(50% - ${cropSize / 2}px)`,
                width: `calc(50% - ${cropSize / 2}px)`,
                height: `${cropSize}px`,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            />
            {/* 우 */}
            <div
              className="absolute right-0"
              style={{
                top: `calc(50% - ${cropSize / 2}px)`,
                width: `calc(50% - ${cropSize / 2}px)`,
                height: `${cropSize}px`,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            />
            {/* 프레임 */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: `${cropSize}px`,
                height: `${cropSize}px`,
                transform: 'translate(-50%, -50%)',
                border: '2px solid rgba(255,255,255,0.5)',
                borderRadius: '4px',
              }}
            >
              {/* 3분할 그리드 */}
              <div className="absolute inset-0" style={{ opacity: 0.2 }}>
                <div className="absolute left-1/3 top-0 h-full" style={{ width: '1px', backgroundColor: '#FFF' }} />
                <div className="absolute left-2/3 top-0 h-full" style={{ width: '1px', backgroundColor: '#FFF' }} />
                <div className="absolute left-0 top-1/3 w-full" style={{ height: '1px', backgroundColor: '#FFF' }} />
                <div className="absolute left-0 top-2/3 w-full" style={{ height: '1px', backgroundColor: '#FFF' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 하단 컨트롤 */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            type="button"
            onClick={() => adjustScale(-0.2)}
            className="flex items-center justify-center rounded-full p-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-sub, #aaa)' }}
          >
            <ZoomOut size={18} />
          </button>

          <input
            type="range"
            min={Math.max(MIN_SCALE, cropSize / Math.min(naturalSize.w || 1, naturalSize.h || 1))}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => {
              const v = Number(e.target.value)
              setScale(v)
              setOffset((o) => clampOffset(o.x, o.y, v))
            }}
            className="flex-1"
            style={{ accentColor: 'var(--accent-food, #f97316)' }}
          />

          <button
            type="button"
            onClick={() => adjustScale(0.2)}
            className="flex items-center justify-center rounded-full p-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-sub, #aaa)' }}
          >
            <ZoomIn size={18} />
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

          <button
            type="button"
            onClick={handleRotate}
            className="flex items-center justify-center rounded-full p-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-sub, #aaa)' }}
          >
            <RotateCw size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
