import { calendarEventProperty } from "./calendar"
import { emailMessageSchema } from "./email"
import {
  numberProperty,
  objectSchema,
  runAssetsProperty,
  type SchemaMap,
  stringArrayProperty,
  stringProperty,
} from "./fragments/common"

export const googleToolInputSchemas = {
  google_gmail_search_threads: objectSchema({
    properties: {
      maxResults: numberProperty("Maximum threads to return.", 1, 50),
      q: stringProperty("Gmail search query."),
    },
  }),
  google_gmail_get_thread: gmailReadSchema("threadId"),
  google_gmail_get_threads: gmailBatchReadSchema("threadIds"),
  google_gmail_get_message: gmailReadSchema("messageId"),
  google_gmail_get_messages: gmailBatchReadSchema("messageIds"),
  google_gmail_reply_to_thread: objectSchema({
    required: ["threadId", "body"],
    properties: {
      body: stringProperty("Plain text reply body."),
      threadId: stringProperty("Gmail thread ID."),
    },
  }),
  google_gmail_send_message: emailMessageSchema(),
  google_gmail_create_draft: gmailDraftSchema(),
  google_calendar_list_calendars: objectSchema({
    properties: {
      maxResults: numberProperty("Maximum calendars to return.", 1, 100),
      pageToken: stringProperty("Google Calendar pagination token."),
    },
  }),
  google_calendar_list_events: objectSchema({
    properties: {
      calendarId: stringProperty(
        "Calendar ID. Omit to scan every readable calendar."
      ),
      maxResults: numberProperty("Maximum total events to return.", 1, 250),
      orderBy: { type: "string", enum: ["startTime", "updated"] },
      pageToken: stringProperty("Google Calendar pagination token."),
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
  google_calendar_create_event: calendarWriteSchema(
    ["event"],
    {},
    calendarEventProperty("google", "create")
  ),
  google_calendar_update_event: calendarWriteSchema(["eventId", "event"], {
    eventId: stringProperty("Google Calendar event ID."),
  }),
} satisfies SchemaMap

function gmailDraftSchema() {
  return objectSchema({
    required: ["body"],
    properties: {
      assets: runAssetsProperty(),
      bcc: stringArrayProperty(
        "BCC recipient email addresses. Standalone drafts only."
      ),
      body: stringProperty("Message body."),
      bodyType: {
        type: "string",
        enum: ["Text", "HTML"],
        description: "Defaults to Text.",
      },
      cc: stringArrayProperty(
        "CC recipient email addresses. Standalone drafts only."
      ),
      subject: stringProperty(
        "Message subject. Required unless threadId is provided."
      ),
      threadId: stringProperty(
        "Optional Gmail thread ID. When provided, Jori creates a reply draft and infers recipient and subject."
      ),
      to: stringArrayProperty(
        "Recipient email addresses. Required unless threadId is provided."
      ),
    },
  })
}

function gmailReadSchema(idProperty: string) {
  return objectSchema({
    required: [idProperty],
    properties: {
      [idProperty]: stringProperty("Gmail ID."),
    },
  })
}

function gmailBatchReadSchema(idsProperty: string) {
  return objectSchema({
    required: [idsProperty],
    properties: {
      [idsProperty]: stringArrayProperty("Gmail IDs. Maximum 50."),
    },
  })
}

function calendarWriteSchema(
  required: string[],
  properties: Record<string, unknown> = {},
  event = calendarEventProperty("google", "update")
) {
  return objectSchema({
    required,
    properties: {
      calendarId: stringProperty("Calendar ID. Defaults to primary."),
      event,
      sendUpdates: {
        type: "string",
        enum: ["all", "externalOnly", "none"],
        description:
          "Whether attendees are emailed about the change. Defaults to none.",
      },
      ...properties,
    },
  })
}
