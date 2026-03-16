'use client'

import { useState, useCallback } from 'react'
import { toPng } from 'html-to-image'

/**
 * Converts a data URL string to a Blob.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

interface UseShareCardReturn {
  /** Generate a PNG from the element and share or download it. */
  generateAndShare: (element: HTMLElement, menuName: string) => Promise<void>
  /** True while the image is being generated / shared. */
  isGenerating: boolean
}

/**
 * Hook that captures a DOM element as a PNG and shares it
 * via the Web Share API (mobile) or downloads it (desktop fallback).
 */
export function useShareCard(): UseShareCardReturn {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateAndShare = useCallback(async (element: HTMLElement, menuName: string) => {
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
      })

      const blob = dataUrlToBlob(dataUrl)

      // Try Web Share API (available on most mobile browsers)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const file = new File([blob], `nyam-${menuName}.png`, { type: 'image/png' })
        const shareData = { files: [file], title: `냠 - ${menuName}` }

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
          return
        }
      }

      // Desktop fallback: download the image
      const link = document.createElement('a')
      link.download = `nyam-${menuName}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { generateAndShare, isGenerating }
}
