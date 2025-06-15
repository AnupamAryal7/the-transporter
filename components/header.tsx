"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Upload, LayoutDashboard, LogOut, Menu, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/logo"
import { TERMS } from "@/lib/constants"
import { useQuery } from "@tanstack/react-query"

export function Header() {
  const { user, signOut, isLoading } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Check if user is admin
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null
      const response = await fetch(`/api/user/profile`)
      if (!response.ok) return null
      return response.json()
    },
    enabled: !!user,
  })

  // This ensures we only render the correct navigation after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = (path: string) => {
    return pathname === path
  }

  const handleSignOut = () => {
    setOpen(false)
    signOut()
  }

  const isAdmin = profile?.role === "admin"

  // Show a loading state while authentication is being determined
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="h-9 w-16 bg-muted animate-pulse rounded-md"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {!isLoading && (
            <>
              {user ? (
                <>
                  <Link href="/upload">
                    <Button variant={isActive("/upload") ? "default" : "ghost"} size="sm" className="gap-2">
                      <Upload className="h-4 w-4" />
                      {TERMS.upload}
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant={isActive("/dashboard") ? "default" : "ghost"} size="sm" className="gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin">
                      <Button variant={isActive("/admin") ? "default" : "ghost"} size="sm" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">Login</Button>
                  </Link>
                  <Link href="/register">
                    <Button>Sign up</Button>
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-background">
            <div className="flex flex-col gap-6 pt-6">
              <Logo />
              <nav className="flex flex-col gap-4">
                {!isLoading && (
                  <>
                    {user ? (
                      <>
                        <Link href="/upload" onClick={() => setOpen(false)}>
                          <Button
                            variant={isActive("/upload") ? "default" : "ghost"}
                            size="sm"
                            className="w-full justify-start gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {TERMS.upload}
                          </Button>
                        </Link>
                        <Link href="/dashboard" onClick={() => setOpen(false)}>
                          <Button
                            variant={isActive("/dashboard") ? "default" : "ghost"}
                            size="sm"
                            className="w-full justify-start gap-2"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setOpen(false)}>
                            <Button
                              variant={isActive("/admin") ? "default" : "ghost"}
                              size="sm"
                              className="w-full justify-start gap-2"
                            >
                              <Shield className="h-4 w-4" />
                              Admin
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href="/login" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            Login
                          </Button>
                        </Link>
                        <Link href="/register" onClick={() => setOpen(false)}>
                          <Button className="w-full justify-start">Sign up</Button>
                        </Link>
                      </>
                    )}
                  </>
                )}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
