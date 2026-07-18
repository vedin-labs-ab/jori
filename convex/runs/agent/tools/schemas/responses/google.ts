import {
  calendarListingSchema,
  calendarListSchema,
  providerEventPayload,
  stampedEventSchema,
} from "./calendar"
import { listField, resultSchema, type SchemaMap, stringField } from "./common"
import {
  draftedMailSchema,
  mailMessageSchema,
  mailThreadSchema,
  sentMailSchema,
} from "./mail"

export const googleToolResponseSchemas = {
  google_gmail_search_threads: resultSchema({
    required: ["threads"],
    properties: {
      threads: listField(
        "Matching threads, newest first. Read one for its messages.",
        resultSchema({
          required: ["threadId"],
          properties: {
            threadId: stringField("Gmail thread ID."),
            snippet: stringField("Preview of the matched content."),
          },
        })
      ),
      nextPageToken: stringField(
        "Pass as pageToken to continue; absent on the last page."
      ),
    },
  }),
  google_gmail_get_thread: mailThreadSchema(),
  google_gmail_get_threads: listField(
    "One entry per requested thread ID, in request order.",
    mailThreadSchema()
  ),
  google_gmail_get_message: mailMessageSchema(),
  google_gmail_get_messages: listField(
    "One entry per requested message ID, in request order.",
    mailMessageSchema()
  ),
  google_gmail_reply_to_thread: sentMailSchema(),
  google_gmail_send_message: sentMailSchema(),
  google_gmail_create_draft: draftedMailSchema(),
  google_calendar_list_calendars: calendarListSchema(true),
  google_calendar_list_events: calendarListingSchema("items"),
  google_calendar_get_event: stampedEventSchema(),
  google_calendar_create_event: providerEventPayload("The created Google"),
  google_calendar_update_event: providerEventPayload("The updated Google"),
} satisfies SchemaMap
