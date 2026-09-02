import { type Integration } from "../../integrations"
import { jobEventCatalog } from "./catalog"
import {
  type JobEventDefinition,
  type JobEventMatch,
  type JobEventParameter,
} from "./catalog/types"

export { jobEventCatalog } from "./catalog"
export type {
  JobEventDefinition,
  JobEventMatch,
  JobEventParameter,
} from "./catalog/types"

const pendingIntegrationDelivery =
  "Event delivery for this integration is not available yet."

export type JobEventIntegration =
  (typeof jobEventCatalog)[number]["integration"]

const jobEventIntegrations = jobEventCatalog.map(
  (definition) => definition.integration
)

function getJobEventIntegrationDefinition(integration: Integration) {
  return jobEventCatalog.find(
    (definition) => definition.integration === integration
  )
}

function getJobEventDefinitions(integration: Integration) {
  return getJobEventIntegrationDefinition(integration)?.events ?? []
}

export function getJobEventDefinition(integration: Integration, value: string) {
  return getJobEventDefinitions(integration).find(
    (definition) => definition.value === value
  )
}

export function getDefaultJobEvent(
  integration: Integration = jobEventCatalog[0].integration
) {
  const integrationDefinition = getJobEventIntegrationDefinition(integration)

  return integrationDefinition?.events[0] ?? jobEventCatalog[0].events[0]
}

export function isJobEventIntegration(
  integration: unknown
): integration is JobEventIntegration {
  return (
    typeof integration === "string" &&
    jobEventIntegrations.some((candidate) => candidate === integration)
  )
}

export function jobEventParameterResetKeys(parameter: JobEventParameter) {
  return [
    ...(parameter.type === "option" ? (parameter.dependsOn ?? []) : []),
    ...(parameter.resetsOn ?? []),
  ]
}

export function normalizeJobEventMatch(
  definition: JobEventDefinition,
  match: Record<string, unknown> | undefined
) {
  const parameters = definition.parameters ?? []
  const input = match ?? {}

  if (Array.isArray(input)) {
    throw new Error("Event match must be a key-value object.")
  }

  assertKnownMatchKeys(parameters, input)

  const normalized: JobEventMatch = {}

  for (const parameter of parameters) {
    const value = normalizeJobEventParameter(parameter, input[parameter.key])

    if (value === undefined) {
      if (parameter.required) {
        throw new Error(`${parameter.label} is required.`)
      }
      continue
    }

    normalized[parameter.key] = value
  }

  return Object.keys(normalized).length === 0 ? undefined : normalized
}

export function assertJobEventIsAvailable(definition: JobEventDefinition) {
  if (definition.availability.status === "available") {
    return
  }

  throw new Error(definition.availability.message ?? pendingIntegrationDelivery)
}

export function jobEventMatchKey(match: JobEventMatch | undefined) {
  if (match === undefined || Object.keys(match).length === 0) {
    return undefined
  }

  return JSON.stringify(
    Object.entries(match).sort(([left], [right]) => left.localeCompare(right))
  )
}

function assertKnownMatchKeys(
  parameters: readonly JobEventParameter[],
  match: Record<string, unknown>
) {
  const knownKeys = new Set(parameters.map((parameter) => parameter.key))

  for (const key of Object.keys(match)) {
    if (!knownKeys.has(key) && match[key] !== undefined && match[key] !== "") {
      throw new Error(`Unknown event match key: ${key}.`)
    }
  }
}

function normalizeJobEventParameter(
  parameter: JobEventParameter,
  value: unknown
) {
  if (parameter.type === "number") {
    return normalizeNumberParameter(parameter, value)
  }

  const normalized = normalizeOptionalText(
    typeof value === "string" ? value : undefined
  )

  if (normalized === undefined) {
    return undefined
  }

  if (parameter.type === "email" && !isEmailAddress(normalized)) {
    throw new Error(`${parameter.label} must be an email address.`)
  }

  return normalized
}

function normalizeNumberParameter(
  parameter: Extract<JobEventParameter, { type: "number" }>,
  value: unknown
) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : undefined

  if (numberValue === undefined) {
    return undefined
  }

  if (!Number.isFinite(numberValue) || !Number.isInteger(numberValue)) {
    throw new Error(`${parameter.label} must be a whole number.`)
  }

  if (parameter.min !== undefined && numberValue < parameter.min) {
    throw new Error(`${parameter.label} must be at least ${parameter.min}.`)
  }

  if (parameter.max !== undefined && numberValue > parameter.max) {
    throw new Error(`${parameter.label} must be at most ${parameter.max}.`)
  }

  return numberValue
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim()

  return normalized === "" ? undefined : normalized
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
