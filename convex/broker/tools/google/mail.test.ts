import { describe, expect, test } from "vitest"
import { mailThreadSchema } from "../../../../contracts/tools/responses/mail"
import { schemaViolations } from "../../../../test/convex/schema"
import {
  gmailMailMessage,
  gmailMailThread,
  gmailThreadSearchPage,
} from "./mail"

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function fullGmailMessage() {
  return {
    id: "message-1",
    threadId: "thread-1",
    internalDate: "1784358000000",
    snippet: "Quick question about the launch",
    labelIds: ["INBOX", "UNREAD"],
    payload: {
      mimeType: "multipart/mixed",
      headers: [
        { name: "From", value: "Client <client@example.com>" },
        {
          name: "To",
          value: '"Doe, Jane" <jane@example.com>, sam@example.com',
        },
        { name: "Cc", value: "team@example.com" },
        { name: "Subject", value: "Launch question" },
      ],
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/plain",
              body: { data: base64Url("Hello,\r\n\r\nWhen do we launch?") },
            },
            {
              mimeType: "text/html",
              body: { data: base64Url("<p>When do we launch?</p>") },
            },
          ],
        },
        {
          mimeType: "application/pdf",
          filename: "timeline.pdf",
          body: { attachmentId: "attachment-1", size: 12_345 },
        },
      ],
    },
  }
}

describe("Gmail mail normalization", () => {
  test("decodes thread messages and conforms to the mail contract", () => {
    const thread = gmailMailThread({
      id: "thread-1",
      messages: [fullGmailMessage()],
    })
    expect(thread.threadId).toBe("thread-1")
    expect(thread.messages).toHaveLength(1)
    const [message] = thread.messages

    expect(message).toEqual({
      provider: "gmail",
      messageId: "message-1",
      threadId: "thread-1",
      from: "Client <client@example.com>",
      to: ['"Doe, Jane" <jane@example.com>', "sam@example.com"],
      cc: ["team@example.com"],
      subject: "Launch question",
      date: "2026-07-18T07:00:00.000Z",
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
    })
    expect(schemaViolations(thread, mailThreadSchema())).toEqual([])
  })

  test("falls back to the HTML part when no plain text exists", () => {
    const payload = fullGmailMessage()
    payload.payload.parts[0]?.parts?.splice(0, 1)

    const message = gmailMailMessage(payload)

    expect(message.body).toBe("<p>When do we launch?</p>")
    expect(message.bodyType).toBe("html")
  })
})

test("search pages reduce to thread stubs", () => {
  const page = gmailThreadSearchPage({
    threads: [
      { id: "thread-1", snippet: "Launch question", historyId: "9" },
      { id: "thread-2" },
    ],
    nextPageToken: "token",
    resultSizeEstimate: 2,
  })

  expect(page).toEqual({
    threads: [
      { threadId: "thread-1", snippet: "Launch question" },
      { threadId: "thread-2" },
    ],
    nextPageToken: "token",
  })
})
