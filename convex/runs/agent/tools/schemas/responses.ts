import { objectSchema, stringProperty } from "./fragments/common"

// Response schemas describe what a tool call returns. Most provider tools
// pass the provider's payload through unchanged and need none; authored
// entries cover the results the broker shapes itself.

const stampedEventProperties = {
  provider: stringProperty("Integration key of the calendar provider."),
  entityKey: stringProperty(
    "Stable identity for this event; survives content edits."
  ),
  contentHash: stringProperty("Changes whenever the event's content changes."),
  calendarId: stringProperty("Calendar the event was listed under."),
  calendarName: stringProperty("Display name of that calendar."),
}

function stampedEventSchema() {
  return {
    ...objectSchema({ properties: stampedEventProperties }),
    additionalProperties: true,
    description: "The provider's event object plus Milo's identity stamp.",
  }
}

function calendarListingSchema(itemsKey: "items" | "value") {
  return {
    ...objectSchema({
      properties: {
        [itemsKey]: {
          type: "array",
          items: stampedEventSchema(),
          description: "Events across the scanned calendars, by start time.",
        },
        calendarsScanned: {
          type: "number",
          description: "How many calendars the scan covered.",
        },
        gaps: {
          type: "array",
          items: { type: "string" },
          description: "Calendars that could not be read.",
        },
        status: {
          type: "string",
          enum: ["ready", "partial"],
          description: "partial when gaps exist or the listing was truncated.",
        },
        truncated: {
          type: "boolean",
          description: "True when more events existed than were returned.",
        },
      },
    }),
    additionalProperties: true,
    description:
      "The event listing. The scan fields appear when no calendar ID was given; a single-calendar listing returns the provider's page with stamped events.",
  }
}

const toolResponseSchemas: Record<string, object> = {
  google_calendar_get_event: stampedEventSchema(),
  google_calendar_list_events: calendarListingSchema("items"),
  microsoft_calendar_get_event: stampedEventSchema(),
  microsoft_calendar_list_events: calendarListingSchema("value"),
}

export function getToolResponseSchema(tool: string) {
  return toolResponseSchemas[tool]
}
