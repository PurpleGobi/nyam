'use client'

import { useEffect, useRef, useState } from 'react'

interface GeolocationState {
  location: { lat: number; lng: number } | null
  isLoading: boolean
  error: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    isLoading: true,
    error: null,
  })
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    requested.current = true

    if (!navigator.geolocation) {
      // Use a microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setState({ location: null, isLoading: false, error: 'Geolocation is not supported' })
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          isLoading: false,
          error: null,
        })
      },
      (err) => {
        setState({ location: null, isLoading: false, error: err.message })
      },
    )
  }, [])

  return state
}
