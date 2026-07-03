import { useEffect, useState } from "react"

const integrationCallbackIntegrations = [
  "gmail",
  "github",
  "googleCalendar",
  "googleDrive",
  "linear",
  "microsoftCalendar",
  "microsoftEmail",
  "notion",
  "slack",
] as const

export type IntegrationCallbackIntegration =
  (typeof integrationCallbackIntegrations)[number]

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
): Record<IntegrationCallbackIntegration, IntegrationCallbackStatus> {
  return Object.fromEntries(
    integrationCallbackIntegrations.map((integration) => [
      integration,
      getIntegrationCallbackStatus(params, integration),
    ])
  ) as Record<IntegrationCallbackIntegration, IntegrationCallbackStatus>
}

function getIntegrationCallbackStatus(
  params: URLSearchParams,
  integration: IntegrationCallbackIntegration
) {
  const value = params.get(integration)

  if (value === "connected" || value === "error") {
    return value
  }

  return null
}
