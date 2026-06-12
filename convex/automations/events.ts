import { type IntegrationProvider } from "../providers/catalog"

export const automationEventOptionSources = ["slack.channels"] as const

export type AutomationEventOptionSource =
  (typeof automationEventOptionSources)[number]

export type AutomationEventResource =
  | {
      type: "text"
      label: string
      placeholder: string
      required: boolean
    }
  | {
      type: "option"
      label: string
      placeholder: string
      required: boolean
      source: AutomationEventOptionSource
    }

export type AutomationEventDefinition = {
  value: string
  label: string
  description: string
  resource?: AutomationEventResource
}

export type AutomationEventProviderDefinition = {
  provider: IntegrationProvider
  events: readonly AutomationEventDefinition[]
}

export const automationEventCatalog = [
  provider("notion", [
    event("page.updated", {
      label: "Page updated",
      description: "Runs when a selected Notion page changes.",
      resource: {
        type: "text",
        label: "Page",
        placeholder: "Paste a Notion page ID or URL",
        required: true,
      },
    }),
  ]),
  provider("slack", [
    event("message.created", {
      label: "Channel message",
      description: "Runs when a new message appears in a selected channel.",
      resource: {
        type: "option",
        label: "Channel",
        placeholder: "Search Slack channels",
        required: true,
        source: "slack.channels",
      },
    }),
  ]),
  provider("gmail", [
    event("message.received", {
      label: "Email received",
      description: "Runs when a new Gmail message arrives.",
    }),
  ]),
  provider("microsoftEmail", [
    event("message.received", {
      label: "Email received",
      description: "Runs when a new Outlook message arrives.",
    }),
  ]),
  provider("googleDrive", [
    event("file.updated", {
      label: "File updated",
      description: "Runs when a selected Google Drive file changes.",
      resource: {
        type: "text",
        label: "File",
        placeholder: "Paste a Google Drive file ID or URL",
        required: true,
      },
    }),
  ]),
] as const satisfies readonly AutomationEventProviderDefinition[]

export type AutomationEventProvider =
  (typeof automationEventCatalog)[number]["provider"]

export const automationEventProviders = automationEventCatalog.map(
  (definition) => definition.provider
)

export function getAutomationEventProviderDefinition(
  provider: IntegrationProvider
) {
  return automationEventCatalog.find(
    (definition) => definition.provider === provider
  )
}

export function getAutomationEventDefinitions(provider: IntegrationProvider) {
  return getAutomationEventProviderDefinition(provider)?.events ?? []
}

export function getAutomationEventDefinition(
  provider: IntegrationProvider,
  value: string
) {
  return getAutomationEventDefinitions(provider).find(
    (definition) => definition.value === value
  )
}

export function getDefaultAutomationEvent(
  provider: IntegrationProvider = automationEventCatalog[0].provider
) {
  const providerDefinition = getAutomationEventProviderDefinition(provider)

  return providerDefinition?.events[0] ?? automationEventCatalog[0].events[0]
}

export function isAutomationEventProvider(
  provider: unknown
): provider is AutomationEventProvider {
  return (
    typeof provider === "string" &&
    automationEventProviders.some((candidate) => candidate === provider)
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

export function providerUsesAutomationEventOptionSource(
  provider: IntegrationProvider,
  source: AutomationEventOptionSource
) {
  return getAutomationEventDefinitions(provider).some((definition) => {
    const resource = definition.resource

    return resource?.type === "option" && resource.source === source
  })
}

export function normalizeAutomationEventResource(
  definition: AutomationEventDefinition,
  value: string | undefined
) {
  const normalized = normalizeOptionalText(value)

  if (definition.resource === undefined) {
    if (normalized !== undefined) {
      throw new Error(`${definition.label} does not use a resource.`)
    }

    return undefined
  }

  if (definition.resource.required && normalized === undefined) {
    throw new Error(`${definition.resource.label} is required.`)
  }

  return normalized
}

function provider<const Provider extends IntegrationProvider>(
  provider: Provider,
  events: readonly AutomationEventDefinition[]
) {
  return { provider, events }
}

function event<const Value extends string>(
  value: Value,
  definition: Omit<AutomationEventDefinition, "value">
) {
  return { ...definition, value }
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim()

  return normalized === "" ? undefined : normalized
}
