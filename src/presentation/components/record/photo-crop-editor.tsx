'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'

interface PhotoCropEditorProps {
  /** 원본 이미지 blob URL */
  imageUrl: string
  /** 편집 완료 시 새 File 반환 */
  onDone: (croppedFile: File) => void
  onCancel: () => void
}

const MAX_SCALE = 4
const CROP_SIZE_RATIO = 0.82
const MIN_CROP_SIZE = 100
const HANDLE_HIT = 28 // 코너 핸들 터치 히트 영역(px)

type Corner = 'tl' | 'tr' | 'bl' | 'br'

/** 각 코너의 앵커(반대편 코너) 방향 부호 */
const CORNER_ANCHOR: Record<Corner, { ax: number; ay: number }> = {
  tl: { ax: 1, ay: 1 },   // anchor = bottom-right
  tr: { ax: -1, ay: 1 },  // anchor = bottom-left
  bl: { ax: 1, ay: -1 },  // anchor = top-right
  br: { ax: -1, ay: -1 }, // anchor = top-left
}

export function PhotoCropEditor({ imageUrl, onDone, onCancel }: PhotoCropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // 이미지 natural 크기
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  // 크롭 영역 (정사각형) px — 이제 리사이즈 가능
  const [cropSize, setCropSize] = useState(260)
  // 크롭 중심 오프셋 (컨테이너 중심 기준)
  const [cropCenter, setCropCenter] = useState({ x: 0, y: 0 })
  // 컨테이너 크기 (정사각형)
  const [containerDim, setContainerDim] = useState(0)

  // 변환 상태
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)

  // 인터랙션 상태
  const interactionRef = useRef<{
    mode: 'pan' | 'resize' | 'move-crop'
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
    corner: Corner
    anchorX: number
    anchorY: number
    startCropX: number
    startCropY: number
  } | null>(null)

  // 핀치 상태
  const pinchState = useRef<{
    initialDist: number
    initialScale: number
  } | null>(null)

  const initCropSize = useRef(260)

  // ── 이미지 로드 + 초기 스케일 ──
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const dim = Math.min(rect.width, rect.height)
      setContainerDim(dim)
      const cs = Math.floor(dim * CROP_SIZE_RATIO)
      initCropSize.current = cs
      setCropSize(cs)
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })

      const cs = initCropSize.current
      const fitScale = cs / Math.min(img.naturalWidth, img.naturalHeight)
      setScale(fitScale)
      setOffset({ x: 0, y: 0 })
    }
    img.src = imageUrl
  }, [imageUrl])

  // ── 이미지 오프셋 클램프 (이미지가 크롭 영역을 완전히 덮도록) ──
  const clampOffset = useCallback(
    (ox: number, oy: number, s: number, cc?: { x: number; y: number }, cs?: number) => {
      if (naturalSize.w === 0) return { x: ox, y: oy }
      const ccc = cc ?? cropCenter
      const ccs = cs ?? cropSize
      const halfCrop = ccs / 2
      const marginX = Math.max(0, naturalSize.w * s / 2 - halfCrop)
      const marginY = Math.max(0, naturalSize.h * s / 2 - halfCrop)
      return {
        x: Math.max(ccc.x - marginX, Math.min(ccc.x + marginX, ox)),
        y: Math.max(ccc.y - marginY, Math.min(ccc.y + marginY, oy)),
      }
    },
    [naturalSize, cropSize, cropCenter],
  )

  // ── 크롭 프레임 이동 클램프 (컨테이너 + 이미지 범위 내) ──
  const clampCropCenter = useCallback(
    (cx: number, cy: number, cs: number, constrainToImage: boolean) => {
      if (containerDim === 0) return { x: cx, y: cy }
      const halfCrop = cs / 2
      const halfC = containerDim / 2
      let minX = -(halfC - halfCrop)
      let maxX = halfC - halfCrop
      let minY = minX
      let maxY = maxX
      if (constrainToImage && naturalSize.w > 0) {
        const imgHalfW = naturalSize.w * scale / 2
        const imgHalfH = naturalSize.h * scale / 2
        minX = Math.max(minX, offset.x - imgHalfW + halfCrop)
        maxX = Math.min(maxX, offset.x + imgHalfW - halfCrop)
        minY = Math.max(minY, offset.y - imgHalfH + halfCrop)
        maxY = Math.min(maxY, offset.y + imgHalfH - halfCrop)
      }
      return {
        x: Math.max(minX, Math.min(maxX, cx)),
        y: Math.max(minY, Math.min(maxY, cy)),
      }
    },
    [containerDim, naturalSize, scale, offset],
  )

  // ── 포인터 다운: 히트 영역에 따라 모드 결정 ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const cropCX = rect.width / 2 + cropCenter.x
      const cropCY = rect.height / 2 + cropCenter.y
      const cropL = cropCX - cropSize / 2
      const cropT = cropCY - cropSize / 2
      const cropR = cropL + cropSize
      const cropB = cropT + cropSize

      // 1) 코너 핸들 체크 → resize
      const corners: Corner[] = ['tl', 'tr', 'bl', 'br']
      const cornerPos: Record<Corner, [number, number]> = {
        tl: [cropL, cropT],
        tr: [cropR, cropT],
        bl: [cropL, cropB],
        br: [cropR, cropB],
      }
      for (const c of corners) {
        const [cx, cy] = cornerPos[c]
        if (Math.abs(px - cx) < HANDLE_HIT && Math.abs(py - cy) < HANDLE_HIT) {
          const { ax, ay } = CORNER_ANCHOR[c]
          interactionRef.current = {
            mode: 'resize',
            startX: e.clientX,
            startY: e.clientY,
            startOffsetX: offset.x,
            startOffsetY: offset.y,
            corner: c,
            anchorX: cropCX + ax * cropSize / 2,
            anchorY: cropCY + ay * cropSize / 2,
            startCropX: cropCenter.x,
            startCropY: cropCenter.y,
          }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          return
        }
      }

      // 2) 크롭 영역 내부 → 이미지 팬
      if (px >= cropL && px <= cropR && py >= cropT && py <= cropB) {
        interactionRef.current = {
          mode: 'pan',
          startX: e.clientX,
          startY: e.clientY,
          startOffsetX: offset.x,
          startOffsetY: offset.y,
          corner: 'br',
          anchorX: 0,
          anchorY: 0,
          startCropX: 0,
          startCropY: 0,
        }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      // 3) 크롭 바깥(오버레이 영역) → 크롭 프레임 이동
      interactionRef.current = {
        mode: 'move-crop',
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: 0,
        startOffsetY: 0,
        corner: 'br',
        anchorX: 0,
        anchorY: 0,
        startCropX: cropCenter.x,
        startCropY: cropCenter.y,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [cropCenter, cropSize, offset],
  )

  // ── 포인터 무브 ──
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = interactionRef.current
      if (!state) return

      if (state.mode === 'pan') {
        const dx = e.clientX - state.startX
        const dy = e.clientY - state.startY
        setOffset(clampOffset(state.startOffsetX + dx, state.startOffsetY + dy, scale))
        return
      }

      if (state.mode === 'move-crop') {
        const dx = e.clientX - state.startX
        const dy = e.clientY - state.startY
        const newCC = clampCropCenter(state.startCropX + dx, state.startCropY + dy, cropSize, true)
        setCropCenter(newCC)
        return
      }

      if (state.mode === 'resize') {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const { ax, ay } = CORNER_ANCHOR[state.corner]
        const dirX = -ax
        const dirY = -ay

        // 앵커→포인터 방향 거리
        const dx = (px - state.anchorX) * dirX
        const dy = (py - state.anchorY) * dirY

        // 앵커 기준 최대 크기 (컨테이너 안에 들어오도록)
        const maxFromX = dirX === 1 ? containerDim - state.anchorX : state.anchorX
        const maxFromY = dirY === 1 ? containerDim - state.anchorY : state.anchorY
        const maxSize = Math.min(maxFromX, maxFromY)

        const newSize = Math.max(MIN_CROP_SIZE, Math.min(maxSize, Math.max(dx, dy)))

        // 새 중심 (컨테이너 좌표 → 중심 기준 오프셋)
        const newCX = state.anchorX + dirX * newSize / 2 - containerDim / 2
        const newCY = state.anchorY + dirY * newSize / 2 - containerDim / 2

        // 스케일 확보 (이미지가 크롭을 완전히 덮도록)
        const minScale = newSize / Math.min(naturalSize.w || 1, naturalSize.h || 1)
        const newScale = Math.max(scale, minScale)

        setCropSize(newSize)
        setCropCenter({ x: newCX, y: newCY })
        if (newScale !== scale) setScale(newScale)
        setOffset((prev) => clampOffset(prev.x, prev.y, newScale, { x: newCX, y: newCY }, newSize))
      }
    },
    [scale, cropSize, containerDim, naturalSize, clampOffset, clampCropCenter],
  )

  const handlePointerUp = useCallback(() => {
    interactionRef.current = null
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
        const minScale = cropSize / Math.min(naturalSize.w || 1, naturalSize.h || 1)
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
      const minScale = cropSize / Math.min(naturalSize.w || 1, naturalSize.h || 1)
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
    setCropCenter({ x: 0, y: 0 })
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

    // 크롭 중심의 이미지 좌표 (cropCenter 반영)
    const centerX = img.naturalWidth / 2 + (cropCenter.x - offset.x) / scale
    const centerY = img.naturalHeight / 2 + (cropCenter.y - offset.y) / scale
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
  }, [scale, offset, rotation, cropSize, cropCenter, onDone])

  // 이미지 표시 크기
  const displayW = naturalSize.w * scale
  const displayH = naturalSize.h * scale

  // 줌 슬라이더 최소값
  const minSliderScale = cropSize / Math.min(naturalSize.w || 1, naturalSize.h || 1)

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

          {/* 크롭 오버레이 — cropCenter 반영 */}
          <div className="pointer-events-none absolute inset-0">
            {/* 상 */}
            <div
              className="absolute left-0 right-0 top-0"
              style={{
                height: `calc(50% + ${cropCenter.y - cropSize / 2}px)`,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            />
            {/* 하 */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: `calc(50% - ${cropCenter.y + cropSize / 2}px)`,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            />
            {/* 좌 */}
            <div
              className="absolute left-0"
              style={{
                top: `calc(50% + ${cropCenter.y - cropSize / 2}px)`,
                width: `calc(50% + ${cropCenter.x - cropSize / 2}px)`,
                height: `${cropSize}px`,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            />
            {/* 우 */}
            <div
              className="absolute right-0"
              style={{
                top: `calc(50% + ${cropCenter.y - cropSize / 2}px)`,
                width: `calc(50% - ${cropCenter.x + cropSize / 2}px)`,
                height: `${cropSize}px`,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            />
            {/* 프레임 */}
            <div
              className="absolute"
              style={{
                left: `calc(50% + ${cropCenter.x}px)`,
                top: `calc(50% + ${cropCenter.y}px)`,
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

              {/* 코너 리사이즈 핸들 */}
              {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((c) => {
                const isL = c[1] === 'l'
                const isT = c[0] === 't'
                return (
                  <div
                    key={c}
                    className="absolute"
                    style={{
                      width: '20px',
                      height: '20px',
                      [isL ? 'left' : 'right']: '-2px',
                      [isT ? 'top' : 'bottom']: '-2px',
                      borderStyle: 'solid',
                      borderColor: 'white',
                      borderWidth: 0,
                      ...(isL ? { borderLeftWidth: '3px' } : { borderRightWidth: '3px' }),
                      ...(isT ? { borderTopWidth: '3px' } : { borderBottomWidth: '3px' }),
                    }}
                  />
                )
              })}
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
            min={minSliderScale}
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
