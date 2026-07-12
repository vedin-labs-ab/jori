import { type Integration } from "../../../integrations"
import { type IntegrationOptionSource } from "../../../integrations/options"

type AutomationEventParameterBase = {
  key: string
  label: string
  placeholder: string
  required: boolean
  description?: string
  /** Match keys that clear this value when they change. */
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
      source: IntegrationOptionSource
      /** Match keys required before this option source can load and reset when changed. */
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

export type AutomationEventMatchValue = string | number
export type AutomationEventMatch = Record<string, AutomationEventMatchValue>
