import { objectSchema, stringProperty } from "./fragments/common"

type CalendarEventMode = "create" | "update"
type CalendarProvider = "google" | "microsoft"

export function calendarEventProperty(
  provider: CalendarProvider,
  mode: CalendarEventMode
) {
  return {
    ...(provider === "google"
      ? googleCalendarEventSchema(mode)
      : microsoftCalendarEventSchema(mode)),
    description:
      mode === "create"
        ? "Calendar event payload. Include start and end."
        : "Partial calendar event payload.",
  }
}

function googleCalendarEventSchema(mode: CalendarEventMode) {
  return {
    ...objectSchema({
      required: mode === "create" ? ["start", "end"] : [],
      properties: {
        attendees: googleAttendeesProperty(),
        description: stringProperty("Google event description."),
        location: stringProperty("Google event free-form location."),
        recurrence: { type: "array", items: { type: "string" } },
        start: googleEventDateTimeSchema(),
        end: googleEventDateTimeSchema(),
        summary: stringProperty("Google event title."),
      },
    }),
    additionalProperties: true,
  }
}

function microsoftCalendarEventSchema(mode: CalendarEventMode) {
  return {
    ...objectSchema({
      required: mode === "create" ? ["start", "end"] : [],
      properties: {
        attendees: microsoftAttendeesProperty(),
        body: microsoftItemBodyProperty(),
        location: microsoftLocationSchema(),
        recurrence: openObjectProperty("Microsoft patternedRecurrence."),
        start: microsoftDateTimeTimeZoneSchema(),
        end: microsoftDateTimeTimeZoneSchema(),
        subject: stringProperty("Microsoft event title."),
      },
    }),
    additionalProperties: true,
  }
}

function googleEventDateTimeSchema() {
  return {
    oneOf: [
      objectSchema({
        required: ["date"],
        properties: {
          date: stringProperty("All-day date in YYYY-MM-DD format."),
        },
      }),
      objectSchema({
        required: ["dateTime"],
        properties: {
          dateTime: stringProperty("RFC3339 date-time value."),
          timeZone: stringProperty("IANA time zone."),
        },
      }),
    ],
  }
}

function microsoftDateTimeTimeZoneSchema() {
  return objectSchema({
    required: ["dateTime", "timeZone"],
    properties: {
      dateTime: stringProperty("Microsoft Graph date-time value."),
      timeZone: stringProperty("Microsoft Graph time zone."),
    },
  })
}

function googleAttendeesProperty() {
  return {
    type: "array",
    items: {
      ...objectSchema({
        required: ["email"],
        properties: {
          displayName: stringProperty("Attendee display name."),
          email: stringProperty("Attendee email address."),
          optional: { type: "boolean" },
          responseStatus: stringProperty("Attendee response status."),
        },
      }),
      additionalProperties: true,
    },
  }
}

function microsoftAttendeesProperty() {
  return {
    type: "array",
    items: {
      ...objectSchema({
        required: ["emailAddress"],
        properties: {
          emailAddress: microsoftEmailAddressProperty(),
          status: openObjectProperty("Microsoft attendee status."),
          type: {
            type: "string",
            enum: ["required", "optional", "resource"],
          },
        },
      }),
      additionalProperties: true,
    },
  }
}

function microsoftEmailAddressProperty() {
  return objectSchema({
    required: ["address"],
    properties: {
      address: stringProperty("Email address."),
      name: stringProperty("Display name."),
    },
  })
}

function microsoftItemBodyProperty() {
  return objectSchema({
    required: ["content"],
    properties: {
      content: stringProperty("Event body content."),
      contentType: { type: "string", enum: ["Text", "HTML"] },
    },
  })
}

function microsoftLocationSchema() {
  return {
    ...objectSchema({
      properties: {
        address: openObjectProperty("Microsoft physical address."),
        displayName: stringProperty("Location display name."),
        locationEmailAddress: stringProperty("Location email address."),
      },
    }),
    additionalProperties: true,
  }
}

function openObjectProperty(description: string) {
  return {
    ...objectSchema({}),
    additionalProperties: true,
    description,
  }
}
