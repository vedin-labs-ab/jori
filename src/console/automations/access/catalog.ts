import { type Integration, integrationLabel } from "@contracts/integrations"
import { providerLogoPath } from "../../shared/logo/path"

const automationSurfaceAccesses = ["read", "write", "both"] as const

export const automationSurfaceIntegrations = [
  integration("slack", ["slack"]),
  integration("linear", ["linear"]),
  integration("github", ["github", "git hub"]),
  integration("gmail", ["gmail", "google mail"]),
  integration("googleCalendar", ["google calendar", "googlecalendar", "gcal"]),
  integration("notion", ["notion"]),
  integration("microsoftEmail", [
    "outlook",
    "outlook mail",
    "microsoft email",
    "microsoft mail",
  ]),
  integration("microsoftCalendar", [
    "microsoft calendar",
    "microsoftcalendar",
    "outlook calendar",
  ]),
] as const

export type AutomationSurfaceAccess = (typeof automationSurfaceAccesses)[number]
export type AutomationSurfaceIntegration =
  (typeof automationSurfaceIntegrations)[number]["integration"]
export type AutomationSurfaceIntegrationMeta =
  (typeof automationSurfaceIntegrations)[number]

export type AutomationSurfaceFormValue = {
  integration: AutomationSurfaceIntegration
  tools: string[]
}

function getAutomationSurfaceIntegration(
  integration: AutomationSurfaceIntegration
) {
  return automationSurfaceIntegrations.find(
    (item) => item.integration === integration
  )
}

export function isAutomationSurfaceIntegration(
  integration: unknown
): integration is AutomationSurfaceIntegration {
  return (
    typeof integration === "string" &&
    automationSurfaceIntegrations.some(
      (item) => item.integration === integration
    )
  )
}

export function getAutomationSurfaceLabel(
  integration: AutomationSurfaceIntegration
) {
  return getAutomationSurfaceIntegration(integration)?.label ?? integration
}

export function getAutomationSurfaceLogo(
  integration: AutomationSurfaceIntegration
) {
  return providerLogoPath(integration)
}

function integration<const Name extends Integration>(
  integration: Name,
  aliases: readonly string[]
) {
  return { aliases, integration, label: integrationLabel(integration) }
}
