"use client"

import { useState, useEffect } from "react"

export function useImageLoader(imageSrc: string) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Reset states when image source changes
    setIsLoaded(false)
    setHasError(false)

    if (!imageSrc) {
      setHasError(true)
      return
    }

    const img = new Image()

    img.onload = () => {
      setIsLoaded(true)
    }

    img.onerror = () => {
      setHasError(true)
    }

    img.src = imageSrc

    // If the image is already cached, the onload event might not fire
    if (img.complete) {
      setIsLoaded(true)
    }

    return () => {
      // Clean up
      img.onload = null
      img.onerror = null
    }
  }, [imageSrc])

  return { isLoaded, hasError }
}
