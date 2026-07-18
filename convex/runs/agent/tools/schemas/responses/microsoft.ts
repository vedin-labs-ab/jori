import {
  calendarListingSchema,
  calendarListSchema,
  providerEventPayload,
  stampedEventSchema,
} from "./calendar"
import { listField, resultSchema, type SchemaMap } from "./common"
import { draftedMailSchema, mailMessageSchema, sentMailSchema } from "./mail"

export const microsoftToolResponseSchemas = {
  microsoft_email_search_messages: resultSchema({
    required: ["messages"],
    properties: {
      messages: listField(
        "Matching messages without bodies; read one for its full content.",
        mailMessageSchema()
      ),
    },
  }),
  microsoft_email_get_message: mailMessageSchema(),
  microsoft_email_send_message: sentMailSchema(),
  microsoft_email_create_draft: draftedMailSchema(),
  microsoft_email_update_message: mailMessageSchema(),
  microsoft_calendar_list_calendars: calendarListSchema(false),
  microsoft_calendar_list_events: calendarListingSchema("value"),
  microsoft_calendar_get_event: stampedEventSchema(),
  microsoft_calendar_create_event: providerEventPayload(
    "The created Microsoft Graph"
  ),
  microsoft_calendar_update_event: providerEventPayload(
    "The updated Microsoft Graph"
  ),
} satisfies SchemaMap
