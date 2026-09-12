import {
  calendarListSchema,
  eventListingSchema,
  stampedEventSchema,
} from "./calendar"
import {
  arrayProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./common"
import {
  draftedMailSchema,
  mailMessageSchema,
  mailThreadSchema,
  sentMailSchema,
} from "./mail"

export const googleToolResponseSchemas = {
  google_gmail_search_threads: objectSchema({
    required: ["threads"],
    properties: {
      threads: arrayProperty(
        "Matching threads, newest first. Read one for its messages.",
        objectSchema({
          required: ["threadId"],
          properties: {
            threadId: stringProperty("Gmail thread ID."),
            snippet: stringProperty("Preview of the matched content."),
          },
        })
      ),
      nextPageToken: stringProperty(
        "Pass as pageToken to continue; absent on the last page."
      ),
    },
  }),
  google_gmail_get_thread: mailThreadSchema(),
  google_gmail_get_threads: arrayProperty(
    "One entry per requested thread ID, in request order.",
    mailThreadSchema()
  ),
  google_gmail_get_message: mailMessageSchema(),
  google_gmail_get_messages: arrayProperty(
    "One entry per requested message ID, in request order.",
    mailMessageSchema()
  ),
  google_gmail_reply_to_thread: sentMailSchema(),
  google_gmail_send_message: sentMailSchema(),
  google_gmail_create_draft: draftedMailSchema(),
  google_calendar_list_calendars: calendarListSchema(true),
  google_calendar_list_events: eventListingSchema(),
  google_calendar_get_event: stampedEventSchema(),
  google_calendar_create_event: stampedEventSchema(),
  google_calendar_update_event: stampedEventSchema(),
} satisfies SchemaMap
