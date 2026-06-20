import { type Integration } from "../../integrations"
import { automationEventCatalog, automationEventOptionSources } from "./catalog"
import {
  type AutomationEventDefinition,
  type AutomationEventMatch,
  type AutomationEventOptionSource,
  type AutomationEventParameter,
} from "./catalog/types"

export { automationEventCatalog, automationEventOptionSources } from "./catalog"
export type {
  AutomationEventDefinition,
  AutomationEventIntegrationDefinition,
  AutomationEventMatch,
  AutomationEventMatchValue,
  AutomationEventOptionSource,
  AutomationEventParameter,
} from "./catalog/types"

const pendingIntegrationDelivery =
  "Event delivery for this integration is not available yet."

export type AutomationEventIntegration =
  (typeof automationEventCatalog)[number]["integration"]

export const automationEventIntegrations = automationEventCatalog.map(
  (definition) => definition.integration
)

export function getAutomationEventIntegrationDefinition(
  integration: Integration
) {
  return automationEventCatalog.find(
    (definition) => definition.integration === integration
  )
}

export function getAutomationEventDefinitions(integration: Integration) {
  return getAutomationEventIntegrationDefinition(integration)?.events ?? []
}

export function getAutomationEventDefinition(
  integration: Integration,
  value: string
) {
  return getAutomationEventDefinitions(integration).find(
    (definition) => definition.value === value
  )
}

export function getDefaultAutomationEvent(
  integration: Integration = automationEventCatalog[0].integration
) {
  const integrationDefinition =
    getAutomationEventIntegrationDefinition(integration)

  return integrationDefinition?.events[0] ?? automationEventCatalog[0].events[0]
}

export function isAutomationEventIntegration(
  integration: unknown
): integration is AutomationEventIntegration {
  return (
    typeof integration === "string" &&
    automationEventIntegrations.some((candidate) => candidate === integration)
  )
}

export function isAutomationEventOptionSource(
  source: unknown
): source is AutomationEventOptionSource {
  return (
    typeof source === "string" &&
    automationEventOptionSources.some((candidate) => candidate === source)
  )
}

export function integrationUsesAutomationEventOptionSource(
  integration: Integration,
  source: AutomationEventOptionSource
) {
  return getAutomationEventDefinitions(integration).some((definition) =>
    (definition.parameters ?? []).some(
      (parameter) => parameter.type === "option" && parameter.source === source
    )
  )
}

export function automationEventParameterResetKeys(
  parameter: AutomationEventParameter
) {
  return [
    ...(parameter.type === "option" ? (parameter.dependsOn ?? []) : []),
    ...(parameter.resetsOn ?? []),
  ]
}

export function normalizeAutomationEventMatch(
  definition: AutomationEventDefinition,
  match: Record<string, unknown> | undefined
) {
  const parameters = definition.parameters ?? []
  const input = match ?? {}

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Event match must be a key-value object.")
  }

  assertKnownMatchKeys(parameters, input)

  const normalized: AutomationEventMatch = {}

  for (const parameter of parameters) {
    const value = normalizeAutomationEventParameter(
      parameter,
      input[parameter.key]
    )

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

export function assertAutomationEventIsAvailable(
  definition: AutomationEventDefinition
) {
  if (definition.availability.status === "available") {
    return
  }

  throw new Error(definition.availability.message ?? pendingIntegrationDelivery)
}

export function automationEventMatchKey(
  match: AutomationEventMatch | undefined
) {
  if (match === undefined || Object.keys(match).length === 0) {
    return undefined
  }

  return JSON.stringify(
    Object.entries(match).sort(([left], [right]) => left.localeCompare(right))
  )
}

function assertKnownMatchKeys(
  parameters: readonly AutomationEventParameter[],
  match: Record<string, unknown>
) {
  const knownKeys = new Set(parameters.map((parameter) => parameter.key))

  for (const key of Object.keys(match)) {
    if (!knownKeys.has(key) && match[key] !== undefined && match[key] !== "") {
      throw new Error(`Unknown event match key: ${key}.`)
    }
  }
}

function normalizeAutomationEventParameter(
  parameter: AutomationEventParameter,
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
  parameter: Extract<AutomationEventParameter, { type: "number" }>,
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
