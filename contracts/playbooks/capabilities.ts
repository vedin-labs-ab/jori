import { type Integration } from "../integrations"

export const playbookCapabilities = ["email", "calendar"] as const

export type PlaybookCapability = (typeof playbookCapabilities)[number]

export const playbookCapabilityLabels = {
  email: "Email",
  calendar: "Calendar",
} satisfies Record<PlaybookCapability, string>

export const playbookCapabilityProviders = {
  email: ["gmail", "microsoftEmail"],
  calendar: ["googleCalendar", "microsoftCalendar"],
} satisfies Record<PlaybookCapability, readonly Integration[]>

// Delivery ("send") is a separate concern, resolved from a DeliveryDestination.
type EmailIntent = "read" | "draft"
type CalendarIntent = "read"

type CapabilityIntents = {
  email: EmailIntent
  calendar: CalendarIntent
}

export type PlaybookSlot = {
  [Capability in PlaybookCapability]: {
    capability: Capability
    intents: readonly CapabilityIntents[Capability][]
  }
}[PlaybookCapability]

export const playbookIntentLabels = {
  email: {
    read: "Read email",
    draft: "Draft replies",
  },
  calendar: {
    read: "Read calendar",
  },
} satisfies {
  [Capability in PlaybookCapability]: Record<
    CapabilityIntents[Capability],
    string
  >
}

export function playbookSlotIntentLabels(slot: PlaybookSlot): string[] {
  if (slot.capability === "email") {
    return slot.intents.map((intent) => playbookIntentLabels.email[intent])
  }

  return slot.intents.map((intent) => playbookIntentLabels.calendar[intent])
}

// Same-capability providers expose differently named and differently shaped
// tool sets, so intents map to explicit tool lists instead of renames.
const intentTools: Record<string, Record<string, readonly string[]>> = {
  gmail: {
    read: [
      "google_gmail_search_threads",
      "google_gmail_get_thread",
      "google_gmail_get_threads",
      "google_gmail_get_message",
      "google_gmail_get_messages",
    ],
    draft: ["google_gmail_create_draft"],
  },
  microsoftEmail: {
    read: ["microsoft_email_search_messages", "microsoft_email_get_message"],
    draft: ["microsoft_email_create_draft"],
  },
  googleCalendar: {
    read: ["google_calendar_list_events", "google_calendar_get_event"],
  },
  microsoftCalendar: {
    read: ["microsoft_calendar_list_events", "microsoft_calendar_get_event"],
  },
}

export function isPlaybookCapabilityProvider(
  capability: PlaybookCapability,
  integration: Integration
) {
  return playbookCapabilityProviders[capability].some(
    (provider) => provider === integration
  )
}

export function playbookSlotTools(
  slot: PlaybookSlot,
  integration: Integration
): string[] {
  if (!isPlaybookCapabilityProvider(slot.capability, integration)) {
    throw new Error(
      `${integration} does not provide the ${slot.capability} capability.`
    )
  }

  const tools = intentTools[integration]

  return [...new Set(slot.intents.flatMap((intent) => tools[intent] ?? []))]
}
