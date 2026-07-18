import {
  calendarListingSchema,
  providerEventPayload,
  stampedEventSchema,
} from "./calendar"
import { providerList, providerPayload, type SchemaMap } from "./common"

export const googleToolResponseSchemas = {
  google_gmail_search_threads: providerPayload(
    "Gmail's users.threads.list page: thread stubs with id, snippet, and historyId, plus nextPageToken and resultSizeEstimate."
  ),
  google_gmail_get_thread: providerPayload(
    "Gmail's users.threads.get response: the thread with its messages in the requested format, unchanged."
  ),
  google_gmail_get_threads: providerList(
    "One entry per requested thread ID, in request order.",
    "Gmail's users.threads.get response for one thread, unchanged."
  ),
  google_gmail_get_message: providerPayload(
    "Gmail's users.messages.get response in the requested format, unchanged."
  ),
  google_gmail_get_messages: providerList(
    "One entry per requested message ID, in request order.",
    "Gmail's users.messages.get response for one message, unchanged."
  ),
  google_gmail_reply_to_thread: providerPayload(
    "Gmail's users.messages.send response for the sent reply: id, threadId, and labelIds."
  ),
  google_gmail_send_message: providerPayload(
    "Gmail's users.messages.send response for the sent message: id, threadId, and labelIds."
  ),
  google_gmail_create_draft: providerPayload(
    "Gmail's users.drafts.create response: the draft id and its message stub."
  ),
  google_calendar_list_calendars: providerPayload(
    "Google Calendar's calendarList.list page: calendar entries in items, plus nextPageToken when more exist."
  ),
  google_calendar_list_events: calendarListingSchema("items"),
  google_calendar_get_event: stampedEventSchema(),
  google_calendar_create_event: providerEventPayload("The created Google"),
  google_calendar_update_event: providerEventPayload("The updated Google"),
} satisfies SchemaMap
