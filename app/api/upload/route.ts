import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth-utils"

export const POST = withAuth(async (req: NextRequest, _context, { userId, supabase }) => {
  try {
    // Get request body
    const body = await req.json()
    const { filePath, fileName, fileSize, linkId, expiresAt, maxViews } = body

    if (!filePath || !fileName || !fileSize || !linkId || !expiresAt || !maxViews) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Verify the file path starts with the user's ID for security
    if (!filePath.startsWith(`${userId}/`)) {
      return NextResponse.json({ message: "Unauthorized: Invalid file path" }, { status: 403 })
    }

    // Store metadata in database
    const { error } = await supabase.from("shared_files").insert({
      user_id: userId,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      link_id: linkId,
      expires_at: expiresAt,
      max_views: maxViews,
      views: 0,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, linkId })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ message: error.message || "Failed to upload file metadata" }, { status: 500 })
  }
})
