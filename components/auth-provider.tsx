"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import type { Session, User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Check if environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are not defined")
    setError("The application is not properly configured. Please contact support.")
  }

  const supabase = createBrowserClient(supabaseUrl || "", supabaseAnonKey || "")

  useEffect(() => {
    // Set loading to true when starting to check auth
    setIsLoading(true)

    const getSession = async () => {
      try {
        console.log("Checking session...")
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
        }

        console.log("Session result:", session ? "Logged in" : "Not logged in")
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error("Error in getSession:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event)
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Protect routes that require authentication
  useEffect(() => {
    if (!isLoading) {
      const protectedRoutes = ["/upload", "/dashboard"]
      const authRoutes = ["/login", "/register"]

      if (protectedRoutes.some((route) => pathname.startsWith(route)) && !user) {
        router.push("/login")
      } else if (authRoutes.includes(pathname) && user) {
        router.push("/dashboard")
      }
    }
  }, [user, isLoading, pathname, router])

  // Show error if environment variables are missing
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-red-700 mb-2">Configuration Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={{ user, session, isLoading, signOut }}>{children}</AuthContext.Provider>
}
