import type { ReactNode } from "react"
import { Logo } from "@/components/logo"

export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
        </div>
      </header>
      <main className="flex-1 container py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-md">{children}</div>
      </main>
    </div>
  )
}
