import { useEffect, useState } from "react"

export const integrationCallbackProviders = [
  "gmail",
  "github",
  "googleCalendar",
  "linear",
  "microsoftCalendar",
  "microsoftEmail",
  "notion",
  "slack",
] as const

export type IntegrationCallbackProvider =
  (typeof integrationCallbackProviders)[number]

export type IntegrationCallbackStatus = "connected" | "error" | null

export function useIntegrationCallbackStatuses() {
  const [statuses, setStatuses] = useState(readIntegrationCallbackStatuses)

  useEffect(() => {
    setStatuses(
      readIntegrationCallbackStatuses(
        new URLSearchParams(window.location.search)
      )
    )
  }, [])

  return statuses
}

function readIntegrationCallbackStatuses(
  params = new URLSearchParams()
): Record<IntegrationCallbackProvider, IntegrationCallbackStatus> {
  return Object.fromEntries(
    integrationCallbackProviders.map((provider) => [
      provider,
      getIntegrationCallbackStatus(params, provider),
    ])
  ) as Record<IntegrationCallbackProvider, IntegrationCallbackStatus>
}

function getIntegrationCallbackStatus(
  params: URLSearchParams,
  provider: IntegrationCallbackProvider
) {
  const value = params.get(provider)

  if (value === "connected" || value === "error") {
    return value
  }

  return null
}
