import {
  booleanField,
  type JsonSchema,
  listField,
  numberField,
  providerPayload,
  stringField,
} from "./common"

// Both calendar providers return provider event objects that Milo stamps
// with a stable identity; the multi-calendar scan wraps them in one shared
// envelope. One schema each, reused by the Google and Microsoft maps.

const stampProperties = {
  provider: stringField("Integration key of the calendar provider."),
  entityKey: stringField(
    "Stable identity for this event; survives content edits."
  ),
  contentHash: stringField("Changes whenever the event's content changes."),
  calendarId: stringField("Calendar the event was listed under."),
  calendarName: stringField("Display name of that calendar."),
}

export function stampedEventSchema(): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description: "The provider's event object plus Milo's identity stamp.",
    properties: stampProperties,
  }
}

export function calendarListingSchema(itemsKey: "items" | "value"): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description:
      "The event listing. The scan fields appear when no calendar ID was given; a single-calendar listing returns the provider's page with stamped events.",
    properties: {
      [itemsKey]: listField(
        "Events across the scanned calendars, by start time.",
        stampedEventSchema()
      ),
      calendarsScanned: numberField("How many calendars the scan covered."),
      gaps: listField("Calendars that could not be read.", {
        type: "string",
      }),
      status: {
        type: "string",
        enum: ["ready", "partial"],
        description: "partial when gaps exist or the listing was truncated.",
      },
      truncated: booleanField(
        "True when more events existed than were returned."
      ),
    },
  }
}

export function providerEventPayload(provider: string): JsonSchema {
  return providerPayload(
    `${provider} event object as the provider returns it, unchanged.`
  )
}
