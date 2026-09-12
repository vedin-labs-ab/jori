import { afterEach, describe, expect, test, vi } from "vitest"
import {
  draftedMailSchema,
  sentMailSchema,
} from "../../../../contracts/tools/responses/mail"
import {
  createFileContext,
  mockJsonFetch,
} from "../../../../test/convex/broker"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { callGoogleTool } from "."

afterEach(() => vi.unstubAllGlobals())

describe("Gmail batch read tools", () => {
  test("reads multiple Gmail threads with one broker tool call", async () => {
    const calls = mockJsonFetch((url) => ({
      id: url.pathname.split("/").at(-1),
    }))

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_get_threads",
      {
        threadIds: ["thread-a", "thread-b"],
      }
    )

    expect(result).toEqual([
      { threadId: "thread-a", messages: [] },
      { threadId: "thread-b", messages: [] },
    ])
    expect(calls.map((call) => call.url)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/threads/thread-a?format=full",
      "https://gmail.googleapis.com/gmail/v1/users/me/threads/thread-b?format=full",
    ])
  })

  test("reads multiple Gmail messages with one broker tool call", async () => {
    const calls = mockJsonFetch((url) => ({
      id: url.pathname.split("/").at(-1),
    }))

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_get_messages",
      {
        messageIds: ["message-a", "message-b"],
      }
    )

    expect(result).toMatchObject([
      { provider: "gmail", messageId: "message-a", to: [], cc: [] },
      { provider: "gmail", messageId: "message-b", to: [], cc: [] },
    ])
    expect(calls.map((call) => call.url)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/message-a?format=full",
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/message-b?format=full",
    ])
  })
})

test("sends a new Gmail message", async () => {
  const calls = mockJsonFetch(() => ({
    id: "sent-message",
    threadId: "thread",
  }))

  const result = await callGoogleTool(
    gmailIntegration(),
    "google_gmail_send_message",
    {
      bcc: ["audit@example.com"],
      body: "Hello from Jori",
      cc: ["team@example.com"],
      subject: "Hello",
      to: ["recipient@example.com"],
    }
  )

  expect(result).toEqual({
    status: "sent",
    messageId: "sent-message",
    threadId: "thread",
  })
  expect(schemaViolations(result, sentMailSchema())).toEqual([])
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
  )

  const raw = readRawMessage(calls[0]?.body)
  expect(raw).toContain("To: recipient@example.com")
  expect(raw).toContain("Cc: team@example.com")
  expect(raw).toContain("Bcc: audit@example.com")
  expect(raw).toContain("Subject: Hello")
  expect(raw).toContain("Content-Type: text/plain; charset=UTF-8")
  expect(raw).toContain("\r\n\r\nHello from Jori")
})

test("creates a Gmail draft", async () => {
  const calls = mockJsonFetch(() => ({
    id: "draft",
    message: { id: "message", threadId: "thread" },
  }))

  const result = await callGoogleTool(
    gmailIntegration(),
    "google_gmail_create_draft",
    {
      body: "<p>Hello from Jori</p>",
      bodyType: "HTML",
      subject: "Draft",
      to: ["recipient@example.com"],
    }
  )

  expect(result).toEqual({
    status: "drafted",
    draftId: "draft",
    messageId: "message",
    threadId: "thread",
  })
  expect(schemaViolations(result, draftedMailSchema())).toEqual([])
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
  )

  const raw = readRawMessage(calls[0]?.body, ["message", "raw"])
  expect(raw).toContain("To: recipient@example.com")
  expect(raw).toContain("Subject: Draft")
  expect(raw).toContain("Content-Type: text/html; charset=UTF-8")
  expect(raw).toContain("\r\n\r\n<p>Hello from Jori</p>")
})

describe("Gmail thread draft tools", () => {
  test("creates a Gmail reply draft for a thread", async () => {
    const calls = mockJsonFetch((url) =>
      url.pathname.endsWith("/drafts")
        ? { id: "draft" }
        : {
            messages: [
              {
                internalDate: "1",
                payload: {
                  headers: [
                    { name: "From", value: "Client <client@example.com>" },
                    { name: "To", value: "sender@example.com" },
                    { name: "Subject", value: "Question" },
                    { name: "Message-Id", value: "<message-1>" },
                    { name: "References", value: "<root>" },
                  ],
                },
              },
            ],
          }
    )

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_create_draft",
      {
        body: "I will look into this.",
        threadId: "thread-1",
      }
    )

    expect(result).toEqual({ status: "drafted", draftId: "draft" })
    expect(calls.map((call) => call.url)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/threads/thread-1?format=metadata",
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    ])
    expect(calls[1]?.body).toMatchObject({
      message: { threadId: "thread-1" },
    })

    const raw = readRawMessage(calls[1]?.body, ["message", "raw"])
    expect(raw).toContain("To: client@example.com")
    expect(raw).toContain("Subject: Re: Question")
    expect(raw).toContain("In-Reply-To: <message-1>")
    expect(raw).toContain("References: <root> <message-1>")
    expect(raw).toContain("\r\n\r\nI will look into this.")
  })
})

describe("Gmail files", () => {
  test("sends saved files", async () => {
    const calls = mockJsonFetch(() => ({ id: "sent-message" }))

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_send_message",
      {
        files: [{ fileId: "file-id" }],
        body: "See attached.",
        subject: "File",
        to: ["recipient@example.com"],
      },
      createFileContext()
    )

    expect(result).toEqual({ status: "sent", messageId: "sent-message" })
    const raw = readRawMessage(calls[0]?.body)

    expect(raw).toContain("Content-Type: multipart/mixed; boundary=")
    expect(raw).toContain("Content-Type: text/plain; charset=UTF-8")
    expect(raw).toContain("See attached.")
    expect(raw).toContain('Content-Type: image/png; name="kitten.png"')
    expect(raw).toContain(
      'Content-Disposition: attachment; filename="kitten.png"'
    )
    expect(raw).toContain("aGVsbG8=")
  })
})

function readRawMessage(body: unknown, path: string[] = ["raw"]) {
  const raw = path.reduce<unknown>((value, key) => {
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)[key]
      : undefined
  }, body)

  expect(raw).toEqual(expect.any(String))

  return Buffer.from(String(raw), "base64url").toString("utf8")
}

function gmailIntegration() {
  return { ...integration("gmail"), email: "sender@example.com" }
}
