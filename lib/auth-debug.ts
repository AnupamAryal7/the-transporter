"use client"

import { useEffect } from "react"
import { useAuth } from "@/components/auth-provider"

export function useAuthDebug() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    console.log("Auth Debug - isLoading:", isLoading)
    console.log("Auth Debug - user:", user ? `Logged in as ${user.email}` : "Not logged in")
  }, [user, isLoading])
}
