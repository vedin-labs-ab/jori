import { type Integration } from "."

export type IntegrationOption = {
  value: string
  label: string
  description?: string
}

export type IntegrationOptionMatch = Record<string, string | number>

const sourceIntegrations = {
  "slack.channels": "slack",
  "slack.users": "slack",
  "github.repositories": "github",
  "github.issues": "github",
  "github.pullRequests": "github",
  "linear.teams": "linear",
  "linear.projects": "linear",
  "linear.issues": "linear",
  "gmail.labels": "gmail",
  "microsoftEmail.folders": "microsoftEmail",
  "googleCalendar.calendars": "googleCalendar",
  "microsoftCalendar.calendars": "microsoftCalendar",
  "notion.pages": "notion",
} as const satisfies Record<string, Integration>

export type IntegrationOptionSource = keyof typeof sourceIntegrations

export function isIntegrationOptionSource(
  source: unknown
): source is IntegrationOptionSource {
  return typeof source === "string" && Object.hasOwn(sourceIntegrations, source)
}

export function integrationForOptionSource(source: IntegrationOptionSource) {
  return sourceIntegrations[source]
}
