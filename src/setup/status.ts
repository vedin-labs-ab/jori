import { useEffect, useState } from "react"

export function useIntegrationCallbackStatus(provider: "linear" | "slack") {
  const [status, setStatus] = useState<"connected" | "error" | null>(null)

  useEffect(() => {
    setStatus(getIntegrationCallbackStatus(provider))
  }, [provider])

  return status
}

function getIntegrationCallbackStatus(provider: "linear" | "slack") {
  const value = new URLSearchParams(window.location.search).get(provider)

  if (value === "connected" || value === "error") {
    return value
  }

  return null
}
