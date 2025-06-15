"use client"

import { useMutation } from "@tanstack/react-query"

export function useDownloadLink() {
  return useMutation({
    mutationFn: async (linkId: string) => {
      const response = await fetch(`/api/download?linkId=${linkId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to download file")
      }
      const data = await response.json()
      return data.url as string
    },
  })
}
