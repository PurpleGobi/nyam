'use client'

import { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MapPin } from 'lucide-react'

interface MiniMapViewProps {
  lat: number
  lng: number
  height?: number
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

let optionsSet = false
function loadGoogleMaps(): Promise<void> {
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error('API key missing'))

  if (!optionsSet) {
    setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly', language: 'ko', region: 'KR' })
    optionsSet = true
  }
  return importLibrary('maps').then(() => importLibrary('marker')).then(() => undefined)
}

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', stylers: [{ saturation: -70 }, { lightness: 40 }] },
  { featureType: 'road', stylers: [{ saturation: -80 }, { lightness: 50 }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ lightness: 30 }] },
  { featureType: 'water', stylers: [{ saturation: -60 }, { lightness: 40 }] },
  { featureType: 'administrative', elementType: 'labels', stylers: [{ lightness: 30 }] },
]

export function MiniMapView({ lat, lng, height = 140 }: MiniMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!loaded || !containerRef.current || mapRef.current) return

    const center = { lat, lng }

    const map = new google.maps.Map(containerRef.current, {
      center,
      zoom: 16,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      gestureHandling: 'none',
      clickableIcons: false,
    })

    new google.maps.Marker({
      position: center,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: 'var(--accent-food, #FF6038)',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    })

    mapRef.current = map
  }, [loaded, lat, lng])

  if (error) {
    return (
      <div
        className="flex items-center justify-center overflow-hidden rounded-lg"
        style={{
          height: `${height}px`,
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <MapPin size={20} style={{ color: 'var(--accent-food)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>
            지도를 불러올 수 없습니다
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-lg"
      style={{
        height: `${height}px`,
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    />
  )
}
