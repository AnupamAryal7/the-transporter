"use client"

import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { useMutation } from "@tanstack/react-query"
import { createBrowserClient } from "@supabase/ssr"
import { useAuth } from "@/components/auth-provider"

type UploadOptions = {
  expiresInHours: number
  maxViews: number
  notifyOnDownload?: boolean
  notifyEmail?: string
}

export function useUploadFile() {
  const [progress, setProgress] = useState(0)
  const { user } = useAuth()

  const uploadMutation = useMutation({
    mutationFn: async (params: { file: File; options: UploadOptions }) => {
      if (!user) throw new Error("You must be logged in to upload files")

      const { file, options } = params
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const linkId = uuidv4()

      // Create a safe filename by removing special characters
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")

      // Ensure the file path includes the user ID for security
      const filePath = `${user.id}/${linkId}/${safeFileName}`

      // 1. Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("secure-files").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        onUploadProgress: (progress) => {
          setProgress(Math.round((progress.loaded / progress.total) * 100))
        },
      })

      if (uploadError) throw uploadError

      // 2. Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + options.expiresInHours)

      // 3. Store metadata in database
      const { error: dbError } = await supabase.from("shared_files").insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        link_id: linkId,
        expires_at: expiresAt.toISOString(),
        max_views: options.maxViews,
        views: 0,
        notify_on_download: options.notifyOnDownload || false,
        notify_email: options.notifyOnDownload ? options.notifyEmail || user.email : null,
      })

      if (dbError) throw dbError

      return {
        linkId,
        fileName: file.name,
      }
    },
  })

  return {
    uploadFile: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    progress,
    error: uploadMutation.error,
    data: uploadMutation.data,
  }
}
