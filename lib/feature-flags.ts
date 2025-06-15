/**
 * Feature flags to control application functionality
 */

export const FEATURE_FLAGS = {
  // Email notification feature flag
  EMAIL_NOTIFICATIONS_ENABLED: false, // Set to false to disable email notifications
}

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(featureName: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[featureName]
}

/**
 * Message to display when email notifications are disabled
 */
export const EMAIL_NOTIFICATIONS_DISABLED_MESSAGE =
  "Email notifications are temporarily unavailable and will be enabled in the future."

/**
 * Simple placeholder for future feature flags
 */

// This will be removed when email notifications are implemented
export const EMAIL_NOTIFICATIONS_MESSAGE = "Email notifications for downloads will be available soon."
