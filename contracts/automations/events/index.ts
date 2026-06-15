import { type Integration } from "../../integrations"
import { automationEventCatalog, automationEventOptionSources } from "./catalog"
import {
  type AutomationEventCriteria,
  type AutomationEventDefinition,
  type AutomationEventOptionSource,
  type AutomationEventParameter,
} from "./catalog/types"

export { automationEventCatalog, automationEventOptionSources } from "./catalog"
export type {
  AutomationEventCriteria,
  AutomationEventCriteriaValue,
  AutomationEventDefinition,
  AutomationEventIntegrationDefinition,
  AutomationEventOptionSource,
  AutomationEventParameter,
} from "./catalog/types"

const pendingProviderDelivery =
  "Event delivery for this provider is not available yet."

export type AutomationEventIntegration =
  (typeof automationEventCatalog)[number]["provider"]

export const automationEventIntegrations = automationEventCatalog.map(
  (definition) => definition.provider
)

export function getAutomationEventIntegrationDefinition(provider: Integration) {
  return automationEventCatalog.find(
    (definition) => definition.provider === provider
  )
}

export function getAutomationEventDefinitions(provider: Integration) {
  return getAutomationEventIntegrationDefinition(provider)?.events ?? []
}

export function getAutomationEventDefinition(
  provider: Integration,
  value: string
) {
  return getAutomationEventDefinitions(provider).find(
    (definition) => definition.value === value
  )
}

export function getDefaultAutomationEvent(
  provider: Integration = automationEventCatalog[0].provider
) {
  const providerDefinition = getAutomationEventIntegrationDefinition(provider)

  return providerDefinition?.events[0] ?? automationEventCatalog[0].events[0]
}

export function isAutomationEventIntegration(
  provider: unknown
): provider is AutomationEventIntegration {
  return (
    typeof provider === "string" &&
    automationEventIntegrations.some((candidate) => candidate === provider)
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
  provider: Integration,
  source: AutomationEventOptionSource
) {
  return getAutomationEventDefinitions(provider).some((definition) =>
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

export function normalizeAutomationEventCriteria(
  definition: AutomationEventDefinition,
  criteria: Record<string, unknown> | undefined
) {
  const parameters = definition.parameters ?? []
  const input = criteria ?? {}

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Event criteria must be a key-value object.")
  }

  assertKnownCriteriaKeys(parameters, input)

  const normalized: AutomationEventCriteria = {}

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

  throw new Error(definition.availability.message ?? pendingProviderDelivery)
}

export function automationEventCriteriaKey(
  criteria: AutomationEventCriteria | undefined
) {
  if (criteria === undefined || Object.keys(criteria).length === 0) {
    return undefined
  }

  return JSON.stringify(
    Object.entries(criteria).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  )
}

export function legacyAutomationEventCriteria(
  definition: AutomationEventDefinition,
  filter: string | undefined
) {
  const normalized = normalizeOptionalText(filter)

  if (normalized === undefined) {
    return undefined
  }

  const parameter = definition.parameters?.[0]

  return parameter === undefined
    ? undefined
    : normalizeAutomationEventCriteria(definition, {
        [parameter.key]: normalized,
      })
}

function assertKnownCriteriaKeys(
  parameters: readonly AutomationEventParameter[],
  criteria: Record<string, unknown>
) {
  const knownKeys = new Set(parameters.map((parameter) => parameter.key))

  for (const key of Object.keys(criteria)) {
    if (
      !knownKeys.has(key) &&
      criteria[key] !== undefined &&
      criteria[key] !== ""
    ) {
      throw new Error(`Unknown event criterion: ${key}.`)
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
