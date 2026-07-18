import {
  arrayProperty,
  booleanProperty,
  enumProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  stringProperty,
} from "./common"

// Both calendar providers return provider event objects that Milo stamps
// with a stable identity; the multi-calendar scan wraps them in one shared
// envelope. One schema each, reused by the Google and Microsoft maps.

const stampProperties = {
  provider: stringProperty("Integration key of the calendar provider."),
  entityKey: stringProperty(
    "Stable identity for this event; survives content edits."
  ),
  contentHash: stringProperty("Changes whenever the event's content changes."),
  calendarId: stringProperty("Calendar the event was listed under."),
  calendarName: stringProperty("Display name of that calendar."),
}

export function stampedEventSchema(): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description: "The provider's event object plus Milo's identity stamp.",
    properties: stampProperties,
  }
}

export function eventListingSchema(): JsonSchema {
  return objectSchema({
    description:
      "The event listing. Scan fields appear when no calendar ID was given and every readable calendar was covered.",
    required: ["events", "status", "truncated"],
    properties: {
      events: arrayProperty(
        "Stamped events across the listed calendars, by start time.",
        stampedEventSchema()
      ),
      calendarsScanned: numberProperty("How many calendars the scan covered."),
      gaps: arrayProperty("Calendars that could not be read.", {
        type: "string",
      }),
      status: enumProperty(
        ["ready", "partial"],
        "partial when gaps exist or the listing was truncated."
      ),
      truncated: booleanProperty(
        "True when more events existed than were returned."
      ),
      nextPageToken: stringProperty(
        "Google single-calendar listings: pass as pageToken to continue."
      ),
    },
  })
}

export function calendarListSchema(paged: boolean): JsonSchema {
  return objectSchema({
    required: ["calendars"],
    properties: {
      calendars: arrayProperty(
        "The account's calendars in the normalized listing shape.",
        objectSchema({
          description:
            "Normalized calendar; provider-specific fields stay optional.",
          required: ["provider", "calendarId", "name"],
          properties: {
            provider: enumProperty(
              ["googleCalendar", "microsoftCalendar"],
              "Calendar provider."
            ),
            calendarId: stringProperty(
              "Calendar ID for event listings and writes."
            ),
            name: stringProperty("Calendar display name."),
            description: stringProperty("Calendar description."),
            timeZone: stringProperty("Calendar time zone."),
            primary: booleanProperty(
              "True for the account's primary calendar."
            ),
            accessRole: stringProperty(
              "Google access role: freeBusyReader, reader, writer, or owner."
            ),
            canEdit: booleanProperty("Whether Microsoft allows edits."),
            owner: stringProperty("Microsoft calendar owner."),
            hidden: booleanProperty("True when hidden from the Google UI."),
          },
        })
      ),
      ...(paged
        ? {
            nextPageToken: stringProperty(
              "Pass as pageToken to continue; absent on the last page."
            ),
          }
        : {}),
    },
  })
}
