"use client"

import { InfoIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EMAIL_NOTIFICATIONS_MESSAGE } from "@/lib/feature-flags"

export function NotificationStatus() {
  return (
    <Alert variant="info" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 mb-6">
      <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="text-blue-800 dark:text-blue-300">{EMAIL_NOTIFICATIONS_MESSAGE}</AlertDescription>
    </Alert>
  )
}
