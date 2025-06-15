"use client"

import { useQuery } from "@tanstack/react-query"

type FileMetadata = {
  fileName: string
  fileSize: number
  expiresAt: string
  maxViews: number
  views: number
  isExpired: boolean
}

export function useValidateLink(linkId: string) {
  return useQuery({
    queryKey: ["file-metadata", linkId],
    queryFn: async () => {
      const response = await fetch(`/api/validateLink?linkId=${linkId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to validate link")
      }
      return response.json() as Promise<FileMetadata>
    },
  })
}
