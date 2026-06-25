import { calendarEventProperty } from "./calendar"
import {
  numberProperty,
  objectSchema,
  runAssetsProperty,
  type SchemaMap,
  stringArrayProperty,
  stringProperty,
} from "./common"

export const microsoftToolInputSchemas = {
  microsoft_email_search_messages: objectSchema({
    properties: {
      folderId: stringProperty("Optional mail folder ID."),
      q: stringProperty("Microsoft Graph message search string."),
      top: numberProperty("Maximum messages to return.", 1, 25),
    },
  }),
  microsoft_email_get_message: objectSchema({
    required: ["messageId"],
    properties: {
      messageId: stringProperty("Outlook message ID."),
    },
  }),
  microsoft_email_send_message: microsoftMessageSchema({
    saveToSentItems: { type: "boolean" },
  }),
  microsoft_email_create_draft: microsoftMessageSchema(),
  microsoft_email_update_message: objectSchema({
    required: ["messageId", "message"],
    properties: {
      message: microsoftMessagePatchProperty(),
      messageId: stringProperty("Outlook message or draft ID."),
    },
  }),
  microsoft_calendar_list_events: objectSchema({
    properties: {
      timeMax: stringProperty("Upper bound ISO timestamp."),
      timeMin: stringProperty("Lower bound ISO timestamp."),
      top: numberProperty("Maximum events to return.", 1, 50),
    },
  }),
  microsoft_calendar_get_event: objectSchema({
    required: ["eventId"],
    properties: {
      eventId: stringProperty("Microsoft Graph event ID."),
    },
  }),
  microsoft_calendar_create_event: microsoftCalendarWriteSchema(
    ["event"],
    {},
    calendarEventProperty("microsoft", "create")
  ),
  microsoft_calendar_update_event: microsoftCalendarWriteSchema(
    ["eventId", "event"],
    { eventId: stringProperty("Microsoft Graph event ID.") }
  ),
} satisfies SchemaMap

function microsoftMessageSchema(properties: Record<string, unknown> = {}) {
  return objectSchema({
    required: ["to", "subject", "body"],
    properties: {
      assets: runAssetsProperty(),
      bcc: stringArrayProperty("BCC recipient email addresses."),
      body: stringProperty("Message body."),
      bodyType: {
        type: "string",
        enum: ["Text", "HTML"],
        description: "Defaults to Text.",
      },
      cc: stringArrayProperty("CC recipient email addresses."),
      subject: stringProperty("Message subject."),
      to: stringArrayProperty("Recipient email addresses."),
      ...properties,
    },
  })
}

function microsoftMessagePatchProperty() {
  return {
    ...objectSchema({
      properties: {
        bccRecipients: graphRecipientsProperty(),
        body: objectSchema({
          required: ["content"],
          properties: {
            content: stringProperty("Message body content."),
            contentType: { type: "string", enum: ["Text", "HTML"] },
          },
        }),
        ccRecipients: graphRecipientsProperty(),
        subject: stringProperty("Message subject."),
        toRecipients: graphRecipientsProperty(),
      },
    }),
    additionalProperties: true,
    description: "Partial Microsoft Graph message payload.",
  }
}

function graphRecipientsProperty() {
  return {
    type: "array",
    items: objectSchema({
      required: ["emailAddress"],
      properties: {
        emailAddress: objectSchema({
          required: ["address"],
          properties: {
            address: stringProperty("Recipient email address."),
            name: stringProperty("Recipient display name."),
          },
        }),
      },
    }),
  }
}

function microsoftCalendarWriteSchema(
  required: string[],
  properties: Record<string, unknown> = {},
  event = calendarEventProperty("microsoft", "update")
) {
  return objectSchema({
    required,
    properties: {
      event,
      sendUpdates: {
        type: "string",
        enum: ["all", "none"],
        description: "Whether attendees are emailed about the change.",
      },
      ...properties,
    },
  })
}
