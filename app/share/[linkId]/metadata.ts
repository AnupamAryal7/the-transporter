import type { Metadata } from "next"
import { createServerClient } from "@supabase/ssr"
import { SITE_NAME, SITE_URL } from "@/lib/constants"

// Format file size helper
const formatFileSize = (bytes: number) => {
  if (!bytes) return "Unknown size"
  if (bytes < 1024) return bytes + " bytes"
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
  else return (bytes / 1073741824).toFixed(1) + " GB"
}

export async function generateMetadata({ params }: { params: { linkId: string } }): Promise<Metadata> {
  // Check if environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase environment variables are not defined")
    return {
      title: `Configuration Error | ${SITE_NAME}`,
      description: `The application is not properly configured. Please contact support.`,
    }
  }

  // Get file metadata
  const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get: () => undefined, // No cookies for admin client
      set: () => {}, // No-op
      remove: () => {}, // No-op
    },
  })

  const { data: file } = await supabase
    .from("shared_files")
    .select("file_name, file_size, expires_at, max_views, views")
    .eq("link_id", params.linkId)
    .single()

  if (!file) {
    return {
      title: `File Not Found | ${SITE_NAME}`,
      description: `This file may have expired or been removed.`,
    }
  }

  const fileName = file.file_name
  const fileSize = formatFileSize(file.file_size)
  const title = `Download ${fileName} | ${SITE_NAME}`
  const description = `Download ${fileName} (${fileSize}) securely via ${SITE_NAME}. This file link is secure and time-limited.`
  const url = `${SITE_URL}/share/${params.linkId}`

  // Check if file is expired
  const now = new Date()
  const expiresAt = new Date(file.expires_at)
  const isExpired = now > expiresAt || file.views >= file.max_views

  if (isExpired) {
    return {
      title: `File Expired | ${SITE_NAME}`,
      description: `This file has expired or reached its maximum download limit.`,
    }
  }

  // Use only the static image for social sharing
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      // Use the same static image for all shares
      images: [
        {
          url: `/images/social-preview.png`,
          width: 1200,
          height: 630,
          alt: `Download ${fileName}`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // Use the same static image for all shares
      images: [`/images/social-preview.png`],
    },
    alternates: {
      canonical: url,
    },
  }
}
