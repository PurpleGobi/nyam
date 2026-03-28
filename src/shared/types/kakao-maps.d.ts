/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: MapOptions)
    setCenter(latlng: LatLng): void
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
    getCenter(): LatLng
    getLevel(): number
    setLevel(level: number): void
    relayout(): void
  }

  interface MapOptions {
    center: LatLng
    level?: number
  }

  class LatLng {
    constructor(lat: number, lng: number)
    getLat(): number
    getLng(): number
  }

  class LatLngBounds {
    constructor()
    extend(latlng: LatLng): void
    isEmpty(): boolean
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map
    image?: MarkerImage
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point })
  }

  class Size {
    constructor(width: number, height: number)
  }

  class Point {
    constructor(x: number, y: number)
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
  }

  interface CustomOverlayOptions {
    position: LatLng
    content: string | HTMLElement
    map?: Map
    yAnchor?: number
    xAnchor?: number
    zIndex?: number
    clickable?: boolean
  }

  namespace event {
    function addListener(target: any, type: string, callback: (...args: any[]) => void): void
    function removeListener(target: any, type: string, callback: (...args: any[]) => void): void
  }

  function load(callback: () => void): void
}

interface Window {
  kakao: typeof kakao
}
