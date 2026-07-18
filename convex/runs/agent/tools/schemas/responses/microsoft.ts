import {
  calendarListingSchema,
  providerEventPayload,
  stampedEventSchema,
} from "./calendar"
import { constField, providerPayload, type SchemaMap } from "./common"

export const microsoftToolResponseSchemas = {
  microsoft_email_search_messages: providerPayload(
    "Microsoft Graph's message listing page: messages in value, plus @odata.nextLink when more exist."
  ),
  microsoft_email_get_message: providerPayload(
    "Microsoft Graph's message object, unchanged."
  ),
  microsoft_email_send_message: constField(
    "sent",
    "Always the string sent - Microsoft Graph's sendMail returns no message object."
  ),
  microsoft_email_create_draft: providerPayload(
    "Microsoft Graph's created draft message object, including its id."
  ),
  microsoft_email_update_message: providerPayload(
    "Microsoft Graph's message object after the patch, unchanged."
  ),
  microsoft_calendar_list_calendars: providerPayload(
    "Microsoft Graph's calendar listing page: calendars in value, plus @odata.nextLink when more exist."
  ),
  microsoft_calendar_list_events: calendarListingSchema("value"),
  microsoft_calendar_get_event: stampedEventSchema(),
  microsoft_calendar_create_event: providerEventPayload(
    "The created Microsoft Graph"
  ),
  microsoft_calendar_update_event: providerEventPayload(
    "The updated Microsoft Graph"
  ),
} satisfies SchemaMap
