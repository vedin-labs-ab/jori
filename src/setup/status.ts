import { useEffect, useState } from "react"

type IntegrationCallbackProvider = "linear" | "microsoft" | "slack"

export function useIntegrationCallbackStatus(
  provider: IntegrationCallbackProvider
) {
  const [status, setStatus] = useState<"connected" | "error" | null>(null)

  useEffect(() => {
    setStatus(getIntegrationCallbackStatus(provider))
  }, [provider])

  return status
}

function getIntegrationCallbackStatus(provider: IntegrationCallbackProvider) {
  const value = new URLSearchParams(window.location.search).get(provider)

  if (value === "connected" || value === "error") {
    return value
  }

  return null
}
