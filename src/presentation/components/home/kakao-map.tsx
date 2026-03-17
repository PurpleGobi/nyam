"use client"

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        LatLng: new (lat: number, lng: number) => KakaoLatLng
        Map: new (
          container: HTMLElement,
          options: { center: KakaoLatLng; level: number },
        ) => KakaoMap
        LatLngBounds: new () => KakaoLatLngBounds
        CustomOverlay: new (options: {
          position: KakaoLatLng
          content: string
          yAnchor?: number
        }) => KakaoCustomOverlay
      }
    }
  }
}

interface KakaoLatLng {
  getLat(): number
  getLng(): number
}

interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void
}

interface KakaoMap {
  setBounds(bounds: KakaoLatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
}

interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void
}

interface MapPin {
  id: string
  lat: number
  lng: number
  title: string
  thumbnailUrl: string | null
}

interface KakaoMapProps {
  pins: MapPin[]
  onPinClick: (id: string) => void
  className?: string
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY

// SDK loading state managed outside React
let sdkStatus: "idle" | "loading" | "ready" | "error" = "idle"
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((l) => l())
}

function loadSdk() {
  if (!KAKAO_JS_KEY || sdkStatus !== "idle") return
  sdkStatus = "loading"

  if (window.kakao?.maps) {
    window.kakao.maps.load(() => {
      sdkStatus = "ready"
      notifyListeners()
    })
    return
  }

  const script = document.createElement("script")
  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`
  script.async = true
  script.onload = () => {
    window.kakao.maps.load(() => {
      sdkStatus = "ready"
      notifyListeners()
    })
  }
  script.onerror = () => {
    sdkStatus = "error"
    notifyListeners()
  }
  document.head.appendChild(script)
}

function subscribeSdk(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSdkStatus() {
  return sdkStatus
}

function getServerSdkStatus() {
  return "idle" as typeof sdkStatus
}

export function KakaoMap({ pins, onPinClick, className }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMap | null>(null)
  const overlaysRef = useRef<KakaoCustomOverlay[]>([])

  const status = useSyncExternalStore(subscribeSdk, getSdkStatus, getServerSdkStatus)

  // Trigger SDK loading
  useEffect(() => {
    loadSdk()
  }, [])

  const handlePinClick = useCallback(
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-pin-id]")
      if (target) {
        const id = target.getAttribute("data-pin-id")
        if (id) onPinClick(id)
      }
    },
    [onPinClick],
  )

  // Initialize map and pins
  useEffect(() => {
    if (status !== "ready" || !containerRef.current || pins.length === 0) return

    const container = containerRef.current
    const { maps } = window.kakao
    const center = new maps.LatLng(pins[0].lat, pins[0].lng)
    const map = new maps.Map(container, { center, level: 5 })
    mapRef.current = map

    // Clear old overlays
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    const bounds = new maps.LatLngBounds()

    pins.forEach((pin) => {
      const position = new maps.LatLng(pin.lat, pin.lng)
      bounds.extend(position)

      const thumb = pin.thumbnailUrl
        ? `<img src="${pin.thumbnailUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${pin.title}" />`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`

      const content = `
        <div data-pin-id="${pin.id}" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--color-primary-500, #F97316);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:2px solid white;">
            ${thumb}
          </div>
          <div style="width:8px;height:8px;background:var(--color-primary-500, #F97316);transform:rotate(45deg);margin-top:-5px;"></div>
        </div>
      `

      const overlay = new maps.CustomOverlay({
        position,
        content,
        yAnchor: 1.2,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
    })

    if (pins.length > 1) {
      map.setBounds(bounds, 40, 40, 40, 40)
    }

    container.addEventListener("click", handlePinClick)

    return () => {
      container.removeEventListener("click", handlePinClick)
      overlaysRef.current.forEach((o) => o.setMap(null))
      overlaysRef.current = []
    }
  }, [status, pins, handlePinClick])

  if (!KAKAO_JS_KEY || status === "error") return null

  return <div ref={containerRef} className={className} />
}
