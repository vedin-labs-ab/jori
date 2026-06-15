import { type Integration } from "../../../integrations"

export const automationEventOptionSources = [
  "slack.channels",
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
  "googleDrive.files",
  "googleDrive.folders",
  "notion.pages",
] as const

export type AutomationEventOptionSource =
  (typeof automationEventOptionSources)[number]

type AutomationEventParameterBase = {
  key: string
  label: string
  placeholder: string
  required: boolean
  description?: string
  /** Criteria keys that clear this value when they change. */
  resetsOn?: readonly string[]
}

export type AutomationEventParameter =
  | (AutomationEventParameterBase & {
      type: "text" | "email"
    })
  | (AutomationEventParameterBase & {
      type: "number"
      min?: number
      max?: number
      step?: number
    })
  | (AutomationEventParameterBase & {
      type: "option"
      source: AutomationEventOptionSource
      /** Criteria keys required before this option source can load and reset when changed. */
      dependsOn?: readonly string[]
    })

export type AutomationEventAvailability = {
  status: "available" | "pending"
  message?: string
}

export type AutomationEventDefinition = {
  value: string
  label: string
  description: string
  availability: AutomationEventAvailability
  parameters?: readonly AutomationEventParameter[]
}

export type AutomationEventIntegrationDefinition = {
  integration: Integration
  events: readonly AutomationEventDefinition[]
}

export type AutomationEventCriteriaValue = string | number
export type AutomationEventCriteria = Record<
  string,
  AutomationEventCriteriaValue
>
