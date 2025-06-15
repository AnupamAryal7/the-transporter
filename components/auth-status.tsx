"use client"

import { useAuth } from "@/components/auth-provider"
import { useAuthDebug } from "@/lib/auth-debug"

export function AuthStatus() {
  const { user, isLoading } = useAuth()
  // Enable auth debugging
  useAuthDebug()

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Checking authentication...</div>
  }

  if (user) {
    return (
      <div className="text-sm">
        Logged in as <span className="font-medium">{user.email}</span>
      </div>
    )
  }

  return <div className="text-sm text-muted-foreground">Not logged in</div>
}
