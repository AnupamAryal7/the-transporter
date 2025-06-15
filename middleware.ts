import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/upload", "/api/upload"]

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ["/login", "/register"]

// API routes that need CORS headers
const API_ROUTES = ["/api/download", "/api/download-test", "/api/validateLink"]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  // Add CORS headers for API routes
  if (API_ROUTES.some((route) => path.startsWith(route))) {
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      })
    }

    // Add CORS headers to the response
    const response = NextResponse.next()
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

    return response
  }

  // Create a Supabase client for auth checks
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: { path: string; maxAge: number; domain?: string }) {
          // This is used for setting cookies in the browser during SSR
          // In middleware, we need to set cookies in the response
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: { path: string; domain?: string }) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    },
  )

  // Check if the user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAuthenticated = !!session

  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some((route) => path === route)

  // Redirect to login if trying to access protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if already authenticated and trying to access auth routes
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return res
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|images).*)",
  ],
}
