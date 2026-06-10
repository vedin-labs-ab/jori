import {
  numberProperty,
  objectProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./common"

export const googleToolInputSchemas = {
  google_gmail_search_threads: objectSchema({
    properties: {
      maxResults: numberProperty("Maximum threads to return.", 1, 50),
      q: stringProperty("Gmail search query."),
    },
  }),
  google_gmail_get_thread: gmailReadSchema("threadId"),
  google_gmail_get_message: gmailReadSchema("messageId"),
  google_gmail_reply_to_thread: objectSchema({
    required: ["threadId", "body"],
    properties: {
      body: stringProperty("Plain text reply body."),
      threadId: stringProperty("Gmail thread ID."),
    },
  }),
  google_calendar_list_events: objectSchema({
    properties: {
      calendarId: stringProperty("Calendar ID. Defaults to primary."),
      maxResults: numberProperty("Maximum events to return.", 1, 50),
      orderBy: { type: "string", enum: ["startTime", "updated"] },
      q: stringProperty("Free text event search."),
      singleEvents: { type: "boolean" },
      timeMax: stringProperty("Exclusive upper bound RFC3339 timestamp."),
      timeMin: stringProperty("Inclusive lower bound RFC3339 timestamp."),
    },
  }),
  google_calendar_get_event: objectSchema({
    required: ["eventId"],
    properties: {
      calendarId: stringProperty("Calendar ID. Defaults to primary."),
      eventId: stringProperty("Google Calendar event ID."),
    },
  }),
  google_calendar_create_event: calendarWriteSchema(["event"]),
  google_calendar_update_event: calendarWriteSchema(["eventId", "event"], {
    eventId: stringProperty("Google Calendar event ID."),
  }),
} satisfies SchemaMap

function gmailReadSchema(idProperty: string) {
  return objectSchema({
    required: [idProperty],
    properties: {
      [idProperty]: stringProperty("Gmail ID."),
      format: {
        type: "string",
        enum: ["full", "metadata", "minimal", "raw"],
      },
    },
  })
}

function calendarWriteSchema(
  required: string[],
  properties: Record<string, unknown> = {}
) {
  return objectSchema({
    required,
    properties: {
      calendarId: stringProperty("Calendar ID. Defaults to primary."),
      event: objectProperty("Google Calendar event payload."),
      sendUpdates: {
        type: "string",
        enum: ["all", "externalOnly", "none"],
      },
      ...properties,
    },
  })
}
