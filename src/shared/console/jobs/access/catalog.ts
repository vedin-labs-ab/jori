import { type Integration, integrationLabel } from "@contracts/integrations"

const jobSurfaceAccesses = ["read", "write", "both"] as const

export const jobSurfaceIntegrations = [
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

export type JobSurfaceAccess = (typeof jobSurfaceAccesses)[number]
export type JobSurfaceIntegration =
  (typeof jobSurfaceIntegrations)[number]["integration"]
export type JobSurfaceIntegrationMeta = (typeof jobSurfaceIntegrations)[number]

export type JobSurfaceFormValue = {
  integration: JobSurfaceIntegration
  tools: string[]
}

function getJobSurfaceIntegration(integration: JobSurfaceIntegration) {
  return jobSurfaceIntegrations.find((item) => item.integration === integration)
}

export function isJobSurfaceIntegration(
  integration: unknown
): integration is JobSurfaceIntegration {
  return (
    typeof integration === "string" &&
    jobSurfaceIntegrations.some((item) => item.integration === integration)
  )
}

export function getJobSurfaceLabel(integration: JobSurfaceIntegration) {
  return getJobSurfaceIntegration(integration)?.label ?? integration
}

function integration<const Name extends Integration>(
  integration: Name,
  aliases: readonly string[]
) {
  return { aliases, integration, label: integrationLabel(integration) }
}
