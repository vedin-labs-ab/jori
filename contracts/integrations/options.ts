import { type Integration } from "."

const integrationOptionSources = [
  "slack.channels",
  "slack.users",
  "github.repositories",
  "github.issues",
  "github.pullRequests",
  "linear.teams",
  "linear.projects",
  "linear.issues",
  "gmail.labels",
  "microsoftEmail.folders",
  "googleCalendar.calendars",
  "microsoftCalendar.calendars",
  "notion.pages",
] as const

export type IntegrationOptionSource = (typeof integrationOptionSources)[number]

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
} as const satisfies Record<IntegrationOptionSource, Integration>

export function isIntegrationOptionSource(
  source: unknown
): source is IntegrationOptionSource {
  return (
    typeof source === "string" &&
    integrationOptionSources.some((candidate) => candidate === source)
  )
}

export function integrationForOptionSource(source: IntegrationOptionSource) {
  return sourceIntegrations[source]
}
