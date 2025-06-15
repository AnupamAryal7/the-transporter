import { Package } from "lucide-react"
import Link from "next/link"
import { SITE_NAME } from "@/lib/constants"

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold">
      <Package className="h-5 w-5 text-primary" />
      <span className="text-primary">{SITE_NAME}</span>
    </Link>
  )
}
