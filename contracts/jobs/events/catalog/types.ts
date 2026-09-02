import { type Integration } from "../../../integrations"
import { type IntegrationOptionSource } from "../../../integrations/options"

type JobEventParameterBase = {
  key: string
  label: string
  placeholder: string
  required: boolean
  description?: string
  /** Match keys that clear this value when they change. */
  resetsOn?: readonly string[]
}

export type JobEventParameter =
  | (JobEventParameterBase & {
      type: "text" | "email"
    })
  | (JobEventParameterBase & {
      type: "number"
      min?: number
      max?: number
      step?: number
    })
  | (JobEventParameterBase & {
      type: "option"
      source: IntegrationOptionSource
      /** Match keys required before this option source can load and reset when changed. */
      dependsOn?: readonly string[]
    })

export type JobEventAvailability = {
  status: "available" | "pending"
  message?: string
}

export type JobEventDefinition = {
  value: string
  label: string
  description: string
  availability: JobEventAvailability
  parameters?: readonly JobEventParameter[]
}

export type JobEventIntegrationDefinition = {
  integration: Integration
  events: readonly JobEventDefinition[]
}

type JobEventMatchValue = string | number
export type JobEventMatch = Record<string, JobEventMatchValue>
