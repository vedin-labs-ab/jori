import { describe, expect, test } from "vitest"
import { schemaViolations } from "../../../runs/agent/tools/schemas/responses/conform"
import {
  draftedMailSchema,
  mailMessageSchema,
} from "../../../runs/agent/tools/schemas/responses/mail"
import { microsoftDraftResult, microsoftMailMessage } from "./mail"

function graphMessage() {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    from: { emailAddress: { name: "Client", address: "client@example.com" } },
    toRecipients: [
      { emailAddress: { name: "Jane Doe", address: "jane@example.com" } },
      { emailAddress: { address: "sam@example.com" } },
    ],
    ccRecipients: [],
    subject: "Launch question",
    receivedDateTime: "2026-07-18T07:00:00Z",
    bodyPreview: "Quick question about the launch",
    isRead: false,
    hasAttachments: true,
    body: { contentType: "text", content: "Hello,\r\n\r\nWhen do we launch?" },
    attachments: [
      {
        id: "attachment-1",
        name: "timeline.pdf",
        contentType: "application/pdf",
        size: 12_345,
      },
    ],
  }
}

describe("Microsoft mail normalization", () => {
  test("maps a Graph message into the normalized shape", () => {
    const message = microsoftMailMessage(graphMessage())

    expect(message).toEqual({
      provider: "microsoftEmail",
      messageId: "message-1",
      threadId: "conversation-1",
      from: "Client <client@example.com>",
      to: ["Jane Doe <jane@example.com>", "sam@example.com"],
      cc: [],
      subject: "Launch question",
      date: "2026-07-18T07:00:00Z",
      snippet: "Quick question about the launch",
      unread: true,
      body: "Hello,\n\nWhen do we launch?",
      bodyType: "text",
      attachments: [
        {
          attachmentId: "attachment-1",
          name: "timeline.pdf",
          mimeType: "application/pdf",
          size: 12_345,
        },
      ],
      hasAttachments: true,
    })
    expect(schemaViolations(message, mailMessageSchema())).toEqual([])
  })

  test("listing rows without bodies or attachments stay conformant", () => {
    const { body, attachments, ...row } = graphMessage()
    const message = microsoftMailMessage(row)

    expect(message.body).toBeUndefined()
    expect(message.attachments).toBeUndefined()
    expect(message.hasAttachments).toBe(true)
    expect(schemaViolations(message, mailMessageSchema())).toEqual([])
  })

  test("draft results carry the message and conversation IDs", () => {
    const result = microsoftDraftResult(graphMessage())

    expect(result).toEqual({
      status: "drafted",
      draftId: "message-1",
      messageId: "message-1",
      threadId: "conversation-1",
    })
    expect(schemaViolations(result, draftedMailSchema())).toEqual([])
  })
})
