import { useEffect } from "react"
import { toast } from "sonner"
import { clearOAuthFeedback, readOAuthFeedback } from "./oauth"

export function OAuthFeedback() {
  useEffect(() => {
    const feedback = readOAuthFeedback()

    if (feedback === null) {
      return
    }

    toast.error(feedback.message, {
      id: "auth-oauth-error",
    })
    clearOAuthFeedback()
  }, [])

  return null
}
