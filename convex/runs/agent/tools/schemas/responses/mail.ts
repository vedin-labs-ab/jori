import {
  booleanField,
  constField,
  enumField,
  type JsonSchema,
  listField,
  numberField,
  resultSchema,
  stringField,
} from "./common"

// One normalized message shape for every mail provider, mirroring
// convex/broker/tools/mail.ts. Both provider schema maps reference these,
// so Gmail and Outlook results document identically.

export function mailMessageSchema(): JsonSchema {
  return resultSchema({
    description: "Normalized mail message; absent fields were not available.",
    required: ["provider", "messageId", "to", "cc", "subject"],
    properties: {
      provider: enumField(
        ["gmail", "microsoftEmail"],
        "Mail provider the message came from."
      ),
      messageId: stringField("Provider message ID."),
      threadId: stringField("Conversation the message belongs to."),
      from: stringField("Sender, as a display string."),
      to: listField("Recipients.", { type: "string" }),
      cc: listField("CC recipients.", { type: "string" }),
      subject: stringField("Message subject."),
      date: stringField("Received time as an ISO timestamp."),
      snippet: stringField("Short preview of the message content."),
      unread: booleanField("True when the message is unread."),
      body: stringField("Decoded message body, when the read included it."),
      bodyType: enumField(["text", "html"], "Format of body."),
      bodyTruncated: booleanField(
        "True when body was cut at 20,000 characters."
      ),
      attachments: listField(
        "Attachments, when the read included them.",
        resultSchema({
          required: ["name"],
          properties: {
            attachmentId: stringField("Provider attachment ID."),
            name: stringField("Attachment filename."),
            mimeType: stringField("Attachment content type."),
            size: numberField("Attachment size in bytes."),
          },
        })
      ),
      hasAttachments: booleanField(
        "True when the message has attachments, on listings that omit them."
      ),
    },
  })
}

export function mailThreadSchema(): JsonSchema {
  return resultSchema({
    required: ["threadId", "messages"],
    properties: {
      threadId: stringField("Gmail thread ID."),
      messages: listField(
        "The thread's messages, oldest first.",
        mailMessageSchema()
      ),
    },
  })
}

export function sentMailSchema(): JsonSchema {
  return resultSchema({
    description:
      "Delivery confirmation. IDs appear when the provider returns them.",
    required: ["status"],
    properties: {
      status: constField("sent", "The message was sent."),
      messageId: stringField("Provider ID of the sent message."),
      threadId: stringField("Conversation the message landed in."),
    },
  })
}

export function draftedMailSchema(): JsonSchema {
  return resultSchema({
    description:
      "The created draft. IDs appear when the provider returns them.",
    required: ["status", "draftId"],
    properties: {
      status: constField("drafted", "The draft was created."),
      draftId: stringField("Provider draft ID."),
      messageId: stringField("Provider ID of the draft message."),
      threadId: stringField("Conversation the draft belongs to."),
    },
  })
}
