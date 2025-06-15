import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Verify user is authenticated and return session
export async function verifyAuth() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: { path: string; maxAge: number; domain?: string }) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: { path: string; domain?: string }) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    },
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("Unauthorized: Authentication required")
  }

  return { session, supabase }
}

// Verify user owns the specified file
export async function verifyFileOwnership(fileId: string, userId: string) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: { path: string; maxAge: number; domain?: string }) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: { path: string; domain?: string }) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    },
  )

  const { data: file, error } = await supabase.from("shared_files").select("user_id").eq("id", fileId).single()

  if (error || !file) {
    throw new Error("File not found")
  }

  if (file.user_id !== userId) {
    throw new Error("Unauthorized: You don't have permission to access this file")
  }

  return true
}

// Verify user owns the file with the specified link ID
export async function verifyLinkOwnership(linkId: string, userId: string) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: { path: string; maxAge: number; domain?: string }) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: { path: string; domain?: string }) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    },
  )

  const { data: file, error } = await supabase.from("shared_files").select("user_id").eq("link_id", linkId).single()

  if (error || !file) {
    throw new Error("Link not found")
  }

  if (file.user_id !== userId) {
    throw new Error("Unauthorized: You don't have permission to access this link")
  }

  return true
}

// API handler wrapper to verify authentication
export function withAuth(
  handler: (
    req: NextRequest,
    context: { params: any },
    auth: { userId: string; supabase: any },
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: { params: any }) => {
    try {
      const { session, supabase } = await verifyAuth()
      return await handler(req, context, { userId: session.user.id, supabase })
    } catch (error: any) {
      console.error("Authentication error:", error.message)
      return NextResponse.json(
        { error: error.message || "Authentication failed" },
        { status: error.message.includes("Unauthorized") ? 401 : 500 },
      )
    }
  }
}
