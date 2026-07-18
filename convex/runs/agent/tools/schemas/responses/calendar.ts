import {
  booleanField,
  enumField,
  type JsonSchema,
  listField,
  numberField,
  providerPayload,
  resultSchema,
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

export function eventListingSchema(): JsonSchema {
  return resultSchema({
    description:
      "The event listing. Scan fields appear when no calendar ID was given and every readable calendar was covered.",
    required: ["events", "status", "truncated"],
    properties: {
      events: listField(
        "Stamped events across the listed calendars, by start time.",
        stampedEventSchema()
      ),
      calendarsScanned: numberField("How many calendars the scan covered."),
      gaps: listField("Calendars that could not be read.", {
        type: "string",
      }),
      status: enumField(
        ["ready", "partial"],
        "partial when gaps exist or the listing was truncated."
      ),
      truncated: booleanField(
        "True when more events existed than were returned."
      ),
      nextPageToken: stringField(
        "Google single-calendar listings: pass as pageToken to continue."
      ),
    },
  })
}

export function calendarListSchema(paged: boolean): JsonSchema {
  return resultSchema({
    required: ["calendars"],
    properties: {
      calendars: listField(
        "The account's calendars in the normalized listing shape.",
        resultSchema({
          description:
            "Normalized calendar; provider-specific fields stay optional.",
          required: ["provider", "calendarId", "name"],
          properties: {
            provider: enumField(
              ["googleCalendar", "microsoftCalendar"],
              "Calendar provider."
            ),
            calendarId: stringField(
              "Calendar ID for event listings and writes."
            ),
            name: stringField("Calendar display name."),
            description: stringField("Calendar description."),
            timeZone: stringField("Calendar time zone."),
            primary: booleanField("True for the account's primary calendar."),
            accessRole: stringField(
              "Google access role: freeBusyReader, reader, writer, or owner."
            ),
            canEdit: booleanField("Whether Microsoft allows edits."),
            owner: stringField("Microsoft calendar owner."),
            hidden: booleanField("True when hidden from the Google UI."),
          },
        })
      ),
      ...(paged
        ? {
            nextPageToken: stringField(
              "Pass as pageToken to continue; absent on the last page."
            ),
          }
        : {}),
    },
  })
}
