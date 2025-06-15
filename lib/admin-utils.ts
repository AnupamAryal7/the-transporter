import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Check if the current user is an admin
export async function verifyAdminAuth() {
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

  // Check if user has admin role
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  if (error || !profile || profile.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }

  return { session, supabase }
}

// API handler wrapper to verify admin authentication
export function withAdminAuth(
  handler: (
    req: NextRequest,
    context: { params: any },
    auth: { userId: string; supabase: any },
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: { params: any }) => {
    try {
      const { session, supabase } = await verifyAdminAuth()
      return await handler(req, context, { userId: session.user.id, supabase })
    } catch (error: any) {
      console.error("Admin authentication error:", error.message)
      return NextResponse.json(
        { error: error.message || "Admin authentication failed" },
        { status: error.message.includes("Unauthorized") ? 403 : 500 },
      )
    }
  }
}
