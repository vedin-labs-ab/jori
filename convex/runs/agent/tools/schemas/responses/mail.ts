import {
  arrayProperty,
  booleanProperty,
  constProperty,
  enumProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  stringProperty,
} from "./common"

// One normalized message shape for every mail provider, mirroring
// convex/broker/tools/mail.ts. Both provider schema maps reference these,
// so Gmail and Outlook results document identically.

export function mailMessageSchema(): JsonSchema {
  return objectSchema({
    description: "Normalized mail message; absent fields were not available.",
    required: ["provider", "messageId", "to", "cc", "subject"],
    properties: {
      provider: enumProperty(
        ["gmail", "microsoftEmail"],
        "Mail provider the message came from."
      ),
      messageId: stringProperty("Provider message ID."),
      threadId: stringProperty("Conversation the message belongs to."),
      from: stringProperty("Sender, as a display string."),
      to: arrayProperty("Recipients.", { type: "string" }),
      cc: arrayProperty("CC recipients.", { type: "string" }),
      subject: stringProperty("Message subject."),
      date: stringProperty("Received time as an ISO timestamp."),
      snippet: stringProperty("Short preview of the message content."),
      unread: booleanProperty("True when the message is unread."),
      body: stringProperty("Decoded message body, when the read included it."),
      bodyType: enumProperty(["text", "html"], "Format of body."),
      bodyTruncated: booleanProperty(
        "True when body was cut at 20,000 characters."
      ),
      attachments: arrayProperty(
        "Attachments, when the read included them.",
        objectSchema({
          required: ["name"],
          properties: {
            attachmentId: stringProperty("Provider attachment ID."),
            name: stringProperty("Attachment filename."),
            mimeType: stringProperty("Attachment content type."),
            size: numberProperty("Attachment size in bytes."),
          },
        })
      ),
      hasAttachments: booleanProperty(
        "True when the message has attachments, on listings that omit them."
      ),
    },
  })
}

export function mailThreadSchema(): JsonSchema {
  return objectSchema({
    required: ["threadId", "messages"],
    properties: {
      threadId: stringProperty("Gmail thread ID."),
      messages: arrayProperty(
        "The thread's messages, oldest first.",
        mailMessageSchema()
      ),
    },
  })
}

export function sentMailSchema(): JsonSchema {
  return objectSchema({
    description:
      "Delivery confirmation. IDs appear when the provider returns them.",
    required: ["status"],
    properties: {
      status: constProperty("sent", "The message was sent."),
      messageId: stringProperty("Provider ID of the sent message."),
      threadId: stringProperty("Conversation the message landed in."),
    },
  })
}

export function draftedMailSchema(): JsonSchema {
  return objectSchema({
    description:
      "The created draft. IDs appear when the provider returns them.",
    required: ["status", "draftId"],
    properties: {
      status: constProperty("drafted", "The draft was created."),
      draftId: stringProperty("Provider draft ID."),
      messageId: stringProperty("Provider ID of the draft message."),
      threadId: stringProperty("Conversation the draft belongs to."),
    },
  })
}
